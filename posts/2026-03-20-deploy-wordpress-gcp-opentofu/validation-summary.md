# Validation Summary: How to Deploy a WordPress Site with OpenTofu on GCP

## Status
validated

## Post Type
Tutorial / deployment guide

## Technologies Covered
- OpenTofu / Terraform-style HCL
- Google Cloud Run
- Google Cloud SQL for MySQL
- Google Cloud Filestore
- Google Secret Manager
- Google Cloud VPC networking
- WordPress

## Sources Consulted
- Cloud Run NFS volume mounts: https://cloud.google.com/run/docs/configuring/services/nfs-volume-mounts
- Cloud Run Direct VPC egress: https://cloud.google.com/run/docs/configuring/vpc-direct-vpc
- Cloud Run container port configuration: https://cloud.google.com/run/docs/configuring/services/containers
- Cloud Run secrets configuration: https://cloud.google.com/run/docs/configuring/services/secrets
- Cloud Run service identity: https://cloud.google.com/run/docs/configuring/services/service-identity
- Cloud Run container deployment docs: https://cloud.google.com/run/docs/deploying
- Cloud SQL private services access: https://cloud.google.com/sql/docs/postgres/configure-private-services-access
- Cloud SQL private IP Terraform sample: https://cloud.google.com/sql/docs/postgres/configure-private-ip
- Cloud SQL for MySQL private IP overview: https://cloud.google.com/sql/docs/mysql/private-ip
- Cloud SQL for MySQL instance settings: https://cloud.google.com/sql/docs/mysql/instance-settings

## Issues Found
- The Cloud SQL private IP example was incomplete. Private services access requires an allocated peering range and a `google_service_networking_connection`, so those resources were added and the SQL instance now depends on that connection before creation.
- The original Cloud Run service was not attached to the VPC, so it could not reach the private Cloud SQL IP or the Filestore NFS endpoint. The post was updated to use Direct VPC egress with `vpc_access`.
- Cloud Run NFS mounts require the Gen2 execution environment. The post now sets `execution_environment = "EXECUTION_ENVIRONMENT_GEN2"`.
- The container snippet omitted an explicit container port even though the `wordpress:*-apache` image listens on port `80`. A `ports { container_port = 80 }` block was added.
- The Secret Manager example created the secret but did not grant the Cloud Run runtime identity access to it. A dedicated service account and `roles/secretmanager.secretAccessor` binding were added.
- The public access IAM example used the wrong resource for a Cloud Run v2 service. It was corrected to `google_cloud_run_v2_service_iam_member` with the `name` field expected by the v2 IAM resource.
- The article described the deployment as production-ready while using `db-g1-small`, which Cloud SQL documents as a shared-core test/development tier that is not covered by the SLA. The instance was updated to a dedicated-core custom tier and `availability_type = "REGIONAL"` to align better with the article's stated intent.
- The prose claimed Cloud Run would scale to zero, but the configuration set `min_instance_count = 1`. The introduction and summary were corrected to say that Cloud Run supports scale-to-zero, while this example intentionally keeps one warm instance.

## Review Notes
- The infrastructure examples are now technically consistent with current Cloud Run, Cloud SQL, Filestore, and Secret Manager behavior.
- The post still pins a specific WordPress image tag. That is valid, but it should be refreshed periodically so the article does not drift onto an older WordPress release.
