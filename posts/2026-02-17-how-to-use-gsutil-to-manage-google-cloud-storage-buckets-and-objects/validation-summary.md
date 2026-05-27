# Validation Summary: How to Use gsutil to Manage Google Cloud Storage Buckets and Objects

## Status
validated

## Post Type
Tutorial / CLI guide

## Technologies Covered
- Google Cloud Storage
- gsutil
- gcloud storage
- Google Cloud CLI
- Cloud Storage IAM and ACLs
- Boto / `.boto` configuration

## Sources Consulted
- Google Cloud Storage gsutil tool documentation: https://cloud.google.com/storage/docs/gsutil
- Google Cloud Storage install gsutil documentation: https://cloud.google.com/storage/docs/gsutil_install
- Google Cloud Storage transition from gsutil to gcloud storage documentation: https://cloud.google.com/storage/docs/gsutil-transition-to-gcloud
- Google Cloud Storage boto configuration documentation: https://cloud.google.com/storage/docs/boto-gsutil
- Google Cloud Storage uniform bucket-level access documentation: https://cloud.google.com/storage/docs/uniform-bucket-level-access
- Google Cloud Storage IAM roles documentation: https://cloud.google.com/storage/docs/access-control/iam-roles
- Google Cloud Storage make data public documentation: https://cloud.google.com/storage/docs/access-control/making-data-public
- Google Cloud SDK gcloud storage command reference: https://cloud.google.com/sdk/gcloud/reference/storage
- Google Cloud SDK gcloud storage cp reference: https://cloud.google.com/sdk/gcloud/reference/storage/cp
- Google Cloud SDK gcloud storage objects describe reference: https://cloud.google.com/sdk/gcloud/reference/storage/objects/describe

## Issues Found
- The post said gsutil is still broadly supported and implied it remains a peer recommendation to `gcloud storage`. Updated the wording to reflect Google's current guidance that `gcloud storage` is the recommended CLI for Cloud Storage, while gsutil remains common in existing scripts and tutorials.
- The post claimed `gcloud storage` is faster because it uses the JSON API and that gsutil uses the XML API. Replaced this with the documented performance guidance that `gcloud storage` generally requires less manual tuning and supports parallel processing by default for commands such as `rsync`.
- The download example used `gsutil cp -Z` to decompress a gzip object. `-Z` is a gzip upload option, so the example was changed to stream the object through `gunzip`.
- The object listing section used `gsutil du -s` for human-readable sizes. `-s` summarizes size; `-h` is the human-readable option, so the command was changed to `gsutil du -h`.
- The counting section used `gsutil du -s` as an object count command. Updated it to use recursive listing piped to `wc -l`, and kept `gsutil du -s` as a separate total-size command.

## Review Notes
The ACL examples are syntactically valid for buckets that use fine-grained access control, but ACL commands fail on buckets with uniform bucket-level access enabled. Future revisions could call this out near the ACL section.
