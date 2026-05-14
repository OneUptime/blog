# Validation Summary: How to Configure GitRepository with GitHub App Authentication in Flux

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Flux CD
- Flux source-controller
- Kubernetes GitRepository custom resources
- Kubernetes Secrets
- GitHub Apps
- GitHub Enterprise Server
- kubectl
- Flux CLI

## Sources Consulted
- Flux GitRepository documentation: https://fluxcd.io/flux/components/source/gitrepositories/
- Flux v2.5 release announcement: https://fluxcd.io/blog/2025/02/flux-v2.5.0/
- Flux CLI `flux get sources git` documentation: https://fluxcd.io/flux/cmd/flux_get_sources_git/
- GitHub Docs, authenticating as a GitHub App installation: https://docs.github.com/enterprise-cloud@latest/apps/creating-github-apps/authenticating-with-a-github-app/authenticating-as-a-github-app-installation
- GitHub Docs, differences between GitHub Apps and OAuth apps: https://docs.github.com/en/apps/oauth-apps/building-oauth-apps/differences-between-github-apps-and-oauth-apps
- GitHub Docs, rate limits for GitHub Apps: https://docs.github.com/developers/apps/rate-limits-for-github-apps
- GitHub REST API rate limit documentation: https://docs.github.com/rest/using-the-rest-api/rate-limits-for-the-rest-api

## Issues Found
- The prerequisites stated Flux CD v2.1.0 or later, but Flux GitHub App authentication for Git repositories was introduced in Flux v2.5.0. Updated the prerequisite to Flux CD v2.5.0 or later.
- The GitRepository examples referenced a GitHub App Secret but omitted `spec.provider: github`. Flux documents GitHub App authentication under the `github` provider, so both GitHub.com and GitHub Enterprise Server examples now include `provider: github`.
- The introduction and rate-limit comparison described GitHub Apps as having a higher flat API rate limit of 5,000 requests per hour per installation compared with 5,000 per hour for personal access tokens. GitHub documents 5,000/hour as the minimum for installation access tokens, with scaling depending on installation and plan. Updated the wording to avoid an inaccurate flat comparison.

## Review Notes
- The Secret key names `githubAppID`, `githubAppInstallationID`, `githubAppPrivateKey`, and optional `githubAppBaseURL` match Flux documentation.
- Flux also supports `githubAppInstallationOwner` as an alternative to `githubAppInstallationID`; exactly one of those two fields should be used. The post's examples use `githubAppInstallationID`, which is valid.
- The `flux get sources git my-app -n flux-system` command and Kubernetes Secret/YAML examples are otherwise consistent with the referenced documentation.
