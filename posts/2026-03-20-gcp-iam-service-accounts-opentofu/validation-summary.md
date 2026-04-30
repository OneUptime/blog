# Validation Summary: How to Create GCP IAM Service Accounts with OpenTofu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTofu / HCL
- Google Cloud IAM service accounts
- Google Cloud IAM policy bindings
- Google Cloud Storage bucket IAM
- Google Cloud Pub/Sub topic IAM
- GKE Workload Identity Federation for GKE
- Service account keys
- Google Cloud Policy Intelligence

## Sources Consulted
- [Google Cloud IAM: Types of service accounts](https://cloud.google.com/iam/docs/service-account-types)
- [Google Cloud IAM: Service account credentials](https://cloud.google.com/iam/docs/service-account-creds)
- [Google Cloud IAM: Best practices for managing service account keys](https://cloud.google.com/iam/docs/best-practices-for-managing-service-account-keys)
- [Google Cloud IAM: Best practices for using service accounts securely](https://cloud.google.com/iam/docs/best-practices-service-accounts)
- [GKE: Authenticate to Google Cloud APIs from GKE workloads](https://cloud.google.com/kubernetes-engine/docs/how-to/workload-identity)
- [Policy Intelligence: Tools to understand service account usage](https://cloud.google.com/policy-intelligence/docs/service-account-usage-tools)
- [Policy Intelligence: Find unused service accounts](https://cloud.google.com/policy-intelligence/docs/service-account-insights)
- [HashiCorp Google provider: `google_service_account`](https://github.com/hashicorp/terraform-provider-google/blob/main/website/docs/r/google_service_account.html.markdown)
- [HashiCorp Google provider: `google_service_account_key`](https://github.com/hashicorp/terraform-provider-google/blob/main/website/docs/r/google_service_account_key.html.markdown)
- [HashiCorp Google provider: `google_service_account_iam`](https://github.com/hashicorp/terraform-provider-google/blob/main/website/docs/r/google_service_account_iam.html.markdown)
- [HashiCorp Google provider: `google_project_iam`](https://github.com/hashicorp/terraform-provider-google/blob/v5.10.0/website/docs/r/google_project_iam.html.markdown)
- [HashiCorp Google provider: `storage_bucket_iam`](https://github.com/hashicorp/terraform-provider-google/blob/v5.10.0/website/docs/r/storage_bucket_iam.html.markdown)
- [HashiCorp Google provider: `pubsub_topic_iam`](https://github.com/hashicorp/terraform-provider-google/blob/v5.10.0/website/docs/r/pubsub_topic_iam.html.markdown)
- [HashiCorp Google provider: `secret_manager_secret_version`](https://github.com/hashicorp/terraform-provider-google/blob/main/website/docs/r/secret_manager_secret_version.html.markdown)

## Issues Found
1. **Service account types were described inaccurately**: The post said GCP has "user-managed" and "Google-managed" service accounts. Google Cloud's IAM docs distinguish between user-managed service accounts and service agents, and they treat default service accounts as user-managed service accounts created automatically by certain services. I corrected that explanation.
2. **The diagram overstated Workload Identity coverage**: It labeled Workload Identity as applying to both GKE and Cloud Run. Cloud Run uses service identity, while the workload identity flow shown later in the post is specific to GKE. I updated the diagram label to refer only to GKE.
3. **The service-account-key guidance was unsafe and misleading**: The post recommended storing a generated service account key in Secret Manager and implied that this would avoid state/file exposure. Official Google guidance recommends not storing service account keys in Secret Manager or other cloud-based secret stores, and the provider docs explicitly warn that `google_service_account_key` persists the private key in OpenTofu/Terraform state. I removed the Secret Manager example and replaced it with accurate warnings.
4. **The GKE Workload Identity section was incomplete**: The `google_service_account_iam_member` binding alone is not sufficient for the linked IAM-service-account flow shown in the post. The cluster must have Workload Identity Federation for GKE enabled, and the Kubernetes ServiceAccount must also be annotated with `iam.gke.io/gcp-service-account`. I updated the prose to include those requirements.
5. **The unused-account audit recommendation was incorrect**: `gcloud iam service-accounts list` lists service accounts, but it doesn't identify which ones are unused. I replaced that recommendation with Policy Intelligence tooling such as service account insights, which is the official Google-documented way to find unused service accounts.
6. **The keyless-auth recommendation used imprecise terminology**: The original text treated Application Default Credentials as an alternative to service account keys in the same sense as Workload Identity. In practice, ADC is a credential-discovery mechanism and can itself use service account keys. I tightened the wording so the post recommends attached service accounts, Workload Identity Federation, and other short-lived credential flows instead.

## Review Notes
- The post pins the Google provider to `~> 5.10`. I checked the resources and arguments used in the examples against that provider series, and the snippets remain syntactically compatible.
- Google also documents newer provider versions, but no provider-version change was required to make the examples technically correct.
- Google currently documents both service account insights and Activity Analyzer as Policy Intelligence features for identifying unused service accounts; those features are marked Preview in the referenced docs.
