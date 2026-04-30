# Validation Summary: How to Deploy GCP Cloud Functions with OpenTofu

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- OpenTofu
- Google Cloud Functions (Gen 2 / Cloud Functions v2 API)
- Cloud Run
- Google Cloud Storage
- Pub/Sub
- Eventarc
- IAM
- Serverless VPC Access

## Sources Consulted
- Google Cloud Functions v2 Terraform provider reference: https://raw.githubusercontent.com/hashicorp/terraform-provider-google/main/website/docs/r/cloudfunctions2_function.html.markdown
- Google Cloud Run service IAM Terraform provider reference: https://raw.githubusercontent.com/hashicorp/terraform-provider-google/main/website/docs/r/cloud_run_service_iam.html.markdown
- Serverless VPC Access connector Terraform provider reference: https://raw.githubusercontent.com/hashicorp/terraform-provider-google/main/website/docs/r/vpc_access_connector.html.markdown
- Cloud Storage bucket object Terraform provider reference: https://raw.githubusercontent.com/hashicorp/terraform-provider-google/main/website/docs/r/storage_bucket_object.html.markdown
- Deploy Cloud Function 2nd gen with HTTP trigger using Terraform: https://docs.cloud.google.com/functions/docs/samples/functions-v2-basic
- Deploy Cloud Function 2nd gen with Pub/Sub trigger using Terraform: https://docs.cloud.google.com/functions/docs/samples/functions-v2-full
- Compare Cloud Run functions: https://cloud.google.com/run/docs/functions/comparison
- Cloud Run functions quotas and limits: https://docs.cloud.google.com/functions/quotas
- Cloud Run functions runtimes: https://cloud.google.com/run/docs/runtimes/function-runtimes
- Restrict network ingress for Cloud Run: https://cloud.google.com/run/docs/securing/ingress
- Create triggers from Pub/Sub events: https://docs.cloud.google.com/run/docs/triggering/pubsub-triggers
- Roles and permissions for Cloud Run targets: https://docs.cloud.google.com/eventarc/docs/roles-permissions
- Connect to a VPC network: https://docs.cloud.google.com/vpc/docs/configure-serverless-vpc-access

## Issues Found
- The main HTTP deployment example used `ingress_settings = "ALLOW_INTERNAL_AND_GCLB"` even though the later IAM example described a public HTTP function using `allUsers`. I changed the deployment example to `ALLOW_ALL` so the examples are consistent and would work for direct public HTTP access.
- The post claimed Gen 2 offers timeouts of up to 60 minutes without distinguishing HTTP from event-driven functions. I corrected the wording to make the 60-minute limit HTTP-specific and noted that event-driven functions created with the Cloud Functions v2 API are still limited to 540 seconds.
- The VPC networking best-practice note said a VPC Access Connector was the only way to reach private VPC resources. I updated that guidance to reflect current Google Cloud documentation, which recommends Direct VPC egress when possible and VPC Access Connectors when Direct VPC egress is not an option.
- The statement about the default compute service account having broad project-level access was too absolute. I softened it to `may have broad project-level access` because newer organizations can have automatic IAM grants disabled by default.

## Review Notes
- Google now recommends the Cloud Run Admin API for new Cloud Run functions, but `google_cloudfunctions2_function` remains a valid and supported resource for Cloud Functions v2 API based deployments.
