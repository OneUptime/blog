# Validation Summary: How to Use count and for_each with Data Sources in OpenTofu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTofu / Terraform (HCL)
- `count` and `for_each` meta-arguments
- Data sources: `aws_ami`, `aws_s3_bucket`, `aws_route53_zone`, `aws_secretsmanager_secret_version`, `aws_iam_policy`
- Resources: `aws_route53_record`, `aws_iam_role_policy_attachment`
- Splat expressions and for-expressions

## Sources Consulted
- OpenTofu meta-arguments documentation: https://opentofu.org/docs/language/meta-arguments/count/ and https://opentofu.org/docs/language/meta-arguments/for_each/
- Terraform `provider` meta-argument: https://developer.hashicorp.com/terraform/language/meta-arguments/resource-provider
- Terraform `for_each` meta-argument: https://developer.hashicorp.com/terraform/language/meta-arguments/for_each
- Terraform splat expressions: https://developer.hashicorp.com/terraform/language/expressions/splat
- AWS provider data source docs (Terraform Registry): `aws_ami`, `aws_route53_zone`, `aws_secretsmanager_secret_version`, `aws_iam_policy`, `aws_s3_bucket`

## Issues Found
1. **Invalid dynamic provider selection in the `count` example.** The original first example included `provider = aws.by_region[count.index]` to "use provider aliased per region." This is not valid OpenTofu/Terraform — the `provider` meta-argument requires a static reference to a configured provider; dynamic expressions that depend on `count.index` (or `each.key`) are not permitted. The example would fail to parse/plan. Replaced the example with a `count`-driven AMI lookup that uses `count.index` to select a name-pattern from a list (a meaningful and valid use of `count` with a data source). Variable name and resource label were updated accordingly so the rest of the example remains coherent.

## Review Notes
- All other examples were verified to be syntactically valid and to use real AWS provider arguments and attributes (`aws_s3_bucket.bucket`/`.arn`, `aws_route53_zone.name`/`.private_zone`/`.zone_id`, `aws_secretsmanager_secret_version.secret_id`/`.secret_string`, `aws_iam_policy.arn`).
- `each.key` equaling the string value when `for_each` is a set, and `data.type.name[*].attr` splat expression on count-indexed data sources, are both correct.
- The post correctly notes that `for_each` is generally preferred over `count` for stable keying — this is consistent with HashiCorp/OpenTofu guidance.
- No version-specific caveats were necessary; the syntax shown is valid for current OpenTofu (1.x) and Terraform (1.x) releases.
