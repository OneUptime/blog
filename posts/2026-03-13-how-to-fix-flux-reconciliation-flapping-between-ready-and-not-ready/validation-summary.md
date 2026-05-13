# Validation Summary: How to Fix Flux Reconciliation Flapping Between Ready and Not Ready

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Flux Kustomizations
- Flux HelmReleases
- Flux notification Alerts
- Kubernetes events, probes, pods, logs, and admission webhooks
- Kustomize builds

## Sources Consulted
- Flux Kustomization documentation: https://fluxcd.io/flux/components/kustomize/kustomizations/
- Flux HelmRelease API reference: https://fluxcd.io/flux/components/helm/api/v2/
- Flux notification Alert documentation: https://fluxcd.io/flux/components/notification/alerts/
- Flux CLI `flux get kustomizations` documentation: https://fluxcd.io/flux/cmd/flux_get_kustomizations/
- Kubernetes `kubectl events` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_events/
- Kubernetes `kubectl get` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_get/
- Kubernetes `kubectl logs` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_logs/
- Kubernetes probe documentation: https://kubernetes.io/docs/tasks/configure-pod-container/configure-liveness-readiness-startup-probes/
- Kubernetes ValidatingWebhookConfiguration API reference: https://kubernetes.io/docs/reference/generated/kubernetes-api/v1.36/
- Kustomize project documentation: https://kustomize.io/

## Issues Found
- The event command used `kubectl get events --for ... --sort-by=...`, but `--for` is documented for `kubectl events`, not `kubectl get events`. Changed it to `kubectl events --for Kustomization/my-app -n flux-system`.
- The status watch command used `flux get kustomizations my-app`, but the documented `flux get kustomizations` command does not take a resource name argument. Changed it to watch the named Kustomization through `kubectl get kustomization my-app -n flux-system`.
- The controller-conflict fix used a nonexistent `kustomize.toolkit.fluxcd.io/field-manager: flux-ignore` annotation. Replaced it with the documented `kustomize.toolkit.fluxcd.io/ssa: Merge` annotation and narrowed the text to non-overlapping fields, which is the behavior Flux documents.
- The Kustomize determinism note referred to "random suffixes" from generators. Kustomize generator name suffixes are content-derived, so this was changed to "changing generator inputs."
- The Flux Alert example used `notification.toolkit.fluxcd.io/v1`, while current Flux documentation uses `notification.toolkit.fluxcd.io/v1beta3` for Alert examples and API reference. Updated the snippet to `v1beta3`.

## Review Notes
- The retry interval Kustomization snippet is intentionally partial and assumes an existing Kustomization spec; `sourceRef` and other deployment-specific fields would still be needed in a complete manifest.
- The Alert example filters error-severity Flux events; detecting rapid Ready/Not Ready transitions may still require metrics or event-rate alerting outside this simple Alert resource.
