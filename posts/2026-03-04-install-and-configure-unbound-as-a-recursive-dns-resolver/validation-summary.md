# Validation Summary: How to Install and Configure Unbound as a Recursive DNS Resolver on RHEL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Red Hat Enterprise Linux 9
- Unbound recursive DNS resolver
- DNS and DNSSEC
- firewalld
- NetworkManager and nmcli
- systemd

## Sources Consulted
- Red Hat Enterprise Linux 9 documentation, "Setting up an unbound DNS server": https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/managing_networking_infrastructure_services/assembly_setting-up-an-unbound-dns-server_networking-infrastructure-services
- NLnet Labs Unbound documentation, `unbound(8)`: https://unbound.docs.nlnetlabs.nl/en/latest/manpages/unbound.html
- NLnet Labs Unbound documentation, `unbound.conf(5)`: https://unbound.docs.nlnetlabs.nl/en/latest/manpages/unbound.conf.html
- NLnet Labs Unbound documentation, `unbound-control(8)`: https://unbound.docs.nlnetlabs.nl/en/latest/manpages/unbound-control.html
- firewalld `firewall-cmd` manual: https://firewalld.org/documentation/man-pages/firewall-cmd.html
- NetworkManager `nmcli` manual: https://www.networkmanager.dev/docs/api/latest/nmcli.html
- NetworkManager `nm-settings-nmcli` manual: https://www.networkmanager.dev/docs/api/latest/nm-settings-nmcli.html
- InterNIC root hints file: https://www.internic.net/domain/named.cache

## Issues Found
- The introduction contained corrupted text: "RHELl" and "purelyRHELe". Changed it to accurately describe Unbound as suitable for a RHEL or network-wide recursive resolver and focused on the resolver role.
- The Unbound configuration block was marked as YAML even though `unbound.conf` uses its own attribute/value syntax. Changed the code fence to `conf`.
- The post used `unbound-control stats_noreset` without first ensuring remote-control keys exist. Added `sudo systemctl restart unbound-keygen` before starting Unbound, matching Red Hat's RHEL 9 guidance.
- The client configuration step told clients to use `127.0.0.1`, which only works on the resolver host or on machines running their own local Unbound instance. Clarified that remote clients should use the Unbound server's LAN IP address.
- The nmcli example used a hard-coded connection name, `"System eth0"`, which may not exist on RHEL systems. Changed it to a placeholder connection name.
- The nmcli example set a static DNS server but did not disable DHCP-provided DNS servers. Added `ipv4.ignore-auto-dns yes` so the configured resolver is actually preferred for DHCP-managed connections.
- Removed a stray trailing `RHEL` line at the end of the post.

## Review Notes
The corrected Unbound options, firewalld service command, root hints URL, systemd commands, `dig` test commands, and `unbound-control stats_noreset` command are technically valid. The post remains intentionally brief; future improvements could add `unbound-checkconf` before enabling the service and mention IPv6 listener/client examples for dual-stack networks.
