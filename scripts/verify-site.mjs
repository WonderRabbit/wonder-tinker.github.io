import { access, readFile } from "node:fs/promises"
import { join } from "node:path"

class SiteVerificationError extends Error {
  constructor(message) {
    super(message)
    this.name = "SiteVerificationError"
  }
}

const distRoot = "dist"
const projectRoot = join(distRoot, "wonder-tinker.github.io")

const isExpectedMissingPathError = (error) => error instanceof Error && "code" in error && error.code === "ENOENT"

const exists = async (path) => {
  try {
    await access(path)
    return true
  } catch (error) {
    if (!isExpectedMissingPathError(error)) {
      throw error
    }
    return false
  }
}

const root = (await exists(projectRoot)) ? projectRoot : distRoot
const filePath = (...parts) => join(root, ...parts)

const readText = async (path) => readFile(path, "utf8")

const assert = (condition, message) => {
  if (!condition) {
    throw new SiteVerificationError(message)
  }
}

const assertFile = async (...parts) => {
  const path = filePath(...parts)
  assert(await exists(path), `Missing built artifact: ${path}`)
  return path
}

const assertMatches = (label, text, pattern) => {
  assert(pattern.test(text), `${label} did not match ${pattern}`)
}

const routeHtml = async (label, parts, patterns) => {
  const path = await assertFile(...parts)
  const text = await readText(path)
  for (const pattern of patterns) {
    assertMatches(label, text, pattern)
  }
  assertHeadingStructure(label, text)
  return text
}

const stripTags = (value) => value.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim()

function assertHeadingStructure(label, html) {
  const headings = [...html.matchAll(/<h([1-6])\b[^>]*>([\s\S]*?)<\/h\1>/gi)].map((match) => ({
    level: Number(match[1]),
    text: stripTags(match[2]),
  }))
  assert(headings.length > 0, `${label} has no headings.`)
  assert(headings.filter((heading) => heading.level === 1).length === 1, `${label} must have exactly one h1.`)
  assert(headings.every((heading) => heading.text.length > 0), `${label} has an empty heading.`)
  for (let index = 1; index < headings.length; index += 1) {
    assert(headings[index].level - headings[index - 1].level <= 1, `${label} skips heading levels.`)
  }
}

function assertBlogPostingJsonLd(postHtml, expected) {
  const scripts = [...postHtml.matchAll(/<script\b[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/gi)]
  const parsed = scripts.flatMap((match) => {
    try {
      return [JSON.parse(match[1].trim())]
    } catch (error) {
      if (!(error instanceof SyntaxError)) {
        throw error
      }
      return []
    }
  })
  const blogPosting = parsed.find((entry) => entry && entry["@type"] === "BlogPosting")
  assert(blogPosting, "Post page is missing parseable BlogPosting JSON-LD.")
  assert(blogPosting.headline?.includes(expected.headline), "BlogPosting headline is unexpected.")
  assert(blogPosting.url?.includes(expected.path), "BlogPosting URL is missing project base.")
  assert(blogPosting.articleSection === expected.category, "BlogPosting articleSection is unexpected.")
}

const homeHtml = await routeHtml("home", ["index.html"], [/Wonder Tinker/, /Web and AI/, /Recent posts/])
assertMatches("home", homeHtml, /wonder-tinker-start/)
assertMatches("home", homeHtml, /windows10-disable-dgpu-for-general-apps/)

await routeHtml("blog", ["blog", "index.html"], [/Blog/, /wonder-tinker-start/, /windows10-disable-dgpu-for-general-apps/, /Windows 운영/, /AI-assisted/])
const postHtml = await routeHtml("post", ["blog", "wonder-tinker-start", "index.html"], [
  /AI-assisted/,
  /AI and source notes/,
  /GPT-5 Codex/,
  /Astro content collections guide/,
])
assertBlogPostingJsonLd(postHtml, {
  headline: "Wonder Tinker",
  path: "/wonder-tinker.github.io/blog/wonder-tinker-start/",
  category: "Site notes",
})
const windowsPostHtml = await routeHtml("windows dGPU post", ["blog", "windows10-disable-dgpu-for-general-apps", "index.html"], [
  /Windows 10/,
  /Windows 운영/,
  /GPU routing/,
  /DXGI_GPU_PREFERENCE/,
  /nvidia-smi pmon/,
  /AI and source notes/,
])
assertBlogPostingJsonLd(windowsPostHtml, {
  headline: "Windows 10",
  path: "/wonder-tinker.github.io/blog/windows10-disable-dgpu-for-general-apps/",
  category: "Windows 운영",
})

await routeHtml("editorial policy", ["editorial-policy", "index.html"], [/AI/, /disclos|공개|출처/i])
await routeHtml("privacy", ["privacy", "index.html"], [/analytics/i, /tracking/i, /privacy/i])
await routeHtml("404", ["404.html"], [/404|Not Found|찾을/i])

const rss = await readText(await assertFile("rss.xml"))
assertMatches("rss", rss, /<rss\b|<feed\b|<channel\b/i)
assertMatches("rss", rss, /wonder-tinker-start|Wonder Tinker/)
assert(!/^\s*broken\s*$/i.test(rss), "RSS appears corrupted.")

const sitemapPath = (await exists(filePath("sitemap-index.xml"))) ? await assertFile("sitemap-index.xml") : await assertFile("sitemap.xml")
const sitemap = await readText(sitemapPath)
assertMatches("sitemap", sitemap, /<sitemapindex\b|<urlset\b|<loc>/i)
assertMatches("sitemap", sitemap, /wonder-tinker\.github\.io/)

const robots = await readText(await assertFile("robots.txt"))
assertMatches("robots", robots, /User-agent:\s*\*/i)
assertMatches("robots", robots, /Sitemap:\s*https:\/\/WonderRabbit\.github\.io\/wonder-tinker\.github\.io\/sitemap-index\.xml/i)

console.log(`site_verified: ${root}`)
console.log("routes: home blog post editorial-policy privacy 404")
console.log("feeds: rss sitemap robots")
console.log("metadata: BlogPosting JSON-LD AI disclosure source notes")
