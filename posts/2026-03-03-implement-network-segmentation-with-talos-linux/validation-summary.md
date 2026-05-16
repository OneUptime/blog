# Validation Summary: How to Implement Network Segmentation with Talos Linux

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Talos Linux (machine configuration, host firewall, VLANs)
- talosctl CLI
- Kubernetes NetworkPolicy (networking.k8s.io/v1)
- Cilium CNI (CiliumNetworkPolicy cilium.io/v2)
- Cilium CLI (`cilium install`, `cilium hubble enable`)
- Hubble (`hubble observe`)
- Prometheus alerting rules

## Sources Consulted
- Talos host firewall guide: https://docs.siderolabs.com/talos/v1.7/networking/host-firewall/
- Talos `NetworkRuleConfig` reference: https://docs.siderolabs.com/talos/v1.7/reference/configuration/network/networkruleconfig/
- Talos `NetworkDefaultActionConfig` reference: https://docs.siderolabs.com/talos/v1.7/reference/configuration/network/networkdefaultactionconfig/
- Talos `v1alpha1` config / interface VLAN reference (machine.network.interfaces[].vlans[].vlanId)
- Talos configuration patches guide: https://docs.siderolabs.com/talos/v1.9/configure-your-talos-cluster/system-configuration/patching
- Cilium Helm/CLI installation docs: https://docs.cilium.io/en/stable/installation/k8s-install-helm/
- Cilium CLI repo / `--helm-set` deprecation discussion: https://github.com/cilium/cilium-cli
- Kubernetes NetworkPolicy reference (networking.k8s.io/v1): https://kubernetes.io/docs/concepts/services-networking/network-policies/

## Issues Found

1. **Talos host firewall configuration format was incorrect.** The original post defined firewall rules under `machine.network.rules` using fields like `action`, `direction`, `protocol`, `portRanges` (with `lo`/`hi`), and `source.network`. Talos does not have such a schema. The host firewall in Talos is configured via separate `apiVersion: v1alpha1` documents — `NetworkDefaultActionConfig` (with `ingress: accept|block`) and one or more `NetworkRuleConfig` documents (with `portSelector.ports`, `portSelector.protocol`, and `ingress[].subnet`). I rewrote both firewall examples (`machine-config-firewall.yaml` and `machine-config-api-isolation.yaml`) to use the documented format and added a sentence explaining that with `ingress: block` as the default, no explicit deny rule is needed.

2. **Invalid IP address in the VLAN example.** `10.0.300.10/24` is not a valid IPv4 address because `300` exceeds the 0–255 octet range. Changed to `10.30.0.10/24`, which keeps the storage segment distinct from the other VLAN segments while remaining a valid address.

3. **`talosctl apply-config --config-patch @file.yaml` usage was misleading.** `talosctl apply-config` applies a complete machine configuration and expects `-f`/`--file`; using it with only `--config-patch` and no base config does not produce the intended effect. Replaced with `talosctl patch mc --nodes <ip> --patch @file.yaml`, which is the documented way to apply a strategic merge / JSON patch (including additional documents like `NetworkRuleConfig`) to the running machine config.

4. **Deprecated Cilium CLI flag.** `cilium install --helm-set ipam.mode=kubernetes` uses the deprecated `--helm-set` flag. Updated to `--set ipam.mode=kubernetes`, which is the current form in recent Cilium CLI versions.

## Review Notes

- The Kubernetes `NetworkPolicy` examples (apiVersion `networking.k8s.io/v1`, `podSelector`, `policyTypes`, `ingress.from.podSelector`, `ports`) match the current Kubernetes API. The default-deny example using `podSelector: {}` with both `Ingress` and `Egress` in `policyTypes` is the canonical pattern.
- The `CiliumNetworkPolicy` example uses `apiVersion: cilium.io/v2`, which is current. The L7 HTTP rules block (`rules.http` with `method` and `path`) is valid Cilium syntax.
- `hubble observe` flags used in the post (`--namespace`, `--verdict DROPPED`, `--type drop`, `--last`, `--from-label`, `--to-label`) are all valid for current Hubble CLI versions.
- The Prometheus alert example references a `hubble_drop_total` metric. Cilium exposes Hubble drop metrics, though the exact metric name can vary by Cilium/Hubble version and the configured metric set (e.g., `hubble_drop_total` vs. `hubble_flows_processed_total` filtered by verdict). Operators should confirm the metric name matches what their Hubble exporter is producing before relying on the alert.
- The post does not pin specific versions of Talos, Cilium, or Kubernetes. The fixes were validated against Talos v1.7+ semantics (where `NetworkRuleConfig` / `NetworkDefaultActionConfig` are the documented host firewall mechanism) and Cilium 1.16+ CLI conventions.
