const XML_ESCAPE_PATTERN = /[&<>"']/g

export type RssSource = {
  readonly title: string
  readonly url: string
}

export const escapeXml = (value: string): string =>
  value.replace(XML_ESCAPE_PATTERN, (character) => {
    switch (character) {
      case "&":
        return "&amp;"
      case "<":
        return "&lt;"
      case ">":
        return "&gt;"
      case '"':
        return "&quot;"
      case "'":
        return "&apos;"
      default:
        return character
    }
  })

export const formatSourceList = (sources: readonly RssSource[]): string =>
  sources
    .map((source) => `<li><a href="${escapeXml(source.url)}">${escapeXml(source.title)}</a></li>`)
    .join("")
