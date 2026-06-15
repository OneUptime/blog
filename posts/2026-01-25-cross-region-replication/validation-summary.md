# Validation Summary: How to Configure Cross-Region Replication

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- AWS S3 Cross-Region Replication
- AWS CloudWatch S3 replication metrics
- AWS RDS cross-region read replicas
- Azure Blob Storage GRS, RA-GRS, and object replication
- Azure SQL Database active geo-replication
- Google Cloud Storage multi-region and dual-region buckets
- Google Cloud Storage Transfer Service
- Google Cloud SQL read replicas
- Kubernetes StatefulSets
- Velero backups and restores
- PostgreSQL streaming replication
- Python with boto3 and azure-storage-blob
- Bash, AWS CLI, Azure CLI, gcloud, gsutil, kubectl, and Velero CLI

## Sources Consulted
- AWS S3 replication configuration file elements: https://docs.aws.amazon.com/AmazonS3/latest/userguide/replication-add-config.html
- AWS S3 live replication IAM permissions: https://docs.aws.amazon.com/AmazonS3/latest/userguide/setting-repl-config-perm-overview.html
- AWS S3 CloudWatch metrics and dimensions: https://docs.aws.amazon.com/AmazonS3/latest/userguide/metrics-dimensions.html
- AWS RDS cross-region read replica documentation: https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/USER_ReadRepl.XRgn.html
- Azure Blob Storage object replication configuration: https://learn.microsoft.com/en-us/azure/storage/blobs/object-replication-configure
- Azure Storage object replication CLI reference: https://learn.microsoft.com/en-us/cli/azure/storage/account/or-policy?view=azure-cli-latest
- Azure SQL Database replica CLI reference: https://learn.microsoft.com/en-us/cli/azure/sql/db/replica?view=azure-cli-latest
- Google Cloud Storage bucket locations: https://docs.cloud.google.com/storage/docs/locations
- Google Cloud Storage Transfer Service gcloud reference: https://docs.cloud.google.com/sdk/gcloud/reference/transfer/jobs/create
- Google Cloud SQL instance create gcloud reference: https://docs.cloud.google.com/sdk/gcloud/reference/sql/instances/create
- Kubernetes StatefulSet documentation: https://kubernetes.io/docs/concepts/workloads/controllers/statefulset/
- PostgreSQL pg_basebackup documentation: https://www.postgresql.org/docs/current/app-pgbasebackup.html
- Velero backup storage location documentation: https://velero.io/docs/v1.9/locations/

## Issues Found
- The S3 IAM example was labeled as creating an IAM role but only showed the permissions policy. Added the required trust policy that allows `s3.amazonaws.com` to assume the role, then clarified that the original policy is the permissions policy.
- The S3 `ReplicationLatency` CloudWatch examples requested `Average`, but AWS documents `ReplicationLatency` with `Maximum` as the valid statistic. Updated both the CLI and boto3 examples to use `Maximum`.
- The Azure object replication example created the policy against the source account only. Azure object replication policies are created on the destination account and then associated with the source account using the same policy ID. Updated the snippet to create the destination policy and then apply it to the source account.
- The Google Cloud Storage Transfer Service command used `--schedule-start-date` and `P1D`. Current `gcloud transfer jobs create` uses `--schedule-starts` with a timestamp and absolute duration values such as `1d`. Updated the command accordingly.
- The Google Cloud Storage dual-region comment described replication as synchronous. Google documents dual-region redundancy as asynchronous, with optional turbo replication for a 15-minute RPO. Updated the comment to say asynchronous replication.
- The AWS RDS cross-region read replica command used a plain source DB identifier. AWS documentation requires the source DB instance identifier to be an ARN for cross-region read replicas. Updated the command to use the source instance ARN.
- The Kubernetes StatefulSet examples were invalid because they omitted required `.spec.selector` values, matching pod template labels, and the `data` volume definition referenced by `volumeMounts`. Added selectors, labels, and `volumeClaimTemplates` for both StatefulSets.
- The PostgreSQL replica startup command always ran `pg_basebackup`, which would fail on restart if the data directory already contained a database. Added a guard that runs `pg_basebackup` only when `PG_VERSION` is absent.

## Review Notes
The examples still use placeholder account names, bucket names, regions, hosted zone IDs, endpoints, and policy IDs. They should be replaced before use in a real environment. The Kubernetes PostgreSQL example remains a simplified illustration and still assumes that the primary database is configured for streaming replication and has a valid replication user.
