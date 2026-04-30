# Validation Summary: How to Set Up IP Masquerading with iptables for Internet Sharing

## Status
validated

## Post Type
Guide

## Technologies Covered
- Linux kernel IPv4 forwarding
- `iptables`
- Netfilter NAT and `MASQUERADE`
- WireGuard
- `iptables-persistent` / `netfilter-persistent`

## Sources Consulted
- Linux kernel IP sysctl documentation: https://www.kernel.org/doc/html/latest/networking/ip-sysctl.html
- `iptables-extensions(8)` manual page: https://man7.org/linux/man-pages/man8/iptables-extensions.8.html
- `iptables(8)` Debian man page: https://manpages.debian.org/iptables/iptables.8
- `iptables-save(8)` Debian man page: https://manpages.debian.org/trixie/iptables/iptables-save.8.en.html
- `netfilter-persistent(8)` Debian man page: https://manpages.debian.org/unstable/netfilter-persistent/netfilter-persistent.8.en.html
- Debian package details for `iptables-persistent`: https://packages.debian.org/stable/iptables-persistent

## Issues Found
- The post used `-m state --state ESTABLISHED,RELATED` in multiple rules. I replaced those examples with `-m conntrack --ctstate ESTABLISHED,RELATED` because the `state` matcher is documented as a subset of `conntrack`, and `conntrack` is the current interface to use for connection-state matches.
- The persistence example used `sudo iptables-save > /etc/iptables/rules.v4`. I changed this to `sudo iptables-save -f /etc/iptables/rules.v4` because `iptables-save` documents `-f` as the file-output option, while the original shell redirection would run outside `sudo` and can fail with a permissions error.
- The persistence steps installed `iptables-persistent` after attempting to write `/etc/iptables/rules.v4`. I reordered that section so the persistence helper is installed before saving the rules.
- The closing sentence implied MASQUERADE is the right fit generically. I tightened that wording to note it is especially appropriate when the external IP can change, matching the documented guidance that MASQUERADE is intended for dynamically assigned addresses and SNAT is preferred for static ones.

## Review Notes
- The tutorial is IPv4-specific. It enables `net.ipv4.ip_forward` and uses IPv4 examples throughout; IPv6 forwarding/NAT is out of scope.
- The persistence commands are Debian/Ubuntu-specific because they rely on `apt`, `iptables-persistent`, and `netfilter-persistent`.
