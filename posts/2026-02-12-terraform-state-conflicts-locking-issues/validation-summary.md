# Validation Summary: How to Handle Terraform State Conflicts and Locking Issues

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Terraform CLI
- Terraform state management
- Terraform S3 backend
- AWS S3
- AWS DynamoDB
- AWS CLI
- Terraform AWS provider

## Sources Consulted
- HashiCorp Terraform S3 backend documentation: https://developer.hashicorp.com/terraform/language/backend/s3
- HashiCorp Terraform state locking documentation: https://developer.hashicorp.com/terraform/language/state/locking
- HashiCorp Terraform refresh-only tutorial: https://developer.hashicorp.com/terraform/tutorials/state/refresh
- HashiCorp Terraform plan command reference: https://developer.hashicorp.com/terraform/cli/commands/plan
- HashiCorp Terraform import command reference: https://developer.hashicorp.com/terraform/cli/commands/import
- HashiCorp Terraform state rm command reference: https://developer.hashicorp.com/terraform/cli/commands/state/rm
- HashiCorp Terraform moved block/refactoring documentation: https://developer.hashicorp.com/terraform/language/modules/develop/refactoring
- Terraform AWS provider documentation for `aws_s3_bucket_server_side_encryption_configuration`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/s3_bucket_server_side_encryption_configuration
- Terraform AWS provider documentation for `aws_dynamodb_table`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/dynamodb_table
- AWS CLI `dynamodb get-item` command reference: https://docs.aws.amazon.com/cli/latest/reference/dynamodb/get-item.html
- AWS CLI `dynamodb delete-item` command reference: https://docs.aws.amazon.com/cli/latest/reference/dynamodb/delete-item.html
- AWS CLI `s3api list-object-versions` command reference: https://docs.aws.amazon.com/cli/latest/reference/s3api/list-object-versions.html
- AWS CLI `s3api get-object` command reference: https://docs.aws.amazon.com/cli/latest/reference/s3api/get-object.html
- AWS CLI `s3 rm` command reference: https://docs.aws.amazon.com/cli/latest/reference/s3/rm.html
- AWS CLI `s3 cp` command reference: https://docs.aws.amazon.com/cli/latest/reference/s3/cp.html

## Issues Found
- The post presented S3 plus DynamoDB locking as the recommended current backend setup. HashiCorp's current S3 backend documentation marks DynamoDB-based locking as deprecated and recommends S3 lockfiles with `use_lockfile`. Updated the main backend examples to use `use_lockfile = true` and reframed DynamoDB as legacy/deprecated.
- The backend setup section created a DynamoDB lock table as part of the main recommended setup. Moved that explanation into a legacy DynamoDB-locking note so readers do not provision deprecated locking infrastructure for new S3 backends.
- The lock error and manual DynamoDB commands used `production/terraform.tfstate`, while the backend key was `production/infrastructure/terraform.tfstate`. Updated the paths to match the configured backend key.
- The lock recovery section only described DynamoDB manual deletion. Added the corresponding S3 lockfile deletion command for backends using `use_lockfile`.
- The wrapping-up section still advised setting up "DynamoDB locking from day one." Updated it to "state locking from day one" to avoid recommending deprecated backend configuration.

## Review Notes
Terraform CLI was not installed in the local environment, so command verification was performed against official HashiCorp and AWS CLI documentation rather than local `--help` output. The external OneUptime link to the moved-blocks post is plausible and on the same site, but I did not treat it as an authoritative technical source.
