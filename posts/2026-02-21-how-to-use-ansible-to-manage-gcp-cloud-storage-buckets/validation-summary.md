# Validation Summary: How to Use Ansible to Manage GCP Cloud Storage Buckets

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ansible
- google.cloud Ansible collection
- Google Cloud Storage
- Google Cloud CLI
- YAML playbooks

## Sources Consulted
- Ansible `google.cloud.gcp_storage_bucket` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/google/cloud/gcp_storage_bucket_module.html
- Ansible `google.cloud` collection documentation: https://docs.ansible.com/projects/ansible/latest/collections/google/cloud/index.html
- Ansible `google.cloud.gcp_storage_object` module documentation: https://docs.ansible.com/ansible/latest/collections/google/cloud/gcp_storage_object_module.html
- Google Cloud Storage bucket locations: https://cloud.google.com/storage/docs/locations
- Google Cloud Storage storage classes: https://cloud.google.com/storage/docs/storage-classes
- Google Cloud Storage Object Lifecycle Management: https://cloud.google.com/storage/docs/lifecycle
- Google Cloud Storage Object Versioning: https://cloud.google.com/storage/docs/object-versioning
- Google Cloud Storage uniform bucket-level access: https://cloud.google.com/storage/docs/uniform-bucket-level-access
- Google Cloud Storage Bucket Lock and retention policies: https://cloud.google.com/storage/docs/bucket-lock
- Google Cloud CLI `gcloud storage buckets update` documentation: https://docs.cloud.google.com/sdk/gcloud/reference/storage/buckets/update
- Google Cloud labels overview: https://cloud.google.com/resource-manager/docs/labels-overview

## Issues Found
- The prerequisite listed Ansible 2.9+, but the current `google.cloud` collection documentation lists support for ansible-core 2.16.0 or newer. Updated the prerequisite accordingly.
- The pip install command included `google-api-python-client`, which is not listed as a requirement for the bucket module. Replaced it with `google-cloud-storage`, which is required by the referenced storage object module.
- The dual-region example used `US-EAST1+US-WEST1` as a bucket `location`, which is not the supported location code format for the basic bucket module. Replaced it with the predefined dual-region code `NAM4` and noted that configurable dual-regions require separate placement configuration.
- Lifecycle rule examples used `age`, but the Ansible module parameter is `age_days`. Updated all affected lifecycle conditions.
- The app bucket debug task looped over `bucket_results.results` while referencing the original input fields such as `storage_class`. Changed the loop to use the original `buckets` list so the debug message references fields that exist.
- The retention policy example used an unsupported `retention_policy` parameter on `google.cloud.gcp_storage_bucket`. Changed the example to create the bucket with the module and apply retention using `gcloud storage buckets update --retention-period=220752000s` from an Ansible command task, and added the Google Cloud CLI prerequisite.

## Review Notes
The Google Cloud documentation now recommends soft delete for protection against permanent data loss in some cases where object versioning was historically used. The versioning example remains technically valid, but future revisions could mention soft delete as a related option.
