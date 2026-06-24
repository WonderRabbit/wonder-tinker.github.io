import { access, mkdir, writeFile } from "node:fs/promises"
import { resolve } from "node:path"
import axe from "axe-core"
import { chromium } from "playwright"

class BrowserVerificationError extends Error {
  constructor(message) {
    super(message)
    this.name = "BrowserVerificationError"
  }
}

const parseArgs = (args) => {
  const values = new Map()
  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index]
    if (!arg.startsWith("--")) continue
    const key = arg.slice(2)
    const value = args[index + 1]
    if (!value || value.startsWith("--")) {
      throw new BrowserVerificationError(`Missing value for --${key}.`)
    }
    values.set(key, value)
    index += 1
  }
  return values
}

const args = parseArgs(process.argv.slice(2))
const base = args.get("base")
const screenshotsDir = args.get("screenshots")
const a11yPath = args.get("a11y")

if (!base || !screenshotsDir || !a11yPath) {
  throw new BrowserVerificationError("Usage: verify-browser -- --base <url> --screenshots <dir> --a11y <path>")
}

const normalizedBase = base.replace(/\/$/, "")
const screenshotRoot = resolve(screenshotsDir)
const a11yOutput = resolve(a11yPath)

const assert = (condition, message) => {
  if (!condition) {
    throw new BrowserVerificationError(message)
  }
}

const isExpectedMissingPathError = (error) => error instanceof Error && "code" in error && error.code === "ENOENT"

const isBundledBrowserMissingError = (error) =>
  error instanceof Error &&
  (error.message.includes("Executable doesn't exist") ||
    error.message.includes("playwright install") ||
    error.message.includes("Playwright was just installed or updated"))

const endpointChecks = [
  ["/", /Wonder|blog|AI/i],
  ["/blog/", /wonder-tinker-start|windows10-disable-dgpu-for-general-apps|Blog|블로그/i],
  ["/blog/wonder-tinker-start/", /BlogPosting|AI|Wonder/i],
  ["/blog/windows10-disable-dgpu-for-general-apps/", /Windows 10|Windows 운영|GPU routing|DXGI_GPU_PREFERENCE/i],
  ["/rss.xml", /<rss|feed|channel/i],
  ["/robots.txt", /User-agent|Sitemap/i],
  ["/editorial-policy/", /AI|disclos|공개|출처/i],
  ["/privacy/", /analytics|tracking|privacy|개인정보|분석/i],
  ["/404.html", /404|Not Found|찾을/i],
]

const pageChecks = [
  ["/", "home.png", /Wonder Tinker/i],
  ["/blog/", "blog.png", /Blog/i],
  ["/blog/wonder-tinker-start/", "post-wonder-tinker-start.png", /AI and source notes/i],
  ["/blog/windows10-disable-dgpu-for-general-apps/", "post-windows10-disable-dgpu-for-general-apps.png", /Windows 운영/i],
  ["/editorial-policy/", "editorial-policy.png", /Editorial Policy/i],
  ["/privacy/", "privacy.png", /Privacy/i],
  ["/404.html", "404.png", /404/i],
]

async function assertEndpoint(path, pattern) {
  const response = await fetch(`${normalizedBase}${path}`)
  const body = await response.text()
  assert(response.status === 200, `${path} returned HTTP ${response.status}.`)
  assert(pattern.test(body), `${path} response did not match ${pattern}.`)
  return { path, status: response.status }
}

async function assertSitemap() {
  for (const path of ["/sitemap-index.xml", "/sitemap.xml"]) {
    const response = await fetch(`${normalizedBase}${path}`)
    if (response.status === 200) {
      const body = await response.text()
      assert(/sitemap|urlset|loc/i.test(body), `${path} is not a sitemap response.`)
      return { path, status: response.status }
    }
  }
  throw new BrowserVerificationError("Neither sitemap-index.xml nor sitemap.xml returned HTTP 200.")
}

async function assertHeadingStructure(page, label) {
  const headings = await page.locator("h1,h2,h3,h4,h5,h6").evaluateAll((nodes) =>
    nodes.map((node) => ({
      level: Number(node.tagName.slice(1)),
      text: node.textContent?.trim() ?? "",
    })),
  )
  assert(headings.length > 0, `${label} has no headings.`)
  assert(headings.filter((heading) => heading.level === 1).length === 1, `${label} must have exactly one h1.`)
  assert(headings.every((heading) => heading.text.length > 0), `${label} has an empty heading.`)
  for (let index = 1; index < headings.length; index += 1) {
    assert(headings[index].level - headings[index - 1].level <= 1, `${label} skips heading levels.`)
  }
}

async function assertKeyboardFocus(page, label) {
  await page.keyboard.press("Tab")
  const focus = await page.evaluate(() => {
    const active = document.activeElement
    if (!active || active === document.body) return null
    const style = window.getComputedStyle(active)
    return {
      tag: active.tagName,
      text: active.textContent?.trim() ?? "",
      outlineStyle: style.outlineStyle,
      outlineWidth: style.outlineWidth,
      boxShadow: style.boxShadow,
    }
  })
  assert(focus, `${label} did not move keyboard focus.`)
  const hasVisibleFocus = focus.outlineStyle !== "none" || focus.outlineWidth !== "0px" || focus.boxShadow !== "none"
  assert(hasVisibleFocus, `${label} active element lacks visible focus styling.`)
}

