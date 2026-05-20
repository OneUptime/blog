# Validation Summary: How to Deploy Loki with ArgoCD

## Status
validated

## Post Type
Tutorial / deployment guide

## Technologies Covered
- Grafana Loki
- Grafana Alloy
- Argo CD
- Helm
- Kubernetes
- Amazon S3 and EKS IRSA
- Grafana and kube-prometheus-stack
- LogCLI

## Sources Consulted
- Grafana Loki Helm installation documentation: https://grafana.com/docs/loki/latest/setup/install/helm/
- Grafana Loki Helm chart components documentation: https://grafana.com/docs/loki/latest/setup/install/helm/concepts/
- Grafana Loki simple scalable Helm chart documentation: https://grafana.com/docs/loki/latest/setup/install/helm/install-scalable/
- Grafana Loki deployment modes documentation: https://grafana.com/docs/loki/latest/get-started/deployment-modes/
- Grafana Loki get started and Alloy log shipping example: https://grafana.com/docs/loki/latest/get-started/
- Grafana Loki Promtail EOL documentation: https://grafana.com/docs/loki/latest/send-data/promtail/
- Grafana Alloy Kubernetes installation documentation: https://grafana.com/docs/alloy/latest/get-started/install/kubernetes/
- Grafana Alloy Helm chart values and Chart.yaml: https://github.com/grafana/alloy/tree/main/operations/helm/charts/alloy
- Grafana Community Loki Helm chart values and Chart.yaml: https://github.com/grafana-community/helm-charts/tree/main/charts/loki
- Argo CD Application specification reference: https://argo-cd.readthedocs.io/en/latest/user-guide/application-specification/
- Grafana Loki LogCLI getting started documentation: https://grafana.com/docs/loki/latest/query/logcli/getting-started/
- kube-prometheus-stack values reference for Grafana additionalDataSources: https://artifacthub.io/packages/helm/prometheus-community/kube-prometheus-stack

## Issues Found
- The post said the guide covered single-binary and microservices deployments, but the implementation only covered Simple Scalable mode. Updated the wording to describe the actual scope.
- The post described Simple Scalable mode as separating only read and write paths. Updated it to read, write, and backend targets.
- The post recommended Simple Scalable mode for most production environments. Grafana now recommends microservices mode for new large production workloads and notes that Simple Scalable Deployment is being deprecated before Loki 4.0, so the recommendation was narrowed to medium environments.
- The Loki wrapper chart referenced the older Grafana Helm repository and chart version `6.16.0`. Updated it to the current Grafana Community Loki chart repository and chart version `16.0.1`.
- The Loki monitoring snippet placed `lokiCanary` under `monitoring` and included the old `selfMonitoring` key. Updated `lokiCanary` to the current top-level chart value and removed `selfMonitoring`.
- The post used Promtail as the Kubernetes log collector. Promtail is EOL as of March 2, 2026, so the Promtail repository structure, wrapper chart, values, Argo CD Application, verification command, architecture diagram, and summary were updated to use Grafana Alloy.
- The LogCLI example put `--addr` after the query subcommand. Updated it to the documented global flag placement before `query`.

## Review Notes
- The YAML snippets were parsed successfully after the edits.
- `helm`, `kubectl`, and `logcli` were not installed in the local environment, so CLI behavior was verified against official documentation rather than local command help.
