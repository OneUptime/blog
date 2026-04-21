# Validation Summary: How to Troubleshoot Docker Container IPv4 Connectivity Issues

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Docker Engine and Docker CLI
- Docker bridge and user-defined networks
- IPv4 container networking and routing
- Docker DNS resolution and embedded DNS
- Linux `ip`, `ping`, and `nslookup` diagnostics
- Linux `iptables` forwarding and NAT rules
- `systemd` Docker daemon restart behavior

## Sources Consulted
- Docker CLI `docker container inspect` reference: https://docs.docker.com/reference/cli/docker/container/inspect/
- Docker CLI formatting and Go templates: https://docs.docker.com/engine/cli/formatting/
- Docker CLI `docker container exec` reference: https://docs.docker.com/reference/cli/docker/container/exec/
- Docker CLI `docker network connect` reference: https://docs.docker.com/reference/cli/docker/network/connect/
- Docker Engine networking documentation, including DNS services: https://docs.docker.com/engine/network/
- Docker bridge network driver documentation: https://docs.docker.com/engine/network/drivers/bridge/
- Docker with iptables documentation: https://docs.docker.com/engine/network/firewall-iptables/
- Docker packet filtering and firewalls documentation: https://docs.docker.com/engine/network/packet-filtering-firewalls/
- Docker with nftables documentation: https://docs.docker.com/engine/network/firewall-nftables/
- Docker live restore documentation: https://docs.docker.com/engine/daemon/live-restore/
- Docker restart policies documentation: https://docs.docker.com/engine/containers/start-containers-automatically/

## Issues Found
- The DNS troubleshooting step implied Docker's embedded resolver applies generally. Docker's documentation says containers on custom networks use the embedded DNS server at `127.0.0.11`, while default bridge containers receive a copy of the host resolver configuration. Updated the comment to specify custom networks.
- The iptables forwarding check described the built-in `FORWARD` chain as Docker's FORWARD chain. Docker creates rules and custom chains that are referenced from the built-in `FORWARD` chain. Updated the comment to say the command checks whether Docker's rules are present.
- The Docker restart warning said a restart only disconnects containers briefly. Docker documentation says daemon termination shuts down running containers by default; live restore can keep containers running, and restart policies control automatic restarts. Updated the warning to mention networking interruption and possible container stops.

## Review Notes
- The Docker CLI is not installed in this workspace, so local `docker --help` checks could not be run; Docker commands were validated against official Docker documentation instead.
- The `ip`, `ping`, and `nslookup` examples are valid diagnostics but require those utilities to exist inside the target container image.
- The iptables examples are correct for Docker's default iptables firewall backend. Docker Engine also has experimental nftables support, so hosts using that backend need equivalent nftables checks.
