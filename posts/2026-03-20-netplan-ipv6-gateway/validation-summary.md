# Validation Summary: How to Configure IPv6 Gateway with Netplan

## Status
validated

## Post Type
Tutorial / How-to guide

## Technologies Covered
- Netplan (YAML-based network configuration)
- systemd-networkd (renderer)
- IPv6 (static addressing, SLAAC, DHCPv6, Privacy Extensions)
- iproute2 (`ip -6 addr`, `ip -6 route`)
- `ping6` / ICMPv6
- sysctl (`net.ipv6.conf.<iface>.use_tempaddr`)
- Ubuntu / Debian

## Sources Consulted
- Netplan reference documentation: https://netplan.readthedocs.io/en/stable/netplan-yaml/
- Netplan examples: https://netplan.readthedocs.io/en/stable/examples/
- `netplan(5)` and `netplan(8)` man pages (covers `generate`, `try`, `apply`, `--debug`, default 120s rollback for `try`)
- RFC 4941 — IPv6 Privacy Extensions for Stateless Address Autoconfiguration
- RFC 4862 — IPv6 Stateless Address Autoconfiguration (SLAAC)
- Linux kernel networking docs: ip-sysctl.txt — `use_tempaddr` (0 = disable, 1 = enable, 2 = prefer temporary)
- iproute2 man pages: `ip-address(8)`, `ip-route(8)`
- systemd documentation: `systemd-networkd.service(8)`, `journalctl(1)`
- Sibling post in this blog (`posts/2026-03-20-netplan-ipv6-privacy/README.md`) for the convention used by other posts in this series for the file-location sentence

## Issues Found
1. **Missing values in "Netplan File Location" section (line 21).** The original text read: "Netplan configuration files are in  with  extension." with both the directory path and file extension placeholders empty (likely an unfilled template). Replaced with the correct values: `/etc/netplan/` directory and `.yaml` extension, matching the wording used in the already-validated sibling post `2026-03-20-netplan-ipv6-privacy` and consistent with the official Netplan documentation.
2. **Conclusion contained duplicated/templated phrasing (line 144).** The original sentence began with "How to Configure IPv6 Gateway with Netplan with Netplan uses clean YAML syntax." — the article title was substituted as a noun, leaving "with Netplan with Netplan" and an ungrammatical lead-in. Rewrote the opening clause to "Configuring an IPv6 gateway with Netplan uses clean YAML syntax." This is a stylistic-looking edit, but the original was a clear templating defect (not deliberate prose), so it falls within the scope of fixing technical/structural errors.

## Review Notes
- All Netplan keys used are valid: `version`, `renderer: networkd`, `ethernets.<iface>`, `dhcp4`, `dhcp6`, `accept-ra`, `ipv6-privacy`, `addresses`, `routes` (`to` / `via`), `nameservers.addresses`, and `dhcp6-overrides` (`use-dns`, `use-domains`). All match the current Netplan reference.
- `netplan try` default rollback is documented as 120 seconds — correct.
- `netplan --debug apply` is a supported invocation (the `--debug` flag is a global Netplan CLI flag).
- `ping6` is still present on Ubuntu 18.04+ (provided by `iputils-ping`); on newer releases `ping -6` is the more modern form, but `ping6` continues to work, so no change is required.
- `sysctl net.ipv6.conf.eth0.use_tempaddr` returning `2` indeed means "prefer temporary addresses" per the Linux kernel `ip-sysctl` documentation — correct.
- The example combines `dhcp6: true`, `accept-ra: true`, a static IPv6 address, and an explicit `::/0` default route via a static next-hop. This is a valid Netplan configuration; in practice, mixing DHCPv6/SLAAC with an explicit default route can cause multiple default routes — a minor caveat worth being aware of, but the YAML is technically correct.
- The post is titled "IPv6 Gateway" but the body covers gateway configuration only as part of broader IPv6 setup (SLAAC, DHCPv6, privacy, DNS). Content is accurate; the title is slightly broader than the body's pure-gateway focus, but no factual changes needed.
