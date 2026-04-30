# Validation Summary: How to Fix 'Error: Unsupported Attribute' in OpenTofu

## Status
validated

## Post Type
Guide

## Technologies Covered
- OpenTofu CLI
- OpenTofu configuration language (HCL)
- OpenTofu modules, resources, data sources, and outputs
- AWS provider for OpenTofu/Terraform-compatible providers
- `jq`

## Sources Consulted
- OpenTofu docs: `tofu providers schema` - https://opentofu.org/docs/cli/commands/providers/schema/
- OpenTofu docs: provider requirements - https://opentofu.org/docs/language/providers/requirements/
- OpenTofu docs: references to named values - https://opentofu.org/docs/v1.9/language/expressions/references/
- OpenTofu docs: `count` meta-argument - https://opentofu.org/docs/v1.11/language/meta-arguments/count/
- OpenTofu docs: `for_each` meta-argument - https://opentofu.org/docs/v1.11/language/meta-arguments/for_each/
- OpenTofu docs: output values - https://opentofu.org/docs/v1.9/language/values/outputs/
- OpenTofu docs: data sources - https://opentofu.org/docs/v1.11/language/data-sources/
- OpenTofu docs: `tofu init` - https://opentofu.org/docs/v1.8/cli/commands/init/
- AWS provider docs: `aws_vpc` - https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/vpc
- AWS provider docs: `aws_lb` - https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/lb
- AWS provider docs: `aws_acm_certificate_validation` - https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/acm_certificate_validation

## Issues Found
- The introduction said unsupported attribute errors can be caused by "referencing computed attributes before they are known." OpenTofu documents unknown values as deferred/unknown during planning, not as unsupported attributes. I replaced that with accurate causes: treating collections as single objects and referencing undefined module outputs.
- The first "Common Error Forms" example mixed `Error: Unsupported attribute` with an `Unsupported argument` message. I corrected the example so the message matches an actual missing attribute reference on `aws_vpc.main.subnet_id`.
- The second "Common Error Forms" example claimed `aws_acm_certificate.main.arn` was unsupported, which is incorrect in AWS provider docs and validation workflows. I changed it to `aws_acm_certificate_validation.main.arn`, which is the invalid attribute, while `certificate_arn` is the correct reference used in the provider docs.
- The `tofu providers schema -json | jq ...` example used `provider_schemas["registry.opentofu.org/hashicorp/aws"]`. OpenTofu's schema docs show that `provider_schemas` keys are provider type names such as `aws`, so I corrected the query to `provider_schemas["aws"]`.
- The "Common attribute confusions" table included incorrect mappings such as `aws_acm_certificate.main.arn -> aws_acm_certificate_validation.main.certificate_arn`, `aws_db_instance.main.endpoint -> aws_db_instance.main.address`, and `aws_s3_bucket.main.bucket_domain_name -> aws_s3_bucket.main.bucket_regional_domain_name`. I removed the invalid equivalences and replaced them with examples supported by the official docs.
- The section on `count` and `for_each` treated both as lists. OpenTofu documents `count` references as lists and `for_each` references as maps, so I corrected the explanation and example comments to use indexing for `count` and keys for `for_each`.
- The "Wrong Object Type" section implied a resource/data source prefix mismatch is an unsupported attribute case. OpenTofu typically reports those as undeclared resource/data source errors instead, so I added a clarification note without changing the section's intent.

## Review Notes
The local workspace did not have the `tofu` CLI installed, so command verification was performed against official OpenTofu documentation rather than local `--help` output. Provider attribute availability remains version-specific, which the post now correctly calls out in the provider-version section.
