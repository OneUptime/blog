# Validation Summary: How to Connect Docker Containers Across Multiple Hosts

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Docker Engine networking
- Docker Swarm overlay networks
- Docker Compose and stack deployments
- WireGuard and wg-quick
- Tailscale containers, subnet routers, and MagicDNS
- Redis Cluster
- Consul and Registrator
- Linux firewall and routing concepts

## Sources Consulted
- Docker overlay network driver documentation: https://docs.docker.com/engine/network/drivers/overlay/
- Docker Swarm mode tutorial and required ports: https://docs.docker.com/engine/swarm/swarm-tutorial/
- Docker CLI help for `docker network create`, `docker service create`, and `docker stack deploy`
- Docker Compose networking documentation: https://docs.docker.com/compose/how-tos/networking/
- Docker Compose networks reference: https://docs.docker.com/reference/compose-file/networks/
- Tailscale Docker container documentation: https://tailscale.com/docs/features/containers/docker
- Tailscale Docker configuration parameters: https://tailscale.com/docs/features/containers/docker/docker-params
- Tailscale subnet router documentation: https://tailscale.com/docs/features/subnet-routers
- Tailscale MagicDNS documentation: https://tailscale.com/docs/features/magicdns
- WireGuard quick start: https://www.wireguard.com/quickstart/
- wg-quick manual page: https://man7.org/linux/man-pages/man8/wg-quick.8.html
- Redis Cluster specification: https://redis.io/docs/latest/operate/oss_and_stack/reference/cluster-spec/
- Registrator project documentation: https://github.com/gliderlabs/registrator

## Issues Found
- Docker Swarm overlay encryption was described as automatic/default in one place. Updated the wording to clarify that overlay application-data encryption is optional and enabled with `--opt encrypted`.
- The WireGuard Docker subnet examples used `172.17.0.0/16`, which commonly conflicts with Docker's default bridge network. Changed the example subnets to `172.20.0.0/16` and `172.21.0.0/16`.
- The WireGuard section added manual routes even though `wg-quick` automatically installs routes for peer `AllowedIPs`. Changed that section to verify the automatically installed routes instead of adding duplicates.
- The Tailscale sidecar example mixed `network_mode: host` with a sidecar namespace pattern. Removed host networking, changed the TUN mount to `devices`, replaced `SYS_MODULE` with `NET_RAW`, and added `TS_ACCEPT_DNS=true` for MagicDNS inside the shared namespace.
- The Tailscale subnet-router example omitted IP forwarding and route approval. Added the Linux IP forwarding commands, used `tailscale set --advertise-routes`, and noted that routes must be approved and accepted on Linux clients.
- The Redis Cluster folded `command` block contained inline comments, which YAML would pass to `redis-server` as literal command arguments. Moved the warning outside the command and removed inline comments from the command block.
- The Redis Cluster example exposed the cluster bus port but did not announce it. Added `--cluster-announce-bus-port 16379`.
- The Swarm encryption quick command omitted `--driver overlay`, so it would create a default bridge network rather than an overlay network. Added `--driver overlay`.

## Review Notes
The Consul/Registrator snippet is conceptually valid but uses `gliderlabs/registrator`, an older project. For future production guidance, consider recommending a maintained service-discovery integration or pinning image versions instead of using `latest`.
