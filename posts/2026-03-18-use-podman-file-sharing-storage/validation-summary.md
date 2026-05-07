# Validation Summary: How to Use Podman for File Sharing and Storage

## Status
validated

## Post Type
Guide

## Technologies Covered
- Podman
- Nextcloud
- MariaDB
- Redis
- MinIO
- MinIO Client (`mc`)
- MinIO Python SDK
- Samba
- WebDAV
- NGINX WebDAV configuration
- Syncthing
- systemd Quadlet

## Sources Consulted
- Podman rootless limitations: https://github.com/containers/podman/blob/main/rootless.md
- Podman volume mount options (`z` vs `Z`): https://docs.podman.io/en/v4.4/markdown/options/volume.html
- Podman Quadlet basic usage: https://docs.podman.io/en/latest/markdown/podman-quadlet-basic-usage.7.html
- Podman `.container` unit reference: https://docs.podman.io/en/latest/markdown/podman-container.unit.5.html
- Nextcloud Docker image documentation: https://github.com/nextcloud/docker
- Nextcloud caching configuration: https://docs.nextcloud.com/server/latest/admin_manual/configuration_server/caching_configuration.html
- Nextcloud `occ` command reference: https://docs.nextcloud.com/server/latest/admin_manual/occ_command.html
- MinIO Client settings (`MC_HOST_*` aliases): https://min.io/docs/minio/linux/reference/minio-mc/minio-client-settings.html
- MinIO Client `mc alias set`: https://min.io/docs/minio/linux/reference/minio-mc/mc-alias-set.html
- MinIO Python SDK quickstart: https://github.com/minio/minio-py
- `minio/mc` container image Dockerfile: https://github.com/minio/mc/blob/master/Dockerfile
- `dperson/samba` image documentation: https://github.com/dperson/samba
- NGINX DAV module documentation: https://nginx.org/en/docs/http/ngx_http_dav_module.html
- `ionelmc/webdav` image source: https://github.com/ionelmc/docker-webdav
- Syncthing Docker documentation: https://github.com/syncthing/syncthing/blob/main/README-Docker.md

## Issues Found
- The rootless security explanation overstated container isolation. I corrected it to match Podman’s rootless model: access is limited by the mounted paths and the privileges of the user running Podman.
- Several bind mounts used `/srv/...` paths while the post positioned Podman as a rootless workflow. I changed those examples to `$HOME/...` paths and added missing `mkdir -p` commands where Podman requires bind-mount source directories to exist.
- The Nextcloud Redis example configured `memcache.local` to Redis. I changed this to `memcache.distributed`, which matches Nextcloud’s documented Redis usage for distributed caching and file locking.
- The MinIO `mc` examples used `--entrypoint /bin/sh`, but the current `minio/mc` image is built `FROM scratch` and does not provide `/bin/sh`. I replaced those commands with supported `MC_HOST_local=...` alias configuration and direct `mc mb` / `mc cp` invocations.
- The MinIO data volume used `:Z` while the backup section mounted the same volume from a second container. I changed those mounts to `:z` where the volume is shared, including the Quadlet example, to match Podman’s SELinux labeling rules.
- The Samba example implied a rootless deployment on TCP 445. I updated the text to note that SMB uses privileged ports and changed the example to use rootful Podman, plus upstream-compatible port publishing and UID/GID settings.
- The WebDAV example referenced an incorrect image name and an unsupported config-mount path/port combination. I replaced it with a working example based on the documented `ionelmc/webdav` image, including its supported environment variables and `/media` volume.
- The backup script did not create the backup directory before writing archives. I added directory creation so the script can run successfully on a fresh host.

## Review Notes
- The post now reads as a technically valid multi-example guide, but several examples still use `latest` tags or broad moving tags such as `stable-apache`. Those are workable for a tutorial, but they can change behavior over time and may deserve pinning in a future editorial pass.
- The WebDAV image used in the corrected example is functional but old. If the blog wants a more actively maintained WebDAV example later, that section should be revisited with a currently maintained image and its official documentation.
