# Validation Summary: How to Set Up Swarm Inter-Node Encryption in Portainer - Inter Node

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Docker Swarm
- Docker overlay networks
- Docker CLI
- Docker Compose / Swarm stack YAML
- Portainer stacks
- IPsec overlay network encryption
- Swarm autolock

## Sources Consulted
- Docker overlay network driver documentation: https://docs.docker.com/engine/network/drivers/overlay/
- Docker Swarm networking documentation: https://docs.docker.com/engine/swarm/networking/
- Docker `network create` CLI reference: https://docs.docker.com/reference/cli/docker/network/create/
- Docker `network` CLI reference: https://docs.docker.com/reference/cli/docker/network/
- Docker `stack deploy` CLI reference: https://docs.docker.com/reference/cli/docker/stack/deploy/
- Docker stack deployment guide: https://docs.docker.com/engine/swarm/stack-deploy/
- Docker Compose networks reference: https://docs.docker.com/reference/compose-file/networks/
- Docker Swarm manager autolock documentation: https://docs.docker.com/engine/swarm/swarm_manager_locking/
- Moby libnetwork overlay encryption implementation: https://github.com/moby/libnetwork/blob/master/drivers/overlay/encryption.go
- Moby SwarmKit key manager implementation: https://github.com/moby/swarmkit/blob/master/manager/keymanager/keymanager.go
- Portainer stack template documentation: https://docs.portainer.io/advanced/app-templates/format

## Issues Found
1. **Network inspection command assumed the wrong name for stack-created networks.** Docker stack deploy prefixes network names with the stack name. Updated the verification step to show `secure-backend` for the CLI-created network and `mystack_secure-backend` for a Portainer stack deployment.
2. **Verification output was misleading.** The `grep -i encrypted` example implied that the VXLAN ID and encryption option would appear together. Replaced it with `docker network inspect --format '{{ index .Options "encrypted" }}'`, which directly returns the encryption option value.
3. **Performance overhead percentage was not supported by Docker documentation.** Docker documents encrypted overlay networking as having a non-negligible performance penalty but does not guarantee a 5-15% range. Reworded the section to say the impact depends on hardware, kernel, and workload.
4. **Autolock wording overstated what is exposed without autolock.** Docker documents that Raft logs are encrypted on disk by default, while autolock protects the mutual TLS key and the key used to encrypt/decrypt Raft logs at rest. Updated the wording accordingly.
5. **The network key rotation command was invalid.** Current Docker CLI documentation does not include a `docker network update` subcommand, and `--ingress=false` does not rotate overlay IPsec keys. Replaced the command with the accurate statement that Swarm rotates overlay network encryption keys automatically and does not provide a supported per-network manual key-rotation command.
6. **Summary overstated encryption scope.** Overlay encryption applies to VXLAN/IPsec traffic crossing swarm nodes. Updated "all container-to-container traffic" to "container-to-container traffic crossing swarm nodes."

## Review Notes
- The `docker network create --driver overlay --opt encrypted=true secure-backend` command is valid for creating an encrypted overlay network in Swarm mode.
- The stack YAML uses valid Swarm stack network configuration with `driver: overlay` and `driver_opts: encrypted: "true"`.
- Docker documentation notes that encrypted overlay networks are not supported for Windows containers and that IP protocol 50 (ESP) must be allowed when using encrypted overlays; these would be useful future additions but were not required to correct the existing content.
