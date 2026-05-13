# Validation Summary: How to Fix Flux Reconciliation Stuck at Not Ready Forever

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Flux
- Flux Kustomizations
- Flux HelmReleases
- Kubernetes
- kubectl
- Kustomize
- Kubernetes RBAC
- Flux notification-controller alerts

## Sources Consulted
- Flux Kustomization documentation: https://fluxcd.io/flux/components/kustomize/kustomizations/
- Flux kustomize-controller documentation: https://fluxcd.io/flux/components/kustomize/
- Flux CLI documentation for `flux get kustomizations`: https://fluxcd.io/flux/cmd/flux_get_kustomizations/
- Flux CLI documentation for `flux reconcile kustomization`: https://fluxcd.io/flux/cmd/flux_reconcile_kustomization/
- Flux CLI documentation for `flux create secret git`: https://fluxcd.io/flux/cmd/flux_create_secret_git/
- Flux CLI documentation for `flux logs`: https://fluxcd.io/flux/cmd/flux_logs/
- Flux Alert documentation: https://fluxcd.io/flux/components/notification/alerts/
- Flux Notification API reference: https://fluxcd.io/flux/components/notification/api/v1/
- Flux Notification API reference v1beta3: https://fluxcd.io/flux/components/notification/api/v1beta3/
- Kubernetes `kubectl events` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_events/

## Issues Found
- The introduction said `Not Ready` usually means Flux has given up after an error. Flux controllers continue retrying on their reconciliation interval unless the resource is suspended. Updated the wording to describe the `Ready=False` condition accurately.
- The source availability section said a HelmRepository source can block a Kustomization. Flux Kustomizations reference sources such as GitRepository, OCIRepository, Bucket, or ExternalArtifact, while HelmRepository is relevant to Helm releases/charts. Updated the sentence to cover dependent Kustomizations or HelmReleases.
- The command `flux get kustomization my-app` is not documented in the current Flux CLI reference, which documents the plural `flux get kustomizations` command. Replaced it with `kubectl describe kustomization my-app -n flux-system` to retrieve the detailed status and error.
- The Alert manifest used `notification.toolkit.fluxcd.io/v1`, but the current Flux Alert documentation uses `notification.toolkit.fluxcd.io/v1beta3`; the v1 notification API reference currently covers Receiver, not Alert. Updated the Alert example to `v1beta3`.

## Review Notes
The RBAC example is technically valid for a default kustomize-controller service account setup, but in multi-tenant Flux installations the Kustomization may impersonate `.spec.serviceAccountName`; in that case permissions should be granted to the impersonated service account instead. The post already keeps the example scoped as a generic troubleshooting pattern.
