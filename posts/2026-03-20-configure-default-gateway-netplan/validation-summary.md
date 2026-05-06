# Validation Summary: How to Configure a Default Gateway with Netplan

## Status
validated

## Post Type
Guide

## Technologies Covered
- Netplan
- Linux networking
- Ubuntu
- Debian
- Static routing
- Default gateways

## Sources Consulted
- Netplan YAML reference: https://netplan.readthedocs.io/en/latest/netplan-yaml/
- Netplan static IP how-to: https://netplan.readthedocs.io/en/1.1.1/using-static-ip-addresses/
- Netplan CLI reference: https://netplan.readthedocs.io/en/stable/cli/
- Ubuntu `netplan(5)` man page: https://manpages.ubuntu.com/manpages/noble/en/man5/netplan.5.html
- Upstream Netplan repository and tagged historical docs/source for `0.102`, `0.103`, and `0.104`: https://github.com/canonical/netplan
- Local `iproute2` CLI help via `ip route help`

## Issues Found
- The introduction said `gateway4` was deprecated in Netplan `0.104+`. Upstream tagged Netplan docs/source already mark `gateway4` and `gateway6` as deprecated in `0.103`, while `0.102` still documents them without the deprecation note. I corrected the version reference to `0.103+`.
- The conclusion used an inline pseudo-YAML snippet, `routes: - to: default via: <gateway-ip>`, that is not valid YAML formatting. I rewrote it to refer to the `routes`, `to`, and `via` fields without implying that one-line form is valid YAML.

## Review Notes
- Netplan’s current upstream docs are slightly inconsistent around multiple default routes. The examples document metric-based multiple default routes, while the YAML reference also points readers to `routing-policy` for multi-route scenarios. The post’s metric-based example is still consistent with current upstream examples and validation behavior.
