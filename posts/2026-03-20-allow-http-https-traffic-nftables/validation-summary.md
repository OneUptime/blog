# Validation Summary: How to Allow HTTP and HTTPS Traffic with nftables

## Status
validated

## Post Type
Guide

## Technologies Covered
- nftables
- Linux firewalling
- HTTP
- HTTPS
- systemd
- IPv4/IPv6 networking

## Sources Consulted
- `nft(8)` man page from the Netfilter project: https://netfilter.org/projects/nftables/manpage.html
- nftables wiki, Sets: https://wiki.nftables.org/wiki-nftables/index.php/Sets
- nftables wiki, Simple ruleset for a server: https://wiki.nftables.org/wiki-nftables/index.php/Simple_ruleset_for_a_server
- nftables wiki, Simple ruleset for a workstation: https://wiki.nftables.org/wiki-nftables/index.php/Simple_ruleset_for_a_workstation
- nftables wiki, Quick reference-nftables in 10 minutes: https://wiki.nftables.org/wiki-nftables/index.php/Quick_reference-nftables_in_10_minutes
- nftables wiki, Limits: https://wiki.nftables.org/wiki-nftables/index.php/Limits
- curl documentation, TLS certificate verification: https://curl.se/docs/sslcerts.html
- curl man page: https://curl.se/docs/manpage.html
- Local `nft --help` output and local `systemctl --help`

## Issues Found
- The introduction said the rule allows both "protocols" in one rule, but the nftables match is on TCP destination ports. I corrected that wording and clarified that the `inet` table makes the same TCP port rule apply to both IPv4 and IPv6 traffic.
- The "Allow Only HTTPS and Redirect HTTP" section was technically contradictory because it still accepted port 80, and the comment claimed the rule "marks" HTTP traffic even though it only accepts it. I changed the section to explain that HTTP is being allowed so the web server can return an HTTP-to-HTTPS redirect.
- The source restriction example used `ip saddr` inside an `inet` table without explaining that it is IPv4-only. I added that `ip6 saddr` is needed for IPv6 source filtering.
- The full `inet` ruleset omitted ICMPv6 neighbor discovery allowances. Official nftables dual-stack examples note that IPv6 connectivity breaks without them. I added the minimal ICMPv6 neighbor discovery rule.
- The HTTPS verification example used `curl -I https://your-server-ip`. That can fail certificate verification even when the firewall is correct because curl verifies that the certificate matches the host name in the URL. I changed it to use a server name for the HTTPS test.
- The persistence example wrote the live ruleset directly to `/etc/nftables.conf` without a leading `flush ruleset`. I changed it to prepend `flush ruleset` so the saved file can be reloaded cleanly, and I qualified `/etc/nftables.conf` as a common distribution-specific path rather than a universal requirement.

## Review Notes
- The rate-limit example is syntactically correct, but it applies a single aggregate limit to new connections matching ports 80 and 443 rather than a per-client limit.
- The example `forward` chain uses `policy drop`, which is appropriate for a standalone server but would need adjustment on a host that intentionally forwards traffic.
