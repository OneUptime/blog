# Validation Summary: How to Fix Swarm MTU Issues with Portainer on Hetzner

## Status
validated

## Post Type
Troubleshooting guide / Tutorial

## Technologies Covered
- Docker Swarm
- Docker Engine networking
- Docker Compose / Swarm stack files
- Portainer
- Hetzner Cloud networking
- Linux networking tools (`ip`, `ping`)

## Sources Consulted
- Hetzner Cloud FAQ (private MTU 1450, public MTU 1500): https://docs.hetzner.com/cloud/technical-details/faq/
- Hetzner MTU troubleshooting guide (PMTU probing, 1422-byte ICMPv4 payload on MTU 1450): https://docs.hetzner.com/networking/networks/troubleshooting/mtu/
- Docker Swarm networking docs (customizing `ingress`, MTU option, published-port services requirement): https://docs.docker.com/engine/swarm/networking/
- Docker `dockerd` CLI reference (`--mtu` for the default bridge network, `default-network-opts`): https://docs.docker.com/reference/cli/dockerd/
- Docker `network create` CLI reference (`--opt com.docker.network.driver.mtu`, `--ingress`): https://docs.docker.com/reference/cli/docker/network/create/
- Docker `network inspect` CLI reference (`--format` support): https://docs.docker.com/reference/cli/docker/network/inspect/
- Docker Compose file networks reference (`driver`, `driver_opts`): https://docs.docker.com/reference/compose-file/networks/
- Portainer stack deployment docs (Compose YML for stacks): https://docs.portainer.io/user/docker/stacks/add
- Portainer FAQ confirming Swarm stack deploys use `docker stack deploy`: https://docs.portainer.io/faqs/troubleshooting/stacks-deployments-and-updates/how-do-automatic-updates-for-stacks-applications-work

## Issues Found
1. **Overbroad Hetzner MTU claim.** The post said Hetzner Cloud uses MTU 1450 in general. Hetzner's official docs distinguish between **private interfaces (1450)** and **public interfaces (1500)**. Updated the explanation to scope the problem to Hetzner private networks, which is where the Swarm MTU mismatch typically appears.
2. **Diagnostic commands were too imprecise.** `ip link show eth0` assumed a specific interface name, and the note "if ping fails, MTU is the issue" overstated what a failed probe proves. Replaced this with `ip addr` and boundary PMTU probes at `1422` and `1423` bytes, matching Hetzner's own MTU troubleshooting guidance.
3. **Docker daemon MTU section described the setting too broadly.** The post presented `"mtu": 1450` as a global Docker fix for Swarm MTU problems. Docker's documented daemon `mtu` setting applies to the default `bridge` network, not to Swarm overlay networks. Kept the example, but clarified that overlay networks still require `com.docker.network.driver.mtu`.
4. **JSON snippet was not valid JSON.** The `daemon.json` example included a `// /etc/docker/daemon.json` comment inside a `json` code block. Removed the inline comment and moved the file path into the surrounding text so the snippet is valid JSON as written.
5. **Ingress removal requirement was too broad.** The original comment implied all services using ingress had to be removed first. Docker's Swarm networking docs are more specific: the blocking services are those that publish ports and depend on the ingress routing mesh. Updated the guidance accordingly.

## Review Notes
- The title mentions Portainer, but the body is mostly Docker Swarm guidance. This is still technically applicable because Portainer deploys Swarm stacks from Compose files using `docker stack deploy`.
- The `version: "3.8"` Compose example remains acceptable for Swarm stack deployment; Docker documents `docker stack deploy` support for Compose file version 3.0 and above.
- The final verification example assumes the target container image includes `ping` with support for `-M do`. That is common on full Linux images but not guaranteed on minimal images such as Alpine-based production containers.
