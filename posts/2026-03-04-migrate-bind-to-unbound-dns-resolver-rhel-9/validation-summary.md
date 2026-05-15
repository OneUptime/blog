# Validation Summary: How to Migrate from BIND to Unbound DNS Resolver on RHEL

## Status
validated

## Post Type
Tutorial / migration guide

## Technologies Covered
- Red Hat Enterprise Linux 9
- BIND / named
- Unbound DNS resolver
- DNS recursion and caching
- DNSSEC validation
- firewalld
- systemd
- dig

## Sources Consulted
- Red Hat Enterprise Linux 9 documentation, "Setting up an unbound DNS server": https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/managing_networking_infrastructure_services/assembly_setting-up-an-unbound-dns-server_networking-infrastructure-services
- Unbound `unbound.conf(5)` manual: https://unbound.docs.nlnetlabs.nl/en/latest/manpages/unbound.conf.html
- Unbound `unbound-control(8)` manual: https://unbound.docs.nlnetlabs.nl/en/latest/manpages/unbound-control.html
- Unbound `unbound-anchor(8)` manual: https://unbound.docs.nlnetlabs.nl/en/latest/manpages/unbound-anchor.html
- Unbound getting started configuration guide: https://unbound.docs.nlnetlabs.nl/en/latest/getting-started/configuration.html
- ISC BIND DNSSEC Guide, DNSSEC validation test domain: https://ftp.ripe.net/mirrors/sites/ftp.isc.org/isc/dnssec-guide/html/dnssec-guide.html
- IANA Root Servers page, root hints context: https://www.iana.org/domains/root/servers
- BIND 9 Configuration Reference: https://bind9.readthedocs.io/en/v9.20.2/reference.html

## Issues Found
- The sample configuration disabled file logging in favor of syslog. The original `/var/log/unbound/unbound.log` example could fail on SELinux-enforcing RHEL systems unless log file context and policy details are handled. RHEL's documented setup does not require a custom log directory, so the post now uses `use-syslog: yes`.
- The post used `unbound-control` commands later but did not enable remote control in the replacement configuration or generate RHEL's control keys. Added a `remote-control:` block with `control-enable: yes` and changed the environment preparation step to run `systemctl restart unbound-keygen`, matching Red Hat's documented setup.
- The `local-data-ptr` names lacked trailing dots. Updated them to fully qualified names to avoid ambiguity in PTR data.
- The DNSSEC failure test used `dnssec-failed.org`; ISC documents `www.dnssec-failed.org` as the deliberately broken DNSSEC validation test name. Updated the command accordingly.
- The `blackhole` mapping was incomplete. BIND `blackhole` can block client queries and prevent use of those addresses for resolution, so the table now maps client blocking to `access-control: ... refuse` and upstream avoidance to `do-not-query-address: ...`.
- The "Flush everything" example included `flush_requestlist`, but Unbound documents that command as dropping currently worked-on queries while leaving the cache unaffected. Removed it from the cache flush example and left `flush_zone .`.

## Review Notes
The post is technically relevant and the migration flow is valid for a recursive caching resolver. The example still uses broad listener interfaces and private RFC1918 access ranges; in production, administrators should narrow both to their actual resolver addresses and client subnets.
