# Validation Summary: How to Use Selective Sync from the ArgoCD UI

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Argo CD
- GitOps
- Kubernetes
- Argo CD web UI
- Selective sync

## Sources Consulted
- Argo CD Selective Sync documentation: https://argo-cd.readthedocs.io/en/stable/user-guide/selective_sync/
- Argo CD Sync Options documentation: https://argo-cd.readthedocs.io/en/stable/user-guide/sync-options/
- Argo CD Sync Phases and Waves documentation: https://argo-cd.readthedocs.io/en/release-3.3/user-guide/sync-waves/
- Argo CD Resource Health documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/health/
- Argo CD Diffing documentation: https://argo-cd.readthedocs.io/en/stable/user-guide/diffing/
- Argo CD UI source code, application sync panel and sync options components: https://github.com/argoproj/argo-cd

## Issues Found
- The post omitted two documented selective sync caveats: partial synchronization is not recorded in application history, and hooks do not run during selective sync. Added a short note near the introduction.
- The sync dialog selection wording described an "All" or "Select All" checkbox, but the current Argo CD UI source shows quick links for "all", "out of sync", and "none" plus per-resource selection. Updated the wording to match the UI.
- The "Apply Only" option was described as skipping pre/post sync hooks. In the UI source, this selects the apply sync strategy instead of the hook sync strategy. Updated the wording to describe the option more precisely.

## Review Notes
The post is technically relevant and its main guidance is consistent with the official Argo CD documentation. UI labels and visual indicators can vary between Argo CD versions and custom themes, so future updates should re-check the current UI source when describing exact button names or icons.
