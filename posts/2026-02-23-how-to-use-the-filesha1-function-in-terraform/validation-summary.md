# Validation Summary: How to Use the filesha1 Function in Terraform

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform
- Terraform HCL functions: `filesha1`, `sha1`, `filemd5`, `filesha256`, `fileset`, `file`, `substr`, `join`, `values`, `distinct`, `merge`
- AWS Terraform Provider resources: `aws_ssm_parameter`, `aws_codedeploy_deployment_group`, `aws_s3_object`, `aws_sqs_queue`, `aws_instance`, `aws_ecs_task_definition`
- SHA-1, MD5, and SHA-256 hashing
- Git object hashes

## Sources Consulted
- Terraform `filesha1` function reference: https://docs.hashicorp.com/terraform/language/functions/filesha1
- Terraform built-in functions reference: https://developer.hashicorp.com/terraform/language/functions
- Terraform `fileset` function reference: https://developer.hashicorp.com/terraform/language/functions/fileset
- HashiCorp AWS Provider `aws_s3_object` resource documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/s3_object
- HashiCorp AWS Provider `aws_codedeploy_deployment_group` resource documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/codedeploy_deployment_group
- Git `git init` documentation for `--object-format`: https://git-scm.com/docs/git-init

## Issues Found
- The introduction said SHA-1 is the algorithm Git uses for commit and object hashes. Git still defaults to SHA-1, but current Git also supports SHA-256 repositories via `--object-format=sha256`, so the wording was updated to mention SHA-1 as the default.
- The MD5 comparison and summary said MD5 is used by S3 ETags. AWS S3 ETags are not always MD5 digests, and the Terraform AWS Provider documents caveats for `etag`, so the wording was narrowed to "often used for simple S3 ETag change detection."
- The CodeDeploy example claimed script changes would trigger redeployment and used `ec2_tag_set` as if it tagged the deployment group. In the AWS provider, `ec2_tag_set` selects deployment target instances. The example was changed to use the deployment group's `tags` argument and the surrounding wording now describes tracking metadata instead of triggering redeployment.
- The important notes said `filesha1` reads files at plan time. Terraform filesystem functions are evaluated during configuration evaluation and require files to already exist before Terraform takes actions. The note was updated to match the Terraform documentation.

## Review Notes
Terraform is not installed in this workspace, so the examples were not executed with `terraform validate`. The snippets were reviewed manually against official Terraform language documentation and relevant AWS provider resource documentation.
