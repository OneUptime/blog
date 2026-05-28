# Validation Summary: How to Create and Configure Google Cloud Storage Buckets Using the gcloud CLI

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Google Cloud Storage
- Google Cloud CLI / gcloud storage
- Cloud Storage buckets
- Object Lifecycle Management
- Object Versioning
- Uniform bucket-level access
- Customer-managed encryption keys (CMEK)
- Bash scripting

## Sources Consulted
- Google Cloud CLI reference: `gcloud storage buckets create` - https://cloud.google.com/sdk/gcloud/reference/storage/buckets/create
- Google Cloud CLI reference: `gcloud storage buckets update` - https://docs.cloud.google.com/sdk/gcloud/reference/storage/buckets/update
- Google Cloud CLI reference: `gcloud storage buckets describe` - https://docs.cloud.google.com/sdk/gcloud/reference/storage/buckets/describe
- Google Cloud CLI reference: `gcloud storage buckets list` - https://docs.cloud.google.com/sdk/gcloud/reference/storage/buckets/list
- Google Cloud CLI reference: `gcloud storage rm` - https://cloud.google.com/sdk/gcloud/reference/storage/rm
- Cloud Storage documentation: Create a bucket - https://docs.cloud.google.com/storage/docs/creating-buckets
- Cloud Storage documentation: About buckets - https://cloud.google.com/storage/docs/buckets
- Cloud Storage documentation: Bucket locations - https://docs.cloud.google.com/storage/docs/locations
- Cloud Storage documentation: Storage classes - https://docs.cloud.google.com/storage/docs/storage-classes
- Cloud Storage documentation: Uniform bucket-level access - https://docs.cloud.google.com/storage/docs/uniform-bucket-level-access
- Cloud Storage documentation: Object Versioning - https://docs.cloud.google.com/storage/docs/object-versioning
- Cloud Storage documentation: Use Object Versioning - https://docs.cloud.google.com/storage/docs/using-object-versioning
- Cloud Storage documentation: Object Lifecycle Management - https://docs.cloud.google.com/storage/docs/lifecycle
- Cloud Storage documentation: Lifecycle configuration examples - https://docs.cloud.google.com/storage/docs/lifecycle-configurations
- Cloud Storage documentation: Delete buckets - https://docs.cloud.google.com/storage/docs/deleting-buckets

## Issues Found
- `gcloud storage buckets create` was shown with `--labels`, but the current official command reference does not support a `--labels` flag for bucket creation. I changed those examples to create the bucket first and then apply labels with `gcloud storage buckets update --update-labels`.
- The complete production example used `--versioning` during bucket creation, but the current official `buckets create` command does not support that flag. I changed the example to enable versioning with `gcloud storage buckets update --versioning` after creating the bucket.
- The Bash script used `--labels` during bucket creation. I changed it to create the bucket first, then run a separate `buckets update --update-labels` command, and kept the production-only versioning update as a separate update command.
- The cleanup example used `gcloud storage rm gs://my-test-bucket/**`, which only affects live versions in buckets that contain versioned objects. I changed it to `gcloud storage rm --recursive gs://my-test-bucket/**` so it also removes object versions before deleting the empty bucket.
- The post stated that bucket location cannot be changed after creation. Current Cloud Storage documentation notes that bucket relocation is available when Storage Intelligence is configured, so I qualified the statement to say location usually cannot be changed unless bucket relocation with Storage Intelligence is being used.

## Review Notes
The remaining commands and snippets are consistent with the official Google Cloud CLI and Cloud Storage documentation reviewed. The examples assume the reader has appropriate IAM permissions and an initialized Google Cloud CLI configuration.
