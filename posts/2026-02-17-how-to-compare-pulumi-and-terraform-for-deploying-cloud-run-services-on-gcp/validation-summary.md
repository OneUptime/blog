# Validation Summary: How to Compare Pulumi and Terraform for Deploying Cloud Run Services on GCP

## Status
validated

## Post Type
Guide

## Technologies Covered
- Google Cloud Run
- Google Cloud Monitoring
- Google Cloud SQL connectivity from Cloud Run
- Serverless VPC Access
- Terraform
- HashiCorp Google Terraform provider
- Pulumi
- Pulumi GCP provider
- TypeScript
- Vitest

## Sources Consulted
- Google Cloud Run custom domain mapping documentation: https://docs.cloud.google.com/run/docs/mapping-custom-domains
- Google Cloud Cloud Run request/response SLI metrics documentation: https://docs.cloud.google.com/stackdriver/docs/solutions/slo-monitoring/sli-metrics/req-resp-metrics
- Google Cloud Monitoring alerting policies with Terraform documentation: https://docs.cloud.google.com/monitoring/alerts/terraform
- HashiCorp Google provider `google_cloud_run_v2_service` documentation: https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/cloud_run_v2_service
- HashiCorp Google provider `google_monitoring_alert_policy` documentation: https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/monitoring_alert_policy
- Pulumi GCP `gcp.cloudrunv2.Service` documentation: https://www.pulumi.com/registry/packages/gcp/api-docs/cloudrunv2/service/
- Pulumi GCP `gcp.cloudrunv2.ServiceIamMember` documentation: https://www.pulumi.com/registry/packages/gcp/api-docs/cloudrunv2/serviceiammember/
- Pulumi GCP `gcp.monitoring.AlertPolicy` documentation: https://www.pulumi.com/registry/packages/gcp/api-docs/monitoring/alertpolicy/
- Pulumi unit testing documentation: https://www.pulumi.com/docs/iac/guides/testing/unit/
- Pulumi configuration documentation: https://www.pulumi.com/docs/iac/concepts/config/

## Issues Found
- The deployment list said the examples deployed a Cloud Run service with a custom domain, but neither the Terraform nor Pulumi examples configured custom domain mapping or a load balancer. Changed the list item to "A Cloud Run service" to match the actual code.
- The Cloud SQL volume was declared but not mounted into the Cloud Run container. Added `volume_mounts` in Terraform and `volumeMounts` in Pulumi so the `/cloudsql` socket path is available to the container.
- The "error rate" alert filtered only 5xx requests and used a threshold of `5`, which measured a raw 5xx request rate rather than a 5% error rate. Added denominator filters and denominator aggregations for total request count, changed the threshold to `0.05`, and added `combiner = "OR"` / `combiner: "OR"`.
- The Pulumi test referenced `infra.minInstanceCount`, but the Pulumi program did not export that value. Added `minInstanceCount` and `publicMember` exports.
- The Pulumi test did not provide required stack config and left the public IAM assertion incomplete. Added mock runtime setup with test config and a real assertion for the `allUsers` IAM member.

## Review Notes
Terraform CLI was not installed in the local environment, so I could not run `terraform validate`. The review was performed against current official Google Cloud, Terraform provider, and Pulumi documentation.
