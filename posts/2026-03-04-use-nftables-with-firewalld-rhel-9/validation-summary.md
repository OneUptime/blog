# Validation Summary: How to Use nftables with firewalld on RHEL

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Red Hat Enterprise Linux 9
- firewalld
- firewall-cmd
- nftables
- systemd services
- Linux netfilter

## Sources Consulted
- Red Hat Enterprise Linux 9 documentation, "Configuring firewalls and packet filters": https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html-single/configuring_firewalls_and_packet_filters/index
- firewalld `firewall-cmd` manual page: https://firewalld.org/documentation/man-pages/firewall-cmd
- firewalld `firewalld.conf` manual page: https://firewalld.org/documentation/man-pages/firewalld.conf.html
- nftables wiki, "Configuring chains": https://wiki.nftables.org/wiki-nftables/index.php/Configuring_chains
- nftables wiki, "Meters": https://wiki.nftables.org/wiki-nftables/index.php/Meters
- Local `nft(8)` manual page and `nft --help` output

## Issues Found
- The original priority explanation implied that an nftables chain priority globally orders a custom chain before or after firewalld chains. nftables priorities order chains attached to the same hook, so the post now states that lower priority values run first on the same hook.
- The custom `nftables-custom.service` loaded a table definition but did not remove the existing custom table first. Restarting the oneshot service could fail if `custom_filter` already existed. Added `ExecStartPre=-/usr/sbin/nft delete table inet custom_filter` so reloads or restarts replace only the custom table.
- The conflict-checking note now clarifies that priority conflicts are scoped to chains on the same hook.

## Review Notes
The post is technically valid after the fixes. Red Hat documents that `firewalld` with the nftables backend does not support passing custom nftables rules through `--direct`, and recommends running only one firewall-related service on a RHEL host to avoid interactions. The post includes that caveat while still showing a technically valid separate-table approach for advanced cases.
