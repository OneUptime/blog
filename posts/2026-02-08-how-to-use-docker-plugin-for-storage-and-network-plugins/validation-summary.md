# Validation Summary: How to Use docker plugin for Storage and Network Plugins

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Docker Engine managed plugins
- Docker volume plugins
- Docker network driver plugins
- Docker Compose volumes and networks
- SSHFS, NFS, NetApp Trident, REX-Ray EBS, Cloudstor, GlusterFS
- Weave Net, Calico, Macvlan, IPvlan

## Sources Consulted
- Docker Engine managed plugin system: https://docs.docker.com/engine/extend/
- Docker plugin CLI reference: https://docs.docker.com/reference/cli/docker/plugin/
- Docker plugin install reference: https://docs.docker.com/reference/cli/docker/plugin/install/
- Docker plugin upgrade reference: https://docs.docker.com/reference/cli/docker/plugin/upgrade/
- Docker plugin config reference: https://docs.docker.com/engine/extend/config/
- Docker volume plugins: https://docs.docker.com/engine/extend/plugins_volume/
- Docker network driver plugins: https://docs.docker.com/engine/extend/plugins_network/
- Docker Compose volumes reference: https://docs.docker.com/reference/compose-file/volumes/
- Docker Compose networks reference: https://docs.docker.com/reference/compose-file/networks/
- Docker Compose version top-level element: https://docs.docker.com/reference/compose-file/version-and-name/
- Docker macvlan driver: https://docs.docker.com/engine/network/drivers/macvlan/
- Docker ipvlan driver: https://docs.docker.com/engine/network/drivers/ipvlan/
- REX-Ray AWS plugin documentation: https://rexray.readthedocs.io/en/stable/user-guide/schedulers/docker/plug-ins/aws/
- NetApp Trident for Docker deployment documentation: https://docs.netapp.com/us-en/trident-2506/trident-docker/deploy-docker.html
- Calico Docker container install documentation: https://docs.tigera.io/calico/latest/getting-started/bare-metal/installation/container
- GlusterFS Docker Hub plugin documentation: https://hub.docker.com/r/urbitech/glusterfs
- Mirantis Cloudstor reference: https://docs.mirantis.com/containers/v3.0/dockeree-products/cluster/yaml_reference/component/azure/cloudstor.html

## Issues Found
- Removed obsolete top-level `version: "3.8"` fields from Docker Compose examples. Current Docker Compose treats `version` as backward-compatible but obsolete and warns when it is used.
- Corrected the NetApp Trident example to install with the documented `--alias netapp`, explicit version placeholder, and config option, then create volumes with the `netapp` driver alias.
- Corrected the Azure example from `cloudstor/azure-disk` to the legacy Cloudstor plugin pattern for Docker Swarm clusters on Azure, and renamed the heading to avoid implying it is the current Azure Disk CSI path.
- Corrected the GlusterFS example to use the documented managed plugin image `urbitech/glusterfs` with a `glusterfs` alias, then create volumes with that alias.
- Replaced the incorrect `docker plugin install calico/node:latest` example. Current Calico documentation runs `calico/node` as a container for non-cluster hosts rather than installing it as a Docker managed plugin.
- Revised the blanket statement that volume plugins should not need host networking. Some documented volume plugins, including SSHFS and Rclone-style FUSE plugins, legitimately request host networking, so the guidance now focuses on reviewing unexpected broad privileges.

## Review Notes
- Several third-party plugins in the examples are legacy or lightly maintained. The commands are now technically aligned with their documented usage, but production users should check plugin maintenance, Docker Engine compatibility, and cloud-provider support before adopting them.
