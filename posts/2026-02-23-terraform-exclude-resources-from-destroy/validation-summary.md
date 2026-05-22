# Validation Summary: How to Exclude Resources from Terraform Destroy

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform CLI
- Terraform lifecycle meta-arguments
- Terraform state management
- Terraform `removed` blocks
- Terraform `terraform_remote_state`
- AWS provider resources for RDS, S3, EC2, and VPC
- AWS RDS deletion protection
- AWS S3 versioning and MFA Delete
- AWS EC2 termination protection
- Bash scripting

## Sources Consulted
- HashiCorp Terraform CLI `destroy` command: https://developer.hashicorp.com/terraform/cli/commands/destroy
- HashiCorp Terraform CLI `state rm` command: https://developer.hashicorp.com/terraform/cli/commands/state/rm
- HashiCorp Terraform lifecycle meta-argument reference: https://developer.hashicorp.com/terraform/language/meta-arguments/lifecycle
- HashiCorp Terraform `removed` block reference: https://developer.hashicorp.com/terraform/language/block/removed
- HashiCorp Terraform resource targeting tutorial: https://developer.hashicorp.com/terraform/tutorials/state/resource-targeting
- HashiCorp Terraform `terraform_remote_state` data source: https://developer.hashicorp.com/terraform/language/state/remote-state-data
- Terraform AWS provider `aws_db_instance` resource documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/db_instance
- Terraform AWS provider `aws_s3_bucket_versioning` resource documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/s3_bucket_versioning
- Terraform AWS provider `aws_instance` resource documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/instance
- Terraform AWS provider `aws_s3_bucket` resource documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/s3_bucket
- Amazon S3 `PutBucketVersioning` API documentation: https://docs.aws.amazon.com/AmazonS3/latest/API/API_PutBucketVersioning.html
- Amazon EC2 termination protection documentation: https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/Using_ChangingDisableAPITermination.html

## Issues Found
- The `aws_db_instance` examples were missing `allocated_storage`, which is required unless creating from a snapshot or replica. Added `allocated_storage = 100` to each standalone RDS example.
- The introduction said `terraform destroy` tears down everything in the state file. Clarified that it destroys objects managed by the current configuration and state.
- The article claimed it covered every approach. Changed this to common approaches to avoid an inaccurate completeness claim.
- The `prevent_destroy` limitations implied no other resources can be destroyed while the setting exists. Clarified that any destroy plan including the protected resource fails, while unrelated resources can still be targeted separately.
- The `-target` section implied only targeted resources are ever affected. Clarified that Terraform includes targeted addresses and dependencies and that the resulting plan is partial.
- The state removal section did not mention that later normal plans can try to recreate forgotten resources if the configuration remains. Added that caveat.
- The selective destroy script built a shell string of targets, which is fragile for resource addresses containing brackets or quotes. Changed it to use a Bash array.
- The selective destroy script used broad prefix matching for protected resources, which could skip unrelated resources with similar address prefixes. Tightened matching to the exact address or indexed instances.
- The selective destroy script could run an unscoped `terraform destroy` if there were no unprotected targets. Added an empty-target guard.
- The S3 MFA Delete example set `mfa_delete = "Enabled"` without the AWS provider `mfa` argument required when enabling MFA Delete. Added `mfa = var.mfa_delete_token` and clarified the inline comment to refer to permanent version deletes.

## Review Notes
Terraform was not installed in the local environment, so command verification used official HashiCorp and provider documentation rather than local CLI help output.
