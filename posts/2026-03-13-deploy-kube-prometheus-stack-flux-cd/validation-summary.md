# Validation Summary: Deploy kube-prometheus-stack with Flux CD

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Flux CD
- Kubernetes
- HelmRelease and HelmRepository custom resources
- kube-prometheus-stack Helm chart
- Prometheus Operator
- Prometheus
- Grafana
- Alertmanager
- SOPS-encrypted Kubernetes Secrets

## Sources Consulted
- Flux HelmRelease documentation: https://fluxcd.io/flux/components/helm/helmreleases/
- Flux Kustomization documentation: https://fluxcd.io/flux/components/kustomize/kustomizations/
- Flux SOPS decryption documentation: https://fluxcd.io/flux/components/kustomize/kustomizations/#decryption
- Prometheus Alertmanager configuration documentation: https://prometheus.io/docs/alerting/latest/configuration/
- prometheus-community kube-prometheus-stack chart metadata and values: https://github.com/prometheus-community/helm-charts/tree/main/charts/kube-prometheus-stack
- Prometheus Operator API reference: https://github.com/prometheus-operator/prometheus-operator/blob/main/Documentation/api-reference/api.md
- Kubernetes Secret documentation: https://kubernetes.io/docs/concepts/configuration/secret/

## Issues Found
- The Slack webhook Secret was created but never referenced by the HelmRelease. I added `spec.valuesFrom` so Flux injects the Secret value into `alertmanager.config.global.slack_api_url`.
- The Alertmanager config used `${SLACK_API_URL}` without configuring Flux post-build substitution. I removed that placeholder and made the Secret-backed `valuesFrom` path the source of the Slack URL.
- The guide instructed storing an encrypted SOPS Secret but the Flux Kustomization did not enable SOPS decryption. I added a `decryption` block and noted that the key Secret name must match the user's Flux setup.
- The manifests referenced the `monitoring` namespace before creating it. I added a Namespace manifest to the first step.
- The chart version range pinned kube-prometheus-stack to the older 55.x series. I updated it to the current 84.x chart series verified against the upstream chart metadata.
- The Kustomization health checks targeted Helm-created workloads directly. Flux documents checking the `HelmRelease` itself when a Kustomization contains HelmRelease objects, so I updated the health check accordingly and added a timeout.
- The text said the guide included custom alert rules, but no custom rules were defined. I corrected that sentence to describe only the implemented persistent storage and Slack notification channel.
- The cross-namespace ServiceMonitor claim was incomplete. I added explicit empty namespace selectors for ServiceMonitors, PodMonitors, and PrometheusRules, and updated the best-practice note accordingly.

## Review Notes
- The examples are still intentionally generic: users must replace `fast-ssd`, `grafana.example.com`, `#alerts`, and the `sops-age` Secret name with values from their own cluster.
