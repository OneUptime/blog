# Validation Summary: How to Understand Docker iptables Rules

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Docker Engine bridge networking
- iptables
- Linux netfilter NAT and filtering
- Docker port publishing
- Docker firewall chains

## Sources Consulted
- Docker Docs: Docker with iptables - https://docs.docker.com/engine/network/firewall-iptables/
- Docker Docs: Packet filtering and firewalls - https://docs.docker.com/engine/network/packet-filtering-firewalls/
- Docker Docs: Port publishing and mapping - https://docs.docker.com/engine/network/port-publishing/
- iptables(8) manual page, local iptables 1.8.10
- iptables-save(8) manual page, local iptables 1.8.10
- iptables-extensions(8) manual page, local iptables 1.8.10

## Issues Found
- The post described Docker as using "every" Docker iptables chain and listed older `DOCKER-ISOLATION-STAGE-*` chains as the main current chains. Updated the wording to cover the main chains, added current Docker Engine chain names from Docker's official docs, and preserved the isolation-stage chains as older-release examples.
- The post said Docker uses three iptables tables, including `mangle`. Docker's official bridge-network firewall documentation focuses on `filter` and `nat` for Docker-created bridge-network rules. Updated the refresher to say Docker primarily uses `filter` and `nat` for bridge networking.
- The `DOCKER-USER` published-port allow/drop example matched `--dport 8080` directly. Docker's official docs state packets have already passed DNAT by the time they reach `DOCKER-USER`, so original host port matching requires the conntrack extension. Updated the example to use `-m conntrack --ctorigdstport 8080` and inserted rules by explicit position so the allow rule is evaluated before the drop rule.
- The tracing example used `curl http://localhost:8080` while describing an external client. Updated it to use another host or the host's external IP.
- The command `iptables-save -t filter | grep DOCKER-USER > /etc/iptables/docker-user.rules` did not produce a restorable iptables-save excerpt because it omitted the table header, chain definition, and `COMMIT`. Replaced it with an `awk` command that keeps the required lines.
- The `DOCKER-USER` section said Docker never modifies the chain. Updated it to match Docker's documented role for the chain as a user-rule placeholder processed before Docker's forwarding rules.

## Review Notes
The example iptables output is inherently version- and configuration-specific. The post now calls this out for older Docker isolation chains, but future updates could include a separate current-Docker example captured from a clean Docker Engine host.
