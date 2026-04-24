# Validation Summary: How to Schedule Automatic Backups to S3 in Portainer Business Edition

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Portainer Business Edition
- Portainer HTTP API
- Docker
- Amazon S3
- AWS CLI
- AWS IAM
- MinIO
- Backblaze B2 S3-Compatible API
- Cloudflare R2 S3 API
- Cron

## Sources Consulted
- Portainer documentation, General settings / Back up Portainer: https://docs.portainer.io/admin/settings/general
- Portainer documentation, What does Portainer's backup include?: https://docs.portainer.io/faqs/getting-started/what-does-portainers-backup-include
- Portainer API documentation landing page: https://docs.portainer.io/api/docs
- Portainer BE OpenAPI spec (`/backup/s3/settings`, `/backup/s3/execute`, `/backup/s3/restore`, `/backup/s3/status`): https://api-docs.portainer.io/versions/ee/2.39.1.yaml
- Portainer source code, backup archive encryption and filename behavior: https://github.com/portainer/portainer
- AWS CLI `put-bucket-lifecycle-configuration`: https://docs.aws.amazon.com/cli/latest/reference/s3api/put-bucket-lifecycle-configuration.html
- AWS CLI `create-user`: https://docs.aws.amazon.com/cli/latest/reference/iam/create-user.html
- AWS CLI `put-user-policy`: https://docs.aws.amazon.com/cli/latest/reference/iam/put-user-policy.html
- AWS CLI `create-access-key`: https://docs.aws.amazon.com/cli/latest/reference/iam/create-access-key.html
- Cloudflare R2 S3 API compatibility docs: https://developers.cloudflare.com/r2/api/s3/api/
- Backblaze B2 S3-Compatible API docs: https://www.backblaze.com/apidocs/introduction-to-the-s3-compatible-api
- MinIO AWS CLI integration docs: https://min.io/docs/minio/linux/integrations/aws-cli-with-minio.html

## Issues Found
- The introduction said Portainer automatically pushes encrypted backups. Portainer backups are only encrypted when password protection is enabled, so this was corrected to optional encryption.
- The prerequisites claimed `Portainer Business Edition (BE) 2.17+` without a verified source for that cutoff. This was changed to the supported product requirement without the unsupported version floor.
- The prerequisites were AWS-specific even though the post also covers MinIO, Backblaze B2, and Cloudflare R2. The credential requirement was generalized to bucket credentials.
- The IAM policy comment said it included only the necessary S3 actions. That claim was too strong, so the wording was changed to a bucket-scoped restrictive policy and the unnecessary `s3:DeleteObject` action was removed.
- The Portainer UI path was wrong. Current Portainer docs say to go to **Settings**, scroll to **Back up Portainer**, and select **Store in S3**. The post incorrectly used **Settings → Backup** and **Automated backups**.
- The UI field names were partially wrong. The post used unsupported labels like **Backup Prefix** and **Backup now**. These were corrected to Portainer’s documented/current labels such as **Bucket name**, **Schedule automatic backups**, **Cron rule**, **Password protect**, and **Export backup**.
- The S3 prefix handling was inaccurate. Portainer uses the **Bucket name** field for this, so the post was corrected to show a prefixed bucket path like `my-portainer-backups/portainer/` rather than a separate **Backup Prefix** field.
- The API example was incorrect. Portainer documents `POST /api/backup/s3/settings`, not `PUT`, and the payload uses `cronRule`, not `cronExpression`. The invalid `scheduleEnabled` field was removed.
- The API example used `http://localhost:9000` as if it were the default access point. Modern Portainer deployments commonly use HTTPS on `9443`, so the example was updated to `https://localhost:9443` with `curl -k`.
- The MinIO example said the region could be any value. This was tightened to `us-east-1` or the region configured for the MinIO deployment.
- The verification section assumed a fixed backup filename ending in `.tar.gz`. Portainer’s backup filename varies, and password-protected backups can end with `.encrypted`, so the example was generalized and corrected.
- The restore section was materially wrong. Portainer restore is only supported on a fresh instance during initial setup, not through an existing instance’s Settings UI, and the previous instructions incorrectly suggested unpacking the archive manually with `tar`. This section was replaced with a fresh-instance restore workflow using **Retrieve from S3** during initialization.
- The monitoring section relied on logs and vague notification guidance only. Portainer exposes `GET /api/backup/s3/status`, so the section was corrected to use the documented/public status endpoint and then optionally inspect logs.
- The conclusion implied all S3 backups are encrypted. This was corrected to optional password protection.

## Review Notes
- Portainer’s current public documentation explicitly documents S3 backup configuration and restore during initial setup, but the exact backup object filename format is not documented there; the filename/encryption note was verified against Portainer’s official source code instead.
- Portainer documentation currently shows the S3 backup feature in supported modern Business Edition releases. The original `2.17+` cutoff was not retained because it was not cleanly supported by the current documentation reviewed.
