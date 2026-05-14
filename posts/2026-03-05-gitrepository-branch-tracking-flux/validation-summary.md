# Validation Summary: How to Set Up GitRepository Branch Tracking in Flux

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Flux CD
- Flux source-controller
- Flux notification-controller
- Flux GitRepository custom resources
- Flux Kustomization custom resources
- Kubernetes manifests and kubectl
- Flux CLI
- Git branch references

## Sources Consulted
- Flux GitRepository documentation: https://fluxcd.io/flux/components/source/gitrepositories/
- Flux Source API reference v1: https://fluxcd.io/flux/components/source/api/v1/
- Flux Kustomization documentation: https://fluxcd.io/flux/components/kustomize/kustomizations/
- Flux Notification API reference v1 and v1beta3: https://fluxcd.io/flux/components/notification/api/v1/ and https://fluxcd.io/flux/components/notification/api/v1beta3/
- Flux Alert documentation: https://fluxcd.io/flux/components/notification/alerts/
- Flux CLI `flux reconcile source git` documentation: https://fluxcd.io/flux/cmd/flux_reconcile_source_git/
- Flux CLI `flux get sources git` documentation: https://fluxcd.io/flux/cmd/flux_get_sources_git/
- Kubernetes `kubectl apply`, `kubectl describe`, and `kubectl delete` command behavior: https://kubernetes.io/docs/reference/kubectl/
- Git `ls-remote` documentation: https://git-scm.com/docs/git-ls-remote

## Issues Found
- The post incorrectly stated that omitting `spec.ref` defaults a Flux GitRepository to the `main` branch. Flux documentation and the Source API reference state that the default is `master`. I corrected the explanation and example so `main` is shown only as an explicit branch selection, while the omitted `ref` example is described as the `master` default.
- The Alert example used `apiVersion: notification.toolkit.fluxcd.io/v1`. Current Flux documentation lists Alert under `notification.toolkit.fluxcd.io/v1beta3`; the notification `v1` API currently contains Receiver, not Alert. I updated the Alert manifest to `v1beta3`.
- The troubleshooting command used `flux reconcile source git my-app -n flux-system --with-source`. The official `flux reconcile source git` command does not support `--with-source`; it is already reconciling the source. I removed the invalid flag.

## Review Notes
The remaining GitRepository and Kustomization examples use current Flux API versions and valid fields. The post's multi-environment branch strategy is technically valid, though in production many teams prefer promotion by immutable tags or commit pins rather than long-lived environment branches.
