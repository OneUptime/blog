# Validation Summary: How to Create a Cloud SQL Instance with OpenTofu on GCP

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTofu
- Google Cloud Platform (GCP)
- Cloud SQL for MySQL
- Cloud Monitoring
- Private services access and VPC networking

## Sources Consulted
- Google Cloud SDK reference: `gcloud auth application-default login` — https://cloud.google.com/sdk/gcloud/reference/auth/application-default/login
- Cloud SQL overview — https://docs.cloud.google.com/sql/docs/introduction
- Configure private services access for Cloud SQL — https://docs.cloud.google.com/sql/docs/postgres/configure-private-services-access
- Configure private IP for Cloud SQL for MySQL — https://cloud.google.com/sql/docs/mysql/configure-private-ip
- Learn about using private IP for Cloud SQL for MySQL — https://docs.cloud.google.com/sql/docs/mysql/private-ip
- About high availability in Cloud SQL — https://cloud.google.com/sql/docs/availability
- Enable and disable high availability for Cloud SQL for MySQL — https://cloud.google.com/sql/docs/mysql/configure-ha
- Create a primary MySQL instance for replication (Terraform sample) — https://cloud.google.com/sql/docs/mysql/samples/cloud-sql-mysql-instance-primary
- Create a read replica Cloud SQL for MySQL instance (Terraform sample) — https://cloud.google.com/sql/docs/mysql/samples/cloud-sql-mysql-instance-replica
- Create read replicas for Cloud SQL for MySQL — https://cloud.google.com/sql/docs/mysql/replication/create-replica
- Cloud SQL metrics reference — https://cloud.google.com/sql/docs/postgres/admin-api/metrics
- Create alerting policies with Terraform — https://docs.cloud.google.com/monitoring/alerts/terraform
- Terraform Registry: `google_project_service` — https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/google_project_service.html
- Terraform Registry provider index for the Google provider — https://registry.terraform.io/providers/hashicorp/google/latest

## Issues Found

1. **The post did not create a Cloud SQL instance at all.** The original Step 4 created a service account and a viewer IAM binding instead of Cloud SQL resources. Replaced it with a VPC network, private services access configuration, a Cloud SQL primary instance, and a read replica so the post matches its title and description.

2. **The required API list was incorrect for Cloud SQL private IP provisioning.** The original post enabled unrelated APIs such as GKE and Cloud Resource Manager, but omitted `sqladmin.googleapis.com` and `servicenetworking.googleapis.com`, which are required for Cloud SQL and private services access. Updated the API list accordingly.

3. **The post claimed high availability, read replicas, backups, and private IP without configuring any of them.** Updated the primary instance to use `availability_type = "REGIONAL"`, enabled backups and MySQL binary logging, and configured private IP on the primary instance. Added a valid read replica configuration that inherits private IP from the primary, which matches Google Cloud's documented behavior.

4. **The monitoring example was not Cloud SQL-specific and referenced an undefined variable.** The original alert policy watched log entry counts and used `var.notification_channel_ids`, which was never declared. Replaced it with a valid Cloud SQL CPU alert policy and added the `notification_channel_names` variable.

5. **The outputs were unrelated to the stated goal.** The original outputs returned a service account email and project ID. Replaced them with Cloud SQL connection details and the replica name.

6. **The provider version was outdated relative to the current official provider documentation.** Updated the Google provider constraint from `~> 5.0` to `~> 7.0` so the post aligns with the current provider documentation referenced during validation.

## Review Notes
- The local workspace does not have `gcloud` or `tofu` installed, so command validation was performed against official documentation rather than local `--help` output or runtime execution.
- The example now uses Cloud SQL for MySQL because Google's official Terraform samples clearly document the backup, HA, and read-replica requirements for MySQL.
- Read replicas inherit private IP connectivity from the primary instance. Google Cloud documentation explicitly states that you do not configure private IP directly on the replica.
