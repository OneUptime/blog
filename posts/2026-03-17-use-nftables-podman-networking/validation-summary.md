# Validation Summary: How to Use nftables with Podman Networking

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Podman
- Netavark
- nftables
- Linux firewall and packet filtering
- Container bridge networking

## Sources Consulted
- Podman `podman-network` documentation: https://docs.podman.io/en/v5.2.0/markdown/podman-network.1.html
- Podman `podman-run` documentation: https://docs.podman.io/en/v5.2.0/markdown/podman-run.1.html
- `containers.conf(5)` manual: https://man.archlinux.org/man/containers.conf.5.en
- Netavark upstream documentation: https://github.com/containers/netavark
- nftables wiki, configuring chains: https://wiki.nftables.org/wiki-nftables/index.php/Configuring_chains
- nftables wiki, logging traffic: https://wiki.nftables.org/wiki-nftables/index.php/Logging_traffic
- nftables wiki, rate limiting: https://wiki.nftables.org/wiki-nftables/index.php/Rate_limiting_matchings
- Red Hat nftables persistence documentation: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/htmlsingle/configuring_firewalls_and_packet_filters/getting-started-with-nftables_firewall-packet-filters

## Issues Found
- The introduction claimed that Podman 4.x and later support nftables natively without qualification. Podman 4.0+ uses Netavark on new systems, and Netavark supports nftables, but the actual firewall driver is distro/configuration dependent. Updated the wording to specify rootful Podman bridge networking with Netavark configured to use nftables.
- The example for viewing Podman-generated rules grepped for `podman`, but Netavark nftables rules are normally under a `netavark` table/name. Updated the command to grep for `netavark`.
- The `nft add chain` command used unquoted braces and semicolons in a form that is fragile in a shell. Updated it to quote the nftables command, matching nftables documentation examples.
- The chain comment called the chain an input chain even though it used the forward hook. Updated the comment to say forward chain.
- The logging example said the rule was inserted before the drop rule, but `nft insert rule` places it at the beginning of the chain by default. Updated the comment to match the command behavior.
- The rate limiting example appended an accept rule after earlier accept/drop rules, which could make it ineffective in the tutorial's rule order. Updated it to insert a `limit rate over 20/minute drop` rule, which matches nftables rate-limit semantics for dropping traffic above the configured rate.

## Review Notes
The persistence example is accurate for RHEL-style nftables services that load includes from `/etc/sysconfig/nftables.conf`. Other distributions, such as Ubuntu, commonly load `/etc/nftables.conf` directly, so the post may benefit from a distro-specific note in a future revision.
