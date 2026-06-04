# Validation Summary: How to Run Duplicati in Docker for Backups

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Docker
- Docker Compose
- LinuxServer.io Duplicati Docker image
- Duplicati
- Duplicati CLI
- Backblaze B2
- Amazon S3 / S3-compatible storage
- SMTP email notifications

## Sources Consulted
- LinuxServer.io Duplicati Docker image documentation: https://docs.linuxserver.io/images/docker-duplicati/
- Docker Compose file reference, version top-level element: https://docs.docker.com/reference/compose-file/version-and-name/
- Duplicati command line interface documentation: https://docs.duplicati.com/duplicati-programs/command-line-interface-cli
- Duplicati Backblaze B2 destination documentation: https://docs.duplicati.com/backup-destinations/provider-specific-destinations/backblaze-b2-destination
- Duplicati S3-compatible destination documentation: https://docs.duplicati.com/backup-destinations/standard-based-destinations/s3-compatible-destination
- Duplicati retention settings documentation: https://docs.duplicati.com/configuration-and-management/retention-settings
- Duplicati advanced options documentation: https://prev-docs.duplicati.com/en/latest/06-advanced-options/
- Duplicati backup size parameters documentation: https://docs.duplicati.com/technical-details/understanding-backup/backup-size-parameters

## Issues Found
- The Compose example used the obsolete top-level `version: "3.8"` field. Removed it so the snippet follows the current Compose Specification guidance.
- The LinuxServer.io Duplicati image now documents `SETTINGS_ENCRYPTION_KEY` and `DUPLICATI__WEBSERVICE_PASSWORD`. Added both variables and updated the web UI login text accordingly.
- The Backblaze B2 example used `Account ID`, while Duplicati's B2 destination documentation identifies the required field as application ID. Updated the field name and placeholder.
- The S3 example used imprecise credential field names. Updated them to `AWS Access Key ID` and `AWS Secret Access Key` to match Duplicati's S3-compatible destination documentation.
- The retention policy example described a custom retention pattern in prose-like fields instead of Duplicati's documented retention-policy syntax. Replaced it with `7D:U,30D:1D,90D:1W,365D:1M`.
- The CLI example used `duplicati-cli list-backup-sets`, which is not a documented current Duplicati CLI command. Replaced it with `duplicati-cli find` without a filename, which Duplicati documents as listing known backup versions.
- The block size section implied block size can be adjusted generally. Added a note that block size must be set before remote backup files are created, because Duplicati documents that it cannot be changed afterward.

## Review Notes
The tutorial is technically relevant and remains valid after the corrections. Running the Duplicati container itself was not performed, but the Docker image parameters, CLI commands, destination fields, retention syntax, and advanced options were checked against official documentation.
