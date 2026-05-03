# Validation Summary: How to Deploy Duplicati for Backup Management via Portainer

## Status
validated

## Post Type
Tutorial / How-to guide

## Technologies Covered
- Duplicati (open-source backup client)
- Portainer (Docker container management UI)
- Docker / Docker Compose
- linuxserver/duplicati Docker image
- S3-compatible object storage (as backup destination)

## Sources Consulted
- LinuxServer.io Duplicati image docs: https://docs.linuxserver.io/images/docker-duplicati/
- linuxserver/docker-duplicati GitHub repo: https://github.com/linuxserver/docker-duplicati
- Duplicati official docs - Using Duplicati from Docker: https://docs.duplicati.com/detailed-descriptions/using-duplicati-from-docker
- Duplicati encryption algorithms docs: https://docs.duplicati.com/technical-details/understanding-backup/encryption-algorithms
- Docker Hub - linuxserver/duplicati: https://hub.docker.com/r/linuxserver/duplicati

## Issues Found
1. **Incorrect environment variable name for web UI password.** The post used `DUPLICATI_WEBSERVICE_PASSWORD` (single underscore). The correct name is `DUPLICATI__WEBSERVICE_PASSWORD` with a **double underscore** between `DUPLICATI` and `WEBSERVICE`. This is because Duplicati maps CLI flags (e.g., `--webservice-password`) to env vars by prefixing `DUPLICATI__` and converting hyphens to underscores. With the single-underscore form, Duplicati would not pick up the password and the container would fall back to its default. Fixed in the Step 4 example.
2. **Mislabeled `/backups` volume mount.** The post described `/backups` as a "Temporary backup working directory" pointing at `/tmp/duplicati-backups`. In the linuxserver/duplicati image, `/backups` is documented as the local backup *destination* path (used when you want Duplicati to write backups to a local directory). It is not a working/scratch directory. Updated the comment and changed the host path to `/opt/duplicati-backups` to reflect that this is a persistent destination, not temporary scratch space.

## Review Notes
- The image reference `linuxserver/duplicati:latest` is valid (Docker Hub mirror), though LinuxServer.io now recommends the registry-prefixed form `lscr.io/linuxserver/duplicati:latest`. Both pull the same image, so this was not changed.
- Duplicati's AES encryption is based on the AESCrypt format, which uses AES-256 - the post's "AES-256 by default" claim is accurate.
- The supported destination list (S3, Backblaze B2, Google Drive, SFTP, WebDAV) is accurate; Duplicati supports many more backends as well.
- The default port `8200` and the standard `PUID/PGID/TZ` env vars used by all linuxserver.io images are correct.
- Recent Duplicati 2.1.x releases require an initial server password; the Step 2 wording about being prompted on first run is reasonable.
- For production use, readers should also set `SETTINGS_ENCRYPTION_KEY` (used to encrypt the local Duplicati settings DB) - this is documented by linuxserver but not mentioned in the post. Not strictly an error, but worth noting as a future enhancement.
