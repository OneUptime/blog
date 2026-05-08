# Validation Summary: Preventing Excluding Labels in Cilium Performance

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Cilium
- Kubernetes
- Helm
- Prometheus Operator
- PromQL
- Flux HelmRelease
- Shell scripting

## Sources Consulted
- Cilium documentation: Limiting Identity-Relevant Labels - https://docs.cilium.io/en/stable/operations/performance/scalability/identity-relevant-labels/
- Cilium documentation: Monitoring & Metrics - https://docs.cilium.io/en/stable/observability/metrics/
- Cilium documentation: Identity Management Mode - https://docs.cilium.io/en/stable/network/kubernetes/identity-management-mode/
- Cilium CLI command reference: cilium config - https://docs.cilium.io/en/latest/cmdref/cilium_config.html
- Cilium debug CLI command reference: cilium-dbg identity list - https://docs.cilium.io/en/stable/cmdref/cilium-dbg_identity_list.html
- Cilium documentation: Terminology and label sources - https://docs.cilium.io/en/stable/gettingstarted/terminology/
- Flux documentation: HelmRelease API - https://fluxcd.io/flux/components/helm/helmreleases/
- Prometheus documentation: Query functions - https://prometheus.io/docs/prometheus/latest/querying/functions/
- Kubernetes documentation: CronJob - https://kubernetes.io/docs/concepts/workloads/controllers/cron-jobs/

## Issues Found
- The post implied that `pod-template-hash`, `controller-revision-hash`, and `pod-template-generation` must be added as custom exclusions. Cilium already excludes these labels by default, so the introduction, example configuration, runbook text, troubleshooting note, and conclusion were updated to distinguish default exclusions from additional custom exclusions.
- The Prometheus alert used `cilium_identity_count`, which is not the documented Cilium metric name. Updated the alert expressions to use `max(cilium_identity)` and a one-hour delta expression for growth.
- The verification commands used `cilium identity list`, which is not part of the documented Kubernetes-facing Cilium CLI. Updated them to execute `cilium-dbg identity list` inside the Cilium DaemonSet.
- The CronJob example used `jq` inside a `bitnami/kubectl` container where `jq` is not guaranteed to be present. Replaced the in-container parsing with `kubectl` Go templates and `awk`.
- The troubleshooting guidance said to add an excluded policy label to the include list. Clarified that custom include patterns should be tested carefully because inclusive label configuration changes identity relevance to an allow-list model.
- The shell snapshot scripts used unquoted variable expansions for filesystem paths. Quoted the snapshot paths to avoid failures on unusual path values.

## Review Notes
The examples still assume supporting test pods, Prometheus Operator CRDs, Flux resources, and performance tools such as `iperf3` and `netperf` already exist in the target cluster. Those are deployment prerequisites rather than Cilium syntax issues.
