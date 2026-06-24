---
title: "Wonder Tinker starts with typed content"
description: "A first Web and AI build note that records how this Astro blog treats content metadata as a validation boundary."
published: "2026-06-24"
draft: false
category: "Site notes"
tags:
  - Astro
  - Content collections
  - AI disclosure
aiAssisted: true
modelNotes:
  - model: "GPT-5 Codex"
    role: "Drafted the implementation checklist and checked the sample metadata against the Astro content schema."
    humanReview: "Accepted only generic editorial structure; no private prompts, credentials, or generated claims were copied into the post."
sources:
  - title: "Astro content collections guide"
    url: "https://docs.astro.build/en/guides/content-collections/"
    accessed: "2026-06-24"
  - title: "GitHub Pages documentation"
    url: "https://docs.github.com/en/pages"
    accessed: "2026-06-24"
---

This site starts with content before routes because the frontmatter contract is the
part that future posts will reuse the most. A post is not just Markdown here: it
has a publication date, draft state, topic tags, source records, and AI assistance
notes that can be checked before a page is generated.

The first practical rule is that AI involvement is explicit. If a model helped
draft, review, summarize, or restructure an article, the post carries
`aiAssisted: true` and a `modelNotes` entry describing the model role and the
human review boundary.

The second rule is source traceability. A future route can render citations from
the same `sources` array that `astro check` validates today. That keeps the blog
ready for technical Web and AI writing without relying on loose, untyped metadata.
