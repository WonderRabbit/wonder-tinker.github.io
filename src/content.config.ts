import { defineCollection } from "astro:content"
import { glob } from "astro/loaders"
import { z } from "astro/zod"

const sourceSchema = z.object({
  title: z.string().min(1),
  url: z.string().url(),
  accessed: z.coerce.date(),
})

const modelNoteSchema = z.object({
  model: z.string().min(1),
  role: z.string().min(1),
  humanReview: z.string().min(1),
})

const posts = defineCollection({
  loader: glob({ base: "./src/content/posts", pattern: "**/*.{md,mdx}" }),
  schema: z.object({
    title: z.string().min(1),
    description: z.string().min(1),
    published: z.coerce.date(),
    updated: z.coerce.date().optional(),
    draft: z.boolean().default(false),
    category: z.string().min(1),
    tags: z.array(z.string().min(1)).min(1),
    aiAssisted: z.boolean(),
    modelNotes: z.array(modelNoteSchema).min(1),
    sources: z.array(sourceSchema).min(1),
  }),
})

const pages = defineCollection({
  loader: glob({ base: "./src/content/pages", pattern: "**/*.{md,mdx}" }),
  schema: z.object({
    title: z.string().min(1),
    description: z.string().min(1),
    updated: z.coerce.date(),
    draft: z.boolean().default(false),
  }),
})

const aiNotes = defineCollection({
  loader: glob({ base: "./src/content/ai-notes", pattern: "**/*.{md,mdx}" }),
  schema: z.object({
    title: z.string().min(1),
    description: z.string().min(1),
    captured: z.coerce.date(),
    model: z.string().min(1),
    task: z.string().min(1),
    disclosure: z.string().min(1),
    sources: z.array(sourceSchema).min(1),
  }),
})

export const collections = { posts, pages, aiNotes }
