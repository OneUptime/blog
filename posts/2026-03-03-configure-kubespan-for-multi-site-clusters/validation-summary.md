# Validation Summary: How to Configure KubeSpan for Multi-Site Clusters

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Talos Linux
- KubeSpan
- WireGuard
- Kubernetes (kubectl, node affinity, topology labels)
- talosctl CLI
- iptables
- jq

## Sources Consulted
- Talos Linux KubeSpan guide: https://www.talos.dev/latest/talos-guides/network/kubespan/
- KubeSpanConfig schema reference: https://www.talos.dev/latest/reference/configuration/network/kubespanconfig/
- Talos network connectivity reference: https://www.talos.dev/latest/learn-more/talos-network-connectivity/
- talosctl CLI reference: https://www.talos.dev/latest/reference/cli/
- Sidero Labs Talos docs (v1.12/v1.14): https://docs.siderolabs.com/talos/v1.14/

## Issues Found
1. **Incorrect COSI resource name** — The post used `talosctl get kubespanpeerstatus` (singular). The official resource name is `kubespanpeerstatuses` (plural), consistent with the other KubeSpan resources (`kubespanidentities`, `kubespanpeerspecs`, `kubespanendpoints`). Fixed in two locations (verification section and the monitoring script).
2. **jq pipeline against `talosctl get -o json` output** — `talosctl get -o json` emits resources as separate JSON documents (NDJSON), so `jq '.[] | ...'` would not iterate them as intended. Added `jq -s` (slurp) so the documents are first collected into an array before iteration.

## Review Notes
- All other technical claims verified correct against official Talos documentation:
  - `talosctl gen config --with-kubespan` flag exists and enables KubeSpan during config generation.
  - KubeSpan schema fields used (`enabled`, `advertiseKubernetesNetworks`, `mtu` default 1420, `filters.endpoints`, `allowDownPeerBypass`) are all valid under `machine.network.kubespan`.
  - The `!` prefix in `filters.endpoints` for CIDR exclusion is the documented syntax (note: must be YAML-quoted, which the post does).
  - UDP 51820 is the documented default KubeSpan WireGuard port.
  - TCP 50000 (apid) and TCP 50001 (trustd) are the documented Talos API/trustd ports.
  - `advertiseKubernetesNetworks` behavior is described accurately — when enabled, KubeSpan takes over pod-to-pod traffic; when disabled, the CNI handles pod-to-pod encapsulation.
- In newer Talos versions, KubeSpan can also be configured as a standalone `KubeSpanConfig` document (`apiVersion: v1alpha1, kind: KubeSpanConfig`) in addition to the nested `machine.network.kubespan` form shown in the post. The post's nested form is still supported and valid.
- The `harvestExtraEndpoints` option exists but is not mentioned in the post — not required and out of scope for a multi-site primer.
- Kubernetes API examples (Deployment with `nodeAffinity`, `topology.kubernetes.io/zone` labels, `kubectl label node`) are all syntactically and semantically correct.
