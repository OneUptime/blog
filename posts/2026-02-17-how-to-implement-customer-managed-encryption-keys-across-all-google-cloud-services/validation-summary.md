# Validation Summary: How to Use Customer-Managed Encryption Keys Across All Google Cloud Services

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Google Cloud Platform
- Cloud KMS
- Customer-managed encryption keys
- Cloud Storage
- BigQuery
- Cloud SQL for PostgreSQL
- Google Kubernetes Engine
- Organization Policy
- Terraform Google provider
- Google Cloud CLI and bq CLI

## Sources Consulted
- Cloud KMS: Create a key: https://docs.cloud.google.com/kms/docs/create-key
- Google Cloud CLI: gcloud kms keys create: https://cloud.google.com/sdk/gcloud/reference/kms/keys/create
- Cloud Storage CMEK overview and usage: https://docs.cloud.google.com/storage/docs/encryption/customer-managed-keys
- Cloud Storage: Use customer-managed encryption keys: https://docs.cloud.google.com/storage/docs/encryption/using-customer-managed-keys
- BigQuery customer-managed Cloud KMS keys: https://docs.cloud.google.com/bigquery/docs/customer-managed-encryption
- Cloud SQL for PostgreSQL CMEK overview: https://docs.cloud.google.com/sql/docs/postgres/cmek
- Cloud SQL for PostgreSQL: Use customer-managed encryption keys: https://docs.cloud.google.com/sql/docs/postgres/configure-cmek
- GKE: Use customer-managed encryption keys: https://docs.cloud.google.com/kubernetes-engine/docs/how-to/using-cmek
- GKE: Encrypt secrets at the application layer: https://docs.cloud.google.com/kubernetes-engine/docs/how-to/encrypting-secrets
- Organization Policy constraints reference: https://docs.cloud.google.com/organization-policy/reference/org-policy-constraints
- Google Cloud CLI: gcloud resource-manager org-policies set-policy: https://docs.cloud.google.com/sdk/gcloud/reference/resource-manager/org-policies/set-policy
- Terraform Google provider: google_kms_crypto_key: https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/kms_crypto_key

## Issues Found
- The GKE example referenced `gke-disk-key` and `gke-secrets-key`, but the setup script did not create those keys. Added both Cloud KMS key creation commands.
- The GKE example required key access but the IAM section did not grant the required roles. Added bindings for the Compute Engine service agent for node boot disks and the GKE service agent for application-layer secrets encryption.
- The Cloud SQL IAM flow assumed the Cloud SQL service agent already existed. Added the documented `gcloud beta services identity create` command before using the service agent email.
- The Cloud Storage description said all objects written to the bucket would be encrypted with the bucket key. Adjusted the wording to say the key is used by default unless another supported object encryption option is provided.
- The Terraform snippet referenced `data.google_project.main.number` without declaring the data source. Added the `google_project` data source.
- The Terraform snippet created a BigQuery dataset with a CMEK key but did not grant the BigQuery encryption service account access to that key. Added the IAM member and a `depends_on` reference.
- The organization policy section did not mention non-retroactive enforcement. Added a note that existing non-CMEK resources must be reconfigured or recreated manually.

## Review Notes
Local `gcloud` was not installed in the review environment, so CLI validation was performed against official Google Cloud CLI reference documentation rather than local `--help` output.
