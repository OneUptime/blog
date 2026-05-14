# Validation Summary: How to Roll Back a HelmRelease to a Previous Revision in Flux CD

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Flux CD
- Flux HelmRelease API
- Flux notification-controller Alert and Provider APIs
- Flux CLI
- Helm CLI
- Kubernetes
- GitOps

## Sources Consulted
- Flux HelmRelease documentation: https://fluxcd.io/flux/components/helm/helmreleases/
- Flux notification Alert documentation: https://fluxcd.io/flux/components/notification/alerts/
- Flux notification API reference: https://fluxcd.io/flux/components/notification/api/
- Flux CLI `flux logs` reference: https://fluxcd.io/flux/cmd/flux_logs/
- Flux CLI `flux resume helmrelease` reference: https://fluxcd.io/flux/cmd/flux_resume_helmrelease/
- Helm `helm list` reference: https://helm.sh/docs/helm/helm_list/
- Helm `helm rollback` reference: https://helm.sh/docs/helm/helm_rollback/

## Issues Found
- The post said Helm revisions are stored in the release namespace. Updated this to refer to the Helm release storage namespace, which defaults to the release namespace unless `spec.storageNamespace` is configured.
- The automated rollback example described upgrade remediation retries as the number of retries before rollback. Updated the comment to clarify that rollback remediation is performed between retry attempts.
- The rollback configuration included `recreate: false`. Removed it because Flux v2.8 documents rollback `.recreate` as deprecated and no longer effective.
- The rollback `cleanupOnFail` comment said it cleaned up resources from a failed upgrade. Updated it to say it applies to resources created during a failed rollback.
- The notification examples used `notification.toolkit.fluxcd.io/v1` for Provider and Alert. Updated them to `notification.toolkit.fluxcd.io/v1beta3`, which is the current documented API for Provider and Alert.
- The history limit example used `historyLimit` and said the default was 10. Updated it to `maxHistory` and noted Flux defaults to 5.

## Review Notes
Most commands and examples are otherwise accurate for current Flux and Helm usage. Several examples use application-specific labels and health endpoints, which are acceptable placeholders but should be adapted to the actual chart labels and application health check path in production.
