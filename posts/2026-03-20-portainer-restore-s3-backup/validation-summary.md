# Validation Summary: How to Restore Portainer from an S3 Backup

## Status
validated

## Post Type
Guide

## Technologies Covered
- Portainer Business Edition
- Docker
- Amazon S3
- AWS CLI
- Bash
- Portainer HTTP API

## Sources Consulted
- Portainer backup and restore documentation: https://docs.portainer.io/admin/settings/general
- Portainer FAQ on downgrading from Business Edition to Community Edition: https://docs.portainer.io/faqs/upgrading/can-i-downgrade-from-portainer-business-to-portainer-ce
- Portainer Docker installation documentation for Business Edition: https://docs.portainer.io/2.33-lts/start/install/server/docker/linux
- Portainer API documentation landing page: https://docs.portainer.io/api/docs
- Portainer API usage examples: https://docs.portainer.io/sts/api/examples
- AWS CLI `s3 ls` command reference: https://docs.aws.amazon.com/cli/latest/reference/s3/ls.html
- AWS CLI `s3 cp` command reference: https://docs.aws.amazon.com/cli/latest/reference/s3/cp.html

## Issues Found
- The post claimed restore was available from an already-running Portainer instance under `Settings` -> `Backup`. Portainer documents restore as available only on a fresh instance during initial setup, so the restore instructions were corrected.
- The post described manual extraction of the backup archive into the Portainer data volume and suggested restoring a BE S3 backup into CE this way. That is not Portainer's documented restore path, and BE-to-CE downgrade requires a separate rollback step, so the section was replaced with the supported direct-from-S3 restore flow during initial setup.
- The post stated that Portainer backup encryption uses `AES-256-CBC` and implied a manual OpenSSL decryption workflow. Portainer's documentation does not document that algorithm or a separate manual decryption process, so the section was changed to the supported password-protected restore workflow.
- The automation example redeployed `portainer/portainer-ce:latest` after a BE backup restore. That was incorrect for a BE restore workflow, so it was changed to prepare a fresh `portainer/portainer-ee:lts` instance with an empty data volume for restore.
- The post used `http://...:9000` as the primary access path. Current Portainer documentation uses HTTPS on `9443` by default and treats `9000` as legacy HTTP, so the access and API verification steps were updated accordingly.
- The automation example assumed backup filenames include a date and could fail on valid backups that do not. That assumption was removed.

## Review Notes
- Direct restore from S3 is a Portainer Business Edition feature.
- Portainer backups cover Portainer configuration stored under `/data`; they do not back up managed containers, images, volumes, or application data.
- The API verification examples use `curl -k` because a fresh Portainer deployment typically starts with a self-signed certificate on `9443`.
