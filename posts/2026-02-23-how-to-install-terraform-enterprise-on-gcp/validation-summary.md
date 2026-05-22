# Validation Summary: How to Install Terraform Enterprise on GCP

## Status
validated

## Post Type
Tutorial / deployment guide

## Technologies Covered
- Terraform
- Terraform Enterprise
- Google Cloud Platform
- Compute Engine
- Cloud SQL for PostgreSQL
- Cloud Storage
- Cloud KMS
- Cloud Load Balancing
- Identity-Aware Proxy
- Docker

## Sources Consulted
- HashiCorp Terraform Enterprise deployment overview: https://developer.hashicorp.com/terraform/enterprise/deploy
- HashiCorp Terraform Enterprise Docker deployment guide: https://developer.hashicorp.com/terraform/enterprise/deploy/docker
- HashiCorp Terraform Enterprise configuration reference: https://developer.hashicorp.com/terraform/enterprise/deploy/reference/configuration
- HashiCorp Terraform Enterprise object storage configuration: https://developer.hashicorp.com/terraform/enterprise/deploy/configuration/storage/connect-object
- HashiCorp Terraform Enterprise PostgreSQL configuration: https://developer.hashicorp.com/terraform/enterprise/deploy/configuration/storage/connect-database/postgres
- HashiCorp Terraform Enterprise diagnostics and readiness endpoints: https://developer.hashicorp.com/terraform/enterprise/deploy/troubleshoot/perform-diagnostics
- HashiCorp Terraform Enterprise CLI reference: https://developer.hashicorp.com/terraform/enterprise/deploy/reference/cli
- HashiCorp Terraform Enterprise releases: https://developer.hashicorp.com/terraform/enterprise/releases
- Terraform Google provider `google_sql_database_instance` resource: https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/sql_database_instance
- Terraform Google provider `google_storage_project_service_account` data source: https://registry.terraform.io/providers/hashicorp/google/latest/docs/data-sources/storage_project_service_account
- Google Cloud Load Balancing firewall rules: https://cloud.google.com/load-balancing/docs/firewall-rules
- Google Cloud Storage customer-managed encryption keys: https://cloud.google.com/storage/docs/encryption/using-customer-managed-keys
- Google Cloud IAP TCP forwarding: https://cloud.google.com/iap/docs/using-tcp-forwarding
- Google Cloud SQL PostgreSQL users and roles: https://cloud.google.com/sql/docs/postgres/users

## Issues Found
- The startup script used the Terraform Enterprise Docker image tag `latest`. HashiCorp documentation states that `latest` is not a valid Terraform Enterprise image tag, so the post now uses a required `tfe_image_tag` variable and pins the image tag explicitly.
- The Docker command omitted required and recommended Docker runtime settings for current Terraform Enterprise deployments, including the Docker socket mount, cache volume, TLS certificate settings, Docker run pipeline settings, read-only container mode, and tmpfs mounts. The startup script now includes these settings.
- Terraform Enterprise TLS certificate settings were missing even though `TFE_TLS_CERT_FILE` is required. The startup script now creates and mounts a backend certificate for the container.
- The load balancer health check used `/_health_check`, which is deprecated in Terraform Enterprise 1.2.0 and later. The health check and verification command now use the readiness endpoint / CLI flow documented by HashiCorp.
- The Cloud Storage bucket used a lifecycle rule that deletes object versions. HashiCorp object storage guidance says to disable lifecycle rules that delete, archive, or transition Terraform Enterprise objects, so the lifecycle rule was removed.
- The Cloud Storage CMEK setup granted KMS permissions to the TFE VM service account but not to the Cloud Storage service agent that performs object encryption and decryption. The storage service agent data source and KMS IAM grant were added, with the bucket depending on that grant.
- The private VM had no external IP, but the SSH firewall rule and verification command assumed direct SSH from an admin CIDR. The SSH path now uses IAP TCP forwarding and the official `35.235.240.0/20` source range.
- The load balancer backend was switched to HTTP port 80 while keeping HTTPS on the public forwarding rule, matching the post's use of a Google-managed certificate at the external HTTPS load balancer.
- The database connection parameters used `sslmode=disable`; this was changed to `sslmode=require` for a managed Cloud SQL PostgreSQL connection.

## Review Notes
The guide is still a simplified single-VM example. For production, readers should also verify Terraform Enterprise version compatibility in the IBM software compatibility report, plan upgrades using HashiCorp's release guidance, enable required Google Cloud APIs before applying, and consider HashiCorp's official Google Cloud GCE module or validated designs for a fuller production deployment.
