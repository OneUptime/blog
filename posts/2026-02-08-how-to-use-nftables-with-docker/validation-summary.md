# Validation Summary: How to Use nftables with Docker

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Docker Engine networking
- Docker firewall backends
- nftables
- iptables-nft and iptables-legacy
- Linux firewall configuration
- systemd service management

## Sources Consulted
- Docker Docs: Docker with nftables, https://docs.docker.com/engine/network/firewall-nftables/
- Docker Docs: dockerd CLI reference, https://docs.docker.com/reference/cli/dockerd/
- Docker Docs: Install Docker Engine on Ubuntu, https://docs.docker.com/engine/install/ubuntu/
- nftables wiki: Sets, https://wiki.nftables.org/wiki-nftables/index.php/Sets
- nftables wiki: Updating sets from the packet path, https://wiki.nftables.org/wiki-nftables/index.php/Updating_sets_from_the_packet_path
- nftables wiki: Moving from iptables to nftables, https://wiki.netfilter.org/wiki-nftables/index.php/Moving_from_iptables_to_nftables
- Local command help/man pages: `nft --help`, `man nft`, `iptables-restore-translate --help`, `dockerd --help`

## Issues Found
- The post only described Docker's iptables-nft compatibility path and omitted Docker 29.0.0's experimental native nftables firewall backend. Added a short clarification that native nftables mode uses `--firewall-backend=nftables` or `"firewall-backend": "nftables"`, creates `ip docker-bridges` and `ip6 docker-bridges`, and does not create `DOCKER-USER`.
- The `DOCKER-USER` nftables examples were presented as general native nftables guidance. Clarified that these apply when Docker is using the iptables backend through iptables-nft.
- The named set example added a CIDR element to a set without `flags interval`. Added `flags interval` to match nftables requirements for interval/prefix elements.
- The port-knocking example used non-canonical packet-path set update syntax and omitted timeout flags on sets that expire elements. Replaced the rules with `update @set { ip saddr }` syntax and added `flags timeout`.
- The port-knocking comment said Docker port 8080 while the forward-chain rule matched destination port 80 after DNAT. Corrected the comment to refer to the container's port 80.
- The persistence example used `sudo nft list ruleset > /etc/nftables.conf`, where the shell redirection may run without elevated privileges. Replaced it with `sudo nft list ruleset | sudo tee /etc/nftables.conf > /dev/null`.
- Troubleshooting examples assumed only the iptables-nft backend. Marked those commands as iptables-nft specific and added native nftables table inspection commands.

## Review Notes
Docker's native nftables backend is experimental as of Docker 29.x and does not support Swarm mode. The post now preserves the compatibility-layer workflow while noting the native backend differences. Some examples still require readers to substitute their actual external interface name and Docker bridge names.
