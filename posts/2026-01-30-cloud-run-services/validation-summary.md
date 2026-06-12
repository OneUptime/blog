# Validation Summary: How to Implement Cloud Run Services

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- Google Cloud Run
- Google Cloud CLI
- Google Cloud Build
- Artifact Registry
- Terraform Google provider
- Secret Manager
- Serverless VPC Access
- Cloud SQL private IP
- Cloud Monitoring and Cloud Logging
- OpenTelemetry

## Sources Consulted
- Cloud Run: Deploying container images to Cloud Run - https://docs.cloud.google.com/run/docs/deploying
- Cloud Run: Deploy services from source code - https://docs.cloud.google.com/run/docs/deploying-source-code
- Google Cloud SDK: `gcloud run deploy` reference - https://docs.cloud.google.com/sdk/gcloud/reference/run/deploy
- Google Cloud SDK: `gcloud run services update-traffic` reference - https://docs.cloud.google.com/sdk/gcloud/reference/run/services/update-traffic
- Cloud Run: Maximum concurrent requests for services - https://docs.cloud.google.com/run/docs/about-concurrency
- Cloud Run: Set maximum concurrent requests per instance - https://docs.cloud.google.com/run/docs/configuring/concurrency
- Cloud Run: Billing settings for services - https://docs.cloud.google.com/run/docs/configuring/billing-settings
- Cloud Run: Configure CPU limits for services - https://docs.cloud.google.com/run/docs/configuring/services/cpu
- Cloud Run: VPC with connectors - https://docs.cloud.google.com/run/docs/configuring/vpc-connectors
- Cloud Run: Configure container health checks for services - https://docs.cloud.google.com/run/docs/configuring/healthchecks
- Cloud Run: Configure secrets for services - https://docs.cloud.google.com/run/docs/configuring/services/secrets
- Cloud Run: Mapping custom domains - https://docs.cloud.google.com/run/docs/mapping-custom-domains
- Artifact Registry: Transition from Container Registry - https://docs.cloud.google.com/artifact-registry/docs/transition/transition-from-gcr
- Terraform Registry: `google_cloud_run_v2_service` - https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/cloud_run_v2_service
- Terraform Registry: `google_cloud_run_domain_mapping` - https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/cloud_run_domain_mapping

## Issues Found
- The deployment examples used `gcr.io` Container Registry image URLs. Container Registry is shut down for writes as of March 18, 2025, and Artifact Registry is the recommended service. Updated the build, deploy, Terraform, VPC, monitoring, and cost examples to use Artifact Registry Docker image URLs and added a repository creation command before the first Cloud Build push.
- The opening billing claim said Cloud Run users "pay only for the requests you serve." Current Cloud Run billing is more precise: request-based billing charges for resources while instances start, shut down, and process requests, and instance-based billing charges for the full instance lifecycle. Updated the wording and CPU section terminology accordingly.
- The Secret Manager Terraform example created a secret reference but did not create a secret version, grant the Cloud Run service account `roles/secretmanager.secretAccessor`, or ensure those resources existed before service deployment. Added a sensitive `db_password` variable, a secret version, an IAM member, a fully qualified secret reference, and an explicit dependency.
- The custom domain commands used the stable `gcloud run domain-mappings` form without noting that Cloud Run domain mappings are Preview and not recommended for production. Updated the commands to `gcloud beta run domain-mappings` and added the production caveat from the Cloud Run custom domains documentation.
- The first Mermaid diagram reused the same identifiers for subgraphs and nodes, which can break Mermaid rendering. Renamed the graph identifiers while keeping the visible labels the same.

## Review Notes
- The Terraform snippets assume supporting APIs are enabled and Artifact Registry repositories/images already exist unless shown in the gcloud build example.
- Cloud Run domain mappings remain useful for limited cases, but production services should generally use a global external Application Load Balancer, Firebase Hosting, or another supported front end.
