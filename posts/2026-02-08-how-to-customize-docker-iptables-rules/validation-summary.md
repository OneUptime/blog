# Validation Summary: How to Customize Docker iptables Rules

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Docker Engine networking
- Docker bridge networks
- iptables
- netfilter / conntrack
- ipset
- systemd
- iptables-persistent / netfilter-persistent

## Sources Consulted
- Docker Docs: Docker with iptables - https://docs.docker.com/engine/network/firewall-iptables/
- Docker Docs: Packet filtering and firewalls - https://docs.docker.com/engine/network/packet-filtering-firewalls/
- Docker Docs: Bridge network driver - https://docs.docker.com/engine/network/drivers/bridge/
- Docker Docs: docker network create reference - https://docs.docker.com/reference/cli/docker/network/create/
- Linux man-pages: iptables-extensions(8) - https://man7.org/linux/man-pages/man8/iptables-extensions.8.html
- netfilter ipset documentation - https://ipset.netfilter.org/
- Local command help: `iptables --help`

## Issues Found
- The post described an older/simplified Docker FORWARD-chain order using `DOCKER-ISOLATION-STAGE-1`. Updated it to match current Docker documentation, which lists `DOCKER-USER`, `DOCKER-FORWARD`, `DOCKER`, `DOCKER-BRIDGE`, `DOCKER-INTERNAL`, `DOCKER-CT`, and `DOCKER-INGRESS` as the relevant filter-table chains.
- The post said Docker never modifies `DOCKER-USER`. Removed that absolute claim and kept the accurate claim that `DOCKER-USER` is for user-defined rules processed before Docker's own forwarding chains.
- Several examples appended DROP rules after the default RETURN rule, which would make them unreachable in a default `DOCKER-USER` chain. Changed those examples to insert rules before the RETURN rule with explicit line numbers.
- The port-specific examples implied `--dport` matches the published host port in `DOCKER-USER`. Docker documentation says packets have already passed DNAT at that point, so `--dport` matches the container destination port. Updated the explanation and added a conntrack original-destination-port example.
- The rate-limit example inserted the DROP rule above the ACCEPT rule because `iptables -I` defaults to line 1. Changed the DROP insertion to line 2 so the limited ACCEPT rule is evaluated first.
- The logging example claimed to log dropped packets but inserted a LOG rule at the top of the chain, which would log unrelated traffic. Changed the example to insert logging immediately before a chosen DROP rule and documented replacing the line number.
- The time-based example implied local business hours, but the iptables `time` match uses UTC by default. Updated the comment to say UTC.
- The temporary test command used `timeout 60` in a way that could terminate the shell before the cleanup command ran. Replaced it with a shell cleanup trap that removes the test rule after the sleep or on shell exit.
- Clarified that Docker does not persist custom `DOCKER-USER` rules across host reboots, and noted that iptables-persistent restoration must happen after Docker has created the chain.

## Review Notes
- The examples assume Docker Engine is using the iptables firewall backend. Docker also supports an nftables backend, where Docker's iptables-specific chains do not apply in the same way.
- Interface names such as `eth0` and bridge names such as `br-abc123` are environment-specific and must be adjusted on real hosts.
