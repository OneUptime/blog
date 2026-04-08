# Validation Summary: How to Configure MongoDB Backups on Kubernetes

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MongoDB 7.0 (`mongodump`, `mongorestore`)
- Kubernetes (CronJob, ConfigMap, Secret)
- AWS S3 (CLI, lifecycle policies)
- Bash scripting

## Sources Consulted
- Kubernetes CronJob API reference: https://kubernetes.io/docs/reference/kubernetes-api/workload-resources/cron-job-v1/
- MongoDB `mongodump` documentation: https://www.mongodb.com/docs/database-tools/mongodump/
- MongoDB `mongorestore` documentation: https://www.mongodb.com/docs/database-tools/mongorestore/
- MongoDB built-in roles: https://www.mongodb.com/docs/manual/reference/built-in-roles/
- AWS CLI `s3 cp` reference: https://docs.aws.amazon.com/cli/latest/reference/s3/cp.html
- AWS S3 lifecycle configuration: https://docs.aws.amazon.com/AmazonS3/latest/userguide/object-lifecycle-mgmt.html
- Docker Hub `bitnami/mongodb` image: https://hub.docker.com/r/bitnami/mongodb
- Docker Hub official `mongo` image: https://hub.docker.com/_/mongo

## Issues Found
1. **Missing AWS CLI in container image**: The CronJob used `bitnami/mongodb:7.0` as its container image, but this image does not include the AWS CLI. The backup script calls `aws s3 cp`, which would fail at runtime. Fixed by:
   - Changing the image to the official `mongo:7.0` (Debian-based, supports `apt-get`).
   - Adding `apt-get update && apt-get install -y awscli` to the backup script so the AWS CLI is available when the job runs.

## Review Notes
- For production use, building a custom Docker image with both `mongodump` and `awscli` pre-installed would be more efficient than installing `awscli` on every CronJob run. This avoids network dependencies and speeds up execution.
- The backup script uses `mongodump --out` with `--gzip`, which creates compressed individual files per collection. An alternative is `mongodump --archive` to produce a single archive file, which simplifies S3 uploads.
- The MongoDB connection URI in the secret points to a single pod (`mongodb-0.mongodb`). For replica sets, consider using a full replica set connection string to ensure backups read from a secondary and avoid impacting the primary.
- The `backup` role used for the dedicated user is correct — it grants the minimum privileges needed to run `mongodump`.
