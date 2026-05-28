# Validation Summary: How to Build Self-Healing Security Infrastructure with Eventarc and Cloud Run

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- Google Cloud
- Eventarc
- Cloud Run
- Cloud Audit Logs
- Compute Engine firewall rules
- Cloud Storage IAM policies
- Cloud Firestore
- Python
- Flask
- gcloud CLI

## Sources Consulted
- Eventarc Cloud Audit Logs filters: https://cloud.google.com/eventarc/docs/determining-filters-cal
- Eventarc route audit log events to Cloud Run: https://docs.cloud.google.com/eventarc/standard/docs/run/route-trigger-cloud-audit-logs
- Eventarc roles and permissions for Cloud Run targets: https://docs.cloud.google.com/eventarc/docs/roles-permissions
- gcloud Eventarc trigger creation reference: https://docs.cloud.google.com/sdk/gcloud/reference/eventarc/triggers/create
- Eventarc supported event types: https://cloud.google.com/eventarc/docs/reference/supported-events
- Compute Engine Python `Allowed` firewall type reference: https://cloud.google.com/python/docs/reference/compute/latest/google.cloud.compute_v1.types.Allowed
- Cloud Storage Python `Bucket.get_iam_policy` reference: https://docs.cloud.google.com/python/docs/reference/storage/latest/google.cloud.storage.bucket.Bucket
- Firestore Python `Increment` transform reference: https://cloud.google.com/python/docs/reference/firestore/latest/google.cloud.firestore_v1.transforms.Increment

## Issues Found
- The firewall sample parsed `protoPayload.resourceName` with brittle positional splitting. Replaced it with a regex for the documented firewall resource path shape and added a graceful fallback when the firewall name cannot be determined.
- The firewall remediation sample assigned the result of `fw_client.patch()` to an unused variable. Removed the unused assignment to keep the example clean.
- The storage sample referenced `extract_bucket_name()` and `notify_security_team()` but did not define them. Added minimal implementations.
- The storage sample claimed to process bucket ACL changes but only inspected and repaired IAM policy bindings. Scoped the logic to bucket IAM policy changes so the behavior matches the code.
- The storage sample used a method-name check that did not match the Eventarc trigger. Updated both the service logic and trigger to use bucket IAM policy method names consistently.
- The storage sample needed `requested_policy_version=3` when reading IAM policies so conditional IAM policies are preserved when writing the policy back.
- The Eventarc setup granted `roles/eventarc.eventReceiver` but omitted Cloud Run Invoker for authenticated Cloud Run targets. Added `roles/run.invoker`.
- The setup omitted runtime permissions required by the remediation services. Added Compute Security Admin, Storage Admin, Logs Writer, and Datastore User roles for the service account used by the examples.
- The firewall trigger command only created a trigger for inserts even though the service handles insert, update, and patch operations. Added separate Eventarc triggers for update and patch operations.
- The Firestore safety-control snippet used `datetime` without importing it and used naive UTC datetimes. Added `datetime` and `timezone` imports and switched to timezone-aware timestamps.

## Review Notes
The local environment did not have `gcloud` or the Google Cloud Python libraries installed, so CLI and API validation was performed against official Google Cloud documentation rather than local `gcloud --help` or runtime imports. Cloud Audit Logs `methodName` values can vary by API surface; for production use, Google recommends generating the target action and confirming the exact `protoPayload.methodName` in Cloud Logging before finalizing Eventarc filters.
