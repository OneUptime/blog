# Validation Summary: Cilium Node Health

## Status
validated

## Post Type
Guide

## Technologies Covered
- Cilium
- Kubernetes
- eBPF and BPF datapath inspection
- Cilium health checking
- Prometheus metrics and PrometheusRule alerts

## Sources Consulted
- Cilium command reference: `cilium status` - https://docs.cilium.io/en/latest/cmdref/cilium_status/
- Cilium command reference: `cilium-dbg status` - https://docs.cilium.io/en/stable/cmdref/cilium-dbg_status.html
- Cilium command reference: `cilium-health status` - https://docs.cilium.io/en/stable/cmdref/cilium-health_status/
- Cilium command reference: `cilium-health ping` - https://docs.cilium.io/en/stable/cmdref/cilium-health_ping/
- Cilium troubleshooting guide, checking cluster connectivity health - https://docs.cilium.io/en/stable/operations/troubleshooting/
- Cilium monitoring and metrics reference - https://docs.cilium.io/en/stable/observability/metrics/
- Cilium system requirements, health-check connectivity ports - https://docs.cilium.io/en/stable/operations/system_requirements/
- Cilium BPF and XDP reference guide - https://docs.cilium.io/en/stable/reference-guides/bpf/

## Issues Found
- The post described `cilium status --verbose` as local node health. The Cilium CLI command reports cluster Cilium status through Kubernetes, while detailed in-pod daemon status is exposed by `cilium-dbg status --verbose`. Added the `kubectl exec ... cilium-dbg status --verbose` command and adjusted the comment.
- The `cilium-health` examples were shown as local commands, but official Kubernetes troubleshooting examples run them inside a Cilium pod. Updated the commands to use `kubectl exec -n kube-system ds/cilium -- cilium-health ...`.
- The command `cilium-health ping <node-name>` was incorrect. Official command reference shows `cilium-health ping` only checks whether the health API is up and accepts no node-name argument. Replaced it with `cilium-health status --succinct` for a per-node summary.
- The sample `cilium-health status` output used a `Probe Summary` format that is not the format shown in the current official troubleshooting guide. Replaced it with a per-node host connectivity example using ICMP and HTTP status lines.
- The BPF status example used `cilium status` inside the Cilium pod. Current Cilium documentation uses `cilium-dbg status` for daemon-level status inside the pod, so the command was updated.
- The recovery example used `NODE_IP` with `--field-selector spec.nodeName=...`. Kubernetes `spec.nodeName` matches the node name, not the node IP. Changed the variable to `NODE_NAME`.
- The metrics section referenced `cilium_up`, which is not a Cilium-exported metric in the official Cilium metrics reference. Replaced it with a metrics endpoint reachability check.
- The inter-node connectivity metric examples used `cilium_node_connectivity...`, but the current metrics reference documents `cilium_unreachable_nodes`, `cilium_unreachable_health_endpoints`, and `cilium_node_health_connectivity_status`. Updated the grep command and Prometheus alert expression accordingly.
- The endpoint regeneration failure grep was made more precise by matching the documented `outcome` label on `cilium_endpoint_regenerations_total`.

## Review Notes
The guide intentionally uses generic pod and node placeholders. In a real cluster, interface names such as `eth0`, Prometheus job labels such as `job="cilium-agent"`, and metric availability can vary by Cilium installation options and scrape configuration.
