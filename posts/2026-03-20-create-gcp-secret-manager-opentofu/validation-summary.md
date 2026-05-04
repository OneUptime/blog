# Validation Summary: How to Create GCP Secret Manager Secrets with OpenTofu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTofu / Terraform
- Google Cloud Platform (GCP)
- GCP Secret Manager
- GCP Cloud Run (v2)
- GCP IAM
- GCP Cloud KMS (customer-managed encryption)
- HCL (HashiCorp Configuration Language)

## Sources Consulted
- Terraform Google Provider docs — `google_secret_manager_secret`: https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/secret_manager_secret
- Terraform Google Provider docs — `google_secret_manager_secret_version`: https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/secret_manager_secret_version
- Terraform Google Provider docs — `google_secret_manager_secret_iam`: https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/secret_manager_secret_iam
- Terraform Google Provider docs — `google_cloud_run_v2_service`: https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/cloud_run_v2_service
- GCP Secret Manager rotation docs: https://cloud.google.com/secret-manager/docs/rotation-recommendations

## Issues Found

1. **Incorrect use of `rotation` block (and inaccurate comment)** — The original snippet used:
   ```hcl
   # Automatic deletion of old versions after 30 days
   rotation {
     rotation_period    = "2592000s"
     next_rotation_time = "2025-01-01T00:00:00Z"
   }
   ```
   This is wrong on two counts:
   - The `rotation` block in `google_secret_manager_secret` does **not** delete old versions. It causes Secret Manager to publish a Pub/Sub notification at the configured time, signaling external systems to perform rotation.
   - The `rotation` block requires a sibling `topics` block to be configured; otherwise the resource will fail validation.

   Since the author's stated intent (per the comment) was automatic deletion of old versions after 30 days, I replaced the block with the correct argument for that behavior:
   ```hcl
   # Automatic destruction of disabled secret versions after 30 days
   version_destroy_ttl = "2592000s"  # 30 days
   ```
   `version_destroy_ttl` is the supported top-level argument on `google_secret_manager_secret` for automatically destroying disabled versions after a TTL.

2. **`for_each` IAM binding missing implicit dependency on the secret** — The original `google_secret_manager_secret_iam_binding "app_access"` resource set `secret_id = each.key`, passing the bare string. While this is syntactically accepted by the provider, it does not establish an implicit dependency on the `google_secret_manager_secret.app_secrets` resource, so Terraform may try to create the IAM binding before the secret exists on initial apply. Changed to `secret_id = google_secret_manager_secret.app_secrets[each.key].secret_id` so Terraform sees the dependency and orders creation correctly.

## Review Notes

- **`version = "latest"` in Cloud Run secret reference** — This is accepted by the Cloud Run API, but the official `google_cloud_run_v2_service` documentation examples consistently pin to a specific numeric version (e.g., `"1"`). Pinning gives deterministic deploys; using `"latest"` means the running container won't pick up a new secret version until the next revision is deployed (Cloud Run resolves the version at revision-creation time, not at runtime). Left as-is since both forms work and the author may have had a deliberate reason.
- **Provider version `~> 5.0`** — Valid and current. All resources used in the post are stable in v5.x.
- **`replication { auto {} }`** — Correct syntax; the legacy `automatic = true` form was deprecated in favor of the nested `auto {}` block. Post uses the modern form.
- **`google_kms_crypto_key.secrets.id`** referenced in the user-managed replication example is undefined elsewhere in the snippets, but this is an illustrative example and the reader is expected to provide their own KMS key resource.
- **`lifecycle { ignore_changes = [secret_data] }`** — Good practice for allowing out-of-band rotation; correctly demonstrated.
