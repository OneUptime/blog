# Validation Summary: How to Bootstrap Flux CD with GitHub App Authentication

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Flux CD
- Flux CLI
- Flux source-controller GitRepository API
- Kubernetes Secrets
- GitHub Apps
- GitHub personal access tokens
- GitOps

## Sources Consulted
- Flux CLI `flux create secret githubapp` documentation: https://fluxcd.io/flux/cmd/flux_create_secret_githubapp/
- Flux GitRepository documentation, including GitHub App provider and secret fields: https://fluxcd.io/flux/components/source/gitrepositories/
- Flux bootstrap for GitHub documentation: https://fluxcd.io/flux/installation/bootstrap/github/
- Flux ImageUpdateAutomation documentation: https://fluxcd.io/flux/components/image/imageupdateautomations/
- Flux GitHub App bootstrap blog for Flux 2.5.0 context: https://fluxcd.io/blog/2025/04/flux-operator-github-app-bootstrap/
- GitHub Docs, authenticating as a GitHub App installation: https://docs.github.com/en/apps/creating-github-apps/authenticating-with-a-github-app/authenticating-as-a-github-app-installation
- GitHub Docs, REST API rate limits for GitHub App installations: https://docs.github.com/en/rest/using-the-rest-api/rate-limits-for-the-rest-api
- GitHub Docs, permissions required for GitHub Apps: https://docs.github.com/en/rest/authentication/permissions-required-for-github-apps

## Issues Found
- The post claimed GitHub Apps get higher API rate limits than PATs. GitHub App installation tokens have a 5,000 requests/hour minimum, can scale with installation size, and use 15,000 requests/hour for GitHub Enterprise Cloud organizations, so this is not universally higher than every PAT context. Changed the wording to "scalable rate limits."
- The GitHub App permissions section required Contents read/write "to push Flux manifests." `flux bootstrap github` still uses a PAT for repository creation/configuration and the initial manifest push, while source-controller only needs repository read access for normal reconciliation. Changed the permission guidance to Contents read-only for standard reconciliation, with read/write only when Flux image automation will push commits.
- The troubleshooting section repeated the same read/write requirement. Updated it to require Contents read access, or read/write when Flux image automation pushes commits.
- The summary described automatic token rotation as a key benefit. Installation tokens are short-lived and Flux obtains new tokens as needed, so the wording was tightened to "short-lived installation tokens."

## Review Notes
The `flux create secret githubapp` command is marked as preview in the official Flux CLI documentation. The command syntax, GitRepository `provider: github` field, secret key names, and the Flux 2.5.0+ version claim align with current official documentation.
