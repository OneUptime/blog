# Validation Summary: How to Manage Kubernetes Operators with Flux CD

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes Operators
- Flux CD HelmRelease, Kustomization, HelmRepository, and Alert resources
- Helm charts and CRD lifecycle management
- cert-manager
- kube-prometheus-stack and Prometheus Operator ServiceMonitor resources
- Zalando Postgres Operator
- Kubernetes custom resources

## Sources Consulted
- Flux HelmRelease documentation: https://fluxcd.io/flux/components/helm/helmreleases/
- Flux Kustomization documentation: https://fluxcd.io/flux/components/kustomize/kustomizations/
- Flux Alert documentation and notification API reference: https://fluxcd.io/flux/components/notification/alerts/ and https://fluxcd.io/flux/components/notification/api/v1/
- cert-manager Helm installation documentation: https://cert-manager.io/docs/installation/helm/
- cert-manager supported releases: https://cert-manager.io/docs/releases/
- cert-manager Helm chart values: https://github.com/cert-manager/cert-manager/blob/master/deploy/charts/cert-manager/values.yaml
- kube-prometheus-stack chart README and values: https://github.com/prometheus-community/helm-charts/tree/main/charts/kube-prometheus-stack
- Zalando Postgres Operator chart and documentation: https://github.com/zalando/postgres-operator and https://opensource.zalando.com/postgres-operator/docs/

## Issues Found
- The cert-manager examples used `installCRDs: true/false`, which is deprecated in current cert-manager Helm chart values. Replaced it with `crds.enabled: true/false`.
- The cert-manager examples pinned `v1.14.x` and the staging example pinned `v1.15.x`; both releases are end-of-life by 2026-05-15. Updated examples to supported `v1.19.x` and `v1.20.x` ranges, and updated the standalone CRD URL to `v1.20.2`.
- The kube-prometheus-stack example pinned `56.x`, which is an old chart line. Updated it to the current `85.x` chart line.
- The Zalando Postgres Operator example pinned `1.12.x`, while the current chart line is `1.15.x`. Updated the version range.
- The cert-manager DNS01 comment said it enabled DNS01 challenge support. The value actually configures recursive nameservers for DNS01 self-checks, so the comment was corrected.
- The Flux Alert example used `notification.toolkit.fluxcd.io/v1` and `spec.summary`. Current Flux documentation keeps Alert examples on `v1beta3`, and `spec.summary` is deprecated in favor of `eventMetadata.summary`; both were corrected.

## Review Notes
- The Flux `install.crds` and `upgrade.crds` policies are correct for charts that ship CRDs through Helm's CRD mechanism; for cert-manager specifically, the current chart also requires the chart value `crds.enabled`.
- The Flux CLI and kubectl commands are syntactically plausible, but the local environment did not have `flux`, `helm`, or `kubectl` installed, so command validation was performed against official documentation rather than local `--help` output.
