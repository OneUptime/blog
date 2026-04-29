# Validation Summary: How to Migrate AWS Infrastructure from CloudFormation to OpenTofu

## Status
validated

## Post Type
Guide / Tutorial

## Technologies Covered
- AWS CloudFormation
- AWS CLI
- OpenTofu
- HCL
- Terraform AWS provider resource imports
- AWS resources used as examples: S3 buckets, S3 bucket versioning, VPCs, and security groups

## Sources Consulted
- OpenTofu import blocks: https://opentofu.org/docs/language/import/
- OpenTofu configuration generation for imports: https://opentofu.org/docs/v1.11/language/import/generating-configuration/
- OpenTofu `plan` command: https://opentofu.org/docs/cli/commands/plan/
- AWS CLI `list-stacks`: https://docs.aws.amazon.com/cli/latest/reference/cloudformation/list-stacks.html
- AWS CLI `list-stack-resources`: https://docs.aws.amazon.com/cli/latest/reference/cloudformation/list-stack-resources.html
- AWS CLI `get-template`: https://docs.aws.amazon.com/cli/latest/reference/cloudformation/get-template.html
- AWS CLI `update-termination-protection`: https://docs.aws.amazon.com/cli/latest/reference/cloudformation/update-termination-protection.html
- AWS CLI `delete-stack`: https://docs.aws.amazon.com/cli/latest/reference/cloudformation/delete-stack.html
- AWS CloudFormation `DeletionPolicy`: https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/aws-attribute-deletionpolicy.html
- AWS CloudFormation `Ref`: https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/intrinsic-function-reference-ref.html
- AWS CloudFormation `Fn::GetAtt`: https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/intrinsic-function-reference-getatt.html
- Terraform Registry `aws_s3_bucket`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/s3_bucket
- Terraform Registry `aws_s3_bucket_versioning`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/s3_bucket_versioning
- Terraform Registry `aws_vpc`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/vpc
- Terraform Registry `aws_security_group`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/security_group

## Issues Found
- The original decommissioning step used `aws cloudformation delete-stack --retain-resources ...` as if it were the normal way to keep resources during migration. AWS documents `--retain-resources` for stacks already in `DELETE_FAILED`, not as a general "retain everything" migration workflow. I replaced that guidance with the documented `DeletionPolicy: Retain` approach before deleting the stack.
- The VPC import example used `id = "my-app-vpc"`, but the AWS provider imports `aws_vpc` resources by VPC ID such as `vpc-...`. I corrected the example to use a valid VPC ID format.
- The post defined `aws_s3_bucket_versioning.app_data` in HCL but did not import it. Because S3 bucket versioning is managed as a separate provider resource, I added the missing import block so the example matches the configuration being managed.
- The CloudFormation-to-OpenTofu mapping table overstated the `Ref` and `Conditions` translations. I updated `Ref` to note that it maps to resource-specific attributes or variable values, and `Conditions` to point to `count`/`for_each` or conditional expressions.
- The CloudFormation-to-OpenTofu mapping table was fenced as `hcl` even though it was explanatory text rather than valid HCL. I changed that block to `text` so the post's code fences remain syntactically accurate.
- The `Fn::Sub` example manually reconstructed an S3 bucket ARN from the bucket name. I changed it to use the provider's `arn` attribute directly, which is the clearer OpenTofu equivalent.
- The first `list-stacks` example was labeled as listing all stacks but filtered to only `CREATE_COMPLETE` and `UPDATE_COMPLETE`. I updated the query so the command no longer drops other non-deleted stack states from the inventory.
- The nested-stack note said to decommission in reverse order of creation. I changed that to "leaf to root" because dependency order is the relevant rule.
- The summary mentioned `tofu plan -generate-config-out` without noting that OpenTofu documents this workflow as experimental. I updated the summary to use the exact `-generate-config-out=generated.tf` form and to note the experimental status.

## Review Notes
- The post is now technically sound, but real-world AWS migrations usually need more provider-specific imports than the examples show. For example, S3 features such as ACLs, bucket policies, lifecycle configuration, and public access blocks are often modeled as separate AWS provider resources and may need separate import blocks if they are managed in OpenTofu.
- OpenTofu's generated configuration workflow is useful for bootstrapping, but the official docs explicitly describe it as experimental and recommend reviewing the generated HCL before applying it.
