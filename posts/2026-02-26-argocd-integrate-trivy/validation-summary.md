# Validation Summary: How to Integrate ArgoCD with Trivy for Vulnerability Scanning

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Argo CD
- Kubernetes Jobs and resource hooks
- Trivy CLI
- Trivy Operator
- Helm
- Prometheus Operator PrometheusRule resources
- jq

## Sources Consulted
- Argo CD resource hooks documentation: https://argo-cd.readthedocs.io/en/release-3.0/user-guide/resource_hooks/
- Argo CD custom resource health checks documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/health/
- Trivy image command reference: https://trivy.dev/docs/latest/references/configuration/cli/trivy_image/
- Trivy config command reference: https://trivy.dev/docs/latest/references/configuration/cli/trivy_config/
- Trivy filtering and .trivyignore documentation: https://trivy.dev/docs/dev/docs/configuration/filtering/
- Trivy Operator documentation: https://aquasecurity.github.io/trivy-operator/latest/docs/
- Trivy Operator Helm chart index: https://aquasecurity.github.io/helm-charts/index.yaml
- Trivy Operator Helm values: https://raw.githubusercontent.com/aquasecurity/trivy-operator/main/deploy/helm/values.yaml
- Trivy Operator metrics documentation: https://aquasecurity.github.io/trivy-operator/latest/tutorials/integrations/metrics/
- Trivy GitHub latest release API: https://api.github.com/repos/aquasecurity/trivy/releases/latest
- Trivy security incident advisory: https://github.com/aquasecurity/trivy/security/advisories/GHSA-69fq-xp46-6x23

## Issues Found
- The PreSync scan examples used the mutable `aquasec/trivy:latest` image tag. I changed the examples to `aquasec/trivy:0.70.0`, the current Trivy release verified through the official GitHub release API. This also avoids recommending a mutable tag for a security-sensitive scanner, which is especially important after the 2026 Trivy supply-chain advisory.
- The Trivy Operator Argo CD Application used chart version `0.20.0`, which is outdated. I updated `targetRevision` to the current published Helm chart version `0.32.1`.
- The PrometheusRule example assumes Trivy Operator metrics are scraped, but the Helm values did not enable the chart's ServiceMonitor. I added `serviceMonitor.enabled: true` to make the Prometheus Operator-based alerting example complete.
- The alerting section said to configure ArgoCD notifications, but the snippet defines a PrometheusRule. I corrected the sentence to describe Prometheus alerts.
- The `.trivyignore` example used a `yaml` code fence even though the file is Trivy's plain ignore-file format. I changed the fence to `text`.

## Review Notes
The hook annotations, Trivy CLI flags, Trivy Operator report resource names, Argo CD Lua health customization keys, `.trivyignore` format, and Trivy Operator metric names were verified against official documentation and are technically valid. The ServiceMonitor setting requires Prometheus Operator and the ServiceMonitor CRD to be installed in the cluster.
