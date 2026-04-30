# Validation Summary: How to Set Up GCP Identity-Aware Proxy with OpenTofu

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Google Cloud Platform (GCP)
- Identity-Aware Proxy (IAP)
- OpenTofu / HCL
- Compute Engine
- App Engine
- Cloud Run

## Sources Consulted
- Google Cloud: Provision IAP resources with Terraform - https://cloud.google.com/iap/docs/terraform
- Google Cloud: Identity-Aware Proxy overview - https://cloud.google.com/iap/docs/concepts-overview
- Google Cloud: Enable IAP for Cloud Run - https://cloud.google.com/iap/docs/enabling-cloud-run
- Google Cloud: Using IAP for TCP forwarding - https://cloud.google.com/iap/docs/using-tcp-forwarding
- Google Cloud: Deprecations - https://cloud.google.com/iap/docs/deprecations
- Google Cloud: Migrate from the IAP OAuth Admin API - https://cloud.google.com/iap/docs/deprecations/migrate-oauth-client
- Terraform Google provider docs: `google_compute_backend_service` - https://github.com/hashicorp/terraform-provider-google/blob/main/website/docs/r/compute_backend_service.html.markdown
- Terraform Google provider docs: `google_iap_brand` - https://github.com/hashicorp/terraform-provider-google/blob/main/website/docs/r/iap_brand.html.markdown
- Terraform Google provider docs: `google_iap_client` - https://github.com/hashicorp/terraform-provider-google/blob/main/website/docs/r/iap_client.html.markdown
- Terraform Google provider docs: `google_iap_web_backend_service_iam` - https://github.com/hashicorp/terraform-provider-google/blob/main/website/docs/r/iap_web_backend_service_iam.html.markdown
- Terraform Google provider docs: `google_iap_web_type_compute_iam` - https://github.com/hashicorp/terraform-provider-google/blob/main/website/docs/r/iap_web_type_compute_iam.html.markdown
- Terraform Google provider docs: `google_iap_web_type_app_engine_iam` - https://github.com/hashicorp/terraform-provider-google/blob/main/website/docs/r/iap_web_type_app_engine_iam.html.markdown
- Terraform Google provider docs: `google_iap_tunnel_instance_iam` - https://github.com/hashicorp/terraform-provider-google/blob/main/website/docs/r/iap_tunnel_instance_iam.html.markdown

## Issues Found
- Step 1 was mislabeled as enabling IAP for App Engine or Cloud Run, but the snippet only enabled the `iap.googleapis.com` API. The heading was corrected and the explicit `project` argument was added for clarity.
- Step 2 used `google_iap_brand` and `google_iap_client`. Those resources depend on the deprecated IAP OAuth Admin API, which Google shut down on March 19, 2026. The section was replaced with current guidance to use the Google-managed OAuth client by default or a pre-created custom client from the Google Cloud console when needed.
- Step 3 claimed that an IAM binding enabled IAP on a backend service. It does not; it only grants access after IAP is enabled. The section was corrected to show `iap { enabled = true }` on `google_compute_backend_service` and then a `google_iap_web_backend_service_iam_binding` to grant access.
- Step 3 also implied the backend-service IAM resource applied to App Engine. That resource is for load balancer backend services, not App Engine. The wording was narrowed accordingly, and a Cloud Run bypass caveat was added because the default `run.app` URL is not protected by load-balancer IAP unless it is disabled or ingress is restricted.
- Step 4 used `google_iap_web_iam_member` for a Compute Engine-specific example. That resource is too broad for the claim being made. It was replaced with `google_iap_web_type_compute_iam_member`, which matches project-level IAP access for Compute Engine-backed web apps.
- Step 5 granted the IAP tunnel IAM role but omitted the required firewall prerequisite. A note was added that ingress from `35.235.240.0/20` must be allowed to the target ports for SSH/RDP or other tunneled traffic.
- Step 6 said it enabled IAP on App Engine, but the snippet only granted IAM access to an App Engine app already protected by IAP. The heading and comment were corrected to match the actual behavior.

## Review Notes
- The post now reflects the current post-shutdown state of the IAP OAuth Admin API as of April 30, 2026.
- For Cloud Run, Google recommends enabling IAP directly on the Cloud Run service when possible; the post's load-balancer example remains valid, but it should not leave the default `run.app` URL exposed.
- The examples focus on IAP enablement and IAM bindings. A production deployment still needs the surrounding load balancer, backend, and firewall configuration that the snippets intentionally omit.
