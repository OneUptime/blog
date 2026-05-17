# Validation Summary: How to Create NetworkRuleConfig Documents in Talos Linux

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Talos Linux (machine configuration, NetworkRuleConfig, NetworkDefaultActionConfig)
- nftables (host-level packet filtering used by Talos)
- talosctl CLI (apply-config, get, read)
- Kubernetes networking concepts (API server, etcd, kubelet, NodePort, NetworkPolicy)

## Sources Consulted
- Talos `NetworkRuleConfig` reference, v1.14: https://github.com/siderolabs/talos/blob/main/website/content/v1.14/reference/configuration/network/networkruleconfig.md
- Talos `NetworkRuleConfig` reference, v1.7: https://docs.siderolabs.com/talos/v1.7/reference/configuration/network/networkruleconfig/
- Talos ingress firewall guide, v1.8: https://docs.siderolabs.com/talos/v1.8/networking/ingress-firewall
- Talos source: `pkg/machinery/config/types/network/rule_config.go` (RuleConfigV1Alpha1 struct definition)

## Issues Found
The blog post used an entirely incorrect document schema for `NetworkRuleConfig`. Every YAML example wrapped the rule body in a non-existent `spec:` field and nested `subnet`, `protocol`, and `ports` together inside each `ingress` entry. The real schema places `portSelector` (containing `ports` and `protocol`) and `ingress` (containing only `subnet` and an optional `except`) as siblings at the top level, and each document has a single `portSelector`. Specific fixes:

1. **Basic example (What Are NetworkRuleConfig Documents)** — rewrote to drop `spec:` and use top-level `portSelector` / `ingress`.
2. **Document Structure section** — replaced the schema skeleton with the real one, including the four valid protocols (`tcp|udp|icmp|icmpv6`) and the optional `except` field. Added a sentence noting that each document holds a single `portSelector`, so different port/protocol combinations need separate documents.
3. **Creating Your First NetworkRuleConfig** — restructured the Talos API rule to the correct schema.
4. **Allowing Kubernetes Traffic** — split the single-document control-plane and worker examples into multiple documents (one per `portSelector`), separated by `---`, since the original tried to mix several protocol/port groups in one document.
5. **Multiple Subnets and Ports** — rewrote to demonstrate the actually-supported pattern (multiple `subnet` entries sharing one `portSelector`) and used a second document for the differing port set.
6. **Applying NetworkRuleConfig Documents (combined patch)** — corrected schema in both inline documents; added the companion `NetworkDefaultActionConfig` (with `ingress: block`) since `NetworkRuleConfig` rules only matter once the default action is `block`.
7. **Managing Multiple Rule Sets** — corrected both per-file examples.
8. **Viewing Active Network Rules** — replaced the unverified `talosctl get networkruleconfigs` invocation with the official inspection pattern from the Talos firewall guide: `talosctl get nftableschain -o yaml` for the compiled rules, plus `talosctl read /system/state/config.yaml | yq 'select(.kind == "NetworkDefaultActionConfig"), select(.kind == "NetworkRuleConfig")'` for the merged config documents.

## Review Notes
- The post's "Common Mistakes" section warns about missing UDP rules but the prior schema documentation only listed `tcp|udp`. The corrected schema now lists all four supported protocols (`tcp`, `udp`, `icmp`, `icmpv6`).
- The `talosctl apply-config --config-patch @file.yaml` pattern is preserved. Talos strategic merge patches accept multi-document YAML where standalone documents (like `NetworkRuleConfig`) are appended to the machine configuration, so this usage is valid even though the more idiomatic approach is to concatenate the documents directly into the main config file.
- The post does not explicitly state Talos version compatibility. The schema used (`apiVersion: v1alpha1`, top-level `portSelector`/`ingress`) is stable across Talos v1.6 through v1.14.
- The author's writing style, section structure, and overall narrative are preserved; only the technically incorrect YAML and the matching descriptive sentences were changed.
