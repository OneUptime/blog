# Validation Summary: How to Use Ansible to Manage Terraform State

## Status
validated

## Post Type
Guide

## Technologies Covered
- Ansible
- Terraform CLI
- Terraform state and workspaces
- AWS S3

## Sources Consulted
- Ansible `amazon.aws.s3_bucket` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/amazon/aws/s3_bucket_module.html
- Ansible `community.aws.dynamodb_table` module documentation: https://docs.ansible.com/ansible/latest/collections/community/aws/dynamodb_table_module.html
- Ansible `community.general.timezone` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/community/general/timezone_module.html
- Ansible `ansible.builtin.package` module documentation: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/package_module.html
- Terraform S3 backend documentation: https://developer.hashicorp.com/terraform/language/backend/s3
- Terraform `init` command documentation: https://developer.hashicorp.com/terraform/cli/commands/init
- Terraform `import` command documentation: https://developer.hashicorp.com/terraform/cli/commands/import
- Terraform `workspace new` command documentation: https://developer.hashicorp.com/terraform/cli/commands/workspace/new

## Issues Found
- The backend setup example created a DynamoDB table for S3 backend state locking. Current Terraform S3 backend documentation marks DynamoDB-based locking as deprecated and recommends native S3 lock files with `use_lockfile = true`. Removed the DynamoDB table task and updated the summary wording to refer to S3 native lock files.
- The infrastructure provisioning example used `ansible.builtin.timezone`, but the timezone module is currently documented in the `community.general` collection. Changed it to `community.general.timezone` so the playbook uses the correct fully qualified collection name.

## Review Notes
- Terraform's `import` CLI command remains valid, but current Terraform documentation also supports import blocks for automating imports through configuration and `terraform apply`.
- The Terraform workspace task handles an existing workspace by checking stderr text. This is acceptable as an example, but production automation could be made more robust by checking `terraform workspace list` before creating workspaces.
