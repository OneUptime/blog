# Validation Summary: How to Choose Between Secret Manager and Cloud KMS for Managing Sensitive Data

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Google Cloud Secret Manager
- Google Cloud KMS
- Google Kubernetes Engine
- Cloud Run
- Cloud Storage
- BigQuery
- Compute Engine persistent disks
- Python Google Cloud client libraries
- Google Cloud CLI

## Sources Consulted
- Google Cloud Secret Manager quotas and limits: https://docs.cloud.google.com/secret-manager/quotas
- Google Cloud Secret Manager pricing: https://cloud.google.com/secret-manager/pricing
- Google Cloud Secret Manager rotation schedules: https://docs.cloud.google.com/secret-manager/docs/secret-rotation
- Google Cloud Secret Manager event notifications: https://docs.cloud.google.com/secret-manager/docs/event-notifications
- Google Cloud Secret Manager CMEK documentation: https://docs.cloud.google.com/secret-manager/docs/cmek
- Google Cloud Secret Manager GKE add-on documentation: https://docs.cloud.google.com/secret-manager/docs/secret-manager-managed-csi-component
- Cloud Run secrets documentation: https://docs.cloud.google.com/run/docs/configuring/services/secrets
- Cloud KMS pricing: https://cloud.google.com/kms/pricing
- Cloud KMS encryption and decryption documentation: https://cloud.google.com/kms/docs/encrypt-decrypt
- Cloud KMS key creation CLI reference: https://docs.cloud.google.com/sdk/gcloud/reference/kms/keys/create
- Cloud KMS digital signatures documentation: https://cloud.google.com/kms/docs/create-validate-signatures
- Compute Engine CMEK disk documentation: https://cloud.google.com/compute/docs/disks/customer-managed-encryption
- BigQuery bq CLI reference: https://cloud.google.com/bigquery/docs/reference/bq-cli-reference

## Issues Found
- The pricing row listed Secret Manager access operations as $0.06 per 10,000 operations. Current Google Cloud pricing lists access operations at $0.03 per 10,000 operations and bills active secret versions separately, so the table was updated.
- The pricing row listed Cloud KMS cryptographic operations as $0.06 per 10,000 operations. Current Cloud KMS pricing lists cryptographic operations at $0.03 per 10,000 operations and bills key versions separately, so the table was updated.
- The GKE SecretProviderClass example used the older `provider: gcp` and `secrets-store.csi.k8s.io` driver while describing a GKE integration. It was updated to the current GKE Secret Manager add-on syntax: `provider: gke` and `secrets-store-gke.csi.k8s.io`.
- The Secret Manager rotation command used `--rotation-period=30d`, but Secret Manager rotation examples and CLI references use seconds for the rotation period. It was changed to `2592000s`.
- The Cloud Function rotation example called an undefined `update_database_password()` function, which would raise a runtime error if copied as-is. The placeholder call was changed to a comment describing where service-specific update logic belongs.
- The Cloud KMS application encryption guidance implied arbitrary file encryption. Cloud KMS direct symmetric encryption is intended for small plaintext values, with size limits depending on key protection level, so the text was narrowed to small values.
- The Secret Manager CMEK example combined `--replication-policy=user-managed` and `--locations` with `--kms-key-name`, but the inline `--kms-key-name` flag is valid for automatic replication with a global KMS key. The example was changed to automatic replication with a `global` KMS key.
- The CMEK explanation said Google cannot read the secret without access to the KMS key. That overstates what CMEK guarantees. It was changed to the documented behavior: Secret Manager cannot create or access encrypted secret versions if its service identity loses key access or the key is unavailable.

## Review Notes
The Google Cloud CLI was not installed in the local environment, so CLI checks were performed against official Google Cloud CLI reference documentation rather than local `--help` output.
