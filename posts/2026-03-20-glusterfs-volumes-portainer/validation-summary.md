# Validation Summary: How to Set Up GlusterFS Volumes with Portainer

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- GlusterFS
- Docker Engine
- Docker Swarm
- Docker Compose file format for Swarm stacks
- Portainer
- Linux mount and `/etc/fstab`

## Sources Consulted
- Gluster Docs, "Setting up GlusterFS Volumes": https://docs.gluster.org/en/latest/Administrator-Guide/Setting-Up-Volumes/
- Gluster Docs, "Setting Up Clients": https://docs.gluster.org/en/latest/Administrator-Guide/Setting-Up-Clients/
- Gluster Docs, "CLI Reference": https://docs.gluster.org/en/latest/CLI-Reference/cli-main/
- Docker Docs, "Deploy a stack to a swarm": https://docs.docker.com/engine/swarm/stack-deploy/
- Docker Docs, "Compose Deploy Specification": https://docs.docker.com/reference/compose-file/deploy/
- Docker Docs, "Deploy services to a swarm": https://docs.docker.com/engine/swarm/services/
- Docker Docs, "`docker volume create`": https://docs.docker.com/reference/cli/docker/volume/create/
- Portainer Docs, "Add a new volume": https://docs.portainer.io/user/docker/volumes/add

## Issues Found
- The architecture diagram used `/mnt/gfs`, but the rest of the post used `/mnt/portainer-vol`. I changed the diagram to match the actual mount path used in the commands and stack example.
- The GlusterFS client mount example used `localhost:/portainer-vol` while also telling readers to replace it with a node IP. Official Gluster client documentation expects `HOSTNAME-OR-IPADDRESS:/VOLNAME`, so I changed both the `mount` and `/etc/fstab` examples to use `192.168.1.100:/portainer-vol`.
- The stack example bind-mounted `/mnt/portainer-vol/webapp/data` and `/mnt/portainer-vol/webapp/uploads` without creating those host paths first. Docker Swarm bind mounts require the source path to exist on the host before the task starts, so I added a `mkdir -p` command after the GlusterFS mount is established.
- The Swarm stack example used `restart: unless-stopped`, which is not the correct restart configuration for Swarm services. I removed that field and replaced it with `deploy.restart_policy.condition: any`, which matches Docker's Swarm service configuration model.
- The alternative Docker volume driver section referenced an unverified third-party `glusterfs` plugin example and implied a built-in `glusterfs` driver workflow in Portainer. I removed that section because it was not supportable from official GlusterFS, Docker, or Portainer documentation as written.

## Review Notes
- Docker Swarm stack deployment still uses the legacy Compose v3 file format; the `version: "3.8"` example remains compatible with `docker stack deploy` and Portainer Swarm stacks.
- The GlusterFS client can optionally use mount options such as `backupvolfile-server` for additional resiliency, but the simplified mount example in the corrected post is still technically valid.
