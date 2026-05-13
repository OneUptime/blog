# Validation Summary: Flux CD vs ArgoCD: Which Has Better Drift Detection

## Status
validated

## Post Type
Technical comparison guide

## Technologies Covered
- Flux CD
- Argo CD
- Kubernetes
- GitOps
- Prometheus and Alertmanager
- Kustomize

## Sources Consulted
- Flux Kustomization documentation: https://fluxcd.io/flux/components/kustomize/kustomizations/
- Flux FAQ on reconciliation and manual changes: https://fluxcd.io/flux/faq/
- Flux Notification Alert documentation: https://fluxcd.io/flux/components/notification/alerts/
- Flux Prometheus metrics documentation: https://fluxcd.io/flux/monitoring/metrics/
- Argo CD automated sync documentation: https://argo-cd.readthedocs.io/en/latest/user-guide/auto_sync/
- Argo CD high availability/application controller documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/high_availability/
- Argo CD diff customization documentation: https://argo-cd.readthedocs.io/en/latest/user-guide/diffing/
- Argo CD sync options documentation: https://argo-cd.readthedocs.io/en/stable/user-guide/sync-options/
- Argo CD application diff command documentation: https://argo-cd.readthedocs.io/en/stable/user-guide/commands/argocd_app_diff/

## Issues Found
- Flux Alert used `notification.toolkit.fluxcd.io/v1`, but current Flux Alert examples and API documentation use `notification.toolkit.fluxcd.io/v1beta3`. Updated the snippet to `v1beta3`.
- The Flux drift ignore example used an undocumented `kustomize.toolkit.fluxcd.io/ssa-ignore-fields` annotation. Replaced it with a Kustomize patch that removes `/spec/replicas` from the desired Deployment manifest before Flux applies it, matching Flux guidance to omit HPA-managed fields from desired state.
- The post described Argo CD drift correction as simply immediate/seconds-based. Updated wording to reflect the documented watch-backed cluster cache, the need for `selfHeal: true`, the default 5-second self-heal timeout, and the normal automated sync reconciliation interval.
- The comparison table listed `argocd app sync` as a manual drift check. Changed it to `argocd app diff`, which is the documented command for comparing live and target state.
- The Flux detection latency row implied arbitrary intervals down to 1 minute without noting the documented Kustomization minimum. Updated it to state the 60-second minimum for Flux Kustomizations.

## Review Notes
The Prometheus example uses `gotk_reconcile_condition`, which is documented in Flux monitoring examples but may depend on the monitoring setup exporting Flux custom resource metrics. The Argo CD `RespectIgnoreDifferences=true` example is valid, but the option affects sync behavior only when the live resource already exists.
