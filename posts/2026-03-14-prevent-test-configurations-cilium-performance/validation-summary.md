# Validation Summary: Preventing Test Configuration Issues in Cilium Performance

## Status
validated

## Post Type
Guide

## Technologies Covered
- Cilium
- Kubernetes
- Helm
- Flux HelmRelease
- Prometheus Operator
- Bash
- iperf3
- netperf
- jq
- yq

## Sources Consulted
- Cilium Helm Reference: https://docs.cilium.io/en/stable/helm-reference/
- Cilium ConfigMap drift detection: https://docs.cilium.io/en/stable/configuration/configmap-drift-detection/
- Cilium Monitoring & Metrics: https://docs.cilium.io/en/stable/observability/metrics.html
- Cilium Kubernetes requirements: https://docs.cilium.io/en/stable/network/kubernetes/requirements.html
- Cilium v1.18.0 release notes discussion for ConfigMap drift checker introduction: https://github.com/cilium/cilium/discussions/37977
- Helm get values command reference: https://helm.sh/docs/helm/helm_get_values/
- Flux HelmRelease API v2 reference: https://fluxcd.io/flux/components/helm/api/v2/
- Prometheus Operator API reference: https://prometheus-operator.dev/docs/api-reference/api/

## Issues Found
- The Cilium Helm values used `tunnel: disabled` alongside `routingMode: native`. `tunnel` was deprecated in favor of `routingMode` and `tunnelProtocol`, and removed in later Cilium versions, so the values file now uses `routingMode: native` only.
- The BPF connection tracking values used old flag-style names, `bpf.ctGlobalTCPMax` and `bpf.ctGlobalAnyMax`. The documented Helm values are `bpf.ctTcpMax` and `bpf.ctAnyMax`, so the snippet was updated.
- The validation script hashed the raw local YAML file and `helm get values` output directly. That can fail because comments and formatting are not preserved in Helm's stored values. The script now canonicalizes both YAML documents to sorted JSON with `yq` before hashing and diffing, and `yq` was added to prerequisites.
- The Prometheus alert used `cilium_agent_boot_time`, which is not listed in the Cilium metrics reference. It now uses the documented `cilium_drift_checker_config_delta` metric for unapplied Cilium ConfigMap changes.
- The post claimed compatibility with Kubernetes v1.24+ and Cilium v1.14+, but current Cilium docs list supported Kubernetes versions per Cilium release, and the drift checker metric used for accurate ConfigMap drift alerting was introduced with the v1.18 line. The prerequisite now asks for a Kubernetes version supported by the chosen Cilium release and the Flux chart version example now uses Cilium v1.18.
- The Flux `valuesFrom` example omitted `valuesKey` even though the file shown in Git was named `cilium-values.yaml`; Flux defaults to `values.yaml`. The example now sets `valuesKey: cilium-values.yaml`.
- The Flux `sourceRef` example omitted the HelmRepository namespace. It now specifies `namespace: flux-system`, matching the common layout where HelmRepository resources live outside the release namespace.

## Review Notes
The examples assume supporting benchmark pods, services, Flux source objects, Prometheus scraping, `jq`, `bc`, `iperf3`, and `netperf` are already installed. These are reasonable for a performance-testing guide, but a future expansion could include setup manifests or links for those prerequisites.
