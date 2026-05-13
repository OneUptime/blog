# Validation Summary: How to Configure Flux 2.8 GitHub Pull Request Comment Notifications

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Flux v2.8
- Flux notification-controller
- Kubernetes custom resources
- GitHub pull request comments
- GitHub commit status checks
- kubectl and Flux CLI

## Sources Consulted
- Flux 2.8 release announcement: https://fluxcd.io/blog/2026/02/flux-v2.8.0/
- Flux notification Provider documentation: https://fluxcd.io/flux/components/notification/providers/
- Flux notification Alert documentation: https://fluxcd.io/flux/components/notification/alerts/
- Flux notification API reference v1beta3: https://fluxcd.io/flux/components/notification/api/v1beta3/
- Flux GitRepository GitHub App secret documentation: https://fluxcd.io/flux/components/source/gitrepositories/

## Issues Found
- The post used `githubdispatch` for pull request comments. Changed it to the Flux 2.8 `githubpullrequestcomment` provider type, which is the provider that posts and updates GitHub pull request comments directly.
- The post described the `github` provider as a pull request comment provider. Clarified that `github` is used for GitHub commit status checks and added a separate Alert for it.
- The Provider and Alert examples used `notification.toolkit.fluxcd.io/v1`, but Flux v2.8 documents Alert and Provider under `notification.toolkit.fluxcd.io/v1beta3`. Updated the examples.
- The GitHub App secret used non-Flux key names (`appID`, `installationID`, `privateKey`). Updated them to `githubAppID`, `githubAppInstallationID`, and `githubAppPrivateKey`.
- The post implied Flux could infer pull requests from a Kustomization spec alone. Added the required `event.toolkit.fluxcd.io/change_request` annotation and the optional `event.toolkit.fluxcd.io/commit` annotation for commit status reporting.
- The post used deprecated Alert `summary`. Replaced it with `eventMetadata.summary`.
- The troubleshooting and testing instructions referenced the commit status provider for PR comments. Updated them to reference the pull request comment provider and annotated preview-environment workflow.

## Review Notes
Flux pull request comment notifications are designed for annotated Flux objects, commonly created for preview environments. Objects without `event.toolkit.fluxcd.io/change_request` are ignored by change request comment providers.
