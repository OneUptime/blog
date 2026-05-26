# Validation Summary: How to Use Ansible to Manage Cloud Storage

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ansible
- Amazon S3
- AWS CLI
- Azure Blob Storage
- Google Cloud Storage
- PostgreSQL backups

## Sources Consulted
- Ansible amazon.aws.s3_bucket module documentation: https://docs.ansible.com/projects/ansible/latest/collections/amazon/aws/s3_bucket_module.html
- Ansible amazon.aws.s3_object module documentation: https://docs.ansible.com/projects/ansible/latest/collections/amazon/aws/s3_object_module.html
- Ansible amazon.aws.s3_bucket_info module documentation: https://docs.ansible.com/projects/ansible/latest/collections/amazon/aws/s3_bucket_info_module.html
- Ansible community.aws.s3_lifecycle module documentation: https://docs.ansible.com/projects/ansible/latest/collections/community/aws/s3_lifecycle_module.html
- Ansible community.aws.s3_website module documentation: https://docs.ansible.com/ansible/latest/collections/community/aws/s3_website_module.html
- AWS CLI put-bucket-replication documentation: https://docs.aws.amazon.com/cli/latest/reference/s3api/put-bucket-replication.html
- Ansible azure.azcollection.azure_rm_storageaccount module documentation: https://docs.ansible.com/projects/ansible/latest/collections/azure/azcollection/azure_rm_storageaccount_module.html
- Ansible azure.azcollection.azure_rm_storageblob module documentation: https://docs.ansible.com/projects/ansible/latest/collections/azure/azcollection/azure_rm_storageblob_module.html
- Ansible google.cloud.gcp_storage_bucket module documentation: https://docs.ansible.com/projects/ansible/latest/collections/google/cloud/gcp_storage_bucket_module.html
- Ansible google.cloud.gcp_storage_object module documentation: https://docs.ansible.com/ansible/latest/collections/google/cloud/gcp_storage_object_module.html

## Issues Found
- Added installation of the `community.aws` collection because `s3_lifecycle` and `s3_website` are current `community.aws` modules, not `amazon.aws` modules.
- Replaced `amazon.aws.s3_lifecycle` with `community.aws.s3_lifecycle`, changed lifecycle transition keys from `days` to `transition_days`, and changed S3 lifecycle storage class values to the lowercase values accepted by the module.
- Replaced `amazon.aws.s3_website` with `community.aws.s3_website`.
- Fixed the S3 replication CLI JSON by using `Filter: { "Prefix": "" }` and adding `DeleteMarkerReplication`, which AWS requires when a replication rule uses `Filter`.
- Replaced the incomplete Azure SDK pip install command with the official azcollection requirements file install command.
- Added the required `exposed_headers` field to the Azure storage account `blob_cors` rule.
- Removed invalid `public_access: off` values from private Azure container examples. The module supports public access levels such as `blob` and `container`; omitting the field leaves containers private.
- Fixed GCP lifecycle conditions from `age` to `age_days`.
- Moved GCP uniform bucket-level access under `iam_configuration.uniform_bucket_level_access.enabled`.
- Fixed GCP object upload syntax by using `action: upload` and `dest` instead of unsupported `name` and `state` parameters.
- Fixed S3 object upload encryption syntax by using `encrypt: true` and `encryption_mode: AES256` instead of the unsupported `encryption` parameter.
- Fixed the S3 audit condition to check `item.buckets[0].bucket_encryption`, matching the return shape of `amazon.aws.s3_bucket_info` in a loop.

## Review Notes
- The examples still assume credentials, IAM permissions, bucket names, resource groups, and service account files are already configured. That is normal for a tutorial, but real deployments should also include explicit authentication and permission setup.
