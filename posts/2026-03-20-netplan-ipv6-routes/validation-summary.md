# Validation Summary: How to Configure IPv6 Routes with Netplan

## Status
validated

## Post Type
Tutorial / How-to guide

## Technologies Covered
- Netplan (YAML-based network configuration)
- IPv6 (DHCPv6, SLAAC, RFC 4941 privacy extensions)
- systemd-networkd (renderer)
- Ubuntu / Debian
- `ip` and `ping6` commands
- `sysctl` (kernel networking parameters)

## Sources Consulted
- Netplan YAML reference: https://netplan.readthedocs.io/en/stable/netplan-yaml/
- `netplan-try` reference: https://netplan.readthedocs.io/en/stable/netplan-try/
- `netplan-generate` reference: https://netplan.readthedocs.io/en/stable/netplan-generate/
- Linux kernel networking docs (ip-sysctl.txt) for `use_tempaddr` semantics
- RFC 4941 (IPv6 Privacy Extensions)
- Google Public DNS IPv6 addresses (`2001:4860:4860::8888`/`::8844`)

## Issues Found
1. **Missing template values in the "Netplan File Location" section.** The original line read: "Netplan configuration files are in  with  extension." with two empty placeholders. Fixed to: "Netplan configuration files are in `/etc/netplan/` with `.yaml` extension." This matches the documented Netplan config path and file extension.
2. **Duplicated phrase in the conclusion.** The original opening sentence read: "How to Configure IPv6 Routes with Netplan with Netplan uses clean YAML syntax." Rewrote to: "Configuring IPv6 with Netplan uses clean YAML syntax." This removes the duplicated "with Netplan" and the awkward title-as-subject usage.

All other technical claims, YAML keys, CLI flags, and behavior descriptions verified correct against Netplan's official reference documentation.

## Review Notes
- The post's title and description mention "static IPv6 routes including host routes, network routes, and policy-based routes," but the body only includes a single default-route example (`::/0` via `2001:db8::1`) and otherwise focuses on DHCPv6, SLAAC, and privacy extensions. The content is technically correct but does not fully match the scope advertised by the title. A future revision could either broaden the route examples (host route via `to: "2001:db8::1234/128"`, network route via `to: "2001:db8:abcd::/48"`, policy-based via `routing-policy`) or rename the post to reflect its actual IPv6-with-Netplan scope.
- `netplan generate` is described as validating YAML syntax. That is a side effect; per the official docs, it converts Netplan YAML into backend (systemd-networkd / NetworkManager) configs in `/run/`. The current wording is a useful simplification rather than an error, so it was left intact.
- `ping6` works on Ubuntu but is deprecated upstream in favor of `ping -6` / unified `ping`. Not incorrect today, just worth noting for future updates.
- `dhcp6-overrides.use-domains` accepts a boolean or the literal string `route` (since Netplan 0.98). The `true` value used in the post is valid.
