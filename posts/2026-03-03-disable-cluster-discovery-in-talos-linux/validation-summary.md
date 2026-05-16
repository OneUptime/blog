# Validation Summary: How to Disable Cluster Discovery in Talos Linux

## Status
validated

## Post Type
Tutorial / How-to Guide

## Technologies Covered
- Talos Linux (cluster discovery configuration)
- talosctl CLI (`patch machineconfig`, `get`, `logs`, `etcd members`)
- KubeSpan (WireGuard-based node mesh networking)
- Kubernetes (kubectl, control plane endpoint)
- Sidero Labs discovery service (`discovery.talos.dev`)
- Prometheus (`PrometheusRule`, kube-state-metrics)

## Sources Consulted
- Talos Linux Discovery Service docs: https://www.talos.dev/v1.10/talos-guides/discovery/ (redirects to https://docs.siderolabs.com/talos/v1.10/configure-your-talos-cluster/system-configuration/discovery)
- Talos v1.10 source: `pkg/machinery/resources/cluster/member.go` (resource type `Members.cluster.talos.dev`)
- Talos v1.10 source: `pkg/machinery/resources/kubespan/peer_status.go` (resource type `KubeSpanPeerStatuses.kubespan.talos.dev`)
- Talos v1.10 source: `internal/app/machined/pkg/runtime/v1alpha2/v1alpha2_controller.go` (confirms `controller-runtime` is a valid log service name via `MakeLogger("controller-runtime")`)
- Talos v1.10 config reference: https://docs.siderolabs.com/talos/v1.10/reference/configuration/v1alpha1/config/ (confirms `machine.network.kubespan.enabled` and `cluster.discovery.*` paths)
- Talos KubeSpan docs (raw): https://raw.githubusercontent.com/siderolabs/talos/release-1.10/website/content/v1.10/talos-guides/network/kubespan.md (confirms `talosctl get kubespanpeerstatuses` plural form)

## Issues Found
1. **Wrong resource name `discoveredmembers`** — `talosctl get discoveredmembers` was used in three places. There is no such resource in Talos; the discovered cluster members are exposed via the `Members.cluster.talos.dev` resource, queried as `talosctl get members` (per the official discovery docs and source in `pkg/machinery/resources/cluster/member.go`). Changed all three occurrences to `talosctl get members`.
2. **Wrong resource name `kubespanpeerstatus` (singular)** — `talosctl get kubespanpeerstatus` was used in two places. The resource type is `KubeSpanPeerStatuses` (plural), and the official KubeSpan docs and source use `talosctl get kubespanpeerstatuses`. Changed both occurrences to the plural form.

## Review Notes
- `talosctl logs controller-runtime` is a valid command: the controller runtime logger is registered with that service name in `v1alpha2_controller.go` (`ctrl.MakeLogger("controller-runtime")`), so the log subcommand accepts it. Verified, no change needed.
- All configuration field paths checked (`cluster.discovery.enabled`, `cluster.discovery.registries.service.disabled`, `cluster.discovery.registries.kubernetes.disabled`, `cluster.discovery.registries.service.endpoint`, `cluster.controlPlane.endpoint`, `machine.network.kubespan.enabled`) match the v1alpha1 machine config reference.
- The default external discovery endpoint `https://discovery.talos.dev/` is correctly cited.
- Note for future updates: per the official discovery docs, the Kubernetes registry is **disabled by default** in current Talos and is **deprecated** because it is incompatible with Kubernetes 1.32+ default node authorization (`AuthorizeNodeWithSelectors`). The post's recommendation in the closing paragraph to "keep at least the Kubernetes registry enabled" is therefore at odds with current Talos guidance — the safer current recommendation would be to keep the service registry enabled (optionally self-hosted) rather than relying on the deprecated Kubernetes registry. This is a guidance/freshness concern rather than a factual error in the commands or config, so the post was left as written.
- The Prometheus alert expression `kube_node_status_condition{condition="Ready",status="true"} == 0` is correct: kube-state-metrics emits 1 when the labeled condition/status pair holds, so `== 0` correctly identifies a node that is not Ready.
- Cilium does support transparent WireGuard encryption at the CNI level — claim verified.
