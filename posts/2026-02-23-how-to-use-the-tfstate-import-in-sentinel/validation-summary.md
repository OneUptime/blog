# Validation Summary: How to Use the tfstate Import in Sentinel

## Status
validated

## Post Type
Technical guide / tutorial

## Technologies Covered
- HashiCorp Sentinel
- Sentinel Terraform imports: `tfstate/v2`, `tfplan/v2`, and `tfrun`
- Terraform state and plan data
- Terraform AWS Provider resources
- Policy as code

## Sources Consulted
- HashiCorp Sentinel `tfstate/v2` import documentation: https://developer.hashicorp.com/sentinel/docs/features/terraform/tfstate-v2
- HashiCorp HCP Terraform `tfplan/v2` Sentinel import documentation: https://developer.hashicorp.com/terraform/cloud-docs/policy-enforcement/import-reference/tfplan-v2
- HashiCorp HCP Terraform `tfrun` Sentinel import documentation: https://developer.hashicorp.com/terraform/cloud-docs/policy-enforcement/sentinel/import/tfrun
- HashiCorp Sentinel language specification: https://developer.hashicorp.com/sentinel/docs/language/spec
- HashiCorp Sentinel rules documentation: https://developer.hashicorp.com/sentinel/docs/language/rules
- HashiCorp Sentinel loops documentation: https://developer.hashicorp.com/sentinel/docs/language/loops
- Terraform AWS Provider `aws_s3_bucket` documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/s3_bucket
- Terraform AWS Provider `aws_s3_bucket_versioning` documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/s3_bucket_versioning
- Terraform AWS Provider `aws_security_group` documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/security_group

## Issues Found
- Code fences were labeled `python`, but the snippets are Sentinel policies. Changed them to `sentinel` to avoid misidentifying the language.
- The S3 versioning audit example used the inline `aws_s3_bucket.values.versioning` shape and an `if` statement inside an `all` expression. Current AWS provider guidance recommends `aws_s3_bucket_versioning` for versioning management, and Sentinel quantifier bodies must be boolean expressions. Updated the example to check `aws_s3_bucket_versioning` resources with expression-based Sentinel syntax.
- The tainted resource advisory example used an `if` statement and `for` statement inside a `rule`, which is invalid because a rule contains a single expression. Replaced it with an `all` expression that prints each tainted resource and still passes.
- The VPC deletion example treated all subnets in state as blockers, including subnets being deleted in the same plan. Added a `subnet_deletes` filter and excluded those addresses when checking for remaining subnets.
- The security group posture example used inline `aws_security_group` ingress blocks. The current AWS provider documentation recommends the standalone `aws_vpc_security_group_ingress_rule` resource. Updated the example to inspect those ingress rule resources and their `cidr_ipv4`, `ip_protocol`, `from_port`, and `to_port` values.

## Review Notes
The Sentinel CLI was not installed in the local environment, so examples were reviewed against official HashiCorp language and import documentation rather than executed locally. The remaining claims about `tfstate/v2` resource and output fields match the official import documentation.
