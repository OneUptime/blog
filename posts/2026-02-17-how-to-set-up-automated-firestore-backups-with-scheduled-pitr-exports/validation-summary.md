# Validation Summary: How to Set Up Automated Firestore Backups with Scheduled PITR Exports

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- Google Cloud Firestore
- Firestore managed export/import
- Firestore point-in-time recovery (PITR)
- Google Cloud Storage
- Cloud Functions / Cloud Run functions
- Cloud Scheduler
- Google Cloud IAM
- Python

## Sources Consulted
- Firestore export and import documentation: https://cloud.google.com/firestore/docs/manage-data/export-import
- Firestore PITR overview: https://firebase.google.com/docs/firestore/pitr
- Firestore PITR usage guide: https://cloud.google.com/firestore/docs/use-pitr
- `gcloud firestore databases update` reference: https://cloud.google.com/sdk/gcloud/reference/firestore/databases/update
- `gcloud firestore databases clone` reference: https://cloud.google.com/sdk/gcloud/reference/firestore/databases/clone
- `gcloud firestore databases restore` reference: https://cloud.google.com/sdk/gcloud/reference/firestore/databases/restore
- `gcloud firestore export` reference: https://cloud.google.com/sdk/gcloud/reference/firestore/export
- `gcloud firestore import` reference: https://cloud.google.com/sdk/gcloud/reference/firestore/import
- `gcloud scheduler jobs create http` reference: https://cloud.google.com/sdk/gcloud/reference/scheduler/jobs/create/http
- Cloud Scheduler HTTP target authentication documentation: https://cloud.google.com/scheduler/docs/http-target-auth
- Cloud Run functions invocation authentication documentation: https://cloud.google.com/functions/docs/securing/authenticating
- Firestore Python client library reference: https://cloud.google.com/python/docs/reference/firestore/latest
- PyPI package index for `google-cloud-firestore` and `google-cloud-firestore-admin`

## Issues Found
- The post described managed exports as exact snapshots. Firestore documentation says an export is not an exact database snapshot taken at export start time and can include changes made while the operation runs. Updated the wording to say exports copy data to Cloud Storage.
- The PITR explanation claimed recovery to any second in the last seven days and said no advance setup was required. Updated it to say PITR must be enabled for seven-day retention, and that whole-database clone/export operations use whole-minute timestamps.
- The PITR restore command used `gcloud firestore databases restore` with `--source-database` and `--snapshot-time`. That command restores from Firestore backup resources using `--source-backup`; PITR database recovery uses `gcloud firestore databases clone`. Replaced the command with `gcloud firestore databases clone` and a fully qualified source database name.
- The Python requirements listed `google-cloud-firestore-admin==1.*`, which is not a published PyPI package. Replaced it with `google-cloud-firestore==2.*`, which provides `google.cloud.firestore_admin_v1`.
- The Cloud Functions deploy command used the Python 3.12 runtime without explicitly deploying as a 2nd gen function. Added `--gen2` to match current Cloud Run functions behavior and the invocation IAM role used later.
- The service account setup did not grant the secured function invoker permission required for Cloud Scheduler OIDC calls to a non-public 2nd gen function. Added a `gcloud functions add-iam-policy-binding` command with `roles/run.invoker`.
- The Cloud Storage IAM command granted only `objectCreator`, while Firestore export/import documentation calls for Storage Admin access for the account initiating export/import operations and bucket access for Firestore export files. Updated the bucket IAM command to grant `roles/storage.admin`.
- The Cloud Scheduler examples used `--body`, but the current `gcloud scheduler jobs create http` flag is `--message-body`. Updated both Scheduler commands.
- The restore section said the basic `gcloud firestore import` command imports into a new database. Without `--database`, it imports into the default database. Updated the comment to avoid a false restore expectation.
- The monitoring Python example used naive UTC datetimes with `datetime.utcnow()` and stripped timezone information from Cloud Storage timestamps. Updated it to use timezone-aware UTC datetimes.
- The monitoring function used `google.cloud.storage` without mentioning the required dependency. Added a short note to include `google-cloud-storage==2.*` when deploying that function separately.

## Review Notes
The revised commands and code examples were checked against official Google Cloud documentation where available. The local workspace does not have `gcloud` installed, so CLI validation was performed against official command references rather than local `--help` output. Python code blocks were parsed successfully with `ast.parse`.
