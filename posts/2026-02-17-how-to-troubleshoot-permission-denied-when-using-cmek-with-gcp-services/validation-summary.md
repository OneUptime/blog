# Validation Summary: How to Troubleshoot Permission Denied When Using CMEK with GCP Services

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Google Cloud Platform
- Cloud KMS
- Customer-managed encryption keys (CMEK)
- IAM service agents
- Cloud Storage
- BigQuery
- Compute Engine
- Google Kubernetes Engine
- Cloud SQL
- Pub/Sub
- Dataflow
- Artifact Registry
- VPC Service Controls
- Organization Policy
- Google Cloud CLI

## Sources Consulted
- Google Cloud KMS CMEK overview: https://docs.cloud.google.com/kms/docs/cmek
- Cloud KMS IAM documentation: https://cloud.google.com/kms/docs/iam
- Cloud KMS locations: https://docs.cloud.google.com/kms/docs/locations
- Cloud Storage CMEK documentation: https://docs.cloud.google.com/storage/docs/encryption/customer-managed-keys
- Cloud Storage service agent command reference: https://cloud.google.com/sdk/gcloud/reference/storage/service-agent
- BigQuery CMEK documentation: https://docs.cloud.google.com/bigquery/docs/customer-managed-encryption
- Compute Engine CMEK documentation: https://cloud.google.com/compute/docs/disks/customer-managed-encryption
- GKE CMEK documentation: https://docs.cloud.google.com/kubernetes-engine/docs/how-to/using-cmek
- Cloud SQL CMEK documentation: https://cloud.google.com/sql/docs/mysql/configure-cmek
- Pub/Sub CMEK documentation: https://docs.cloud.google.com/pubsub/docs/encryption
- Dataflow CMEK documentation: https://docs.cloud.google.com/dataflow/docs/guides/customer-managed-encryption-keys
- Artifact Registry CMEK documentation: https://docs.cloud.google.com/artifact-registry/docs/cmek
- VPC Service Controls ingress and egress rules: https://docs.cloud.google.com/vpc-service-controls/docs/ingress-egress-rules
- IAM access change propagation: https://cloud.google.com/iam/docs/access-change-propagation
- Organization policy constraints: https://cloud.google.com/resource-manager/docs/organization-policy/org-policy-constraints
- gcloud org-policies describe reference: https://cloud.google.com/sdk/gcloud/reference/org-policies/describe

## Issues Found
- The GKE section implied the GKE service agent was relevant for the node disk CMEK troubleshooting path. Google documentation says CMEK-protected node boot disks and attached Persistent Disks require granting `roles/cloudkms.cryptoKeyEncrypterDecrypter` to the Compute Engine service agent, so the section and quick reference table were corrected.
- The Cloud SQL section used an instance describe field and said the account varies per instance. Cloud SQL CMEK uses the Cloud SQL service identity in the form `service-PROJECT_NUMBER@gcp-sa-cloud-sql.iam.gserviceaccount.com`, so the command and quick reference table were corrected.
- The organization policy command used the older `gcloud resource-manager org-policies describe` form. It was updated to the current `gcloud org-policies describe` command shown in the Google Cloud CLI reference.
- The Cloud Storage location wording was too broad for multi-region buckets. It now says the Cloud KMS key ring must match the bucket data location or location code.

## Review Notes
The core troubleshooting flow, IAM role, service-agent formats for Cloud Storage, BigQuery, Compute Engine, Pub/Sub, Dataflow, and Artifact Registry, cross-project CMEK guidance, VPC Service Controls caveat, key state checks, audit-log debugging approach, and IAM propagation timing are consistent with Google Cloud documentation.