async function assertDisclosureMetadata(page) {
  const jsonLd = await page.locator('script[type="application/ld+json"]').evaluateAll((nodes) =>
    nodes.flatMap((node) => {
      try {
        return [JSON.parse(node.textContent ?? "")]
      } catch (error) {
        if (!(error instanceof SyntaxError)) {
          throw error
        }
        return []
      }
    }),
  )
  assert(jsonLd.some((entry) => entry["@type"] === "BlogPosting"), "Post lacks BlogPosting JSON-LD.")
  await page.getByText("AI-assisted").first().waitFor({ state: "visible", timeout: 5000 })
  await page.getByText("GPT-5 Codex").first().waitFor({ state: "visible", timeout: 5000 })
  await page.getByText("Sources").first().waitFor({ state: "visible", timeout: 5000 })
}

async function assertWindowsPostMetadata(page) {
  await page.getByText("Windows 운영").first().waitFor({ state: "visible", timeout: 5000 })
  await page.getByText("GPU routing").first().waitFor({ state: "visible", timeout: 5000 })
  await page.getByText("DXGI_GPU_PREFERENCE").first().waitFor({ state: "visible", timeout: 5000 })
  await page.getByText("nvidia-smi pmon").first().waitFor({ state: "visible", timeout: 5000 })
  await page.getByText("AI and source notes").first().waitFor({ state: "visible", timeout: 5000 })
}

await mkdir(screenshotRoot, { recursive: true })

const endpointResults = []
for (const [path, pattern] of endpointChecks) {
  endpointResults.push(await assertEndpoint(path, pattern))
}
endpointResults.push(await assertSitemap())

const chromeCandidates = [
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  "/Applications/Chromium.app/Contents/MacOS/Chromium",
  "/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge",
]

async function firstExecutable(paths) {
  for (const path of paths) {
    try {
      await access(path)
      return path
    } catch (error) {
      if (!isExpectedMissingPathError(error)) {
        throw error
      }
      continue
    }
  }
  return undefined
}

async function launchBrowser() {
  try {
    return await chromium.launch()
  } catch (error) {
    if (!isBundledBrowserMissingError(error)) {
      throw error
    }
    const executablePath = await firstExecutable(chromeCandidates)
    if (!executablePath) {
      throw error
    }
    return chromium.launch({ executablePath })
  }
}

const browser = await launchBrowser()
const page = await browser.newPage({ viewport: { width: 1440, height: 960 } })
const accessibility = { base: normalizedBase, routes: [], totals: { critical: 0, serious: 0 }, status: "PASS" }

try {
  for (const [path, screenshot, contentPattern] of pageChecks) {
    const url = `${normalizedBase}${path}`
    const response = await page.goto(url, { waitUntil: "networkidle", timeout: 30000 })
    assert(response?.status() === 200, `${path} browser navigation returned HTTP ${response?.status()}.`)
    assert(contentPattern.test(await page.textContent("body")), `${path} body did not match ${contentPattern}.`)
    await assertHeadingStructure(page, path)
    await assertKeyboardFocus(page, path)
    if (path === "/blog/wonder-tinker-start/") {
      await assertDisclosureMetadata(page)
    }
    if (path === "/blog/windows10-disable-dgpu-for-general-apps/") {
      await assertWindowsPostMetadata(page)
    }
    await page.addScriptTag({ content: axe.source })
    const axeResult = await page.evaluate(async () => window.axe.run(document, {
      resultTypes: ["violations"],
      runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"] },
    }))
    const critical = axeResult.violations.filter((violation) => violation.impact === "critical").length
    const serious = axeResult.violations.filter((violation) => violation.impact === "serious").length
    accessibility.totals.critical += critical
    accessibility.totals.serious += serious
    accessibility.routes.push({
      path,
      screenshot,
      critical,
      serious,
      violations: axeResult.violations.map((violation) => ({
        id: violation.id,
        impact: violation.impact,
        help: violation.help,
        nodes: violation.nodes.length,
        targets: violation.nodes.map((node) => node.target.join(" ")),
      })),
    })
    await page.screenshot({ path: resolve(screenshotRoot, screenshot), fullPage: true })
  }
} finally {
  await browser.close()
}

await writeFile(a11yOutput, `${JSON.stringify(accessibility, null, 2)}\n`, "utf8")
assert(accessibility.totals.critical === 0, "Critical accessibility violations found.")
assert(accessibility.totals.serious === 0, "Serious accessibility violations found.")

console.log(`browser_verified: ${normalizedBase}`)
console.log(`screenshots: ${screenshotRoot}`)
console.log(`accessibility: ${a11yOutput}`)
console.log("PASS critical:0 serious:0")
