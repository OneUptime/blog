# Validation Summary: How to Deploy Datadog Agent with Flux CD

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Flux CD
- Kubernetes
- Datadog Agent
- Datadog Helm chart
- Datadog Cluster Agent
- SOPS
- Kustomize
- HelmRelease and HelmRepository custom resources

## Sources Consulted
- Datadog Helm chart values: https://github.com/DataDog/helm-charts/blob/main/charts/datadog/values.yaml
- Datadog Helm chart DaemonSet and Cluster Agent templates: https://github.com/DataDog/helm-charts/tree/main/charts/datadog/templates
- Datadog Kubernetes APM documentation: https://docs.datadoghq.com/containers/kubernetes/apm/
- Datadog Kubernetes log collection documentation: https://docs.datadoghq.com/containers/kubernetes/log/
- Datadog Kubernetes configuration documentation: https://docs.datadoghq.com/containers/kubernetes/configuration/
- Datadog Cloud Network Monitoring setup documentation: https://docs.datadoghq.com/network_monitoring/cloud_network_monitoring/setup/
- Flux HelmRelease documentation: https://fluxcd.io/flux/components/helm/helmreleases/
- Flux HelmRepository documentation: https://fluxcd.io/flux/components/source/helmrepositories/
- Flux Kustomization and SOPS decryption documentation: https://fluxcd.io/flux/components/kustomize/kustomizations/

## Issues Found
- The Helm values enabled `datadog.processAgent.enabled`, which the current Datadog chart marks as deprecated in favor of `datadog.processAgent.processCollection` or `datadog.processAgent.containerCollection`. Removed the deprecated `enabled` field and kept `processCollection: true`.
- The Helm values set `datadog.kubeStateMetricsEnabled: true`, which deploys the legacy kube-state-metrics deployment and is marked for removal in Datadog chart 4.0. Changed it to `false` while keeping `kubeStateMetricsCore.enabled: true`.
- The verification commands used pod label selectors that do not match the current Datadog Helm chart templates for a release named `datadog-agent`. Updated the Agent selector to `app=datadog-agent`, added `-c agent` to the `kubectl exec` command, and updated the Cluster Agent selector to `app=datadog-agent-cluster-agent`.
- The troubleshooting note said Network Performance Monitoring requires kernel headers. Current Datadog Cloud Network Monitoring documentation describes eBPF and supported kernel/platform requirements, so the note was revised to check supported OS/kernel versions and a Helm chart version that supports `datadog.networkMonitoring.enabled`.

## Review Notes
- The Flux API versions used in the examples are current for HelmRelease, HelmRepository, and Kustomization.
- The SOPS decryption example is consistent with Flux Kustomization decryption fields, but an actual repository should also include a working `.sops.yaml` or equivalent SOPS recipient configuration.
- Local `helm`, `flux`, and `sops` binaries were not installed in this workspace, so CLI validation was performed against official documentation and upstream chart templates instead of local command help output.
