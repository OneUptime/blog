# Validation Summary: How to Use the bcrypt Function in Terraform

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform configuration language
- Terraform `bcrypt`, `sha256`, `md5`, and `sha1` functions
- Terraform lifecycle `ignore_changes`
- Terraform provisioners
- AWS EC2 `aws_instance` user data
- AWS Systems Manager Parameter Store
- Terraform S3 backend state locking
- Linux password provisioning with `chpasswd`

## Sources Consulted
- HashiCorp Terraform `bcrypt` function documentation: https://developer.hashicorp.com/terraform/language/functions/bcrypt
- HashiCorp Terraform lifecycle meta-argument documentation: https://developer.hashicorp.com/terraform/language/meta-arguments/lifecycle
- HashiCorp Terraform sensitive variables and state documentation: https://developer.hashicorp.com/terraform/tutorials/configuration-language/sensitive-variables
- HashiCorp Terraform S3 backend documentation: https://developer.hashicorp.com/terraform/language/backend/s3
- HashiCorp AWS provider `aws_instance` documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/instance
- HashiCorp AWS provider `aws_ssm_parameter` documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/ssm_parameter
- HashiCorp Local provider `local_file` documentation: https://registry.terraform.io/providers/hashicorp/local/latest/docs/resources/file
- AWS EC2 user data documentation: https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/user-data.html

## Issues Found
- The post claimed a bcrypt cost of 10 means exactly 2^10 iterations of its internal function. I changed this to the safer and more accurate claim that the cost factor is exponential and each increment roughly doubles the time.
- The post recommended `ignore_changes` for most resource uses of `bcrypt`. HashiCorp's documentation recommends using `bcrypt` only in provisioner blocks, or in data resources used only by provisioners, because direct resource arguments cause spurious diffs. I updated the guidance and added a caveat that `ignore_changes` also hides legitimate future changes.
- The AWS EC2 example said `user_data` changes would recreate the instance on every plan. Current AWS provider documentation says `user_data` updates trigger stop/start by default and replacement only when `user_data_replace_on_change` is true. I changed the wording to "planning a user_data update."
- The database example used `local_file` for sensitive generated content and worked around bcrypt churn with `ignore_changes`. The Local provider recommends `local_sensitive_file` for sensitive file content, and Terraform recommends using `bcrypt` in provisioners. I changed the example to generate the file from a `local-exec` provisioner.
- The `null_resource` trigger example used `sha256(var.admin_password)` as a deterministic password indicator. That stores a password-derived value in state and is poor password-hash guidance. I replaced it with a non-secret version trigger and added a state exposure caveat.
- The S3 backend example used `dynamodb_table` for state locking. DynamoDB-based S3 backend locking is deprecated in current Terraform documentation, so I changed it to `use_lockfile = true`.
- The summary said bcrypt generally requires `ignore_changes`. I updated it to recommend provisioner workflows instead.

## Review Notes
The post is technically valid after edits. The remaining examples that use `ignore_changes` are explicitly framed as initial-create-only patterns because later changes to those arguments will be ignored by Terraform.
