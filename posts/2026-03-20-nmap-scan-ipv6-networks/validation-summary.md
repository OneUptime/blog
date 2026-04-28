# Validation Summary: How to Scan IPv6 Networks with nmap

## Status
validated

## Post Type
Tutorial / Reference Guide

## Technologies Covered
- nmap (Network Mapper) IPv6 scanning
- ICMPv6 / IPv6 multicast (ff02::1)
- NSE (Nmap Scripting Engine) scripts: `ipv6-ra-flood`, `ipv6-multicast-mld-list`, `ipv6-node-info`, `targets-ipv6-multicast-echo`
- Python `ipaddress` module
- IPv6 address notation, CIDR, link-local zone IDs

## Sources Consulted
- nmap Target Specification docs: https://nmap.org/book/man-target-specification.html
- nmap Brief Options: https://nmap.org/book/man-briefoptions.html
- nmap Firewall/IDS Bypass docs (`--send-ip`): https://nmap.org/book/man-bypass-firewalls-ids.html
- NSE script docs:
  - https://nmap.org/nsedoc/scripts/targets-ipv6-multicast-echo.html
  - https://nmap.org/nsedoc/scripts/ipv6-ra-flood.html
  - https://nmap.org/nsedoc/scripts/ipv6-multicast-mld-list.html
  - https://nmap.org/nsedoc/scripts/ipv6-node-info.html

## Issues Found

1. **Incorrect claim that nmap does not support IPv6 CIDR.** The post comment "nmap does not support CIDR for IPv6 in the same way as IPv4" was wrong. Per the official Target Specification docs, nmap has supported IPv6 CIDR since 5.31BETA1 (e.g. `nmap -6 2001:db8::/120` is valid). Replaced the misleading comment with a correct CIDR example and clarified that octet ranges are what is unsupported for IPv6.

2. **Invalid bracket octet-range syntax.** The example `nmap -6 2001:db8::[1-254]` is not valid nmap syntax — octet/group ranges are not supported for IPv6 in any form, and nmap uses neither `[...]` brackets nor hyphen ranges for IPv6 targets. Removed this line and replaced with the CIDR equivalent (`2001:db8::/120`).

3. **Multicast host discovery example does not actually discover hosts.** `nmap -6 -sn ff02::1%eth0` treats `ff02::1` as a single multicast target rather than enumerating responders. The correct way to discover link-local IPv6 hosts via multicast with nmap is the prerule NSE script `targets-ipv6-multicast-echo` (with `--script-args newtargets`). Replaced the command with `sudo nmap -6 -sn -e eth0 --script targets-ipv6-multicast-echo --script-args newtargets`.

## Review Notes
- All other commands verified correct: `-6`, `-sn`, `-F`, `-p-`, `-sV`, `-iL` (including `-iL -` for stdin), `-sS`, `-sU`, `-sT`, `-O`, `-A`, `-sC`, `--send-ip`, output flags `-oN`/`-oX`/`-oG`/`-oA`, and zone-id syntax (`fe80::1%eth0`).
- The NSE scripts referenced (`ipv6-ra-flood`, `ipv6-multicast-mld-list`, `ipv6-node-info`) all exist in the official NSE library.
- The `ping6` command is being phased out on modern Linux distros in favor of `ping -6` / `ping`, but `ping6` still ships on most systems. Not a correctness issue today; may warrant a future update.
- The `--send-ip` flag is valid but somewhat unrelated to "ICMPv6 echo request" as the inline comment suggests — `--send-ip` only controls whether packets are sent at the raw IP layer vs raw ethernet. Left as-is since the command itself runs correctly.
- `python3 -c "..."` heredoc-style enumeration piped to `nmap -iL -` works as written.
