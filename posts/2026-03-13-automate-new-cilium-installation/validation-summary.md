# Validation Summary: Automate a New Cilium Installation with Helm and CI/CD

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Cilium
- Kubernetes
- Helm
- Cilium CLI
- Flux HelmRelease
- Hubble
- Prometheus ServiceMonitor
- eBPF kube-proxy replacement

## Sources Consulted
- Cilium Helm installation documentation: https://docs.cilium.io/en/stable/installation/k8s-install-helm/
- Cilium Helm values reference: https://docs.cilium.io/en/stable/helm-values/
- Cilium connectivity test command reference: https://docs.cilium.io/en/latest/cmdref/cilium_connectivity_test/
- Cilium status command reference: https://docs.cilium.io/en/latest/cmdref/cilium_status/
- Cilium Monitoring & Metrics documentation: https://docs.cilium.io/en/stable/observability/metrics/
- Cilium Helm chart repository index: https://helm.cilium.io/index.yaml
- Cilium CLI stable version source: https://raw.githubusercontent.com/cilium/cilium-cli/main/stable.txt
- Helm v3 upgrade command reference: https://helm.sh/docs/v3/helm/helm_upgrade
- Helm search repo command reference: https://helm.sh/docs/helm/helm_search_repo/
- Flux HelmRelease v2 API reference: https://fluxcd.io/flux/components/helm/api/v2/

## Issues Found
- The prerequisite listed `cilium` CLI v1.14+, but the Cilium CLI currently uses v0.x release versions. Changed this to "Latest stable `cilium` CLI" to match Cilium's official installation guidance.
- The examples pinned Cilium chart version 1.15.0, which is outdated for a 2026 installation guide. Updated the script and Flux HelmRelease examples to 1.19.4, which is present in the official Cilium Helm chart repository.
- The install script used `cilium connectivity test --test pod-to-pod`. The `--test` flag accepts regular expressions against Cilium CLI test names and can skip expected validation coverage if the pattern does not match the intended scenarios. Changed it to run the standard connectivity test suite with `--timeout 120s`.
- The Prometheus ServiceMonitor comment said it creates a ServiceMonitor CRD. The Helm value creates a ServiceMonitor resource and requires the Prometheus Operator CRD to already exist. Updated the comment accordingly.

## Review Notes
- The traditional `https://helm.cilium.io/` repository remains supported, although current Cilium documentation recommends OCI chart references for new installs.
- `k8sServiceHost` and `k8sServicePort` are correctly included for kube-proxy replacement, but their values must be tailored to the cluster's actual Kubernetes API endpoint.
- Enabling `prometheus.serviceMonitor.enabled` will fail unless the Prometheus Operator ServiceMonitor CRD is installed or the chart is configured to trust existing CRDs as appropriate for the environment.
