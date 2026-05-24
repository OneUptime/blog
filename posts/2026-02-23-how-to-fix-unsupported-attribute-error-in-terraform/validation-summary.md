# Validation Summary: How to Fix Unsupported Attribute Error in Terraform

## Status
validated

## Post Type
Troubleshooting guide / Tutorial

## Technologies Covered
- Terraform (HCL)
- AWS provider for Terraform (`hashicorp/aws`)
- `terraform` CLI (`plan`, `console`, `state show`, `init -upgrade`)
- AWS resources used as examples: `aws_vpc`, `aws_subnet`, `aws_instance`, `aws_s3_bucket`, `aws_s3_bucket_versioning`, `aws_ami` (data source)

## Sources Consulted
- Terraform AWS provider `aws_s3_bucket` resource docs: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/s3_bucket
- HashiCorp blog "Terraform AWS Provider 4.0 Refactors S3 Bucket Resource": https://www.hashicorp.com/en/blog/terraform-aws-provider-4-0-refactors-s3-bucket-resource
- Terraform AWS provider `aws_s3_bucket_versioning` resource docs: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/s3_bucket_versioning
- Terraform `keys()` function docs: https://developer.hashicorp.com/terraform/language/functions/keys
- Terraform type constraints (objects vs maps): https://developer.hashicorp.com/terraform/language/expressions/type-constraints
- Terraform references to values: https://developer.hashicorp.com/terraform/language/expressions/references
- Terraform AWS provider `aws_instance` docs: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/instance
- HashiCorp blog "Terraform 0.12 Generalized Splat Operator": https://www.hashicorp.com/en/blog/terraform-0-12-generalized-splat-operator

## Issues Found
1. **Cause 4 example made a false historical claim.** The post stated that the `arn` attribute on `aws_s3_bucket` "was added in AWS provider v4.x" and "might not [work] in v3.x". In reality, `arn` has been an exported attribute on `aws_s3_bucket` since very early provider versions (v1.x) and was unaffected by the v4.0 refactor. Replaced the example with `aws_s3_bucket_versioning.example.versioning_configuration[0].status`, since `aws_s3_bucket_versioning` was actually introduced in AWS provider v4.0 and is a genuinely accurate illustration of the version-availability problem.
2. **Broken `keys()` example in the debugging section.** The post recommended `keys(aws_vpc.main)` in `terraform console` to list attribute names. `keys()` accepts a `map`, but resource references are structural object types with heterogeneous attribute types (string, bool, list, etc.), which cannot be implicitly converted to a map — so this call errors. Replaced the line with a working alternative that suggests inspecting a specific attribute (`aws_vpc.main.id`) after printing the full object reference.

## Review Notes
- Cause 7 correctly describes the AWS provider v4.0 S3 refactor (the inline `versioning` block and `acl` argument were deprecated and moved to dedicated `aws_s3_bucket_versioning` / `aws_s3_bucket_acl` resources). Note that those deprecated inline arguments were removed entirely in AWS provider v5.0, so on v5.x they now produce a different error (unsupported argument on the input side) rather than the "Unsupported attribute" error discussed here. Not strictly inaccurate, but readers on v5.x should know the inline form is no longer accepted.
- Cause 6's `root_block_device[0].volume_size` is correct, though strictly `root_block_device` is exported as a list of objects on read; the `[0]` indexing form shown is the standard idiom.
- The splat (`aws_subnet.private[*].id`) and `for` map comprehension (`{ for k, v in aws_subnet.private : k => v.id }`) examples are correct and idiomatic.
- The closing recommendation to `terraform init -upgrade` after bumping provider constraints is correct.
