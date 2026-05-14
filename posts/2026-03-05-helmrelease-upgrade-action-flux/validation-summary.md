# Validation Summary: How to Configure HelmRelease Upgrade Action in Flux

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Flux CD
- Flux Helm Controller
- Kubernetes HelmRelease API
- Helm
- Kubernetes CLI

## Sources Consulted
- Flux HelmRelease documentation: https://fluxcd.io/flux/components/helm/helmreleases/
- Flux Helm API reference v2: https://fluxcd.io/flux/components/helm/api/v2/
- Flux CLI reference for `flux get helmreleases`: https://fluxcd.io/flux/cmd/flux_get_helmreleases/
- Helm CLI reference for `helm history`: https://helm.sh/docs/helm/helm_history/
- Kubernetes `kubectl get` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_get/
- Kubernetes `kubectl logs` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_logs/

## Issues Found
- Fixed the `cleanupOnFail` description in the basic example. Flux documents this field as deleting new resources created during a failed upgrade, not resources from previous releases that are no longer in the chart.
- Corrected the upgrade remediation flow. Flux performs remediation using the configured strategy between retry attempts, and `remediateLastFailure` controls whether the final exhausted failure is remediated.
- Adjusted wording around `strategy: rollback`. It is the default remediation strategy when upgrade remediation is configured, not a separate action that only happens after retries are exhausted.
- Softened the `force` explanation. Flux documents this as Helm's replacement strategy, and downtime is possible but not guaranteed for every workload.
- Corrected the `preserveValues` example to use `preserveValues: true`, matching the surrounding explanation that this reuses the previous release values and merges new overrides.
- Clarified that `CreateReplace` updates existing CRDs but does not delete CRDs removed from the chart.
- Corrected the install and upgrade remediation defaults. Both default to no retries; upgrade remediation's default strategy is `rollback` when remediation is configured.

## Review Notes
The HelmRelease examples use the current `helm.toolkit.fluxcd.io/v2` API and documented upgrade fields. The post uses the traditional `spec.chart.spec.sourceRef` form, which remains valid, while current Flux production guidance often recommends OCI-based `chartRef` for OCI charts.
