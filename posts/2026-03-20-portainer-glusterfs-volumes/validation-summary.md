# Validation Summary: How to Set Up GlusterFS Volumes with Portainer - A Practical Guide

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Portainer
- GlusterFS
- Docker Swarm
- Docker volumes and bind mounts
- Docker Compose / stack file syntax
- XFS
- Linux systemd

## Sources Consulted
- Gluster Docs, Install Guide: https://docs.gluster.org/en/latest/Install-Guide/Install/
- Gluster Docs, Configure: https://docs.gluster.org/en/main/Install-Guide/Configure/
- Gluster Docs, Formatting and Mounting Bricks: https://docs.gluster.org/en/main/Administrator-Guide/formatting-and-mounting-bricks/
- Gluster Docs, Setting Up Clients: https://docs.gluster.org/en/latest/Administrator-Guide/Setting-Up-Clients/
- Gluster Docs, Managing Volumes: https://docs.gluster.org/en/main/Administrator-Guide/Managing-Volumes/
- Docker Docs, `docker volume create`: https://docs.docker.com/reference/cli/docker/volume/create/
- Docker Docs, `docker service create`: https://docs.docker.com/reference/cli/docker/service/create/
- Docker Docs, Deploy services to a swarm: https://docs.docker.com/engine/swarm/services/
- Docker Docs, Compose file reference for volumes: https://docs.docker.com/reference/compose-file/volumes/
- Docker Docs, Compose file reference for services: https://docs.docker.com/reference/compose-file/services/

## Issues Found
- The prerequisites understated Gluster networking requirements. I updated them to require hostname resolution plus the configured brick-port range, not just ports `24007-24008`, because Gluster clients and bricks use additional ports.
- The RPM install example incorrectly implied the same commands applied to both RHEL and CentOS. I narrowed that example to CentOS with the CentOS Storage SIG repository so the command shown matches the platform it actually targets.
- The brick-formatting step omitted Gluster's recommended XFS inode size. I changed `mkfs.xfs /dev/sdb1` to `mkfs.xfs -i size=512 /dev/sdb1` because Gluster uses extended attributes heavily.
- The client-mount step omitted two important Gluster details from the docs: hostname resolution on the client side and the `backupvolfile-server` option for mount resilience. I added both to the mount and `/etc/fstab` examples.
- The Docker bind-backed paths used later in the stack example were never created. I added `mkdir -p` commands for `/mnt/glusterfs/app-data`, `/mnt/glusterfs/web-content`, and `/mnt/glusterfs/db-data` so the bind sources exist on every node before Swarm tries to mount them.
- The direct `docker volume create --opt type=glusterfs ...` example was replaced with the host-mounted bind-backed volume pattern. That aligns with the documented Swarm/Compose bind-mount workflow used elsewhere in the post and avoids mixing two different Gluster access patterns in a way that wasn't clearly supported by the vendor docs.
- The monitoring note said rebalance should be run "after adding nodes". I corrected that wording to "after expanding the volume with additional bricks", which is the operation Gluster documents rebalance for.
- The conclusion overclaimed that the setup is "ideal for stateful services". I narrowed that to "shared persistent data" to avoid overstating suitability across all stateful workloads.

## Review Notes
- Portainer stack deployment in this post relies on standard Docker Swarm/Compose semantics, so Docker's Swarm and Compose references were the authoritative sources for the YAML and mount behavior.
- Gluster brick-port behavior is version-sensitive. Current Gluster docs note that from Gluster 10 onward brick ports are randomized within the configured `base-port` to `max-port` range, so firewall guidance should stay version-aware.
- Docker was not installed in the local review environment, so CLI verification for Docker commands was documentation-based rather than validated with local `--help` output.
