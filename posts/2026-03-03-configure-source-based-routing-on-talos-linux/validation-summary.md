# Validation Summary: How to Configure Source-Based Routing on Talos Linux

## Status
validated

## Post Type
Tutorial / How-to guide

## Technologies Covered
- Talos Linux (machine configuration v1alpha1)
- `RoutingRuleConfig` multi-document machine config (added in Talos v1.13)
- Linux policy / source-based routing (`ip rule`, `ip route`)
- Reverse path filter (`rp_filter`) kernel parameter
- `talosctl` CLI
- `kubectl debug node` with `nicolaka/netshoot`
- VLAN interface configuration on Talos

## Sources Consulted
- Talos v1alpha1 route schema (Go source): https://raw.githubusercontent.com/siderolabs/talos/v1.13.0/pkg/machinery/config/types/v1alpha1/v1alpha1_types.go
- Talos network configuration index: https://docs.siderolabs.com/talos/v1.10/reference/configuration/network/
- Talos machine configuration reference (v1.7 and v1.9): https://docs.siderolabs.com/talos/v1.7/reference/configuration/v1alpha1/config/ and https://docs.siderolabs.com/talos/v1.9/reference/configuration/v1alpha1/config/
- Talos 1.13 release notes ("What's New"): https://docs.siderolabs.com/talos/v1.13/getting-started/what's-new-in-talos
- `RoutingRuleConfig` reference: https://docs.siderolabs.com/talos/v1.13/reference/configuration/network/routingruleconfig/
- Implementing PR for routing rules: https://github.com/siderolabs/talos/pull/12938
- Original feature request: https://github.com/siderolabs/talos/issues/7184
- Talos llms.txt index for available config documents: https://docs.siderolabs.com/llms.txt
- Linux kernel `rp_filter` semantics (sysctl reference): https://www.kernel.org/doc/Documentation/networking/ip-sysctl.txt

## Issues Found
The post's core YAML schema was wrong. None of the routing-rule fields it used exist where it placed them. Specific fixes made:

1. **`routingRules` is not a field on `machine.network.interfaces[]`.** The `Route` struct in v1alpha1 only has `network`, `gateway`, `source`, `metric`, `mtu`. Linux policy routing rules in Talos are a separate multi-document config kind, `RoutingRuleConfig`, added in Talos 1.13.
   - Fix: moved every `routingRules:` block out of the interface and into separate top-level `RoutingRuleConfig` documents (separated by `---`).

2. **`table:` is not a field on routes.** The post added `table: 100` to several route entries to push them into custom routing tables. The route schema has no such field.
   - Fix: removed all `table:` keys from `routes`. The custom-table routes were not achievable through machine config and would have caused config validation errors.

3. **Wrong field names inside the rule body.** The post used `from:` and `priority:` as direct fields. `RoutingRuleConfig` uses `src:` for the source CIDR, and the document's `name:` is the priority. `table:` values are strings, not bare integers.
   - Fix: switched `from` → `src`, removed `priority`, used the `name` field as the priority (`name: "100"`, `name: "200"`, etc.), and quoted table values (`table: "100"`).

4. **`apiVersion`/`kind` headers were missing.** `RoutingRuleConfig` documents need `apiVersion: v1alpha1` and `kind: RoutingRuleConfig`.
   - Fix: added the correct headers to every rule document in all four YAML examples (Basic Two-Interface, VLANs, Kubernetes Services, Multiple IPs).

5. **The post implied that declarative source-based routing is fully supported.** Even with corrected rule syntax, Talos currently has no way to add routes into a custom routing table via machine config — only `RoutingRuleConfig` (rules) and `BlackholeRouteConfig` exist as multi-doc route-related types, and `routes[]` on an interface always lands in the main table. A rule that points to an empty custom table won't direct traffic anywhere; the kernel just falls through to the next rule.
   - Fix: added a short note under the basic example explaining that the destination tables (`100`, `200`, …) need to be populated out-of-band (operator, post-boot script, etc.) for the rules to take effect.

6. **Troubleshooting verification was greppin for a non-existent field.** The `talosctl get machineconfig … | grep routingRules` command would never match anything because that field doesn't exist.
   - Fix: replaced with `talosctl get machineconfig -o yaml`, `talosctl get routingrules`, and `talosctl read /proc/net/fib_rules` — the actual ways to inspect rule state on Talos.

## Review Notes
- The conceptual explanation of source-based routing, the `ip rule` / `ip route` Linux commands, and the `rp_filter` value descriptions (0/1/2) are accurate and unchanged.
- The "What This Configuration Does" walkthrough still describes the intended Linux kernel behavior correctly — it just depends on tables `100` / `200` having been populated, which is now called out in the limitation note.
- The `kubectl debug node/<name> -it --image=nicolaka/netshoot -- …` invocations are valid for Talos clusters (the kubelet supports the ephemeral debug container), but `talosctl read /proc/net/fib_rules` and `talosctl get routes` would be the more idiomatic verification path on Talos and could be substituted in a future revision.
- `RoutingRuleConfig` is a Talos 1.13+ feature. Users on older releases will not have it available; the new intro paragraph in the Basic Setup section calls this out.
- The Conclusion still says machine config gives declarative control over "routing rules and custom routing tables." The rules half is now correct; the custom-tables half is only partially true (rules can target tables, but the tables themselves must be populated out-of-band). Worth tightening in a future pass, but left as-is to respect the "only fix technical errors, do not restructure" instruction.
