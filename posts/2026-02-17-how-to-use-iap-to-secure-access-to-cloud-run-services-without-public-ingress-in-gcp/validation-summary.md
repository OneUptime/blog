# Validation Summary: How to Use IAP to Secure Access to Cloud Run Services Without Public Ingress

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Google Cloud Run
- Identity-Aware Proxy
- External Application Load Balancer
- Serverless network endpoint groups
- gcloud CLI
- Terraform Google provider
- Python Flask
- Google Auth Python library

## Sources Consulted
- Google Cloud: Enable IAP for Cloud Run: https://cloud.google.com/iap/docs/enabling-cloud-run
- Google Cloud: Restrict network ingress for Cloud Run: https://cloud.google.com/run/docs/securing/ingress
- Google Cloud: Set up a global external Application Load Balancer with Cloud Run: https://cloud.google.com/load-balancing/docs/https/setup-global-ext-https-serverless
- Google Cloud: Secure your app with signed IAP headers: https://cloud.google.com/iap/docs/signed-headers-howto
- Google Cloud SDK: gcloud iap web add-iam-policy-binding: https://cloud.google.com/sdk/gcloud/reference/iap/web/add-iam-policy-binding
- Google Cloud SDK: gcloud compute ssl-certificates create: https://cloud.google.com/sdk/gcloud/reference/compute/ssl-certificates/create
- Terraform Google provider: google_cloud_run_v2_service_iam: https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/cloud_run_v2_service_iam
- Terraform Google provider: google_project_service_identity: https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/project_service_identity
- Terraform Google provider: google_compute_backend_service: https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/compute_backend_service

## Issues Found
- The Cloud Run deploy example described `internal-and-cloud-load-balancing` as internal-only ingress. Updated the comment to say internal and load balancer ingress, which matches Cloud Run's documented setting.
- The image examples used `gcr.io`, which can imply the deprecated Container Registry path. Updated examples to the current Artifact Registry URL format.
- The forwarding rule command did not explicitly set `--load-balancing-scheme=EXTERNAL_MANAGED` or `--network-tier=PREMIUM`. Added both to align with the documented global external Application Load Balancer setup.
- The Cloud Run authentication explanation incorrectly referred to a load balancer service account or Compute Engine default service account. Updated it to use the IAP service agent, which is the documented identity that invokes Cloud Run when IAP protects the backend.
- The gcloud flow granted Cloud Run Invoker to the IAP service agent without first creating the service agent. Added the documented `gcloud beta services identity create --service=iap.googleapis.com` command.
- The Terraform IAM resource used the Cloud Run v1 IAM resource with a Cloud Run v2 service and granted `allUsers` despite the surrounding text saying IAP should invoke Cloud Run. Updated it to `google_cloud_run_v2_service_iam_member` and the generated IAP service identity.
- The Terraform IAP block referenced an undefined `google_iap_client.app` resource. Updated the block to `enabled = true`, which uses the Google-managed OAuth client supported by the provider.
- The Terraform forwarding rule did not specify `load_balancing_scheme = "EXTERNAL_MANAGED"`. Added it to match the backend service and gcloud load balancer setup.
- The troubleshooting command checked the ingress annotation under `spec.template.metadata.annotations`, but Cloud Run stores the service ingress annotation under service metadata. Updated the format expression to `metadata.annotations['run.googleapis.com/ingress']`.

## Review Notes
Google currently recommends enabling IAP directly on Cloud Run for simpler single-service setups. The load-balancer-backed pattern remains valid for cases such as centralized access management across multiple regional Cloud Run backends.
