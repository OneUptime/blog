# Validation Summary: How to Use Connection Tracking (conntrack) with iptables

## Status
validated

## Post Type
Guide / Tutorial

## Technologies Covered
- iptables
- Netfilter connection tracking (conntrack)
- conntrack-tools
- Linux kernel netfilter sysctls
- FTP conntrack helper

## Sources Consulted
- Netfilter `iptables-extensions(8)` man page: https://ipset.netfilter.org/iptables-extensions.man.html?source=post_page---------------------------
- Netfilter `conntrack(8)` man page: https://netfilter.org/projects/conntrack-tools/conntrack-manpage.html
- conntrack-tools user manual: https://conntrack-tools.netfilter.org/manual.html
- Linux kernel `nf_conntrack` sysctl documentation: https://www.kernel.org/doc/html/v5.15/networking/nf_conntrack-sysctl.html
- Local CLI help: `iptables -m state -h`
- Local CLI help: `iptables -m conntrack -h`
- Local CLI help: `iptables -j CT -h`
- Local syntax verification: `iptables-translate`

## Issues Found
- The post used the older `state` matcher throughout. I replaced it with `-m conntrack --ctstate ...`, which matches the current conntrack syntax documented by Netfilter.
- The "complete stateful firewall in 6 rules" example was not complete as written: it did not handle loopback traffic and it did not actually restrict outbound or forwarded traffic. I added loopback accept rules, explicit `OUTPUT` and `FORWARD` drop rules, and changed the note to describe it as a basic host firewall example.
- The state definitions for `NEW`, `ESTABLISHED`, and `INVALID` were oversimplified. I updated them to match documented conntrack behavior more closely.
- The invalid-packet section said such packets "should always be dropped" and included `OUTPUT`. I narrowed this to the common early-drop pattern on `INPUT` and `FORWARD`, and updated the wording accordingly.
- The sample `conntrack -L` output omitted the reply tuple shown in normal conntrack output. I replaced it with a plausible full entry format.
- The FTP helper section was incomplete for modern kernels. Loading `nf_conntrack_ftp` alone is not enough when automatic helper assignment is disabled by default; I added the `raw` table `CT --helper ftp` rule and updated the explanation.
- The description and closing sentence referred specifically to TCP session state. I changed them to connection state, since conntrack is not limited to TCP.

## Review Notes
- iptables content is still technically valid, but modern Linux distributions increasingly prefer nftables as the long-term successor.
- The installation example `apt install conntrack -y` is Debian/Ubuntu-specific; the post remains correct, but package commands differ across distributions.
