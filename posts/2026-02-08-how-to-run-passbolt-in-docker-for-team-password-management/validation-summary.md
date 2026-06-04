# Validation Summary: How to Run Passbolt in Docker for Team Password Management

## Status
validated

## Post Type
Tutorial / deployment guide

## Technologies Covered
- Docker
- Docker Compose
- Passbolt Community Edition
- MariaDB
- GPG / OpenPGP
- JWT authentication keys
- SMTP
- TLS certificates
- REST API

## Sources Consulted
- Passbolt Docker installation documentation: https://www.passbolt.com/docs/hosting/install/ce/docker/
- Official Passbolt CE Docker Compose file: https://download.passbolt.com/ce/docker/docker-compose-ce.yaml
- Passbolt environment variable reference: https://www.passbolt.com/docs/hosting/environment-reference/
- Passbolt manual HTTPS configuration for Docker: https://www.passbolt.com/docs/hosting/tls/ce/docker-manual/
- Passbolt Docker backup documentation: https://www.passbolt.com/docs/hosting/maintenance/backup/from-docker/
- Passbolt API documentation: https://www.passbolt.com/docs/api/
- Passbolt action log purge documentation: https://www.passbolt.com/docs/hosting/troubleshooting/purge-action-logs/

## Issues Found
- The manual GPG key generation command created a local GPG keyring but did not export the `serverkey.asc` and `serverkey_private.asc` files that Passbolt expects under `/etc/passbolt/gpg`. Updated it to generate the key with appropriate usage flags, export the public and private server key files, and print the fingerprint for `PASSBOLT_GPG_SERVER_KEY_FINGERPRINT`.
- The Docker Compose example used `mariadb:11`, while the official Passbolt CE Docker Compose file currently uses `mariadb:10.11`. Updated the image to match the official example.
- The SSL certificate volume mounted a directory to `/etc/ssl/certs/passbolt`, but official Docker manual HTTPS documentation expects the standard image to receive `certificate.crt` and `certificate.key` at specific paths. Updated the mounts to `./certs/cert.pem:/etc/ssl/certs/certificate.crt:ro` and `./certs/key.pem:/etc/ssl/certs/certificate.key:ro`.
- The Compose example did not include Passbolt's official `wait-for.sh` command wrapper. Added it so the Passbolt container waits for MariaDB before running the entrypoint.
- The text said the first startup generates encryption keys. Clarified that startup waits for the database, runs migrations, and generates missing application keys.
- A section claimed the displayed Cake command managed resources, but the command was actually a health check. Updated the wording to call it a maintenance command.
- The audit logging section claimed logs can be viewed through the web interface or queried via API. Official documentation confirms action logs are stored in the database and can be configured for file/syslog output, so the wording was corrected.
- The API example used `/resources.json` and a generic bearer token while describing secret retrieval. Updated it to use the documented `/secrets/resource/{resourceId}.json` endpoint with a JWT access token and clarified that returned secret data remains encrypted.
- The backup section used `mysqldump`; official Docker backup docs use `mariadb-dump` for the MariaDB container. Updated the command and added application configuration to the backup list.
- The backup section said encrypted data cannot be recovered without the server GPG key. Corrected this: recovery depends on the database and users' private keys; the server GPG key is required to restore the same server identity.

## Review Notes
- The official Passbolt Docker documentation recommends pinning a specific Passbolt image tag for non-test environments instead of staying on `latest-ce`; the post already advises reviewing release notes and backing up before updates, but future revisions could make tag pinning more explicit.
- The post uses bind mounts for simplicity, while the official example uses named volumes. Both are valid Docker patterns if permissions and backups are handled carefully.
