# Validation Summary: How to Configure Volume Drivers in Portainer - A Practical Guide

## Status
validated

## Post Type
Guide

## Technologies Covered
- Portainer
- Docker Engine volumes
- Docker Compose volume definitions
- Docker managed plugins
- NFS
- CIFS/SMB
- tmpfs
- REX-Ray
- AWS EBS
- Azure Files
- Azure unmanaged disks
- GlusterFS
- Portworx

## Sources Consulted
- Docker volume create CLI reference: https://docs.docker.com/reference/cli/docker/volume/create/
- Docker volumes documentation: https://docs.docker.com/engine/storage/volumes/
- Docker tmpfs mounts documentation: https://docs.docker.com/engine/storage/tmpfs/
- Docker plugin install CLI reference: https://docs.docker.com/reference/cli/docker/plugin/install/
- Docker plugin ls CLI reference: https://docs.docker.com/reference/cli/docker/plugin/ls/
- Docker Compose volumes reference: https://docs.docker.com/reference/compose-file/volumes/
- Portainer add volume documentation: https://docs.portainer.io/user/docker/volumes/add
- Portainer volumes documentation: https://docs.portainer.io/user/docker/volumes
- REX-Ray Docker managed plugins overview: https://rexray.readthedocs.io/en/stable/user-guide/schedulers/docker/plug-ins/
- REX-Ray AWS plugin documentation: https://rexray.readthedocs.io/en/stable/user-guide/schedulers/docker/plug-ins/aws/
- REX-Ray Microsoft Azure plugin documentation: https://rexray.readthedocs.io/en/stable/user-guide/schedulers/docker/plug-ins/microsoft/
- REX-Ray Google plugin documentation: https://rexray.readthedocs.io/en/stable/user-guide/schedulers/docker/plug-ins/google/
- REX-Ray Ceph plugin documentation: https://rexray.readthedocs.io/en/stable/user-guide/schedulers/docker/plug-ins/ceph/
- Azure Files SMB on Linux documentation: https://learn.microsoft.com/en-us/azure/storage/files/storage-how-to-use-files-linux
- Docker Hub page for `trajano/glusterfs-volume-plugin`: https://hub.docker.com/r/trajano/glusterfs-volume-plugin
- Portworx Docker interaction documentation: https://2.13.docs.portworx.com/operations/operate-other/operate-docker/volume-plugin/

## Issues Found
- The first YAML example used duplicate top-level `volumes:` keys in a single code block, which makes the snippet invalid YAML. I merged the examples into one valid `volumes:` mapping.
- The tmpfs example said data is "lost on container restart". Docker documents tmpfs as non-persistent temporary storage; I changed the wording to "non-persistent" to avoid overstating the exact lifecycle semantics.
- Several `docker plugin install` examples used incorrect CLI structure or incomplete setup. I corrected the command form to match Docker's official `docker plugin install [OPTIONS] PLUGIN [KEY=VALUE...]` syntax.
- The Azure section incorrectly treated `rexray/azureud` as an Azure File driver and used the wrong environment variable names. I corrected it to Azure Unmanaged Disk with the documented `AZUREUD_*` configuration variables, and kept Azure Files as the separate CIFS-based example.
- The GlusterFS example referenced a different plugin/driver combination than the one documented by the plugin source. I replaced it with a documented managed plugin example using `trajano/glusterfs-volume-plugin` with an alias and matching Compose configuration.
- The Portworx example used a label format that did not match Docker-style key/value driver options. I changed it to `env=production`.
- The Portainer UI instructions implied everything is entered as generic driver options. Portainer's official volume UI has dedicated NFS/CIFS fields for `local` volumes, so I clarified that behavior.
- The `docker plugin ls` example incorrectly showed the built-in `local` driver. Docker's documentation states that `docker plugin ls` lists installed plugins only, so I removed that line and clarified the example.
- The driver selection guide mixed driver names with storage services or Kubernetes-oriented tooling in ways that were too ambiguous for a Docker/Portainer guide. I replaced those rows with specific Docker-appropriate drivers such as `rexray/efs`, `rexray/azureud`, `rexray/gcepd`, `rexray/rbd`, and `pxd`.
- The conclusion still implied Azure Files required a third-party plugin after the body had been corrected to use `local` + CIFS. I aligned the conclusion with the corrected examples.

## Review Notes
- The core Docker and Portainer guidance is still useful, but several third-party drivers referenced here come from projects whose public plugin images and docs are relatively old. Readers should confirm current maintenance status and backend requirements before adopting them in new production deployments.
- Portainer's official docs focus most directly on `local`, NFS, CIFS, and tmpfs volume creation. External driver behavior depends on what the underlying Docker environment has installed and enabled.
