# Validation Summary: How to Schedule Automatic Backups in Portainer Business Edition - Business

## Status
validated

## Post Type
Tutorial / guide

## Technologies Covered
- Portainer Business Edition
- Portainer backup and restore
- Portainer HTTP API
- S3-compatible object storage
- Bash, curl, cron, and find

## Sources Consulted
- Portainer settings documentation, Back up Portainer section: https://docs.portainer.io/admin/settings/general
- Portainer API documentation entry point: https://docs.portainer.io/api/docs
- Portainer BE 2.39.1 OpenAPI specification: https://api-docs.portainer.io/versions/ee/2.39.1.yaml
- Portainer BE 2.40.0 OpenAPI specification: https://api-docs.portainer.io/versions/ee/2.40.0.yaml

## Issues Found
1. **Scheduled backups were described as generic local scheduled backups.** Portainer BE's built-in scheduled backup feature is specifically for storing configuration backups in S3-compatible object storage. Updated the introduction and UI steps to make the S3 requirement explicit.

2. **Incorrect UI navigation and field names.** The post pointed users to **Backup & Restore** and a **Scheduled Backups** section. Current Portainer documentation places this under **Settings** -> **Back up Portainer**, with **Store in S3**, **Schedule automatic backups**, and **Cron rule** fields. Updated the steps and option names.

3. **Incomplete S3 setup instructions.** The UI and API examples omitted required S3 settings such as access key, secret key, region, and bucket name. Added the S3 connection fields needed for the scheduled backup configuration.

4. **Incorrect API endpoint and method.** The post used `PUT /api/backup/s3`. The Portainer BE OpenAPI spec documents `POST /api/backup/s3/settings` for updating stored S3 backup settings and scheduled cron jobs. Updated the API example accordingly.

5. **Incorrect API payload fields.** The post used `scheduleEnabled` and only supplied `cronRule` and `password`. The documented S3 backup settings schema uses `cronRule` with the S3 settings fields and does not include `scheduleEnabled`. Removed `scheduleEnabled` and added the documented fields.

6. **Local backup password field casing did not match the documented schema.** The `/api/backup` payload schema documents `Password` with a capital `P`. Updated the external cron backup script to use the documented field name.

7. **The external backup script could treat HTTP errors as successful downloads.** `curl` returns success for HTTP error responses unless `--fail` is used. Added `-fS` to the API calls so authentication or backup errors stop the script instead of writing an error response as a backup file.

8. **Verification commands only applied to the external cron path.** Added the documented `/api/backup/s3/status` check for built-in scheduled S3 backups and clarified that the log and local file checks are for the external cron backup.

## Review Notes
- Portainer backups cover Portainer configuration data, not the containers, images, volumes, or application data running in managed environments.
- The S3-compatible host field should be left blank for AWS S3 and set to the provider endpoint for MinIO or another S3-compatible service.
