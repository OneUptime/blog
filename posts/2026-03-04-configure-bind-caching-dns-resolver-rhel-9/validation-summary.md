# Validation Summary: How to Configure BIND as a Caching DNS Resolver on RHEL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Red Hat Enterprise Linux 9
- BIND 9 / named
- DNS recursion, forwarding, caching, DNSSEC validation
- firewalld
- NetworkManager / nmcli
- rndc and dig

## Sources Consulted
- Red Hat Enterprise Linux 9 documentation, "Setting up and configuring a BIND DNS server": https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/managing_networking_infrastructure_services/assembly_setting-up-and-configuring-a-bind-dns-server_networking-infrastructure-services
- ISC BIND 9.16 Administrator Reference Manual, configuration reference: https://bind9.readthedocs.io/en/v9.16.25/reference.html
- ISC BIND 9.20 Administrator Reference Manual, configuration reference and statistics file documentation: https://bind9.readthedocs.io/en/v9.20.2/reference.html
- ISC BIND 9.16 DNSSEC validation documentation: https://bind9.readthedocs.io/en/v9.16.27/advanced.html
- ISC BIND 9 rndc manual page: https://bind9.readthedocs.io/en/v9.18.30/manpages.html
- firewalld firewall-cmd manual page: https://firewalld.org/documentation/man-pages/firewall-cmd.html
- NetworkManager nm-settings-nmcli reference: https://www.networkmanager.dev/docs/api/latest/nm-settings-nmcli.html
- Local `nmcli connection modify help` output on the review host

## Issues Found
- The post said a caching resolver "doesn't serve its own zones." That was too absolute because the same post later adds local authoritative zones for overrides. Changed the wording to say it does not primarily serve authoritative zones.
- The privacy bullet said the ISP does not see every DNS query. With plaintext DNS forwarding, that is not generally guaranteed at the network-observer level. Changed it to the narrower and accurate claim that a local resolver improves privacy from the ISP's recursive resolver.
- The BIND configuration comment said the default cache size is unlimited. Current BIND defaults are not simply unlimited for recursive service, and the post explicitly sets `max-cache-size`, so the incorrect default claim was removed.
- The post later reads `/var/named/data/cache_dump.db` and `/var/named/data/named_stats.txt`, but the replacement `named.conf` did not set `dump-file` or `statistics-file`. Added those options so the `rndc dumpdb -cache` and `rndc stats` examples write to the paths shown.
- The testing section claimed cached responses should be under 1ms. Cache hits are usually much faster, but exact timing depends on host, network, and measurement conditions. Changed the statement to a less absolute claim.
- The cache management section labeled `rndc status` as cache statistics. `rndc status` displays server status, while `rndc stats` writes statistics. Updated the label to "View server status."
- The performance section said to increase worker threads but only showed cache size. BIND exposes relevant recursive resolver limits such as `recursive-clients`; changed the text and snippet to tune the recursive client limit and cache size.

## Review Notes
The reviewed host is Ubuntu and does not have RHEL BIND packages installed, so `named-checkconf` could not be run locally against the final configuration. The syntax and commands were checked against Red Hat's RHEL 9 BIND documentation, ISC BIND references, official firewalld documentation, NetworkManager references, and local `nmcli` help.
