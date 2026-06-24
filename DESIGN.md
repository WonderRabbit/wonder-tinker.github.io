# Wonder Tinker Design System

## 1. Atmosphere & Identity

Wonder Tinker feels like a quiet technical notebook: precise, readable, and ready for repeated publishing. The signature is a paper-like index page with restrained metadata, clear article rows, and a small amount of machine-room detail for Web and AI notes.

## 2. Color

### Palette

| Role | Token | Light | Dark | Usage |
|------|-------|-------|------|-------|
| Surface/primary | --surface-primary | #FBFBFA | #111111 | Page background |
| Surface/secondary | --surface-secondary | #FFFFFF | #181818 | Article panels and header bands |
| Surface-muted | --surface-muted | #F4F2ED | #202020 | Quiet metadata surfaces |
| Text/primary | --text-primary | #1D1D1B | #FAFAFA | Headlines and body |
| Text/secondary | --text-secondary | #696760 | #B4B0A8 | Summaries and metadata |
| Text/tertiary | --text-tertiary | #8A867D | #8A867D | Fine labels |
| Border/default | --border-default | #E7E2D8 | #34312B | Panels and dividers |
| Border/subtle | --border-subtle | #F0EDE6 | #28251F | Soft separations |
| Accent/primary | --accent-primary | #244C7A | #8CB4E8 | Links and focus |
| Accent/hover | --accent-hover | #183B63 | #A6C8F0 | Link hover |
| Status/info | --status-info | #E5EEF7 | #1C3148 | Topic chips |
| Status/success | --status-success | #E9F1E7 | #1E3A24 | Stable-state indicators |
| Status/warning | --status-warning | #F8EFD8 | #493715 | Draft indicators |
| Status/error | --status-error | #F7E4E3 | #4A1F1D | Error states |

### Rules

- Accent color is reserved for links, focus rings, and selected technical metadata.
- Large surfaces stay warm neutral; no decorative gradient fields.
- Any new color must be added here before use.

## 3. Typography

### Scale

| Level | Size | Weight | Line Height | Tracking | Usage |
|-------|------|--------|-------------|----------|-------|
| Display | 44px / 2.75rem | 650 | 1.08 | 0 | Site title on wide screens |
| H1 | 34px / 2.125rem | 650 | 1.15 | 0 | Page title |
| H2 | 26px / 1.625rem | 620 | 1.25 | 0 | Section headers |
| H3 | 20px / 1.25rem | 620 | 1.35 | 0 | Article titles |
| Body/lg | 18px / 1.125rem | 400 | 1.65 | 0 | Lead copy |
| Body | 16px / 1rem | 400 | 1.65 | 0 | Default text |
| Body/sm | 14px / 0.875rem | 400 | 1.5 | 0 | Secondary information |
| Caption | 12px / 0.75rem | 560 | 1.4 | 0.04em | Labels and metadata |
| Overline | 11px / 0.6875rem | 650 | 1.3 | 0.08em | Section labels |

### Font Stack

- Primary: Avenir Next, SF Pro Display, Helvetica Neue, Arial, sans-serif
- Mono: SF Mono, JetBrains Mono, Consolas, monospace
- Serif: Georgia, Times New Roman, serif

### Rules

- Body text never drops below 14px.
- Letter spacing stays non-negative.
- Mono text is only for metadata, code-like labels, and timestamps.

## 4. Spacing & Layout

### Base Unit

All spacing derives from a base of 4px.

| Token | Value | Usage |
|-------|-------|-------|
| --space-1 | 4px | Tight inline spacing |
| --space-2 | 8px | Compact gaps |
| --space-3 | 12px | Metadata groups |
| --space-4 | 16px | Default padding |
| --space-5 | 20px | Comfortable controls |
| --space-6 | 24px | Panel padding |
| --space-8 | 32px | Section inner spacing |
| --space-10 | 40px | Major content gaps |
| --space-12 | 48px | Page rhythm |
| --space-16 | 64px | First-screen spacing |

### Grid

- Max content width: 1120px
- Column system: one column on mobile, 12-column grid from 900px
- Breakpoints: sm 640px, md 768px, lg 1024px, xl 1280px

### Rules

- Page sections use full-width bands with constrained inner content.
- Article lists are dense but scannable; avoid oversized marketing cards.
- Fixed UI elements keep stable dimensions through explicit min-height or aspect-ratio.

## 5. Components

### Article Row

- Structure: anchor or article wrapper with metadata, title, summary, and topic chips.
- Variants: featured, compact.
- Spacing: --space-4 to --space-6.
- States: default, hover, focus.
- Accessibility: visible focus ring; title remains the primary link target.
- Motion: hover changes color and translate only.

### Topic Chip

- Structure: inline text label.
- Variants: Web, AI, Notes.
- Spacing: --space-2 horizontal, --space-1 vertical.
- States: static in scaffold.
- Accessibility: text label does not rely on color alone.
- Motion: none.

## 6. Motion & Interaction

### Timing

| Type | Duration | Easing | Usage |
|------|----------|--------|-------|
| Micro | 120ms | ease-out | Link hover and button press |
| Standard | 220ms | ease-in-out | Panel hover |
| Emphasis | 420ms | cubic-bezier(0.16, 1, 0.3, 1) | Initial content reveal |

### Rules

- Animate only transform and opacity.
- Every interactive element has hover and focus states.
- Respect prefers-reduced-motion by disabling non-essential animation.

## 7. Depth & Surface

### Strategy

Use borders-only.

| Type | Value | Usage |
|------|-------|-------|
| Default | 1px solid var(--border-default) | Panels and article rows |
| Subtle | 1px solid var(--border-subtle) | Dividers and secondary blocks |

No box-shadow is used in the scaffold.
