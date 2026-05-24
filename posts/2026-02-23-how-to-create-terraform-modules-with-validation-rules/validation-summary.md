# Validation Summary: How to Create Terraform Modules with Validation Rules

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform (variable validation, preconditions, postconditions, check blocks, test framework)
- HCL (HashiCorp Configuration Language)
- AWS provider for Terraform (aws_db_instance, aws_subnet, aws_ecs_service, aws_vpc, aws_acm_certificate)

## Sources Consulted
- Terraform Custom Conditions docs: https://developer.hashicorp.com/terraform/language/expressions/custom-conditions
- Terraform Checks docs: https://developer.hashicorp.com/terraform/language/checks
- Terraform Tests docs: https://developer.hashicorp.com/terraform/language/tests
- HashiCorp blog on Terraform 1.9 enhanced variable validations: https://www.hashicorp.com/en/blog/terraform-1-9-enhances-input-variable-validations
- AWS provider `aws_subnet` resource: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/subnet
- AWS provider `aws_subnet` data source: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/data-sources/subnet
- AWS provider `aws_db_instance` resource: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/db_instance
- AWS provider `aws_acm_certificate` data source: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/data-sources/acm_certificate
- AWS S3 bucket naming rules: https://docs.aws.amazon.com/AmazonS3/latest/userguide/bucketnamingrules.html

## Issues Found

1. **Incorrect attribute on `aws_subnet` resource postcondition.** The original example used `self.available_ip_address_count` inside a postcondition on the `aws_subnet` resource. That attribute is only exposed on the `aws_subnet` **data source**, not on the resource (the AWS API does not return it on create/update — see hashicorp/terraform-provider-aws#11493). Reworked the example so the resource creates the subnet and a companion `data "aws_subnet" "verify"` block looks it up and asserts on `available_ip_address_count` in its own postcondition. Added a short comment explaining why.

2. **Outdated claim about variable validation cross-references.** The post said "Variable validation blocks can only reference the variable they are attached to." This was true before Terraform 1.9 but was relaxed in Terraform 1.9 (June 2024), which allows validation conditions to reference other variables, locals, data sources, and resources in the same module. Updated the paragraph to call out the version difference while preserving the rationale for still using `precondition` blocks for resource-state-dependent checks.

## Review Notes
- The AWS region regex (`^[a-z]{2}-(north|south|east|west|central|northeast|southeast|northwest|southwest)-[0-9]$`) is presented as illustrative. It does not match AWS GovCloud regions (`us-gov-west-1`, `us-gov-east-1`) which have a three-segment prefix, and currently AWS does not use `northwest` or `southwest` in any region name. Left as-is because the post frames this as a sample validation library rather than an exhaustive AWS region matcher.
- The two `app_port` validations interact such that effectively only ports 1024-65535 will be accepted (the first allows 1-65535, the second requires >=1024). This is intentional per the error messages and is fine — both validation blocks must pass.
- The post does not mention the S3 bucket name rule that bucket names cannot be formatted as IPv4 addresses. The provided regex still allows IP-address-shaped strings. Not corrected because the post explicitly frames the validation as a starting point ("AWS naming rules") and not an exhaustive check.
- The Terraform test framework (`.tftest.hcl`) became generally available in Terraform 1.6. Worth noting for readers on older Terraform versions, but not flagged in-post since the syntax used is correct.
- `aws_db_instance.status` (used in the postcondition) is correctly exposed as a computed attribute on the resource.
- ACM data source `not_after` is exposed since AWS provider v4.0.0 (Feb 2022); the `cert_expiry` check example is accurate.
