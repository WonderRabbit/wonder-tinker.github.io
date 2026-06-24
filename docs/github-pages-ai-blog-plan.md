# GitHub Pages Web & AI 블로그 설치 및 운영 계획

작성일: 2026-06-24
대상 저장소: `WonderRabbit/wonder-tinker.github.io`
권장 결론: `Astro + MDX + GitHub Actions Pages 배포`

## 1. 결론

이 저장소는 원격이 `https://github.com/WonderRabbit/wonder-tinker.github.io`로 잡혀 있고 아직 커밋과 사이트 스캐폴드가 없는 초기 상태다. 따라서 마이그레이션이 아니라 첫 커밋에서 사이트 계약을 확정하는 방식으로 시작해야 한다.

권장 스택은 `Astro`다. 이유는 GitHub Pages 공식 배포 가이드가 있고, Markdown/MDX 콘텐츠, typed content collections, RSS, sitemap, 이미지 처리, 정적 빌드가 블로그 운영 요구와 잘 맞기 때문이다. GitHub Pages는 정적 HTML/CSS/JS를 저장소에서 서빙하거나 빌드 후 배포하는 서비스이고, 비-Jekyll 빌드나 전용 산출물 브랜치를 피하려면 GitHub Actions 배포가 권장된다. [S1], [S2], [S6]

`Jekyll`은 가장 GitHub-native인 단순 선택지지만 Windows 비공식 지원, 플러그인 제한, 오래된 authoring 모델이 있다. `Hugo`는 RSS/sitemap/이미지 처리 같은 콘텐츠 기능이 강하지만 Go/Hugo 툴체인을 별도로 운용해야 한다. `Next.js static export`는 가능하지만 순수 블로그에는 앱 프레임워크 복잡도가 크고, 서버가 필요한 기능은 static export에서 지원되지 않는다. [S5], [S14], [S15], [S16]

## 2. 추천 아키텍처

```text
.
├── .github/workflows/deploy.yml
├── astro.config.mjs
├── package.json
├── src/
│   ├── content.config.ts
│   ├── content/
│   │   ├── posts/
│   │   ├── pages/
│   │   └── ai-notes/
│   ├── layouts/
│   ├── pages/
│   │   ├── index.astro
│   │   ├── blog/[...slug].astro
│   │   ├── rss.xml.ts
│   │   └── 404.astro
│   └── components/
├── public/
│   ├── robots.txt
│   └── favicon.svg
└── docs/
    └── editorial-policy.md
```

핵심 설계 원칙:

- `src/content/posts/`: 공개 블로그 글. `title`, `description`, `published`, `updated`, `tags`, `draft`, `aiAssisted`, `sources`, `modelNotes` 같은 frontmatter를 typed schema로 강제한다. Astro content collections는 Markdown/MDX 콘텐츠를 스키마로 검증하고 TypeScript 타입 안정성을 제공한다. [S6]
- `src/content/ai-notes/`: 프롬프트 요약, 모델 버전, 실험 조건, 검증 로그 등 글의 근거 자료를 공개 가능한 수준으로 정리한다.
- `src/pages/rss.xml.ts`: 게시된 글 컬렉션에서 RSS를 생성한다. Astro는 `@astrojs/rss`로 content collections 기반 피드를 만드는 공식 레시피를 제공한다. [S8]
- `@astrojs/sitemap`: canonical URL 목록을 빌드에서 자동 생성한다. [S7]
- `src/pages/404.astro`: GitHub Pages의 정적 404 페이지로 사용한다.

이 저장소의 최종 GitHub Pages 도메인은 `https://wonder-tinker.github.io/`다. 따라서 root user/org Pages 형태로 배포되도록 `site: "https://wonder-tinker.github.io"`를 사용하고 `base`는 설정하지 않는다. owner 하위 project Pages 경로는 이 저장소의 배포 도메인이 아니다. [S1], [S4], [S17]

## 3. 설치 계획

1. Astro 프로젝트 생성

```bash
npm create astro@latest -- --template blog --typescript strict
```

빈 저장소 루트에 생성한다. 이미 `.git`이 있으므로 생성 도구가 새 git 저장소를 만들지 않게 옵션을 확인한다.

2. 필수 통합 추가

```bash
npx astro add mdx
npx astro add sitemap
npm install @astrojs/rss
```

3. `astro.config.mjs` 기준값

```js
import { defineConfig } from "astro/config";
import mdx from "@astrojs/mdx";
import sitemap from "@astrojs/sitemap";

export default defineConfig({
  site: "https://wonder-tinker.github.io",
  trailingSlash: "always",
  integrations: [mdx(), sitemap()],
});
```

도메인이 바뀌면 `site`를 최종 URL로 바꾸되, root Pages 배포에서는 `base`를 추가하지 않는다.

4. 콘텐츠 스키마 초안

