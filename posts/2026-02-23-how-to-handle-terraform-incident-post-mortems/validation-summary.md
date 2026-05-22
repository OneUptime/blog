# Validation Summary: How to Handle Terraform Incident Post-Mortems

## Status
validated

## Post Type
Guide

## Technologies Covered
- Terraform
- Terraform state and S3 backend locking
- AWS CLI
- Amazon S3
- Amazon DynamoDB
- AWS CloudTrail
- GitHub CLI
- Python
- YAML

## Sources Consulted
- Terraform S3 backend documentation: https://developer.hashicorp.com/terraform/language/backend/s3
- Terraform state documentation: https://developer.hashicorp.com/terraform/language/state
- Terraform moved block and refactoring documentation: https://developer.hashicorp.com/terraform/language/modules/develop/refactoring
- Terraform lifecycle meta-argument documentation: https://developer.hashicorp.com/terraform/language/meta-arguments/lifecycle
- Terraform remove resource from state documentation: https://developer.hashicorp.com/terraform/language/state/remove
- AWS CLI s3api list-object-versions documentation: https://docs.aws.amazon.com/cli/latest/reference/s3api/list-object-versions.html
- AWS CLI dynamodb query documentation: https://docs.aws.amazon.com/cli/latest/reference/dynamodb/query.html
- AWS CLI cloudtrail lookup-events documentation: https://docs.aws.amazon.com/cli/latest/reference/cloudtrail/lookup-events.html
- GitHub CLI gh run list manual: https://cli.github.com/manual/gh_run_list

## Issues Found
- The post recommended DynamoDB locking for all Terraform state operations. Current Terraform S3 backend documentation marks DynamoDB-based locking as deprecated and recommends S3 state locking with `use_lockfile`. Updated the recommendation to prefer S3 state locking while noting DynamoDB locking only for older Terraform versions that require it.
- The investigation script described querying DynamoDB lock "history", but Terraform's DynamoDB lock table contains the current lock item and is not an audit history by itself. Updated the comments and output label to describe checking the current lock record for deployments still using deprecated DynamoDB locking.
- The state-diff Python script keyed resources only by module/type/name, which collapses multiple `count` or `for_each` instances of the same resource. Updated it to build Terraform-style instance addresses using `index_key`, preserving distinct resource instances.

## Review Notes
- Python snippets were syntax-checked after the README changes.
- The local environment did not have `terraform` or `aws` installed, so Terraform and AWS CLI behavior was verified against official documentation instead of local `--help` output. GitHub CLI syntax was checked locally and against the official manual.
