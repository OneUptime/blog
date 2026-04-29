# Validation Summary: How to Configure IPvlan L2 Mode for Containers in Portainer

## Status
validated

## Post Type
Guide

## Technologies Covered
- Portainer
- Docker Engine
- Docker Compose
- IPvlan networking
- Linux `iproute2`
- Pi-hole
- Chrony / `cturra/ntp`
- Eclipse Mosquitto

## Sources Consulted
- Docker IPvlan driver docs: https://docs.docker.com/engine/network/drivers/ipvlan/
- Docker `docker network create` CLI reference: https://docs.docker.com/reference/cli/docker/network/create/
- Docker Compose file reference: https://docs.docker.com/reference/compose-file/
- Docker Compose `version` and `name` docs: https://docs.docker.com/reference/compose-file/version-and-name/
- Docker Compose `services` reference: https://docs.docker.com/reference/compose-file/services/
- Docker Compose `networks` reference: https://docs.docker.com/reference/compose-file/networks/
- Docker Compose networking guide: https://docs.docker.com/compose/how-tos/networking/
- Portainer network creation docs: https://docs.portainer.io/user/docker/networks/add
- Portainer supported network types docs: https://docs.portainer.io/user/docker/networks
- Linux kernel IPvlan HOWTO: https://docs.kernel.org/networking/ipvlan.html
- Pi-hole Docker configuration docs: https://docs.pi-hole.net/docker/configuration/
- Pi-hole official Docker image repository: https://github.com/pi-hole/docker-pi-hole
- `cturra/ntp` repository README: https://github.com/cturra/docker-ntp
- Eclipse Mosquitto official image docs: https://hub.docker.com/_/eclipse-mosquitto/

## Issues Found
- The Docker network name was inconsistent across the CLI example, Portainer instructions, and Compose snippet (`ipvlan_l2_network` vs `ipvlan_l2`). I standardized the name to `ipvlan_l2` so the examples line up and the external Compose network reference resolves correctly.
- The Compose example used the top-level `version: "3.8"` field, which current Compose marks as obsolete. I removed it to match the current Compose specification.
- The Pi-hole example used outdated environment variable names (`WEBPASSWORD` and `PIHOLE_DNS_`). I replaced them with the current documented variables `FTLCONF_webserver_api_password` and `FTLCONF_dns_upstreams`.
- The `cturra/ntp` example added `SYS_TIME`, but the image documentation states `chronyd` runs with `-x` and does not control the host clock. I removed the unnecessary capability.
- The prerequisites section suggested enabling promiscuous mode, which is associated with multi-MAC scenarios such as macvlan and is not an IPvlan L2 prerequisite. I removed that command.
- The DHCP exclusion block was labeled as `bash` despite being plain text, and it still contained Macvlan-specific leftovers. I changed it to a text block and aligned the reserved addresses with the IPvlan pool and host-side IPvlan interface shown later in the post.
- The bridge-vs-IPvlan comparison block was not a valid Compose/YAML example as written. I adjusted it into valid illustrative YAML fragments and moved the access URLs outside the code block.

## Review Notes
- The post is technically sound after the fixes above.
- Docker documents that containers on an IPvlan L2 network cannot directly reach the underlying host interface, so the extra host-side interface and route in Step 5 remain an important caveat for host-to-container communication.
- Review was documentation-based and command-syntax-based; the examples were not executed against a live Portainer or LAN environment in this workspace.
