# Validation Summary: How to Set Up Policy-Based Routing on Talos Linux

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Talos Linux machine configuration
- Talos `LinkConfig` and `RoutingRuleConfig`
- Linux policy routing (`ip rule`, routing tables)
- Kubernetes `kubectl debug` node debugging
- Linux networking sysctls (`rp_filter`, `ip_forward`, `accept_source_route`)

## Sources Consulted
- Talos Linux `RoutingRuleConfig` reference: https://docs.siderolabs.com/talos/v1.13/reference/configuration/network/routingruleconfig
- Talos Linux `LinkConfig` reference: https://docs.siderolabs.com/talos/v1.13/reference/configuration/network/linkconfig
- Talos Linux networking resources: https://docs.siderolabs.com/talos/v1.13/learn-more/networking-resources
- Talos Linux `talosctl` CLI reference: https://docs.siderolabs.com/talos/v1.13/reference/cli
- Kubernetes `kubectl debug` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_debug/
- Kubernetes node debugging guide: https://kubernetes.io/docs/tasks/debug/debug-cluster/kubectl-node-debug/
- Linux `ip-rule(8)` manual page from the local system
- Linux kernel IP sysctl documentation: https://docs.kernel.org/networking/ip-sysctl.html

## Issues Found
1. **Incorrect Talos routing rule schema**: The post used nested `machine.network.interfaces[].routingRules` entries with `from`, `to`, `priority`, and numeric `table` fields. Current Talos documentation uses separate `RoutingRuleConfig` documents with `name` as the rule priority, `src`, `dst`, and string `table` values. Updated all PBR examples to use `RoutingRuleConfig`.
2. **Incorrect Talos route schema for current network config documents**: The examples used interface-level `routes[].network`. Current `LinkConfig` uses `routes[].destination`, `addresses[].address`, and `name` for the link. Updated examples to `LinkConfig` documents.
3. **Missing custom-table routes**: Some examples created rules for tables `400` and `500` without defining routes in those tables. Added matching `LinkConfig` routes so the referenced tables have usable route entries.
4. **Invalid verification path**: The post suggested `talosctl read /proc/net/fib_rules`, but this is not a portable/current Linux procfs path for policy rules. Replaced it with `talosctl get routes` for Talos route state and kept `ip rule show` via a debug pod for rule verification.
5. **Kubernetes node debug privilege caveat**: The node debug commands omitted `--profile=sysadmin`. Kubernetes documents node debug pods as host-networked but not privileged by default; added `--profile=sysadmin` for host-level network inspection commands.
6. **Service CIDR rule direction**: The service example matched `from: 10.96.0.0/12`, but Service ClusterIPs are normally destinations, not packet sources. Changed the example to match `dst: 10.96.0.0/12` and use table `254` for the main table.
7. **Misleading monitoring claim**: The post claimed `ip -s rule show` tracks PBR rule hits. Linux `ip rule` does not generally expose simple per-rule hit counters. Reworded the section to inspect rule and route state instead.
8. **Source routing sysctl guidance**: The post suggested enabling `accept_source_route` if needed. Source routing is not required for PBR and is normally disabled for security. Updated the snippet to keep it disabled.
9. **Talos protocol-routing overstatement**: The description implied Talos PBR directly routes based on protocol. Talos `RoutingRuleConfig` supports source, destination, input/output interface, firewall mark, and mask fields. Updated the description to list supported criteria.

## Review Notes
The corrected examples use Talos v1.13 configuration documents. Older Talos configurations may still contain legacy `machine.network.interfaces` snippets, but current documentation favors standalone network configuration documents for `LinkConfig` and `RoutingRuleConfig`.
