# Validation Summary: How to Use NAS Storage with Docker Compose: NFS, SMB, and Local Volumes

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Docker
- Docker Compose
- Docker local volume driver
- NFS
- SMB/CIFS
- Linux mount options and `/etc/fstab`
- PostgreSQL and Redis container storage

## Sources Consulted
- Docker Compose volumes reference: https://docs.docker.com/reference/compose-file/volumes/
- Docker `volume create` reference: https://docs.docker.com/reference/cli/docker/volume/create/
- Docker Compose `up` command reference: https://docs.docker.com/reference/cli/docker/compose/up/
- Docker Compose `exec` command reference: https://docs.docker.com/reference/cli/docker/compose/exec/
- Docker Compose startup order / `depends_on` documentation: https://docs.docker.com/compose/how-tos/startup-order/
- Docker Compose interpolation reference: https://docs.docker.com/reference/compose-file/interpolation/
- Linux `nfs(5)` manual page: https://man7.org/linux/man-pages/man5/nfs.5.html
- Linux `mount.cifs(8)` manual page: https://man7.org/linux/man-pages/man8/mount.cifs.8.html
- PostgreSQL documentation, Creating a Database Cluster: https://www.postgresql.org/docs/current/creating-cluster.html

## Issues Found
1. **Overstated local bind mount benefits**: The protocol comparison claimed host-mounted NAS bind mounts have no network latency and work offline. A NAS mounted on the host still depends on the NAS and network. Updated the comparison to describe the real benefit: simpler Compose configuration over any host-mounted file system.

2. **NFS encryption wording was too broad**: The table said NFS has no built-in encryption. Modern NFS deployments can use security layers such as Kerberos privacy or RPC-with-TLS where supported, but encryption is not the default in typical NAS setups. Changed the wording to "No encryption by default."

3. **SMB/CIFS scope implied Windows Docker hosts**: The Compose examples use Linux CIFS mounts through Docker's local driver and require `cifs-utils`. Updated the SMB/CIFS description to clarify that the examples target Linux Docker hosts accessing SMB shares.

4. **`nolock` was used with NFSv4.1 examples**: The post paired `nolock` with `nfsvers=4.1` and described it as disabling file locking generally. Linux documents `nolock` as an NFSv2/v3 NLM option. Removed `nolock` from NFSv4.1 examples and clarified the table entry.

5. **`intr` was recommended for modern Linux NFS mounts**: The post used `hard,intr` and described `intr` as preventing hung processes. Linux `nfs(5)` documents `intr`/`nointr` as ignored after kernel 2.6.25. Removed `intr` from examples and comments.

6. **`soft` NFS guidance was too permissive**: The post recommended soft mounts broadly, including in quick-start examples. Linux `nfs(5)` warns that soft timeouts can cause data integrity problems, and PostgreSQL requires hard NFS mounts. Added caveats and changed general-purpose, backup, and PostgreSQL-related examples to `hard` where data integrity matters.

7. **Incorrect PostgreSQL UID discovery command**: `docker run --rm postgres:16 id` runs the overridden command as root in the official image. Replaced it with `docker run --rm --entrypoint id postgres:16 postgres`, which reports the `postgres` user UID/GID.

8. **Legacy Compose command spelling**: Updated operational commands from `docker-compose` to the current `docker compose` plugin form. File names such as `docker-compose.yml` were left unchanged because they remain commonly supported.

## Review Notes
- The Docker Compose `driver_opts` structure for NFS and CIFS volumes matches Docker's documented local volume driver pattern.
- The `depends_on` example using `condition: service_completed_successfully` is valid in the current Compose specification.
- CIFS options such as `credentials=`, `uid=`, `gid=`, `file_mode=`, `dir_mode=`, `vers=`, and `seal` are valid Linux `mount.cifs` options, with ownership and mode behavior depending on SMB server capabilities and Unix extensions.
- NAS-side "Map all users to admin" squashing can solve simple permission problems but is broad from a security perspective; production deployments should prefer least-privilege UID/GID mapping where possible.
