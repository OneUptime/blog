# Validation Summary: How to Deploy Portainer on Hetzner Cloud - Part 2

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Hetzner Cloud
- `hcloud` CLI
- Hetzner DNS
- Docker Engine
- Docker Swarm networking
- Portainer CE
- cloud-init

## Sources Consulted
- Hetzner Cloud CLI manual: `hcloud server create` - https://raw.githubusercontent.com/hetznercloud/cli/main/docs/reference/manual/hcloud_server_create.md
- Hetzner Cloud CLI manual: `hcloud server ip` - https://raw.githubusercontent.com/hetznercloud/cli/main/docs/reference/manual/hcloud_server_ip.md
- Hetzner Cloud CLI manual: `hcloud firewall add-rule` - https://raw.githubusercontent.com/hetznercloud/cli/main/docs/reference/manual/hcloud_firewall_add-rule.md
- Hetzner Cloud CLI manual: `hcloud firewall apply-to-resource` - https://raw.githubusercontent.com/hetznercloud/cli/main/docs/reference/manual/hcloud_firewall_apply-to-resource.md
- Hetzner Cloud CLI manual: `hcloud volume create` - https://raw.githubusercontent.com/hetznercloud/cli/main/docs/reference/manual/hcloud_volume_create.md
- Hetzner Cloud CLI manual: `hcloud zone create` - https://raw.githubusercontent.com/hetznercloud/cli/main/docs/reference/manual/hcloud_zone_create.md
- Hetzner Cloud CLI manual: `hcloud zone set-records` - https://raw.githubusercontent.com/hetznercloud/cli/main/docs/reference/manual/hcloud_zone_set-records.md
- Hetzner Cloud pricing and current product changes - https://docs.hetzner.com/general/infrastructure-and-availability/price-adjustment/
- Hetzner Cloud server overview and deprecated server plans - https://docs.hetzner.com/cloud/servers/overview and https://docs.hetzner.com/cloud/servers/deprecated-plans/
- Hetzner DNS migration FAQ - https://docs.hetzner.com/networking/dns/faq/beta
- Portainer CE installation with Docker on Linux - https://docs.portainer.io/2.33-lts/start/install-ce/server/docker/linux
- Docker daemon configuration overview - https://docs.docker.com/engine/daemon/
- Docker `dockerd` reference - https://docs.docker.com/reference/cli/dockerd/
- Docker bridge and overlay networking docs - https://docs.docker.com/engine/network/drivers/bridge/ and https://docs.docker.com/engine/network/drivers/overlay/
- Docker Swarm service networking - https://docs.docker.com/engine/swarm/networking/
- Hetzner MTU and private network technical details - https://docs.hetzner.com/cloud/technical-details/faq/ and https://docs.hetzner.com/networking/networks/troubleshooting/mtu

## Issues Found
- The post used deprecated Hetzner server types (`CX22`, `CX32`, `CX42`). I updated them to currently orderable `CX23`, `CX33`, and `CX43`, and adjusted the pricing language accordingly.
- The opening price comparison referenced stale pricing and an unsupported performance comparison to another provider. I replaced it with a current, defensible Hetzner-only pricing statement.
- The firewall section opened ports `80` and `443`, but the post never configured a reverse proxy or service on those ports. I removed those rules so the example only opens the Portainer UI port that the post actually uses.
- The volume section changed Docker's `data-root` after Portainer had already been deployed. That would not safely migrate the existing container state and is also incomplete on fresh Docker Engine 29 installs using the containerd image store. I corrected this by mounting the attached volume directly to Portainer's `/data` path instead.
- The Portainer image tag used `latest`. I updated the deployment example to `portainer/portainer-ce:lts` to match current Portainer installation guidance.
- The DNS example used the deprecated Hetzner DNS Console API. I replaced it with the current `hcloud zone` workflow that uses Hetzner Console / Cloud API DNS management.
- The MTU section claimed Hetzner Cloud generally uses MTU `1450` and suggested a `daemon.json` setting for Swarm. I corrected this to Hetzner private network interfaces and changed the example to the Docker overlay-network MTU option used for Swarm networking.

## Review Notes
- The cloud-init example still uses Docker's convenience install script. Docker documents this as a convenience method for quick installs; for hardened production systems, their repository-based installation steps are a stronger default.
- Portainer port `8000` is only needed for Edge agent use cases. The post's container example still exposes it to match Portainer's documented default install command, but the firewall no longer opens it externally.
