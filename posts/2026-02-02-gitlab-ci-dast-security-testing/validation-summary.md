# Validation Summary: How to Configure GitLab CI DAST Security Testing

## Status
validated

## Post Type
Tutorial / How-to guide

## Technologies Covered
- GitLab CI/CD
- GitLab DAST (browser-based analyzer, formerly proxy-based ZAP analyzer)
- GitLab API Security Testing (formerly DAST API)
- OWASP ZAP (referenced historically)
- OpenAPI / GraphQL API scanning
- jq, curl (used in helper scripts)

## Sources Consulted
- GitLab DAST overview: https://docs.gitlab.com/user/application_security/dast/
- GitLab DAST browser-based analyzer: https://docs.gitlab.com/user/application_security/dast/browser/
- DAST browser-based variables reference: https://docs.gitlab.com/user/application_security/dast/browser/configuration/variables/
- DAST browser-based authentication: https://docs.gitlab.com/user/application_security/dast/browser/configuration/authentication/
- DAST enabling the analyzer: https://docs.gitlab.com/user/application_security/dast/browser/configuration/enabling_the_analyzer/
- GitLab API Security Testing: https://docs.gitlab.com/user/application_security/api_security_testing/
- API Security Testing variables: https://docs.gitlab.com/user/application_security/api_security_testing/configuration/variables/

## Issues Found
The post was written using the legacy proxy-based DAST analyzer (deprecated in GitLab 16.9, removed in GitLab 17.3). Nearly every CI variable, template reference, and a key technical claim required correction. Fixes applied:

1. **Engine description**: "GitLab includes a built-in DAST analyzer powered by OWASP ZAP" was wrong. The current browser-based analyzer is proprietary. Clarified that the legacy ZAP-based proxy analyzer was removed in GitLab 17.3.
2. **Template paths**: `DAST.gitlab-ci.yml` → `Security/DAST.gitlab-ci.yml` (canonical path). `DAST-API.gitlab-ci.yml` → `Security/API-Security.gitlab-ci.yml` (renamed in GitLab 17.1).
3. **Target URL variable**: `DAST_WEBSITE` → `DAST_TARGET_URL`.
4. **Full scan variable**: `DAST_FULL_SCAN_ENABLED` → `DAST_FULL_SCAN`.
5. **Browser-scan toggle**: removed `DAST_BROWSER_SCAN` (no longer exists; browser is the only/default analyzer).
6. **Crawl timeout**: `DAST_SPIDER_MINS` (integer minutes) → `DAST_CRAWL_TIMEOUT` (duration string like `30m`).
7. **Auth field selectors**: `DAST_USERNAME_FIELD`/`DAST_PASSWORD_FIELD`/`DAST_SUBMIT_FIELD` → `DAST_AUTH_USERNAME_FIELD`/`DAST_AUTH_PASSWORD_FIELD`/`DAST_AUTH_SUBMIT_FIELD`.
8. **Auth verification**: `DAST_AUTH_VERIFICATION_URL` → `DAST_AUTH_SUCCESS_IF_URL`.
9. **Credentials**: `DAST_USERNAME`/`DAST_PASSWORD` → `DAST_AUTH_USERNAME`/`DAST_AUTH_PASSWORD`.
10. **HTTP Basic auth**: `DAST_AUTH_TYPE: "basic"` → `DAST_AUTH_TYPE: "basic-digest"`.
11. **URL exclusion**: `DAST_EXCLUDE_URLS` → `DAST_SCOPE_EXCLUDE_URLS` (now regex patterns).
12. **Check exclusion**: `DAST_EXCLUDE_RULES` → `DAST_CHECKS_TO_EXCLUDE` (rule ID format also changed away from ZAP IDs like 10020).
13. **Crawl scope limits**: `DAST_MAX_DEPTH` → `DAST_CRAWL_MAX_DEPTH`; `DAST_MAX_URLS_PER_VULNERABILITY` (never existed) → `DAST_CRAWL_MAX_ACTIONS`.
14. **Browser-scan tuning vars**: removed nonexistent `DAST_BROWSER_ACTION_TIMEOUT`/`DAST_BROWSER_PAGE_TIMEOUT`/`DAST_BROWSER_STABILITY_TIMEOUT`; replaced with the real `DAST_PAGE_DOM_READY_TIMEOUT`, `DAST_PAGE_READY_AFTER_NAVIGATION_TIMEOUT`, and `DAST_CRAWL_WORKER_COUNT`.
15. **Paths file**: `DAST_PATHS_FILE` → `DAST_TARGET_PATHS_FILE` (and switched to paths rather than full URLs, which is what the variable expects).
16. **Availability timeout**: replaced `DAST_TARGET_AVAILABILITY_TIMEOUT` with the real `DAST_ACTIVE_SCAN_TIMEOUT` in the timeout-tuning example.
17. **Debug logging**: replaced nonexistent `DAST_DEBUG`/`DAST_AUTH_TIMEOUT` with `DAST_AUTH_REPORT: "true"` (the documented way to debug authentication).
18. **API Security variables**: `DAST_API_OPENAPI` → `APISEC_OPENAPI`, `DAST_API_GRAPHQL` → `APISEC_GRAPHQL`, `DAST_API_TARGET_URL` → `APISEC_TARGET_URL`, `DAST_API_HTTP_USERNAME`/`DAST_API_HTTP_PASSWORD` → `APISEC_HTTP_USERNAME`/`APISEC_HTTP_PASSWORD`, `DAST_API_GRAPHQL_SCHEMA` → `APISEC_GRAPHQL_SCHEMA`, `DAST_API_HTTP_HEADERS` → `APISEC_REQUEST_HEADERS`. Renamed `dast_api` job override to `apisec`.
19. **Analyzer image version**: `registry.gitlab.com/security-products/dast:4` → `:5` (DAST v4 → v5 in GitLab 17.0).
20. **Parallel scanning example**: removed the broken `dast_api` parallel job that mixed DAST and API-Security variables; kept the frontend and admin parallel-job examples.

## Review Notes
- The article generally targets a GitLab 17.x+ audience now. If readers are on older self-managed versions still running the proxy-based analyzer, the variable names will not apply.
- `DAST_AUTH_USERNAME` / `DAST_AUTH_PASSWORD` should always be defined as masked CI/CD variables, not in YAML — the post already calls this out and the fixes preserve that guidance.
- The "Vulnerability Dismissal" API call (`POST .../vulnerabilities/:id/dismiss`) reflects an older API style; the modern approach uses GraphQL mutations on the security dashboard, but the REST endpoint still works on current GitLab versions, so it was left as-is to avoid scope creep beyond technical corrections.
- The `DAST_CHECKS_TO_EXCLUDE` example uses placeholder IDs (`16.1,16.2`) since the new analyzer uses GitLab's own check IDs rather than the old ZAP plugin IDs (`10020`, etc.) — readers should consult the browser-based checks reference for actual IDs.
- The article still mentions `OWASP ZAP` once in a parenthetical historical note; this is intentional and accurate as background context, not as a current implementation claim.
