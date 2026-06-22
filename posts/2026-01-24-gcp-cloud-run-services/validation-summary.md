# Validation Summary: How to Configure Cloud Run Services in GCP

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Google Cloud Run
- Google Cloud CLI
- Docker container images
- Artifact Registry and Container Registry
- Terraform Google provider
- Secret Manager
- Serverless VPC Access
- Cloud SQL for PostgreSQL
- Cloud SQL Python Connector
- Cloud Run IAM authentication
- Cloud Logging

## Sources Consulted
- Google Cloud Run: Deploy services from source code: https://docs.cloud.google.com/run/docs/deploying-source-code
- Google Cloud Run: Billing settings for services: https://docs.cloud.google.com/run/docs/configuring/billing-settings
- Google Cloud Run: Configure secrets for services: https://docs.cloud.google.com/run/docs/configuring/services/secrets
- Google Cloud Run: Rollbacks, gradual rollouts, and traffic migration: https://docs.cloud.google.com/run/docs/rollouts-rollbacks-traffic-migration
- Google Cloud Run: Mapping custom domains: https://docs.cloud.google.com/run/docs/mapping-custom-domains
- Google Cloud Run: VPC with connectors: https://docs.cloud.google.com/run/docs/configuring/vpc-connectors
- Google Cloud Run v2 API reference: https://docs.cloud.google.com/run/docs/reference/rpc/google.cloud.run.v2
- Google Cloud Run: Authenticate service-to-service requests sample: https://docs.cloud.google.com/run/docs/samples/cloudrun-service-to-service-auth
- Google Cloud Run: Authenticating service-to-service: https://docs.cloud.google.com/run/docs/authenticating/service-to-service
- Google Cloud Run: Logging and viewing logs: https://docs.cloud.google.com/run/docs/logging
- Google Cloud SQL for PostgreSQL: Cloud SQL Python Connector sample: https://docs.cloud.google.com/sql/docs/postgres/samples/cloud-sql-postgres-sqlalchemy-connect-connector
- Terraform Google provider: google_cloud_run_v2_service: https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/cloud_run_v2_service
- Terraform Google provider: Cloud Run v2 service IAM resources: https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/cloud_run_v2_service_iam

## Issues Found
- The CPU allocation comments did not show the command for always-allocated CPU and described the behavior imprecisely. Added `--no-cpu-throttling` and clarified request-based versus instance-based billing.
- The Terraform `cpu_idle = true` comment incorrectly implied it controls scale-to-zero. Updated the comment to state that CPU is allocated only while processing requests.
- The Terraform IAM example used the v1 `google_cloud_run_service_iam_member` resource with a v2 Cloud Run service. Changed it to `google_cloud_run_v2_service_iam_member` and updated the argument from `service` to `name`.
- The custom domain section omitted the current production caveat for Cloud Run domain mappings. Added a note that domain mappings are Preview and that a global external Application Load Balancer is recommended for production custom domains.
- The domain verification command verified `api.example.com`; Google Cloud's Cloud Run domain mapping docs direct users to verify the base domain. Changed it to `example.com`.
- The Cloud SQL deployment snippet set `DB_SOCKET`, while the Python Cloud SQL Connector code reads `INSTANCE_CONNECTION_NAME`. Updated the deployment snippet to set `INSTANCE_CONNECTION_NAME` and removed the Unix socket mount flag to avoid mixing connection approaches.
- The Cloud SQL Python Connector sample used the default background refresh strategy, which can be problematic in serverless environments with throttled CPU. Updated it to `Connector(refresh_strategy="LAZY")`.
- The authenticated Cloud Run Python request example used `requests.get` without importing `requests`. Added the missing import.
- The log tail command used the GA command, but current Cloud Run documentation shows command-line log tail under `gcloud beta`. Updated the command to `gcloud beta run services logs tail`.
- The revision log command used an unsupported `gcloud run revisions logs read` form. Replaced it with a `gcloud logging read` filter for `resource.labels.revision_name`.

## Review Notes
- `gcloud` and `terraform` were not installed in the review environment, so CLI and Terraform examples were verified against official Google Cloud and Terraform provider documentation rather than local `--help` output.
- Container Registry examples remain syntactically valid, but Artifact Registry is correctly identified as the recommended registry for new deployments.
