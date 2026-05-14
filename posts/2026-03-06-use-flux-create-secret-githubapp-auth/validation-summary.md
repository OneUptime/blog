# Validation Summary: How to Use flux create secret githubapp for GitHub App Auth

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Flux CLI
- Flux source-controller GitRepository resources
- GitHub Apps
- Kubernetes Secrets
- GitHub Enterprise Server
- SOPS
- kubectl

## Sources Consulted
- Flux CLI documentation for `flux create secret githubapp`: https://fluxcd.io/flux/cmd/flux_create_secret_githubapp/
- Flux CLI documentation for `flux create source git`: https://fluxcd.io/flux/cmd/flux_create_source_git/
- Flux GitRepository documentation, including GitHub App Secret fields: https://fluxcd.io/flux/components/source/gitrepositories/
- Flux bootstrap for GitHub documentation: https://fluxcd.io/flux/installation/bootstrap/github/
- Archived Flux v2.5 `flux create secret githubapp` documentation: https://v2-5.docs.fluxcd.io/flux/cmd/flux_create_secret_githubapp/
- GitHub Docs for GitHub App private keys: https://docs.github.com/en/apps/creating-github-apps/authenticating-with-a-github-app/managing-private-keys-for-github-apps
- GitHub Docs for GitHub App installation access tokens: https://docs.github.com/rest/apps/apps#create-an-installation-access-token-for-an-app

## Issues Found
- The post used `--app-private-key-file`, but the Flux CLI command is `--app-private-key`. Updated all `flux create secret githubapp` examples to use the documented flag.
- The prerequisites said Flux CLI v2.0 or later. The archived Flux documentation confirms `flux create secret githubapp` in v2.5, so the prerequisite was changed to Flux CLI v2.5 or later.
- The bootstrap section implied `flux bootstrap github --token-auth=false` uses GitHub App authentication. Official Flux bootstrap documentation says that mode configures SSH deploy-key authentication; it does not accept GitHub App credentials. Replaced the command with a note to bootstrap first and then update the generated `GitRepository` to use the GitHub App Secret.
- The Secret verification example expected `githubAppBaseURL` for a basic GitHub.com secret. Flux documents `githubAppBaseURL` as optional and required only for GitHub Enterprise Server, so the expected keys were corrected and a GHES note was added.

## Review Notes
The `flux create secret githubapp` command is marked as preview in the official Flux CLI documentation, so future Flux releases may change the command surface. The GitHub App installation-owner flow is also available in newer Flux versions, but the installation-ID based examples in this post remain valid.
