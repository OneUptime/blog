# Validation Summary: How to Understand /proc/sys/net/ipv6/conf Parameters

## Status
validated

## Post Type
Reference

## Technologies Covered
- Linux kernel sysctl interface
- IPv6
- Linux `/proc/sys/net/ipv6/conf/*`
- `sysctl` CLI
- SLAAC / Router Advertisements / Neighbor Discovery

## Sources Consulted
- Linux Kernel documentation, "IP Sysctl": https://docs.kernel.org/6.18/networking/ip-sysctl.html
- RFC 4861, "Neighbor Discovery for IP version 6 (IPv6)": https://www.rfc-editor.org/rfc/rfc4861.html
- RFC 4862, "IPv6 Stateless Address Autoconfiguration": https://www.rfc-editor.org/rfc/rfc4862
- RFC 4941, "Privacy Extensions for Stateless Address Autoconfiguration in IPv6": https://www.rfc-editor.org/rfc/rfc4941.html
- RFC 7217, "A Method for Generating Semantically Opaque Interface Identifiers with IPv6 Stateless Address Autoconfiguration (SLAAC)": https://www.rfc-editor.org/rfc/rfc7217
- Installed `sysctl` CLI help (`sysctl --help`) to confirm `-w` and `-p/--load[=<file>]` syntax.

## Issues Found
- The `all/` directory description implied a simple global override model. Updated it to match kernel documentation more closely: `conf/all/*` is special and changes settings across interfaces, while `conf/default/*` seeds newly created interfaces.
- The `use_tempaddr` value table incorrectly treated `-1` as the general default. Updated it to match kernel docs: values `<= 0` disable privacy extensions, values `> 1` prefer temporary addresses, and the default is `0` for most interfaces but `-1` for loopback and point-to-point interfaces.
- The `dad_transmits` explanation overstated the meaning of individual values. Simplified it to the documented behavior: it controls the number of Duplicate Address Detection probes sent.
- The `router_solicitations` section incorrectly claimed `-1` means unlimited solicitations until a Router Advertisement is received. Removed that claim and aligned the text with kernel docs: the setting controls how many solicitations are sent before assuming no routers are present.
- The `max_addresses` section described the limit as applying to all IPv6 addresses and suggested it for many virtual IPs. Corrected it to "autoconfigured IPv6 addresses" only.
- The `addr_gen_mode` value mapping was incorrect, and the examples used the wrong mode for stable privacy addressing. Replaced the value table with the current kernel meanings and updated the example and persistent config from `1` to `3`.

## Review Notes
- The `sysctl -p /etc/sysctl.d/99-ipv6-tuning.conf` example is syntactically valid with the installed `sysctl` CLI.
- Some IPv6 `conf/*` settings have effective behavior that depends on both `conf/all/*` and per-interface values; the post now avoids the most misleading simplification, but kernel documentation is still the best reference for edge-case semantics.
