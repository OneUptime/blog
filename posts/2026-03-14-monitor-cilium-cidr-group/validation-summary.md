# Validation Summary: Monitoring CiliumCIDRGroup in Kubernetes

## Status
validated

## Post Type
Tutorial / monitoring guide

## Technologies Covered
- Cilium
- CiliumCIDRGroup and CiliumNetworkPolicy
- Kubernetes
- Prometheus and Prometheus Operator
- Grafana
- Hubble
- Helm

## Sources Consulted
- Cilium CiliumCIDRGroup documentation: https://docs.cilium.io/en/latest/network/kubernetes/ciliumcidrgroup/
- Cilium Monitoring & Metrics documentation: https://docs.cilium.io/en/stable/observability/metrics/
- Cilium Helm Reference: https://docs.cilium.io/en/stable/helm-reference/
- Cilium Hubble CLI documentation: https://docs.cilium.io/en/latest/observability/hubble/hubble-cli.html
- Cilium `cilium-dbg metrics list` command reference: https://docs.cilium.io/en/stable/cmdref/cilium-dbg_metrics_list.html
- Cilium Creating Policies from Verdicts documentation: https://docs.cilium.io/en/latest/security/policy-creation/
- Cilium GitHub release/support information: https://github.com/cilium/cilium

## Issues Found
- The post used `cilium metrics list` inside the Cilium pod. Current Cilium command reference documents the in-agent debug command as `cilium-dbg metrics list`, so the examples were updated accordingly.
- The post used `cilium_policy_count`, which is not the current Prometheus metric name for the policy gauge. Cilium exports the `policy` metric under the `cilium_` namespace, so the PromQL examples now use `cilium_policy`.
- The post referenced `cilium_policy_import_errors_total`, which is not present in current Cilium metrics documentation. The alert and dashboard examples now use failed policy changes via `cilium_policy_change_total{outcome="failure"}`.
- The post filtered endpoint regenerations with a non-existent `reason="policy"` label and used `outcome="fail"`. Cilium documents `endpoint_regenerations_total` with an `outcome` label, so the examples now aggregate by outcome and use `outcome="failure"` for failures.
- The dashboard used `cilium_policy_l3l4_total`, which is not a documented current Cilium metric. It now uses Hubble policy verdicts through `hubble_policy_verdicts_total`, and the Helm command enables the Hubble `policy` metric.
- The Hubble metrics Helm configuration omitted `hubble.enabled=true` and used deprecated `http` Hubble metrics. The Helm example now enables Hubble and uses `httpV2`.
- The Hubble example used `--type drop`, which is not the documented way to filter dropped flows. It now uses `--verdict DROPPED`.
- The `--to-ip` example used a CIDR block even though Hubble's IP filter is for IP addresses. It now demonstrates filtering a specific IP in the referenced CIDR range.
- The endpoint regeneration histogram query missed aggregation by `le`, which is required for a correct Prometheus `histogram_quantile()` over classic histogram buckets.
- The Helm command pinned Cilium `1.16.5`, which is older than the currently maintained release branches listed by the Cilium project as of this review date. It was updated to `1.19.3`.

## Review Notes
- CiliumCIDRGroup is still documented as `apiVersion: cilium.io/v2alpha1` with `spec.externalCIDRs`, and `cidrGroupRef` remains the documented way to reference a group from `fromCIDRSet`.
