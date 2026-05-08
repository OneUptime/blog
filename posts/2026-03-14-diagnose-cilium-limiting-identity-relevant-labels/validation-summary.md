# Validation Summary: Diagnosing Cilium Limiting Identity-Relevant Labels

## Status
validated

## Post Type
Technical troubleshooting guide

## Technologies Covered
- Cilium
- Kubernetes
- Cilium security identities and identity-relevant labels
- Cilium CLI and `cilium-dbg`
- Hubble
- eBPF/BPF diagnostics
- `kubectl`, `jq`, `bpftool`, and `bpftrace`

## Sources Consulted
- Cilium documentation: Limiting Identity-Relevant Labels - https://docs.cilium.io/en/stable/operations/performance/scalability/identity-relevant-labels.html
- Cilium documentation: Security Identities - https://docs.cilium.io/en/stable/internals/security-identities/
- Cilium documentation: Identity Management Mode - https://docs.cilium.io/en/stable/network/kubernetes/identity-management-mode.html
- Cilium command reference: `cilium` CLI - https://docs.cilium.io/en/latest/cmdref/index_cilium_cli/
- Cilium command reference: `cilium-dbg identity list` - https://docs.cilium.io/en/stable/cmdref/cilium-dbg_identity_list.html
- Cilium command reference: `cilium-dbg bpf policy get` - https://docs.cilium.io/en/stable/cmdref/cilium-dbg_bpf_policy_get.html
- Cilium command reference: `cilium-dbg metrics list` - https://docs.cilium.io/en/stable/cmdref/cilium-dbg_metrics_list.html
- Cilium command reference: `cilium-dbg monitor` - https://docs.cilium.io/en/stable/cmdref/cilium-dbg_monitor.html
- Cilium documentation: Hubble setup and port-forwarding - https://docs.cilium.io/en/stable/observability/hubble/setup/
- Cilium documentation: Hubble flow export JSON shape - https://docs.cilium.io/en/latest/observability/hubble/configuration/export.html
- Cilium Helm values: operator identity GC defaults - https://docs.cilium.io/en/stable/helm-values/

## Issues Found
- The post used `cilium identity list`, `cilium bpf`, `cilium endpoint`, and `cilium monitor` as top-level Cilium CLI commands. Current Cilium documentation exposes these troubleshooting commands as `cilium-dbg` commands inside Cilium agent pods, so the examples were updated to use `kubectl exec ... -- cilium-dbg ...` or Kubernetes `CiliumIdentity` resources.
- The identity count examples used `cilium identity list | wc -l`, which would not work with the external Cilium CLI and could include table header lines. They now use `kubectl get ciliumidentities.cilium.io --no-headers | wc -l`.
- The JSON identity label analysis assumed `cilium identity list -o json` output. It now reads the `security-labels` field from `CiliumIdentity` resources, which matches the Kubernetes CRD representation.
- The ratio guidance claimed that identity-to-pod ratio should be below 0.5 and above 1.0 indicates identity explosion. That threshold is not stated in Cilium documentation, so it was replaced with a softer warning that ratios near 1.0 should be investigated.
- The metrics example searched for `policy_computation`, which is not the documented current metric name. It now uses `identity_updater_timer_duration` with `name="id-alloc-update-policy-maps"` as the relevant identity and policy map update timing metric.
- The troubleshooting note said namespace-level identities are the minimum. Cilium's default inclusive identity labels also include reserved labels, cluster, service account, and `app.kubernetes.io`, so the note was corrected.
- The Hubble `jq` examples referenced top-level `.verdict`, `.source`, and `.destination` fields. Current Hubble JSON output wraps flows under `.flow`, so the examples now use `.flow.verdict`, `.flow.source`, and `.flow.destination`.
- The `bpftrace` example referenced `args->action` on `tracepoint:xdp:xdp_redirect`, which is not a portable field for that tracepoint. It now counts redirect events without reading that field.

## Review Notes
The corrected commands were validated against official Cilium documentation, but they were not executed against a live Cilium cluster from this workspace. The article still focuses on diagnostics and does not include a full label configuration remediation workflow; adding one could be useful in a future revision.
