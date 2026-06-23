# Validation Summary: How to Implement CI/CD Pipelines for React with GitHub Actions

## Status
validated

## Post Type
Tutorial / Guide (step-by-step CI/CD pipeline construction with full workflow YAML examples)

## Technologies Covered
- GitHub Actions (workflows, jobs, matrix builds, concurrency, reusable workflows, environments, OIDC)
- React (Vite-based build, Vitest/Jest testing)
- Playwright (E2E and smoke testing)
- Chromatic / Storybook (visual regression)
- Turborepo (monorepo caching)
- AWS S3 + CloudFront (deployment, invalidation, versioned rollback)
- Vercel, Netlify, GitHub Pages (alternative deploy targets)
- Docker / GitHub Container Registry (Buildx, build-push-action, metadata-action)
- CodeQL, npm audit, license-checker (security/compliance scanning)
- Slack, OneUptime webhooks (notifications)

## Sources Consulted
- GitHub Actions billing & usage docs — https://docs.github.com/en/actions/concepts/billing-and-usage (confirmed public repos get unlimited standard-runner minutes; 2,000/month applies to private repos on Free plan)
- actions/checkout releases — https://github.com/actions/checkout/releases (v6 valid current major; v7 latest)
- actions/setup-node releases — https://github.com/actions/setup-node/releases (v6 is latest major, Node 24 runtime)
- actions/cache (v5 branch) — https://github.com/actions/cache/tree/v5 (v5 released, Node 24, cache service v2)
- actions/upload-artifact / download-artifact — https://github.com/actions/upload-artifact (v4 still GA and supported; v7 latest)
- github/codeql-action — https://github.com/github/codeql-action/releases and https://github.com/github/codeql-action/issues/3271 (v4 released Oct 2025, Node 24; v3 deprecation Dec 2026 — v4 reference is correct and current)
- General marketplace/version checks for codecov-action@v5, github-script@v7, slack-github-action@v2, docker/build-push-action@v6, aws-actions/configure-aws-credentials@v4, amondnet/vercel-action@v25, nwtgck/actions-netlify@v3, actions/configure-pages@v4, actions/deploy-pages@v4, actions/upload-pages-artifact@v3 — all valid, non-deprecated versions

## Issues Found
1. **Incorrect free-tier claim** — The post stated "Free tier: 2,000 minutes/month for public repositories." This is wrong: GitHub Actions standard runners are free and **unlimited** for public repositories. The 2,000 minutes/month figure is the allowance for **private** repositories on the Free plan. Changed the bullet to: "Unlimited minutes for public repositories (private repos get 2,000 minutes/month on the Free plan)."

## Review Notes
- **Action versions are all current and consistent.** `actions/checkout@v6`, `actions/setup-node@v6`, `actions/cache@v5`, and `github/codeql-action@v4` are all valid latest/near-latest majors. `actions/upload-artifact@v4` and `actions/download-artifact@v4` are slightly behind the latest (v7 exists) but remain fully GA-supported, and the upload/download majors are correctly matched (v4 artifacts require matching major versions) — no change needed.
- **`npm run test -- --coverage --watchAll=false`** — `--watchAll` is a Jest/Create-React-App flag, not a Vitest flag (Vitest uses `--run` to disable watch mode). Since the project structure shown uses `vitest.config.ts`, a purist Vitest setup would prefer `--run`. However, the command is invoked through the `npm run test` script indirection (the post's summary table explicitly says "Jest/Vitest"), so this is valid for a Jest-based `test` script and harmless otherwise. Left as-is; flagged for awareness.
- Separately caching `node_modules` via `actions/cache` *in addition to* `setup-node`'s built-in `cache: 'npm'` (Part 3 "Aggressive Dependency Caching") is somewhat redundant and can be fragile across runner image changes; the npm cache + `npm ci` is usually sufficient. Not incorrect, just an optimization worth reconsidering.
- The Vite `preview` + `sleep 5` pattern for E2E is functional but timing-fragile; a wait-on-port utility (e.g. `wait-on http://localhost:4173`) would be more robust. Not an error.
- OIDC deployment, zero-downtime S3 ordering (assets before HTML), CloudFront invalidation, and S3-versioned rollback logic are all technically sound and follow current AWS/GitHub best practices.
