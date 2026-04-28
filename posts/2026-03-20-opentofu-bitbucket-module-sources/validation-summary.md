# Validation Summary: How to Use Bitbucket Module Sources in OpenTofu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTofu (module sources)
- Bitbucket Cloud (Atlassian)
- Git (HTTPS and SSH authentication)
- Bitbucket Pipelines (CI/CD)
- HCL (Terraform/OpenTofu configuration language)

## Sources Consulted
- [OpenTofu Module Sources documentation](https://opentofu.org/docs/language/modules/sources/)
- [Bitbucket Cloud transitions to API tokens — Atlassian blog](https://www.atlassian.com/blog/bitbucket/bitbucket-cloud-transitions-to-api-tokens-enhancing-security-with-app-password-deprecation)
- [Using API tokens — Bitbucket Cloud / Atlassian Support](https://support.atlassian.com/bitbucket-cloud/docs/using-api-tokens/)
- [Using access tokens for a repository — Bitbucket Cloud](https://support.atlassian.com/bitbucket-cloud/docs/using-access-tokens/)
- [Atlassian community: App password deprecation phase 2](https://community.atlassian.com/forums/Bitbucket-questions/quot-On-September-9-2025-the-creation-of-app-passwords-will-be/qaq-p/3042379)

## Issues Found

1. **App Passwords were deprecated.** The original "App Passwords (HTTPS)" section instructed readers to "Create an App Password in Bitbucket: Settings > Security > App passwords" and used a `BITBUCKET_APP_PASSWORD` env variable. Atlassian disabled new App Password creation on September 9, 2025, and all existing App Passwords stop working on June 9, 2026. For a post dated March 2026 (and reviewed in April 2026) this advice is no longer functional. I rewrote this section as "API Tokens (HTTPS)", added a one-line note about the deprecation, pointed to the correct token creation URL (`https://id.atlassian.com/manage-profile/security/api-tokens`), and changed the git `insteadOf` invocation to use the documented static username `x-bitbucket-api-token-auth` with a `BITBUCKET_API_TOKEN` variable. The Step-by-Step list and Conclusion were also updated to reference API tokens instead of App Passwords.

2. **Shorthand limitation for private repositories was missing.** The OpenTofu documentation explicitly states: "This shorthand works only for public repositories, because OpenTofu must access the BitBucket API to learn if the given repository uses Git or Mercurial." The original post implied that the `bitbucket.org/<workspace>/<repo>` shorthand worked for private repos as long as authentication was configured. I added a clarifying sentence to the Introduction noting the public-only limitation and pointing readers to explicit Git source URLs (`git::ssh://git@bitbucket.org/...` or `git::https://bitbucket.org/...`) for private repositories, and adjusted the Conclusion to match.

## Review Notes

- The HCL `module` block syntax, the `//subdirectory` separator, and the `?ref=` query parameter are all correct and match OpenTofu's generic Git source semantics.
- The Bitbucket Pipelines snippet using `x-token-auth:${BITBUCKET_TOKEN}` is correct for repository/workspace/project access tokens (a separate, still-supported mechanism distinct from the deprecated App Passwords). It was left unchanged. Note that `BITBUCKET_TOKEN` is a user-defined repository variable here, not a Pipelines built-in.
- The SSH key path "Account > SSH keys" is consistent with older Bitbucket UI labels; the current path is "Personal Bitbucket settings > SSH keys", but both are easily discoverable. Left as-is to avoid scope creep.
- Bitbucket Cloud dropped Mercurial support in 2020, so the OpenTofu detector's Git/Mercurial branch is effectively Git-only on bitbucket.org today. The post does not mention Mercurial, so no change was needed.
- The section heading "In CI/CD (GitHub Actions or Bitbucket Pipelines)" mentions GitHub Actions but the snippet only shows Bitbucket Pipelines. This is a minor stylistic issue, not a technical one, so it was left unchanged.
