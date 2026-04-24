# Validation Summary: How to Create CIFS/SMB Volumes in Portainer - A Practical Guide

## Status
validated

## Post Type
Guide / Tutorial

## Technologies Covered
- Portainer
- Docker Engine volumes
- Docker Compose
- SMB/CIFS
- `cifs-utils` / `mount.cifs`
- Samba `smbclient`

## Sources Consulted
- Portainer Documentation, "Add a new volume" https://docs.portainer.io/user/docker/volumes/add
- Docker Docs, "Volumes" https://docs.docker.com/engine/storage/volumes/
- Docker Docs, "docker volume create" https://docs.docker.com/reference/cli/docker/volume/create/
- Docker Docs, "Define and manage volumes in Docker Compose" https://docs.docker.com/reference/compose-file/volumes/
- Docker Docs, "Version and name top-level elements" https://docs.docker.com/reference/compose-file/version-and-name/
- Docker Docs, "Secrets in Compose" https://docs.docker.com/compose/how-tos/use-secrets/
- Linux man-pages, `mount.cifs(8)` https://man7.org/linux/man-pages/man8/mount.cifs.8.html
- Samba man page, `smbclient(1)` https://www.samba.org/samba/samba/docs/man/manpages/smbclient.1.html
- Microsoft Learn, "Manage SMB dialects in Windows and Windows Server 2025" https://learn.microsoft.com/en-us/windows-server/storage/file-server/manage-smb-dialects

## Issues Found
- Portainer CIFS instructions were outdated. The post told readers to add raw local-driver options manually, but current Portainer exposes a dedicated CIFS workflow with `Use CIFS volume` and specific CIFS fields. I updated Step 3 to match the current Portainer UI.
- The Compose example used top-level `version: "3.8"`. Docker's current Compose specification marks `version` as obsolete and only informational, so I removed it from the example.
- The note after the Compose example suggested using Docker secrets for volume driver credentials. Compose secrets are granted to services and mounted inside containers, not used to populate `driver_opts` for a local CIFS volume. I changed the guidance to environment variables or a host credentials file.
- The manual credentials-file example did not protect the credentials file. I added `chmod 600` to align with `mount.cifs` guidance.
- The SMB version table treated `vers=3.0` as the recommended baseline. Current SMB guidance favors newer dialects when available, so I changed the table to mark `vers=3.1.1` as preferred when supported.

## Review Notes
- `mount.cifs` currently defaults to `vers=default`, which negotiates the highest SMB2+ dialect supported by both ends. The explicit `vers=3.0` examples remain valid for compatibility-focused setups.
- Docker CLI was not available in the local workspace during review, so command validation relied on current official documentation rather than local `--help` output.
