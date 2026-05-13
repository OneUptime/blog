# Validation Summary: How to Configure Flux 2.8 Gitea Comment Notifications

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Flux v2.8
- Flux notification-controller
- Kubernetes Custom Resources
- Gitea
- GitOps
- kubectl
- Flux CLI

## Sources Consulted
- Flux 2.8 release announcement: https://fluxcd.io/blog/2026/02/flux-v2.8.0/
- Flux notification providers documentation: https://fluxcd.io/flux/components/notification/providers/
- Flux notification Alert API reference v1beta3: https://fluxcd.io/flux/components/notification/api/v1beta3/
- Flux notification alerts documentation: https://fluxcd.io/flux/components/notification/alerts/
- Flux notification receivers documentation: https://fluxcd.io/flux/components/notification/receivers/
- Flux Kustomization API reference v1: https://fluxcd.io/flux/components/kustomize/api/v1/

## Issues Found
- The post used `notification.toolkit.fluxcd.io/v1` for `Provider` and `Alert` examples. For Flux 2.8, `Provider` and `Alert` are `notification.toolkit.fluxcd.io/v1beta3`, so the examples were updated.
- The post described Gitea pull request comments but only configured a `type: gitea` provider, which is for commit status updates. Added a separate `type: giteapullrequestcomment` provider and alert for PR comments.
- The token permissions were described generically as repository and issue read/write. Updated them to the Flux-documented Gitea scopes: `write:repository` for commit status and `write:issue` for PR comments.
- The Kustomization example did not include the event metadata required by Flux 2.8 comment and commit status providers. Added `event.toolkit.fluxcd.io/change_request` and `event.toolkit.fluxcd.io/commit` annotations and adjusted the explanatory text.
- The info alerts used a lowercase `.*reconciliation.*` inclusion regex, which can miss Flux messages and reasons such as `ReconciliationSucceeded`. Removed the inclusion filters so the providers receive the selected Flux object events.
- The Gitea webhook receiver used `type: gitea`, but Flux documents Gitea webhooks as GitHub-compatible receiver payloads using `type: github`. Updated the receiver type and added the `apiVersion` field to the referenced `GitRepository` resource.
- Troubleshooting commands only checked the commit status provider. Added checks for the Gitea pull request comment provider.

## Review Notes
The examples are now aligned with Flux 2.8 documentation. The `event.toolkit.fluxcd.io/change_request` and `event.toolkit.fluxcd.io/commit` values are placeholders; in a real preview environment they should be generated from the pull request number and commit SHA.
