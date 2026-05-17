# Validation Summary: How to Configure Ingress Firewall Rules in Talos Linux

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Talos Linux host firewall (`NetworkRuleConfig`, `NetworkDefaultActionConfig`)
- nftables
- `talosctl` CLI (`apply-config`, `get nftableschain`, `read`)
- Kubernetes control-plane service ports (Talos API, kube-apiserver, etcd, kubelet, scheduler, controller-manager)
- CNI port reference (Cilium, Calico)

## Sources Consulted
- [Talos Ingress Firewall guide (v1.9)](https://docs.siderolabs.com/talos/v1.9/networking/ingress-firewall/)
- [Talos NetworkRuleConfig reference (v1.10)](https://www.talos.dev/v1.10/reference/configuration/network/networkruleconfig/)
- [Talos CLI reference (v1.9)](https://docs.siderolabs.com/talos/v1.9/reference/cli/)
- siderolabs/talos GitHub issue #9009 (firewall ruleset behavior with port lists)

## Issues Found
1. **Wrong `NetworkRuleConfig` schema throughout.** Every YAML example wrapped the body in a `spec:` field and embedded `protocol`/`ports` inside each `ingress` entry. The actual schema places fields at the document level: `name`, then `portSelector` (containing `ports` and `protocol`), then `ingress` (a list of `{subnet, except}` entries). All seven YAML snippets were rewritten to match the real schema, splitting examples that mixed multiple protocols/port groups into multiple documents (one `portSelector` per document).
2. **Incorrect default-deny claim.** The post said that creating `NetworkRuleConfig` documents auto-switches Talos to default-deny for the covered ports. In reality the default ingress action is `accept`; you must add a `NetworkDefaultActionConfig` document with `ingress: block` to flip to default-deny. The "How Talos Firewall Works" section was corrected and the basic-example was extended to include the required `NetworkDefaultActionConfig` document.
3. **`except` field never mentioned.** Added a short note in the "Multiple Source Subnets" section showing the optional `except` field, since it is part of the public schema and useful for the multi-subnet scenario the section already covers.
4. **Invalid `talosctl get networkruleconfigs` command.** That resource type isn't exposed by `talosctl get`. Replaced with the documented approach: `talosctl read /system/state/config.yaml | yq 'select(.kind == "NetworkRuleConfig")'`. The `talosctl get nftableschain -o yaml` command was retained because it is the documented way to inspect the active firewall state.
5. **Misleading "Emergency Rule Removal" claim.** The original implied that removing `NetworkRuleConfig` patches alone reverts to allow-all. If `NetworkDefaultActionConfig` is still set to `block`, removing only the rules leaves a fully closed firewall. Added a warning that both documents must be dropped to restore the default `accept` posture.

## Review Notes
- CNI port references (Cilium 4240/4244/8472, Calico 179/4789/5473, WireGuard 51871 as used by Cilium) check out against current upstream defaults.
- Kubernetes component ports in the control-plane table (10257 controller-manager, 10259 scheduler, 10250 kubelet, 10249 kube-proxy metrics) match current Kubernetes defaults.
- The post does not pin a Talos version. The schema documented here is stable across v1.6+ and current as of v1.10; future schema bumps to v1beta1 (or similar) would require revisiting the `apiVersion` field.
