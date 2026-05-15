# Validation Summary: How to Write nftables Rules from Scratch on RHEL

## Status
validated

## Post Type
Tutorial / guide

## Technologies Covered
- Red Hat Enterprise Linux 9
- nftables
- nft command-line tool
- systemd service management
- firewalld interaction with nftables
- Linux packet filtering, base chains, hooks, sets, and connection tracking

## Sources Consulted
- Red Hat Enterprise Linux 9 documentation: Configuring firewalls and packet filters - https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/htmlsingle/configuring_firewalls_and_packet_filters/getting-started-with-nftables_firewall-packet-filters
- nft(8) manual page installed in the review environment
- nft --help output installed in the review environment
- nftables wiki: Simple rule management - https://wiki.nftables.org/wiki-nftables/index.php/Simple_rule_management
- nftables wiki: Scripting - https://wiki.nftables.org/wiki-nftables/index.php/Scripting

## Issues Found
- The `trusted_mgmt` named set used CIDR prefix elements with `type ipv4_addr` but did not declare `flags interval`. nftables requires interval sets when prefix/range elements are used. Added `flags interval` to the set declaration so the ruleset is syntactically valid.

## Review Notes
- The RHEL-specific persistence approach using `/etc/sysconfig/nftables.conf` and `include "/etc/nftables/server.nft"` matches Red Hat documentation for the `nftables` systemd service.
- The guidance to run only one of `firewalld` or `nftables` is consistent with Red Hat documentation.
- The extracted ruleset was checked with `nft -c -f` before and after the fix. After the syntax fix, this review environment stopped on `Operation not permitted` because it lacks the privileges needed for a complete kernel ruleset validation, but the original interval-set syntax error was resolved.
