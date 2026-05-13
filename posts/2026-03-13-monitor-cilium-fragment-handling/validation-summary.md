# Validation Summary: Monitor Cilium Fragment Handling

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Cilium
- Kubernetes
- Hubble
- eBPF
- IP fragmentation
- MTU configuration
- VXLAN/Geneve overlay networking

## Sources Consulted
- Cilium Fragment Handling documentation: https://docs.cilium.io/en/latest/network/concepts/fragmentation/
- Cilium Monitoring & Metrics documentation: https://docs.cilium.io/en/latest/observability/metrics/
- Cilium Routing documentation: https://docs.cilium.io/en/stable/network/concepts/routing/
- Cilium configuration documentation: https://docs.cilium.io/en/stable/configuration/
- Cilium Helm values reference for MTU: https://docs.cilium.io/en/stable/helm-values/
- Cilium `cilium-dbg monitor` command reference: https://docs.cilium.io/en/stable/cmdref/cilium-dbg_monitor/
- Cilium `cilium-dbg metrics list` command reference: https://docs.cilium.io/en/stable/cmdref/cilium-dbg_metrics_list/
- Hubble CLI documentation: https://docs.cilium.io/en/latest/observability/hubble/hubble-cli.html

## Issues Found
- The introduction described Cilium fragment tracking as targeting UDP and protocols that do not perform PMTUD. Cilium documents the feature as fragment tracking for protocols that do not support segmentation, such as UDP, so the wording was corrected.
- The prerequisites listed Cilium v1.14+, but the documented fragment handling and `cilium-dbg bpf frag` command references are associated with current Cilium documentation from v1.18+ onward. The prerequisite was updated to Cilium v1.18+.
- In-agent commands used `cilium status`, `cilium metrics list`, and `cilium monitor`. Current Cilium agent command references use `cilium-dbg status`, `cilium-dbg metrics list`, and `cilium-dbg monitor`, so the commands were updated.
- The post referenced a non-documented Prometheus alert example `cilium_drop_count_total{reason="Fragmented packet"}`. It was replaced with documented fragment-related metrics: `cilium_fragmented_count_total`, `cilium_mtu_error_message_total`, and `cilium_bpf_map_pressure` for the IPv4/IPv6 fragment maps.
- The Hubble JSON example used deprecated or incorrect fields (`drop_reason` and lowercase `ip`). It was updated to use `drop_reason_desc` and the documented JSON `IP` field.
- The MTU configuration snippet described `auto-direct-node-routes: "false"` as automatic MTU detection. That option controls direct routing behavior, not MTU detection, so the comment was replaced with guidance to leave `mtu` unset or set it to `0` for automatic MTU detection.
- The Hubble section implied Hubble exposes payload sizes approaching MTU limits. Hubble flow records are better used for correlating drops and UDP conversations with fragment metrics, so the wording was corrected.

## Review Notes
The guide is technically relevant and useful after correction. Future improvements could mention that manual edits to `cilium-config` may be overwritten in Helm-managed installations, where `helm upgrade` or `cilium config set` is usually preferable.
