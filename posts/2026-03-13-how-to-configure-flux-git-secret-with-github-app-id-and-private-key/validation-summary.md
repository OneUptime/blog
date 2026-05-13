# Validation Summary: How to Configure Flux Git Secret with GitHub App ID and Private Key

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Flux CD
- Kubernetes
- Flux Source Controller
- GitRepository custom resources
- Kubernetes Secrets
- GitHub Apps
- GitHub installation access tokens
- kubectl

## Sources Consulted
- Flux GitRepository documentation: https://fluxcd.io/flux/components/source/gitrepositories/
- Flux `flux create secret githubapp` CLI documentation: https://fluxcd.io/flux/cmd/flux_create_secret_githubapp/
- Flux release and Kubernetes support documentation: https://fluxcd.io/flux/releases/
- Flux Source Controller GitRepository API source: https://raw.githubusercontent.com/fluxcd/source-controller/main/api/v1/gitrepository_types.go
- GitHub Docs, authenticating as a GitHub App installation: https://docs.github.com/en/enterprise-cloud@latest/apps/creating-github-apps/authenticating-with-a-github-app/authenticating-as-a-github-app-installation
- GitHub Docs, managing private keys for GitHub Apps: https://docs.github.com/en/apps/creating-github-apps/authenticating-with-a-github-app/managing-private-keys-for-github-apps
- GitHub Docs, REST API rate limits: https://docs.github.com/en/rest/using-the-rest-api/rate-limits-for-the-rest-api

## Issues Found
- The `GitRepository` examples omitted `spec.provider: github`. Flux's GitRepository API defaults `provider` to `generic`, and the official Flux documentation describes the `github` provider as the GitHub App authentication mode. Added `provider: github` to all GitRepository examples and updated the explanatory sentence accordingly.
- The prerequisites stated "A Kubernetes cluster (v1.20 or later)", which is outdated for current Flux releases. Flux supports Kubernetes versions supported upstream and does not guarantee new Flux releases on EOL Kubernetes versions. Reworded this prerequisite to require a Kubernetes version supported by the Flux release in use.

## Review Notes
- The Kubernetes Secret key names (`githubAppID`, `githubAppInstallationID`, and `githubAppPrivateKey`) match Flux documentation. Flux also supports `githubAppInstallationOwner` as an alternative to `githubAppInstallationID`, but the post's installation ID approach is valid.
- The GitHub App private key PEM format, installation token behavior, and one-hour token lifetime are consistent with GitHub documentation.
- The GitHub App installation rate limit starts at 5,000 requests per hour and may scale higher depending on the installation context; the post's troubleshooting guidance is acceptable for a baseline explanation.
