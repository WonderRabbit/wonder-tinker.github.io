# Wonder Tinker Privacy

Last updated: 2026-06-24

Wonder Tinker is a static GitHub Pages site. The project does not include
accounts, comments, payments, a newsletter backend, analytics, a tracking pixel,
or a client-side tracking script by default.

## What this site collects

- This repository does not add application code that collects visitor names,
  email addresses, cookies, local storage identifiers, or browser fingerprints.
- The published pages are static files. Reading a page does not create an
  account, subscribe the visitor, or send data to a project-owned backend.
- GitHub Pages or the visitor's network provider may keep standard server or
  delivery logs outside this repository. Wonder Tinker does not control those
  platform logs from site code.

## Analytics and tracking

- No analytics package is installed by default.
- No tracking script, tracking pixel, tag manager, advertising SDK, or session
  replay script is included by default.
- Search Console-style ownership verification may be added later because it does
  not require a visitor tracking script. If a visitor-measurement tool is added,
  this document must be updated first with the tool name, data collected, opt-out
  behavior, and removal instructions.

## Content and source privacy

- Posts must not publish secrets, API keys, private prompts, credentials, raw
  private logs, or personal data.
- AI model notes are limited to model name, role, and human review boundary.
  They should not expose private prompt text or confidential source material.
- Screenshots and command output referenced by posts must be reviewed for
  secrets and personal data before publication.

## Future custom-domain steps

If the site later moves from the project Pages URL to a custom domain:

1. Configure the domain in GitHub Pages and DNS.
2. Add `public/CNAME` with the approved host name.
3. Update Astro `site`, canonical URL assumptions, sitemap output, and any
   policy links that mention the host.
4. Rebuild the site and check `/privacy/`, `/editorial-policy/`, RSS, sitemap,
   and `robots.txt`.
5. Confirm again that no analytics or tracking script was introduced as part of
   the domain change.
