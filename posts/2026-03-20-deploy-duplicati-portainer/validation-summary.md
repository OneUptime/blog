# Validation Summary: How to Deploy Duplicati for Backup Management via Portainer - A Practical Guide

## Status
validated

## Post Type
Tutorial / Practical Guide

## Technologies Covered
- Duplicati (backup client)
- Portainer (Docker container management)
- Docker / Docker Compose
- Amazon S3 / S3-compatible storage (MinIO)
- Backblaze B2
- linuxserver.io container image (`lscr.io/linuxserver/duplicati`)

## Sources Consulted
- LinuxServer.io Duplicati image docs: https://docs.linuxserver.io/images/docker-duplicati/
- LinuxServer.io Duplicati GitHub repo (Dockerfile / s6 service script): https://github.com/linuxserver/docker-duplicati
- Duplicati setting-the-server-password docs: https://docs.duplicati.com/installation-details/setting-the-server-password
- Duplicati Backblaze B2 destination docs: https://docs.duplicati.com/backup-destinations/provider-specific-destinations/backblaze-b2-destination
- Duplicati Amazon S3 destination docs: https://docs.duplicati.com/backup-destinations/provider-specific-destinations/amazon-s3-destination
- Duplicati S3-compatible destination docs: https://docs.duplicati.com/backup-destinations/standard-based-destinations/s3-compatible-destination
- Duplicati CLI docs: https://docs.duplicati.com/duplicati-programs/command-line-interface-cli
- Duplicati upstream README: https://github.com/duplicati/duplicati

## Issues Found

1. **Incorrect S3 destination URL format** in Step 5.
   - Original: `s3://s3.amazonaws.com/my-bucket/backups/?auth-username=...&auth-password=...`
   - Problem: The hostname `s3.amazonaws.com` was placed in the URL path. Duplicati's S3 backend expects the path to contain only the bucket and prefix; the hostname for non-AWS endpoints is supplied via the `s3-server-name` query parameter.
   - Fix: Replaced with `s3://my-bucket/backups/?auth-username=AKIAXXXXXX&auth-password=YOUR_SECRET&s3-location-constraint=us-east-1` for AWS, and added a separate example for S3-compatible providers using `s3-server-name=...`.

2. **Incorrect Backblaze B2 destination URL format** in Step 5.
   - Original: `b2://account_id:application_key@bucket-name/path`
   - Problem: Duplicati's documented B2 URL form does not embed credentials in `user:pass@host` style. The supported form uses query-string auth parameters.
   - Fix: Replaced with `b2://bucket-name/path?auth-username=ACCOUNT_ID&auth-password=APPLICATION_KEY`.

3. **Step 7 CLI example used the broken S3 URL** from Issue 1.
   - Fix: Updated the `duplicati-cli list` example to drop the hostname from the path and added the `--s3-location-constraint=us-east-1` flag for consistency.

## Review Notes

- `DUPLICATI__WEBSERVICE_PASSWORD` is the correct, documented env var for the LinuxServer Duplicati image (the double-underscore naming convention is upstream Duplicati's: upper-case the option, replace `-` with `_`, prefix with `DUPLICATI__`). Verified.
- `lscr.io/linuxserver/duplicati:latest`, port `8200`, the `duplicati-cli` binary name, and the `--encryption-module=aes` / `--passphrase` / `--auth-username` / `--auth-password` CLI flags are all accurate.
- AES-256 encryption claim is accurate per upstream Duplicati README.
- `version: "3.8"` in Compose is technically obsolete in Compose v2 (it's ignored with a warning) but still works; left as-is since it does not affect functionality and the post's style.
- The image also presets `DUPLICATI__REQUIRE_DB_ENCRYPTION_KEY=true`. Users running newer image versions may additionally want to set `SETTINGS_ENCRYPTION_KEY` — not strictly required to follow this tutorial but worth being aware of for production use.
