# Validation Summary: How to Understand the Flux CD Reconciliation Interval

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Flux CD
- Flux source-controller
- Flux kustomize-controller
- Flux helm-controller
- Flux notification-controller
- Kubernetes
- GitOps
- YAML custom resources

## Sources Consulted
- Flux GitRepository documentation: https://fluxcd.io/flux/components/source/gitrepositories/
- Flux Source API reference v1: https://fluxcd.io/flux/components/source/api/v1/
- Flux Kustomization documentation: https://fluxcd.io/flux/components/kustomize/kustomizations/
- Flux Kustomize API reference v1: https://fluxcd.io/flux/components/kustomize/api/v1/
- Flux HelmRelease documentation: https://fluxcd.io/flux/components/helm/helmreleases/
- Flux Helm API reference v2: https://fluxcd.io/flux/components/helm/api/v2/
- Flux Receiver documentation: https://fluxcd.io/flux/components/notification/receivers/
- Flux webhook receiver guide: https://fluxcd.io/flux/guides/webhook-receivers/
- Flux CLI documentation for `flux reconcile source git`: https://fluxcd.io/flux/cmd/flux_reconcile_source_git/
- Flux CLI documentation for `flux reconcile kustomization`: https://fluxcd.io/flux/cmd/flux_reconcile_kustomization/
- Flux CLI documentation for `flux reconcile helmrelease`: https://fluxcd.io/flux/cmd/flux_reconcile_helmrelease/
- Flux CLI documentation for `flux suspend kustomization`: https://fluxcd.io/flux/cmd/flux_suspend_kustomization/
- Flux CLI documentation for `flux resume kustomization`: https://fluxcd.io/flux/cmd/flux_resume_kustomization/

## Issues Found
- The post stated that every Flux CD resource has `spec.interval`. Flux has other resources, such as notification resources, where interval behavior is different or optional. Updated the wording to focus on the source and delivery resources covered by the article.
- The post described the interval as the period between reconciliation starts. Flux documentation states that after a successful reconciliation, controllers requeue the object after the specified interval, and the interval is approximate and may include jitter. Updated the explanation and summary accordingly.
- The post described `spec.retryInterval` as a general controller behavior. In the examples and current documentation, this field is specifically documented for Kustomization retries; HelmRelease failure retry behavior is configured through Helm install/upgrade remediation and strategies. Updated the retry section and summary to scope the claim to Kustomization.
- The webhook section said the notification-controller annotates the relevant source. Flux documentation describes Receivers as requesting reconciliation for listed resources. Updated the wording and diagram label to avoid over-specifying implementation details.
- The API load table labeled the interval-derived values as API calls per hour, but the values were actually scheduled reconciliation counts. Updated the table heading and values to "Scheduled Reconciliations per Hour" and changed "Default for most workloads" to "Common baseline" because Flux requires explicit intervals for the main resources discussed.

## Review Notes
- The YAML snippets use current Flux API versions: `source.toolkit.fluxcd.io/v1`, `kustomize.toolkit.fluxcd.io/v1`, and `notification.toolkit.fluxcd.io/v1`.
- The Flux CLI commands shown are current, but the local environment did not have the `flux` binary installed, so command validation was performed against the official Flux CLI documentation.
