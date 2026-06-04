# Validation Summary: How to Detect and Remediate Configuration Drift Using Flux Drift Detection

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Flux
- Flux kustomize-controller
- Flux helm-controller
- Flux notification-controller
- Kubernetes Kustomization and HelmRelease custom resources
- Kubernetes audit policies
- Kubernetes admission webhooks
- Prometheus and Grafana metrics

## Sources Consulted
- Flux Kustomization documentation: https://fluxcd.io/flux/components/kustomize/kustomizations/
- Flux Kustomize API reference v1: https://fluxcd.io/flux/components/kustomize/api/v1/
- Flux HelmRelease documentation: https://fluxcd.io/flux/components/helm/helmreleases/
- Flux Helm API reference v2: https://fluxcd.io/flux/components/helm/api/v2/
- Flux Helm drift detection guide: https://fluxcd.io/flux/installation/configuration/helm-drift-detection/
- Flux notification Alert documentation: https://fluxcd.io/flux/components/notification/alerts/
- Flux notification Provider documentation: https://fluxcd.io/flux/components/notification/providers/
- Flux CLI documentation for `flux get kustomizations`: https://fluxcd.io/flux/cmd/flux_get_kustomizations/
- Flux Prometheus metrics documentation: https://fluxcd.io/flux/guides/monitoring/
- Kubernetes audit policy documentation: https://kubernetes.io/docs/reference/config-api/apiserver-audit.v1/
- Kubernetes audit task documentation: https://kubernetes.io/docs/tasks/debug/debug-cluster/audit/
- Kubernetes ValidatingWebhookConfiguration API reference: https://kubernetes.io/docs/reference/kubernetes-api/admissionregistration/validating-webhook-configuration-v1/

## Issues Found
- The Kustomization example incorrectly used `.spec.patches` as a drift remediation control and included an incomplete patch. Removed that patch and clarified that Kustomizations re-apply desired state on their reconciliation interval.
- The HelmRelease examples described install and upgrade remediation settings as drift detection. Added the correct `.spec.driftDetection.mode` configuration and corrected the second example to use `warn` mode with an ignore rule.
- The notification examples used `notification.toolkit.fluxcd.io/v1` for Alert and Provider resources, but current Alert and Provider resources are documented under `v1beta3`. Updated the API versions.
- The health check section claimed manual scaling would make health checks fail. Reworded it to explain that health checks assess readiness after reconciliation, while Flux reconciliation corrects managed-field drift.
- The metrics section referenced `gotk_reconcile_condition_timestamp`, which is not listed in Flux's documented metrics. Replaced it with documented `gotk_reconcile_condition` and reconciliation duration histogram metrics.
- The audit logging section described deploying a webhook to log `kubectl exec`, but the snippet was an audit policy for update, patch, and delete operations. Reworded the section to match the configuration.
- The prune best practice claimed Flux removes arbitrary manually created resources. Corrected it to state that prune removes resources previously applied by Flux and later removed from the Kustomization inventory.
- The testing section said to apply configuration with `kubectl apply` while describing GitOps flow. Replaced that with committing and pushing the desired manifest to Git.
- The conclusion overclaimed that all cluster state always matches Git. Narrowed it to managed cluster resources.

## Review Notes
The examples are now aligned with current Flux and Kubernetes documentation. The Grafana dashboard JSON remains illustrative and minimal; a production dashboard would normally include full Grafana panel schemas and data source configuration.
