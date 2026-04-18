# Validation Summary: How to Troubleshoot ISP Customer IPv6 Issues - Issues

## Status
validated

## Post Type
Guide (ISP operations / support troubleshooting)

## Technologies Covered
- IPv6 (addressing, RA, Happy Eyeballs)
- DHCPv6 and DHCPv6 Prefix Delegation (RFC 3633)
- Kea DHCP server (kea-shell, memfile CSV lease file)
- Cisco BNG / IOS `show subscriber session`
- RADIUS accounting (Delegated-IPv6-Prefix attribute)
- OpenWrt netifd (`dhcpv6` proto, `reqprefix` option)
- Linux networking utilities: `ip -6`, `ping6`, `dhclient -6`, `mtr -6`, `dig`, `curl`

## Sources Consulted
- Kea Administrator Reference Manual — `lease6-get-by-duid` command: https://kea.readthedocs.io/en/latest/arm/hooks.html#lease6-get-by-duid
- Kea Administrator Reference Manual — kea-shell invocation (arguments via stdin): https://kea.readthedocs.io/en/latest/arm/shell.html
- Kea Administrator Reference Manual — memfile lease storage default path `kea-leases6.csv`: https://kea.readthedocs.io/en/latest/arm/dhcp6-srv.html#memfile-basic-storage-for-leases
- OpenWrt dhcpv6 protocol options (`reqprefix`): https://openwrt.org/docs/guide-user/network/ipv6/configuration
- iputils ping6/ping man page
- ISC dhclient man page (`-6`, `-r`)
- Cisco IOS XE Broadband Access Aggregation and DSL Configuration Guide — `show subscriber session`
- RFC 3633 (IPv6 Prefix Options for DHCPv6)
- RFC 8305 (Happy Eyeballs Version 2)
- Google Public DNS IPv6 address reference (2001:4860:4860::8888): https://developers.google.com/speed/public-dns/docs/using

## Issues Found
1. **Incorrect `kea-shell` invocation for DHCPv6 lease lookup by DUID.**
   The original snippet passed the JSON arguments as a positional argument after the command name and used `{"type": "duid", "identifier": "..."}`, which is not a valid payload for `lease6-get`. `kea-shell` expects the JSON `arguments` object via stdin, and looking up a v6 lease by DUID uses the dedicated `lease6-get-by-duid` command with a `{"duid": "..."}` payload. Updated to:
   ```bash
   echo '{"duid": "<customer-duid>"}' \
     | kea-shell --service dhcp6 lease6-get-by-duid \
     | python3 -m json.tool
   ```

2. **Wrong default Kea lease file path.**
   The post referenced `/var/lib/kea/dhcp6.leases`, which is the ISC DHCP lease file convention. Kea's default memfile backend writes a CSV file at `/var/lib/kea/kea-leases6.csv`. Updated the path and clarified the format in a comment; also removed the `duid-` prefix from the grep pattern since the CSV stores the raw DUID column.

## Review Notes
- `ping6` is still shipped by iputils on most distros, but on modern systems it is a symlink to `ping` (which auto-selects family or respects `-6`). Both forms are acceptable for a customer-facing script.
- `show subscriber session uid <id> detail` syntax is valid on Cisco IOS XE BNG platforms (ASR1000/ASR9K with iosxrwbng varies — on IOS XR the keyword can be `session-id` or `username`). The post is generic enough that the existing phrasing is fine for a guide.
- The escalation decision tree is fenced with `nginx` highlighting; it's not nginx syntax, but this is a stylistic choice for ASCII tree rendering and not a technical error.
- Example addresses `2001:db8::/32` (RFC 3849 documentation prefix) and `2001:4860:4860::8888` (Google Public DNS) are both valid and appropriate.
