# Validation Summary: How to Use Helmfile for Multi-Chart Deployments on Talos

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Talos Linux
- Kubernetes
- Helm
- Helmfile
- Helm diff plugin
- ingress-nginx Helm chart
- cert-manager Helm chart
- kube-prometheus-stack Helm chart
- Grafana Helm chart

## Sources Consulted
- Helmfile official documentation: https://helmfile.readthedocs.io/en/stable/
- Helmfile configuration reference: https://helmfile.readthedocs.io/en/latest/configuration/
- Helmfile environments documentation: https://helmfile.readthedocs.io/en/stable/environments/
- Helmfile releases and DAG documentation: https://helmfile.readthedocs.io/en/stable/releases/
- Helm plugin install documentation: https://helm.sh/docs/helm/helm_plugin_install/
- cert-manager v1.14 Helm installation documentation: https://cert-manager.io/v1.14-docs/installation/helm/
- ingress-nginx chart values source: https://github.com/kubernetes/ingress-nginx/blob/controller-v1.9.0/charts/ingress-nginx/values.yaml
- kube-prometheus-stack 56.0.0 chart values source: https://github.com/prometheus-community/helm-charts/blob/kube-prometheus-stack-56.0.0/charts/kube-prometheus-stack/values.yaml
- Grafana Helm chart values source: https://github.com/grafana/helm-charts/blob/grafana-7.0.19/charts/grafana/values.yaml
- Talos Linux philosophy documentation: https://docs.siderolabs.com/talos/v1.12/learn-more/philosophy
- Sidero Labs Cilium on Talos documentation: https://docs.siderolabs.com/kubernetes-guides/cni/deploying-cilium

## Issues Found
- The Linux Helmfile installation command used a stale tarball asset URL that omitted the version embedded in current release asset names. Updated it to resolve the latest version from the GitHub release metadata and download the matching Linux amd64 tarball.
- The kube-prometheus-stack Grafana persistence example used `storageClass`, but the Grafana chart value is `storageClassName`. Updated the key so the storage class setting is applied.
- The Helmfile environment example omitted the document separator that Helmfile documentation recommends between `environments` and `releases`. Added `---`.
- The `needs` example said the dependent release waits for cert-manager to be fully deployed. Helmfile `needs` controls deployment ordering; readiness waiting depends on Helm wait settings. Reworded the comment to describe ordering only.
- The `helmfile.d` section implied automatic loading always happens from the parent directory. Updated it to match Helmfile behavior: `helmfile.d/*.yaml` is used when `helmfile.yaml` is not found.
- Added the `--sequential-helmfiles` command for cases where split helmfile files need alphabetical ordering, because Helmfile can process multiple files in parallel by default.

## Review Notes
- The specific chart versions in the examples are valid historical versions, but they are not current as of this validation date. The post pins versions, so this is acceptable for reproducible examples.
- The Talos CNI note is directionally correct, but production CNI installation on Talos often needs Talos-specific Helm values or bootstrap manifests.