```ts
import { defineCollection, z } from "astro:content";
import { glob } from "astro/loaders";

const posts = defineCollection({
  loader: glob({ pattern: "**/*.{md,mdx}", base: "./src/content/posts" }),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    published: z.date(),
    updated: z.date().optional(),
    draft: z.boolean().default(false),
    tags: z.array(z.string()).default([]),
    aiAssisted: z.boolean().default(false),
    modelNotes: z.string().optional(),
    sources: z.array(z.string().url()).default([]),
  }),
});

const pages = defineCollection({
  loader: glob({ pattern: "**/*.{md,mdx}", base: "./src/content/pages" }),
  schema: z.object({
    title: z.string(),
    description: z.string(),
  }),
});

const aiNotes = defineCollection({
  loader: glob({ pattern: "**/*.{md,mdx}", base: "./src/content/ai-notes" }),
  schema: z.object({
    title: z.string(),
    model: z.string(),
    created: z.date(),
    relatedPost: z.string().optional(),
    sources: z.array(z.string().url()).default([]),
  }),
});

export const collections = { posts, pages, aiNotes };
```

5. GitHub Actions 배포

GitHub Pages 설정에서 `Build and deployment > Source`를 `GitHub Actions`로 선택한다. 워크플로는 `build -> upload-pages-artifact -> deploy-pages` 구조로 둔다. Pages 배포 작업에는 최소 권한으로 `contents: read`, `pages: write`, `id-token: write`를 부여한다. [S2], [S3]

```yaml
name: Deploy to GitHub Pages

on:
  push:
    branches: [main]
  workflow_dispatch:

permissions:
  contents: read
  pages: write
  id-token: write

concurrency:
  group: pages
  cancel-in-progress: true

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v6
      - name: Build with Astro
        uses: withastro/action@v6
        with:
          node-version: 24

  deploy:
    needs: build
    runs-on: ubuntu-latest
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    steps:
      - id: deployment
        uses: actions/deploy-pages@v5
```

## 4. 운영 베스트 프랙티스

### 콘텐츠 작성

- 글은 `draft: true`로 시작하고 PR에서 리뷰 후 `draft: false`로 공개한다.
- AI가 관여한 글은 `aiAssisted: true`와 `modelNotes`를 둔다.
- 기술 주장에는 가능한 1차 출처를 붙인다.
- 실험/벤치마크 글은 실행 환경, 버전, 명령, 원본 출력 요약을 함께 남긴다.
- 공개 글에는 독자가 놓치기 어려운 방식으로 AI 사용 사실을 밝힌다. OpenAI 출판 정책은 생성물을 공유할 때 수동 검토, 작성자/회사 귀속, AI 생성 여부의 명확한 표시를 요구한다. [S12]
- Google Search Central은 생성 AI 콘텐츠도 정확성, 품질, 관련성을 충족해야 하며, 대량 자동 생성으로 사용자 가치가 없는 페이지를 만드는 것은 spam policy 문제가 될 수 있다고 설명한다. [S11]

### SEO와 피드

- sitemap은 `@astrojs/sitemap`으로 자동 생성하고 Search Console에 제출한다. Google은 sitemap이 크거나 새롭거나 미디어가 많은 사이트의 크롤링에 도움이 된다고 설명한다. [S9]
- RSS는 `/rss.xml`로 제공하고 HTML `<head>`에 autodiscovery 링크를 넣는다. [S8]
- 글 페이지에는 `BlogPosting` 또는 `Article` JSON-LD를 넣고, visible date와 `datePublished`/`dateModified`를 맞춘다. [S10]
- URL은 `/blog/<slug>/`처럼 사람이 읽을 수 있게 유지한다.
- 태그/아카이브 페이지는 색인할지 명시적으로 결정한다.

### 접근성

- WCAG 2.2 AA를 기본 목표로 삼는다.
- 키보드 접근, visible focus, 충분한 대비, 의미 있는 alt text, 구조적인 heading을 템플릿 수준에서 보장한다. [S18]
- 코드 블록은 줄바꿈/스크롤/복사 동작이 모바일에서도 깨지지 않게 확인한다.

### 보안과 배포

- GitHub Actions 권한은 워크플로 또는 job 단위로 최소화한다. GitHub는 `GITHUB_TOKEN`에 필요한 최소 권한만 부여하라고 권장한다. [S3]
- `pull_request_target`는 쓰지 않는다. 외부 PR을 체크아웃하는 privileged workflow는 보안 위험이 크다. [S13]
- 커스텀 도메인은 Pages 설정에서 추가하기 전에 GitHub custom domain verification을 먼저 한다. GitHub는 takeover 방지를 위해 도메인 검증을 권장한다. [S4]
- custom domain은 가능하면 `www` subdomain을 기본으로 둔다. GitHub는 `www` subdomain이 IP 변경에 영향받지 않아 더 안정적이라고 설명한다. [S4]
- DNS 변경과 HTTPS 인증서 준비에는 최대 24시간 지연을 운영 일정에 반영한다. [S4]

### 분석과 개인정보

- 초기에는 분석 도구 없이 Search Console만 연결한다.
- 방문 통계가 필요하면 cookieless 분석 도구를 우선 검토한다.
- 수집 항목, 보존 기간, opt-out 가능 여부를 `docs/privacy.md` 또는 사이트 페이지에 문서화한다.

## 5. 운영 루틴

