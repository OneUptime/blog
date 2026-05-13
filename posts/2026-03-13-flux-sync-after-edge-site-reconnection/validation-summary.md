# Validation Summary: How to Handle Flux Sync After Edge Site Reconnection

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Flux CD
- Kubernetes
- GitOps
- Flux source-controller, kustomize-controller, image-automation-controller, and notification-controller
- systemd
- Bash
- kubectl

## Sources Consulted
- Flux GitRepository documentation: https://fluxcd.io/flux/components/source/gitrepositories/
- Flux Kustomization documentation: https://fluxcd.io/flux/components/kustomize/kustomizations/
- Flux ImageUpdateAutomation documentation: https://fluxcd.io/flux/components/image/imageupdateautomations/
- Flux CLI `flux get sources git`: https://fluxcd.io/flux/cmd/flux_get_sources_git/
- Flux CLI `flux get images update`: https://fluxcd.io/flux/cmd/flux_get_images_update/
- Flux CLI `flux suspend image update`: https://fluxcd.io/flux/cmd/flux_suspend_image_update/
- Flux CLI `flux resume image update`: https://fluxcd.io/flux/cmd/flux_resume_image_update/
- Flux CLI `flux reconcile kustomization`: https://fluxcd.io/flux/cmd/flux_reconcile_kustomization/
- Flux CLI `flux diff kustomization`: https://fluxcd.io/flux/cmd/flux_diff_kustomization/
- Flux Alert documentation: https://fluxcd.io/flux/components/notification/alerts/
- Kubernetes field selectors documentation: https://kubernetes.io/docs/concepts/overview/working-with-objects/field-selectors/
- systemd network-online.target guidance: https://systemd.io/NETWORK_ONLINE/

## Issues Found
- Corrected image automation CLI commands from unsupported resource-style forms such as `flux get imageupdateautomations`, `flux suspend imageupdateautomation`, and `flux resume imageupdateautomation` to the documented `flux get images update`, `flux suspend image update`, and `flux resume image update` commands.
- Clarified image automation behavior so it describes detection and Git updates after connectivity returns, rather than implying automation can normally continue while the edge site has no registry or Git connectivity.
- Added `git fetch origin main` before counting accumulated commits so `origin/main` is current before the comparison.
- Reworded the GitRepository status comment to avoid implying a specific stale status transition that Flux does not guarantee.
- Corrected the systemd guidance: `network-online.target` is a boot-time synchronization target and does not fire on every post-boot reconnection, so the post now recommends a network-manager dispatcher or equivalent hook for every reconnection.
- Changed the systemd unit install target from `network-online.target` to `multi-user.target`, while keeping `After=` and `Wants=` on `network-online.target`.
- Replaced `flux get kustomization ... -o jsonpath` with `kubectl get kustomization ... -o jsonpath`, because the Flux `get` command does not provide kubectl-style JSONPath output.
- Updated the `flux diff kustomization` example to include a local manifest path, matching the documented local diff workflow.
- Updated the Alert manifest from `notification.toolkit.fluxcd.io/v1` to the current documented `v1beta3` API and replaced deprecated templated `summary` usage with `eventMetadata.summary`.
- Removed the claim that the Alert snippet filters Ready-to-True transitions, because Flux Alerts select event sources and severities and do not directly express condition-transition filters.
- Corrected the best-practice command to `flux reconcile kustomization <name> --with-source`, because `--with-source` is a Kustomization reconcile flag.

## Review Notes
The remaining examples are operational templates and use placeholder names such as `flux-system`, `apps`, `production`, and `monitoring.example.com`; readers must adapt those to their own repository paths, resource names, namespaces, and monitoring endpoint.
