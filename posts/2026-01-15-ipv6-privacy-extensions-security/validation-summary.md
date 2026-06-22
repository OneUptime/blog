# Validation Summary: How to Enable IPv6 Privacy Extensions for Enhanced Security

## Status
validated

## Post Type
Tutorial / How-to guide

## Technologies Covered
- IPv6 SLAAC and Privacy Extensions (RFC 4862, RFC 4941/8981, RFC 7217)
- Modified EUI-64 interface identifier generation
- Linux kernel IPv6 sysctl parameters (`use_tempaddr`, `temp_valid_lft`, `temp_prefered_lft`, `max_addresses`, `regen_max_retry`)
- NetworkManager (`nmcli`, `ipv6.ip6-privacy`)
- systemd-networkd (`.network` files)
- netplan (Ubuntu Server)
- Distribution-specific configuration (Ubuntu/Debian, RHEL/CentOS/Rocky/AlmaLinux, Arch, Fedora, openSUSE)
- `ip`, `ip6tables`, firewalld, Ansible, cloud-init, Prometheus node_exporter

## Sources Consulted
- systemd.network(5) manual — https://www.freedesktop.org/software/systemd/man/latest/systemd.network.html (confirmed `IPv6PrivacyExtensions=` is a `[Network]` key taking `yes`/`no`/`prefer-public`/`kernel`; no `[IPv6PrivacyExtensions]` section exists)
- Linux kernel IPv6 sysctl documentation (ip-sysctl) — definitions and defaults for `regen_max_retry` (default 5, "Number of attempts before give up attempting to generate valid temporary addresses"), `max_addresses` (default 16, "Maximum number of autoconfigured addresses per interface"), `temp_valid_lft` (default 604800), `temp_prefered_lft` (default 86400)
- RFC 4862 (SLAAC), RFC 4941 / RFC 8981 (Privacy Extensions), RFC 7217 (Stable privacy addresses) — cross-referenced for conceptual accuracy
- NetworkManager `ipv6.ip6-privacy` property semantics (0=disabled, 1=enabled-prefer-public, 2=enabled-prefer-temporary)

## Issues Found
1. **Fabricated systemd-networkd `[IPv6PrivacyExtensions]` section (Method 3).** The post included a `[IPv6PrivacyExtensions]` section with a `PreferTemporaryAddresses=yes` key. No such section or key exists in systemd-networkd; privacy is controlled solely by the `IPv6PrivacyExtensions=` key in the `[Network]` section. Removed the invalid section. Also clarified the misleading `[DHCPv6] UseAddress=yes` comment (it controls whether the DHCPv6-assigned address is used, not privacy).
2. **Incorrect `regen_max_retry` description.** The config comment described it as "Regenerate advance: seconds before expiry to generate new address," which is wrong — it is the *number of attempts* to generate a valid temporary address before giving up, and its kernel default is **5**, not 3. Corrected the inline comment and the summary table (default 5; the example still uses 3 as a deliberate override).
3. **`max_addresses` description.** Described as "Maximum number of temporary addresses per interface." The kernel defines it as the maximum number of *autoconfigured* addresses per interface (which includes the stable SLAAC address, not only temporary ones). Corrected the inline comment and the summary table.

## Review Notes
- The Modified EUI-64 worked example (`00:1A:2B:3C:4D:5E` → `021A:2BFF:FE3C:4D5E`, U/L bit flip `00`→`02`) is correct.
- sysctl values `use_tempaddr` (0/1/2), `temp_valid_lft` (604800 default), and `temp_prefered_lft` (86400 default) are accurate, as are the NetworkManager `ipv6.ip6-privacy` values and the netplan `ipv6-privacy: true` key.
- The verification shell scripts and the `ip -6 addr show` example output (`temporary`, `mngtmpaddr`, lifetimes) are realistic and syntactically correct.
- Caveat (not changed — valid syntax, but worth noting): the Fedora section adds `firewall-cmd --add-rich-rule='rule family="ipv6" source address="::/0" drop'` as "additional protection." This drops *all* inbound IPv6 from every source and is unrelated to privacy extensions; readers who apply it verbatim alongside the rest of the guide would lose inbound IPv6 connectivity. Consider scoping or removing it in a future revision.
- Caveat: `ip6-privacy` in NetworkManager has historically been the property name; on very recent NetworkManager versions the kernel-default value (`-1`) and newer addr-gen-mode interactions exist, but the documented `0/1/2` values used here remain valid.
- Naming `ipv6.icanhazip.com` and the general workflow are fine; these depend on a reachable IPv6 path at test time.
