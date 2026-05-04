# Validation Summary: How to Configure Longhorn Backup Target to Google Cloud Storage

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Longhorn (v1.11.x backup target)
- Kubernetes (Secrets, kubectl patch, RecurringJob CRD)
- Google Cloud Storage (gsutil, IAM service accounts, HMAC keys, S3 interoperability, lifecycle policies, public access prevention)
- gcloud CLI

## Sources Consulted
- Longhorn docs — Setting a Backup Target (v1.11.1): https://longhorn.io/docs/1.11.1/snapshots-and-backups/backup-and-restore/set-backup-target/
- Longhorn manual test plan — google-cloud-s3-interop-backups: https://longhorn.github.io/longhorn-tests/manual/pre-release/backup-and-restore/google-cloud-s3-interop-backups/
- GitHub issue #2219 — How to setup Google Cloud Storage as Backup Target: https://github.com/longhorn/longhorn/issues/2219
- GitHub issue #5774 — Document GCP bucket backups better: https://github.com/longhorn/longhorn/issues/5774
- GitHub issue #12676 — GCS backup target SignatureDoesNotMatch (CRC32 header regression): https://github.com/longhorn/longhorn/issues/12676
- Google Cloud — HMAC keys for service accounts: https://cloud.google.com/storage/docs/authentication/managing-hmackeys
- Google Cloud — `gsutil pap` (Public Access Prevention): https://cloud.google.com/storage/docs/using-public-access-prevention
- Google Cloud — `gsutil uniformbucketlevelaccess`: https://cloud.google.com/storage/docs/using-uniform-bucket-level-access

## Issues Found
The post described a configuration that Longhorn does not actually support. The corrected version uses GCS's S3 interoperability mode with HMAC keys, which is the only path Longhorn supports for GCS today. Specific changes:

1. **Backup target URL scheme (`gs://` is not supported).** Longhorn only accepts `s3://`, `nfs://`, `cifs://`, and `azblob://` URLs. The post used `gs://${BUCKET_NAME}/`. Changed to `s3://${BUCKET_NAME}@${REGION}/` (the `@region` segment is required for the S3 backend), and added a sentence explaining that the endpoint override in the secret is what redirects S3 calls to GCS. Updated both the kubectl and Longhorn UI sections.

2. **Service account JSON key + `GOOGLE_APPLICATION_CREDENTIALS` is not consumed by Longhorn.** Longhorn's backupstore reads only `AWS_*`, `AZBLOB_*`, or `CIFS_*` keys from the credential secret; it does not read GCP service account JSON. Replaced Step 3 (JSON key creation via `gcloud iam service-accounts keys create`) with HMAC key creation via `gcloud storage hmac create`. Replaced Step 4's secret (which set `GOOGLE_APPLICATION_CREDENTIALS` to JSON contents) with a secret containing `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, and `AWS_ENDPOINTS=https://storage.googleapis.com`. Updated the prose claim that "Longhorn uses S3-compatible credentials for GCS access via the `GOOGLE_APPLICATION_CREDENTIALS` environment variable" to reflect the actual mechanism.

3. **Workload Identity does not authenticate the Longhorn backup target.** Longhorn reads static credentials from a Kubernetes Secret and does not exchange GKE Workload Identity tokens for backup access. The "Using Workload Identity on GKE" section presented an incorrect configuration that would not have worked. Replaced with a short note clarifying the limitation and reinforcing HMAC key rotation as the supported approach. Updated the conclusion, which previously credited "Workload Identity federation for authentication," to instead reference rotated HMAC keys via S3 interoperability.

4. **`gsutil policyonly set gs://$BUCKET_NAME` was both syntactically wrong and semantically duplicate.** The command needs an `on` / `off` argument (the post omitted it), and `policyonly` is the legacy alias for the very same uniform-bucket-level-access setting enabled on the line above. Replaced with `gsutil pap set enforced gs://$BUCKET_NAME`, which actually implements the "block public access" comment via Public Access Prevention.

5. **`tr -d -` is fragile shell.** `tr` parses the unquoted `-` as an option introducer in some implementations rather than as the SET to delete. Quoted to `tr -d '-'` so the bucket-name expression is portable across shells.

6. **Introduction overstated GCS support.** Added one sentence to the introduction making clear that there is no native `gs://` backup target and that the configuration relies on GCS's S3 interoperability mode.

## Review Notes
- **Active GCS-S3-interop bug to be aware of (#12676).** Recent Longhorn releases ship with an aws-sdk-go-v2 version that emits CRC32 checksum trailers; GCS does not include those headers in its SigV4 canonical string and rejects the requests with `SignatureDoesNotMatch`. The fix is being tracked upstream. Readers attempting this configuration on the very latest Longhorn may hit the issue and should check #12676 for the current status. This was not added to the post body because the right warning depends on the Longhorn version the reader installs and is likely to be resolved soon, but it is the most important caveat for anyone following the guide today.
- **Bucket-name region in the backup target URL.** The `@REGION` segment in `s3://BUCKET@REGION/` is the bucket location used by the AWS SDK for SigV4 signing. For GCS multi-regions you can use `us`, `eu`, or `asia`; for single-region buckets use the actual region (e.g. `us-central1`). The post uses `us-central1` consistently with the bucket creation step.
- **`storage.objectAdmin` role.** This is sufficient for Longhorn to list, read, write, and delete backup objects. If a tighter role is desired, `roles/storage.objectUser` (GA in 2024) covers the same operations more narrowly than the legacy admin role.
- **Lifecycle transitions.** The 30-day NEARLINE / 90-day COLDLINE / 365-day Delete schedule is fine, but be aware that Longhorn backups are written as many small chunks; minimum-storage-duration charges for COLDLINE (90 days) and ARCHIVE (365 days) can make aggressive transitions surprisingly expensive if backups are short-lived. Worth modelling against the recurring job's `retain` value before adopting in production.
