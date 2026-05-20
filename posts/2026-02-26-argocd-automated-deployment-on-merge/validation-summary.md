# Validation Summary: How to Implement Automated Deployment on Merge

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Argo CD Applications and automated sync
- Argo CD Git webhooks
- Argo CD Image Updater
- Kubernetes manifests and Jobs
- Kustomize image updates
- GitHub Actions
- Argo CD Notifications
- Argo CD AppProject sync windows

## Sources Consulted
- Argo CD Application specification: https://argo-cd.readthedocs.io/en/release-2.13/user-guide/application-specification/
- Argo CD automated sync policy: https://argo-cd.readthedocs.io/en/release-2.8/user-guide/auto_sync/
- Argo CD webhook configuration: https://argo-cd.readthedocs.io/en/latest/operator-manual/webhook/
- Argo CD sync windows: https://argo-cd.readthedocs.io/en/latest/user-guide/sync_windows/
- Argo CD resource hooks: https://argo-cd.readthedocs.io/en/release-2.7/user-guide/resource_hooks/
- Argo CD Notifications triggers: https://argo-cd.readthedocs.io/en/latest/operator-manual/notifications/triggers/
- Argo CD Notifications subscriptions: https://argo-cd.readthedocs.io/en/release-3.1/operator-manual/notifications/subscriptions/
- Argo CD Notifications services overview: https://argo-cd.readthedocs.io/en/stable/operator-manual/notifications/services/overview/
- Argo CD Image Updater application configuration: https://argocd-image-updater.readthedocs.io/en/stable/configuration/applications/
- Argo CD Image Updater image configuration: https://argocd-image-updater.readthedocs.io/en/stable/configuration/images/
- Argo CD Image Updater update methods: https://argocd-image-updater.readthedocs.io/en/latest/basics/update-methods/

## Issues Found
- The Argo CD Image Updater example used legacy Application annotations. Updated it to the current `ImageUpdater` custom resource format, including `applicationRefs`, `commonUpdateSettings`, `manifestTargets.kustomize`, and `writeBackConfig.gitConfig`.
- The Image Updater tag filter needed the documented `regexp:` prefix for `allowTags`. Added the prefix.
- The staging Application watched the `release` branch while the promotion workflow checked out and pushed `main`, so staging would not necessarily deploy the CI-updated manifests. Updated the staging `targetRevision` to `HEAD` to match the workflow's main-branch write-back.
- The notifications example defined a trigger, template, and Slack service but no subscription, so it would not send to a recipient. Added a global `subscriptions` entry for `slack:deploy-alerts`.
- The notifications trigger accessed `app.status.operationState` directly. Updated it to use the documented optional access form `app.status?.operationState.phase` to avoid errors when `operationState` is absent.

## Review Notes
The Argo CD auto-sync, webhook secret keys, sync options, retry settings, sync windows, and PreSync hook examples are consistent with official Argo CD documentation. The multi-environment Application snippets are partial examples and omit full `repoURL`, `project`, and `destination` fields; that is acceptable for illustration, but a future revision could make them complete manifests for copy-paste use.
