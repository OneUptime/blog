# Validation Summary: How to Use nmap for IPv6 Network Scanning

## Status
validated

## Post Type
Tutorial / Reference guide

## Technologies Covered
- nmap (network scanner)
- IPv6 networking
- ICMPv6 / NDP (Neighbor Discovery Protocol)
- IPv6 multicast (link-local `ff02::1`)
- nmap NSE (Nmap Scripting Engine) IPv6 scripts
- Linux `ip -6 neigh` command
- `dig` for AAAA / AXFR queries
- Bash scripting

## Sources Consulted
- nmap target specification reference: https://nmap.org/book/man-target-specification.html
- nmap NSE script category index: https://nmap.org/nsedoc/categories/discovery.html
- `ipv6-node-info` NSE script docs: https://nmap.org/nsedoc/scripts/ipv6-node-info.html
- `ipv6-ra-flood` NSE script docs: https://nmap.org/nsedoc/scripts/ipv6-ra-flood.html
- nmap host discovery / IPv6 docs (https://nmap.org/book/host-discovery.html)
- RFC 4291 (IPv6 Addressing Architecture), RFC 4620 (IPv6 Node Information Queries), RFC 4861 (NDP)

## Issues Found

1. **Unsupported IPv6 octet range syntax.** The original post contained `nmap -6 2001:db8::1-ff` with a comment claiming it was a valid sequential range. Per the official nmap target specification documentation: "Octet ranges aren't yet supported for IPv6." This syntax does not work and would be rejected. Replaced the line with a valid CIDR example (`nmap -6 2001:db8::/124`).

2. **Invalid IPv6 literal.** The original `2001:db8::mail-server` is not a valid IPv6 address — `mail-server` is not a hex group. Replaced with `2001:db8::25` so the example is a valid, runnable command.

3. **Incorrect description of `ipv6-node-info` NSE script.** The original comment said "Check for IPv6 address privacy extensions". The script actually performs RFC 4620 IPv6 Node Information Queries to obtain hostnames and IPv4/IPv6 addresses; it has nothing to do with privacy extensions (RFC 4941 / SLAAC temporary addresses). Updated the comment to accurately describe the script's purpose.

4. **Incorrect "safe" claim for `--script ipv6*`.** The original comment said "Run all safe IPv6-related scripts". The `ipv6*` glob also matches `ipv6-ra-flood`, which is in the `dos` and `intrusive` categories per its NSE docs ("This script is dangerous and is very likely to bring down a server or network appliance"). Updated comment to warn that intrusive scripts are included, and quoted the glob to avoid shell expansion edge cases.

5. **Mislabeled `ipv6-ra-flood`.** The original described it as a "Router Advertisement spoofing test". Per the script's documentation it is a Router Advertisement *flood* attack (DoS) that can incapacitate target machines. Updated the comment to accurately label it as a DoS and warn it should only be used in authorized/lab contexts.

## Review Notes

- The introduction states a `/64` "contain[s] billions of addresses" — strictly true (more than billions), but actually 2^64 ≈ 1.8 × 10^19 (~18 quintillion). Left as-is since it is technically not wrong and supports the post's broader (correct) point that exhaustive sweeps are infeasible.
- The example `nmap -6 -sn --send-ip 2001:db8::1/64` is syntactically valid but operationally infeasible (would attempt 2^64 hosts). Kept because the surrounding prose explicitly frames this as a contrast with the recommended NDP/multicast approach.
- `nmap -6 --script ipv6-multicast-mld-list -e eth0` typically requires a placeholder target (since nmap demands at least one target) or `--script-args=newtargets`. Most users running it in practice add a dummy target; left unchanged since it matches the script's documented minimal usage.
- The `dig AXFR` example for zone discovery only works against authoritative nameservers that allow zone transfers, which is uncommon in production. The post's "if allowed" qualifier is appropriate.
- `cat /etc/hosts | grep -v '#' | awk '{print $2}'` is a UUOC and won't reliably skip inline comments, but it is functionally adequate for the demo script.
- `grep ':'` to identify IPv6 records in `dig +short` output is fragile (e.g., it would match anything containing a colon) but is fine for typical AAAA output.
