# Validation Summary: How to Monitor Discovery Status in Talos Linux

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Talos Linux (discovery service, COSI resources)
- talosctl CLI
- KubeSpan
- Kubernetes (kubectl)
- Bash scripting
- Python (prometheus_client)
- Prometheus (PrometheusRule CRD via prometheus-operator)
- Grafana
- OneUptime heartbeat monitors

## Sources Consulted
- Talos Linux discovery docs: https://docs.siderolabs.com/talos/v1.9/configure-your-talos-cluster/system-configuration/discovery
- Talos KubeSpan docs: https://docs.siderolabs.com/talos/v1.9/networking/kubespan/
- talosctl CLI reference: https://docs.siderolabs.com/talos/v1.9/reference/cli/
- Talos discovery-service source: https://github.com/siderolabs/discovery-service
- Talos source — cluster members controller: https://github.com/siderolabs/talos/blob/main/internal/app/machined/pkg/controllers/cluster/member.go
- Talos troubleshooting docs: https://docs.siderolabs.com/talos/v1.9/troubleshooting/troubleshooting
- Prometheus naming conventions: https://prometheus.io/docs/practices/naming/

## Issues Found

1. **Invalid resource name `discoveredmembers`.** Talos does not expose a `discoveredmembers` COSI resource. The correct resource is `members` (under `cluster.talos.dev`). Replaced every `talosctl get discoveredmembers` invocation with `talosctl get members` (bash one-liner, monitoring script, watch command, Python exporter, OneUptime integration).

2. **Invalid resource name `clusteridentity`.** Talos does not have a `clusteridentity` resource. The correct resource is `identity` (alias for `Identities.cluster.talos.dev`). Updated the command and its inline description ("node identity used for discovery" instead of "cluster ID").

3. **Incorrect "subtract self" logic in monitoring script.** The script subtracted 1 from the expected count with the comment "a node does not discover itself". This is false: the `members` resource is built from all affiliates with a `Nodename` set, including the local node's own affiliate, so each node should see the full cluster member count. Removed the `- 1` adjustment in the `MISSING` calculation and the "expected" message.

4. **Off-by-one in the `TalosDiscoveryMembersMissing` PromQL.** The expression `talos_discovered_members_total < (count(kube_node_info) - 1)` assumed self-exclusion. Changed to `talos_discovered_members_total < count(kube_node_info)` to match the actual member count.

5. **OneUptime integration threshold.** The `-lt 2` check made sense under the (incorrect) self-exclusion assumption. Switched to `-lt "${#NODES[@]}"` so a healthy cluster requires every node to be visible.

## Review Notes

- `kubespanidentity` and `kubespanpeerstatus` are accepted as singular aliases by `talosctl`; the canonical plural forms (`kubespanidentities`, `kubespanpeerstatuses`) appear in the official docs but both work. Left as-is.
- The Python exporter exposes `talos_discovered_members_total` as a Gauge. The `_total` suffix is reserved for Counters by Prometheus naming conventions; functionally it still scrapes correctly, but a future revision could rename to `talos_discovered_members` for convention compliance.
- `https://discovery.talos.dev/` does return HTTP 200 (it serves a landing page); the actual discovery protocol is gRPC over TLS on 443. The post's HTTP 200 health check is therefore valid as a liveness signal but does not exercise the gRPC discovery API itself.
- The `talosctl logs controller-runtime` invocation is correct; `controller-runtime` is the canonical service name for Talos COSI controller logs.
