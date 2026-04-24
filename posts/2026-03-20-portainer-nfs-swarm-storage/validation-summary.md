# Validation Summary: How to Set Up NFS Shared Storage for Portainer Swarm - A Practical Guide

## Status
validated

## Post Type
Guide

## Technologies Covered
- Portainer
- Docker Swarm
- Docker volumes
- NFS / NFSv4
- Linux NFS server and client utilities
- PostgreSQL
- Nginx

## Sources Consulted
- Docker Engine volumes documentation: https://docs.docker.com/engine/storage/volumes/
- Docker Compose volume reference: https://docs.docker.com/reference/compose-file/volumes/
- Docker Swarm stack deployment documentation: https://docs.docker.com/engine/swarm/stack-deploy/
- Portainer stack deployment documentation: https://docs.portainer.io/2.21/user/docker/stacks/add
- Linux `nfs(5)` man page: https://man7.org/linux/man-pages/man5/nfs.5.html
- Linux `exports(5)` man page: https://man7.org/linux/man-pages/man5/exports.5.html
- Linux `mount.nfs(8)` man page: https://man7.org/linux/man-pages/man8/mount.nfs.8.html
- Linux `showmount(8)` man page: https://man7.org/linux/man-pages/man8/showmount.8.html

## Issues Found
- The post used `nfs4` as the filesystem type in `/etc/fstab` and as the Docker `driver_opts.type` value. Current Linux NFS guidance treats `nfs4` as old syntax and recommends `nfs` with `nfsvers=4` or `vers=4`, so the examples were updated accordingly.
- The direct Docker NFS volume examples used `soft` for database storage. The Linux `nfs(5)` documentation warns that soft timeouts can cause silent data corruption, which is a poor fit for PostgreSQL data directories, so those examples were changed to `hard` mounts.
- The performance section used the deprecated `intr` option and forced a very small `rsize` and `wsize` in the general example. `intr` is ignored on modern Linux kernels, and NFS normally negotiates appropriate transfer sizes automatically, so the examples were revised to use current NFSv4 options.
- The conclusion claimed shared NFS storage provides “true high availability” for stateful workloads. That overstates what NFS plus Swarm alone guarantees, so the conclusion was corrected to note that application design and NFS backend availability still determine HA.

## Review Notes
- Portainer deploys Swarm stacks using Docker Swarm stack semantics, so keeping `version: '3.8'` in the example stack is acceptable even though modern `docker compose` uses the newer Compose Specification.
- `showmount -e` is valid for checking exports when the server exposes the legacy MNT service, but `showmount(8)` notes it may not work against NFSv4-only servers that do not expose that service.
