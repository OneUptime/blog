# Validation Summary: How to Deploy Prometheus Operator with Flux CD

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Flux CD
- Flux HelmRepository, HelmRelease, and Kustomization APIs
- Kubernetes
- kube-prometheus-stack Helm chart
- Prometheus Operator
- ServiceMonitor and PrometheusRule custom resources
- Alertmanager routing and receivers
- SOPS with age encryption

## Sources Consulted
- Flux HelmRelease documentation: https://fluxcd.io/flux/components/helm/helmreleases/
- Flux Kustomization documentation: https://fluxcd.io/flux/components/kustomize/kustomizations/
- Flux Kustomization API reference: https://fluxcd.io/flux/components/kustomize/api/v1/
- prometheus-community Helm chart repository index: https://prometheus-community.github.io/helm-charts/index.yaml
- kube-prometheus-stack chart values: https://github.com/prometheus-community/helm-charts/blob/main/charts/kube-prometheus-stack/values.yaml
- Prometheus Operator API reference: https://prometheus-operator.dev/docs/api-reference/api/
- Prometheus Operator troubleshooting documentation: https://prometheus-operator.dev/docs/platform/troubleshooting/
- Alertmanager configuration documentation: https://prometheus.io/docs/alerting/latest/configuration/
- SOPS documentation: https://github.com/getsops/sops

## Issues Found
- The HelmRelease pinned `kube-prometheus-stack` to `60.x`, which is outdated for a 2026 guide. Updated the example to `85.x`, the current chart series available in the prometheus-community chart index on 2026-05-14, while keeping the Kubernetes prerequisite at v1.25 or later because the chart declares `kubeVersion: >=1.25.0-0`.
- The Flux Kustomization used `targetNamespace: monitoring`, which would force all namespaced objects in the path into the `monitoring` namespace. That would break the `HelmRepository` example because the `HelmRelease` references it in `flux-system`. Removed the namespace override.
- The SOPS section encrypted a Kubernetes Secret but did not configure Flux to decrypt it. Added `decryption.provider: sops` and a `secretRef` to the Flux Kustomization, and added a short note that the SOPS age key Secret must be referenced.
- The Alertmanager secret example created `alertmanager-secrets`, but the Alertmanager configuration still used inline webhook and PagerDuty placeholders. Added `alertmanager.alertmanagerSpec.secrets` so the Secret is mounted, and changed the receiver config to use `api_url_file` and `service_key_file`.
- The Alertmanager route matchers used unquoted classic matcher syntax (`severity = critical`). Updated them to UTF-8-compatible matcher syntax (`severity="critical"` and `severity="warning"`), matching current Alertmanager guidance.
- The Slack receiver referenced undefined templates `slack.title` and `slack.text`. Updated them to Alertmanager's default Slack templates, `slack.default.title` and `slack.default.text`.
- The upgrade example still referenced the old `61.x` chart series. Updated it to show moving an older `84.x` pin to the current `85.x` series.

## Review Notes
- The PrometheusRule expressions are syntactically valid PromQL examples, but production alert rules should usually be tuned to the cluster's installed metric labels, kube-state-metrics version, and workload conventions.
- The post assumes that the SOPS age private key Secret already exists in the Flux controller namespace. A future expansion could show creating that Secret, but the current correction keeps the scope limited to the existing tutorial.
