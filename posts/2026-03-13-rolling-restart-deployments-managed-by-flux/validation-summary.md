# Validation Summary: How to Perform Rolling Restart of Deployments Managed by Flux

## Status
validated

## Post Type
Tutorial / Day 2 Operations Guide

## Technologies Covered
- Flux CD v2 (kustomize-controller, helm-controller)
- Kubernetes (Deployments, server-side apply, rolling restarts)
- kubectl (`rollout restart`, `rollout status`, `rollout undo`)
- Flux CLI (`flux reconcile`, `flux get kustomization`)
- Stakater Reloader (auto restart on Secret/ConfigMap change)
- GitOps workflows

## Sources Consulted
- [Flux Kustomization documentation](https://fluxcd.io/flux/components/kustomize/kustomizations/)
- [Flux Controller Options (field managers)](https://fluxcd.io/flux/components/kustomize/options/)
- [fluxcd/kustomize-controller GitHub repository](https://github.com/fluxcd/kustomize-controller)
- [flux get kustomizations CLI reference](https://fluxcd.io/flux/cmd/flux_get_kustomizations/)
- [Flux Helm API reference v2](https://fluxcd.io/flux/components/helm/api/v2/)
- [Flux server-side reconciliation blog (CNCF)](https://www.cncf.io/blog/2021/10/07/server-side-reconciliation-is-coming/)
- Kubernetes docs for `kubectl rollout restart` and the `kubectl.kubernetes.io/restartedAt` annotation
- Stakater Reloader documentation (annotation reference)

## Issues Found
- **Incorrect Flux field manager name**: The post originally claimed Flux uses the field manager name `gotk-sync-manager` or `manager`. This is incorrect. Per the official Flux docs and `kustomize-controller` source, the kustomize-controller registers as field manager `kustomize-controller`, and the helm-controller uses `helm-controller`. (There is also `flux-client-side-apply` reserved for manual kubectl overrides, but that is not what Flux itself uses for its server-side apply.) Updated the sentence in Step 1 to name the correct field managers.

## Review Notes
- The core claim that `kubectl rollout restart` adds a `kubectl.kubernetes.io/restartedAt` annotation to the pod template, and that Flux does not overwrite this annotation because it is not declared in Git, is correct.
- `flux reconcile source git`, `flux reconcile kustomization`, and `flux get kustomization --watch` are all valid CLI invocations.
- The `--with-source` flag mentioned in Best Practices is a valid flag on `flux reconcile kustomization`.
- The HelmRelease example uses `apiVersion: helm.toolkit.fluxcd.io/v2`, which is the current GA API version for the Flux helm-controller.
- The Stakater Reloader annotations (`reloader.stakater.com/auto`, `secret.reloader.stakater.com/reload`, `configmap.reloader.stakater.com/reload`) are correct per Reloader's documentation.
- Minor caveat (not changed): The HelmRelease example uses `chart.spec.version: "1.x"`. This wildcard range works but in production a pinned version is generally preferred; the post does not claim otherwise, so left as-is.
- Minor caveat (not changed): The post references `platform.io/restartedAt` as an example custom annotation for the GitOps-tracked restart pattern. Any non-conflicting annotation key works; this is illustrative and accurate.
