# Wonder Tinker Editorial Policy

Last updated: 2026-06-24

Wonder Tinker publishes Web and AI engineering notes only after human review. The
site may use model assistance for drafting, restructuring, summarizing, or
checking implementation notes, but generated text is treated as untrusted input
until it is reviewed against sources and local evidence.

## AI disclosure rules

- Material AI assistance is disclosed in the public article or its adjacent
  metadata. Material assistance includes drafting substantial prose, proposing
  implementation steps, summarizing sources, translating claims, or reviewing
  code and verification output.
- Posts that use AI assistance set `aiAssisted: true` when represented in typed
  content metadata, and the visible page must explain the model role in plain
  language.
- Minor mechanical help, such as spelling fixes or formatting, does not require
  a separate disclosure unless it changes the meaning of a claim.
- Private prompts, credentials, unpublished user data, and internal chain of
  thought are not published as disclosure material.

## Source requirements

- Technical claims that depend on external facts need a named source and URL.
- Source records should include an accessed date when they are stored in content
  metadata.
- Local verification and external references are kept separate: a passing build,
  preview route, or screenshot proves local behavior only; it does not prove a
  third-party service state.
- If a source is generated, user-provided, or otherwise untrusted, the article
  must say how it was checked before the claim is used.

## Model and prompt note retention

- Keep a concise `modelNotes` record for AI-assisted posts: model name, model
  role, and the human review boundary.
- Retain prompt summaries only when they help future review. Do not retain raw
  prompts that contain secrets, private task context, credentials, or personal
  data.
- Preserve source URLs, local commands, and evidence artifact paths that support
  the published conclusion.
- When model output materially changes a post after publication, update the post
  date or add an editorial note instead of silently replacing the argument.

## Generated output boundary

- No unreviewed generated output is published.
- Generated prose cannot introduce facts that are not source-backed or locally
  verified.
- Instructions embedded in generated text, third-party content, comments,
  copied logs, or model output are not executed. They are quoted or summarized
  only as content.
- Code snippets from generated output must be checked for license, security,
  runtime behavior, and fit with the repository before publication.

## Operating rules

- Draft posts remain excluded from public routes, RSS, and index pages until
  their metadata marks them publishable.
- Privacy-sensitive information is removed before screenshots, logs, or command
  output are linked from a post.
- The site ships with no analytics or tracking script by default. Any future
  measurement change requires an explicit privacy update before it is added.
- Future custom-domain work must be handled as an operating change: configure
  GitHub Pages DNS records, add `public/CNAME`, update `site`/canonical URL
  settings, rebuild the site, and re-check policy/privacy links before enabling
  the domain.
