# Validation Summary: How to Configure Cloud Composer with Customer-Managed Encryption Keys

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Google Cloud Composer 3
- Cloud KMS
- Customer-managed encryption keys (CMEK)
- Google Cloud CLI
- Cloud Storage
- Cloud Logging and Cloud Monitoring

## Sources Consulted
- Cloud Composer 3 CMEK documentation: https://docs.cloud.google.com/composer/docs/composer-3/configure-cmek-encryption
- Cloud Composer 2 CMEK documentation: https://docs.cloud.google.com/composer/docs/composer-2/configure-cmek-encryption
- `gcloud composer environments create` reference: https://docs.cloud.google.com/sdk/gcloud/reference/composer/environments/create
- Cloud Composer versioning overview and image version format: https://docs.cloud.google.com/composer/docs/composer-versioning-overview
- Cloud Composer version list: https://docs.cloud.google.com/composer/docs/composer-versions
- `gcloud storage service-agent` reference: https://docs.cloud.google.com/sdk/gcloud/reference/storage/service-agent
- `gcloud kms keys create` reference: https://docs.cloud.google.com/sdk/gcloud/reference/kms/keys/create
- `gcloud kms keys versions create` reference: https://docs.cloud.google.com/sdk/gcloud/reference/kms/keys/versions/create
- Cloud KMS key rotation documentation: https://docs.cloud.google.com/kms/docs/key-rotation
- Cloud KMS destroy and restore documentation: https://docs.cloud.google.com/kms/docs/destroy-restore

## Issues Found
- The post said CMEK protects all Cloud Composer data and listed Pub/Sub topics. Current Cloud Composer 3 documentation lists the protected data as the Airflow database, Cloud Logging logs, environment bucket contents, cluster secrets, task queue persistent disks, and Artifact Registry container images. I updated the protected-data list and added the Cloud Monitoring / metadata caveat from the official docs.
- The IAM section mixed Composer 2 service-agent requirements into a Composer 3 tutorial. For Composer 3, the current gcloud documentation requires the Managed Airflow service agent and Cloud Storage service agent. I removed the Compute Engine, Artifact Registry, and Pub/Sub grants from the Composer 3 example.
- The Cloud Storage service-agent grant used `gsutil kms serviceaccount` plus a direct KMS IAM binding. Current Composer documentation recommends `gcloud storage service-agent --authorize-cmek`, so I changed the command.
- The manual key rotation command created a key version but did not make it primary. I added `--primary` so new encryption uses the newly created version.
- The key destruction section said the default scheduled destruction period is 24 hours. Cloud KMS currently documents the default as 30 days, so I corrected that value.

## Review Notes
The post uses the Composer 3 image alias `composer-3-airflow-2.9.3`, which is valid because Composer 3 supports aliases that resolve to the latest build for that Airflow version. A fully pinned build, such as `composer-3-airflow-x.y.z-build.t`, would be more reproducible in production examples.
