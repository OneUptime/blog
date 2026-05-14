# Validation Summary: How to Configure Flux Notification Provider for GitHub Commit Status

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Flux CD notification-controller
- Flux Provider and Alert custom resources
- Kubernetes Secrets
- GitHub commit statuses
- GitHub personal access tokens and GitHub Apps
- Flux CLI

## Sources Consulted
- Flux Providers documentation: https://fluxcd.io/flux/components/notification/providers/
- Flux Alerts documentation: https://fluxcd.io/flux/components/notification/alerts/
- Flux Notification API reference v1beta3: https://fluxcd.io/flux/components/notification/api/v1beta3/
- Flux Notification API reference v1: https://fluxcd.io/flux/components/notification/api/v1/
- Flux CLI `flux reconcile kustomization` documentation: https://fluxcd.io/flux/cmd/flux_reconcile_kustomization/
- Flux CLI `flux create secret githubapp` documentation: https://fluxcd.io/flux/cmd/flux_create_secret_githubapp/
- GitHub REST API commit statuses documentation: https://docs.github.com/rest/commits/statuses
- Flux notification-controller GitHub notifier source: https://raw.githubusercontent.com/fluxcd/notification-controller/main/internal/notifier/github.go

## Issues Found
- The Provider and Alert examples used `notification.toolkit.fluxcd.io/v1`. Current Flux documentation exposes Provider and Alert under `notification.toolkit.fluxcd.io/v1beta3`; the v1 notification API currently covers Receiver. Updated all Provider and Alert manifests to `v1beta3`.
- The Alert example included `HelmRelease` event sources, but Flux commit status documentation describes posting Kustomization events to the origin repository, and HelmRelease revisions are not necessarily Git commit SHAs. Removed the HelmRelease event source and adjusted surrounding text and the diagram to focus on Kustomizations.
- The post described a `Pending` commit status for in-progress reconciliation. The current Flux GitHub notifier skips progressing events and maps info/error events to GitHub success/failure states. Removed the Pending bullet.
- The GitHub token guidance implied `repo` scope was needed for private repositories. GitHub documents `repo:status` for classic PAT commit status access and **Commit statuses** read/write for fine-grained PATs and GitHub Apps. Updated prerequisites, setup, and troubleshooting accordingly.
- The Provider comment described the `address` as owner/repo format, but Flux examples use the repository URL. Updated the comment to say GitHub repository URL.
- The GitHub App note did not mention the accepted Flux secret identity choice clearly. Updated it to say installation owner or installation ID, matching Flux GitHub App authentication docs.

## Review Notes
The post is technically valid after the corrections. Future improvements could add an explicit GitHub App Secret example using Flux's `githubAppID`, `githubAppInstallationOwner` or `githubAppInstallationID`, and `githubAppPrivateKey` keys, but the existing post remains accurate without adding that extra section.