주간:

- `npm run build`로 정적 빌드 확인
- broken link 체크
- 신규 글의 출처 URL 재확인
- Search Console crawl/index issue 확인

월간:

- dependency update PR 생성 및 build 검증
- 오래된 모델명/가격/성능/정책 주장 재검토
- draft와 공개 글의 frontmatter schema 위반 여부 확인
- sitemap/RSS/JSON-LD 샘플 검증

릴리스 전:

- `npm ci`
- `npm run build`
- `npm run preview`
- 홈, 글 목록, 글 상세, RSS, sitemap, 404 수동 확인
- PR diff에서 생성물/비밀/개인정보 유출 확인

## 6. 후보 스택 비교표

| 항목 | Astro | Jekyll | Hugo | Next.js static export |
|---|---:|---:|---:|---:|
| GitHub Pages 적합성 | 5 | 5 | 4 | 3 |
| Markdown/MDX authoring | 5 | 3 | 4 | 4 |
| AI/실험 콘텐츠 확장성 | 5 | 3 | 4 | 4 |
| 배포 단순성 | 4 | 5 | 4 | 3 |
| SEO/RSS/sitemap | 4 | 3 | 5 | 4 |
| 장기 유지보수 | 4 | 3 | 4 | 3 |
| 총점 | 27 | 22 | 25 | 21 |

점수 기준: 5점은 이 저장소의 GitHub Pages AI 기술 블로그 요구에 매우 잘 맞음, 3점은 가능하지만 보완 작업이 필요함, 1점은 부적합함.

최종 권장 순위:

1. Astro: 기본 선택. 현대적 authoring, content schema, MDX, Pages 배포 균형이 가장 좋다.
2. Hugo: 콘텐츠 기능과 빌드 속도를 중시하면 강한 대안.
3. Jekyll: 가장 단순한 GitHub-native 선택지지만 확장성과 DX가 낮다.
4. Next.js static export: React 앱으로 확장할 계획이 있을 때만 선택한다.

## 7. 첫 마일스톤

첫 PR 목표:

- Astro blog scaffold
- `src/content.config.ts`의 `posts`, `pages`, `aiNotes` schema
- 홈, 글 목록, 글 상세, 404
- RSS, sitemap, robots.txt
- GitHub Pages deploy workflow
- `docs/editorial-policy.md`, `docs/privacy.md`
- 샘플 글 1개: “Wonder Tinker 시작 기록” at `https://wonder-tinker.github.io/blog/wonder-tinker-start/`

완료 기준:

- `npm ci` 성공
- `npm run build` 성공
- `npm run preview`에서 홈/글/RSS/sitemap/404 확인
- 로컬 workflow 정적 검증이 성공하고, push/deploy 권한이 있는 후속 작업에서 Pages 설정의 Source를 `GitHub Actions`로 지정할 수 있음

## Sources

- [S1] GitHub Docs, “What is GitHub Pages?” https://docs.github.com/en/pages/getting-started-with-github-pages/what-is-github-pages
- [S2] GitHub Docs, “Configuring a publishing source for your GitHub Pages site” https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site
- [S3] GitHub Docs, “Using custom workflows with GitHub Pages” https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages
- [S4] GitHub Docs, “About custom domains and GitHub Pages” https://docs.github.com/en/pages/configuring-a-custom-domain-for-your-github-pages-site/about-custom-domains-and-github-pages
- [S5] GitHub Docs, “About GitHub Pages and Jekyll” https://docs.github.com/en/pages/setting-up-a-github-pages-site-with-jekyll/about-github-pages-and-jekyll
- [S6] Astro Docs, “Content collections” https://docs.astro.build/en/guides/content-collections/
- [S7] Astro Docs, “@astrojs/sitemap” https://docs.astro.build/en/guides/integrations-guide/sitemap/
- [S8] Astro Docs, “Add an RSS feed” https://docs.astro.build/en/recipes/rss/
- [S9] Google Search Central, “What Is a Sitemap” https://developers.google.com/search/docs/crawling-indexing/sitemaps/overview
- [S10] Schema.org, “BlogPosting” https://schema.org/BlogPosting
- [S11] Google Search Central, “Google Search's guidance on using generative AI content on your website” https://developers.google.com/search/docs/fundamentals/using-gen-ai-content
- [S12] OpenAI, “Sharing & publication policy” https://openai.com/policies/sharing-publication-policy/
- [S13] GitHub Docs, “Secure use reference” https://docs.github.com/en/actions/reference/security/secure-use
- [S14] Next.js Docs, “Static Exports” https://nextjs.org/docs/app/guides/static-exports
- [S15] Hugo Docs, “Host on GitHub Pages” https://gohugo.io/host-and-deploy/host-on-github-pages/
- [S16] Jekyll Docs, “GitHub Pages” https://jekyllrb.com/docs/github-pages/
- [S17] Astro Docs, “Deploy your Astro Site to GitHub Pages” https://docs.astro.build/en/guides/deploy/github/
- [S18] W3C WAI, “Accessibility Principles” https://www.w3.org/WAI/fundamentals/accessibility-principles/
