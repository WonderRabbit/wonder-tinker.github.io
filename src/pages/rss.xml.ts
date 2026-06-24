import rss from "@astrojs/rss"
import type { APIContext } from "astro"
import { getCollection } from "astro:content"
import { formatSourceList } from "../lib/rssXml"

export async function GET(context: APIContext): Promise<Response> {
  const posts = (await getCollection("posts", ({ data }) => !data.draft)).sort(
    (left, right) => right.data.published.getTime() - left.data.published.getTime(),
  )

  const baseUrl = new URL(import.meta.env.BASE_URL, context.site ?? "https://wonder-tinker.github.io")

  return rss({
    title: "Wonder Tinker",
    description: "Web and AI engineering notes with visible source and review metadata.",
    site: baseUrl,
    items: posts.map((post) => ({
      title: post.data.title,
      description: post.data.description,
      pubDate: post.data.published,
      link: `blog/${post.id}/`,
      categories: [post.data.category, ...post.data.tags],
      customData: `<aiAssisted>${post.data.aiAssisted}</aiAssisted><sources><ul>${formatSourceList(post.data.sources)}</ul></sources>`,
    })),
  })
}
