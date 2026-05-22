# Validation Summary: How to Use Dynamic Blocks with Optional Nested Blocks

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Terraform
- Terraform dynamic blocks
- Terraform type constraints and optional object attributes
- HashiCorp AWS provider
- AWS security groups
- AWS Application Load Balancers
- Amazon CloudFront

## Sources Consulted
- Terraform language documentation for dynamic blocks: https://developer.hashicorp.com/terraform/language/expressions/dynamic-blocks
- Terraform language documentation for optional object type attributes: https://developer.hashicorp.com/terraform/language/expressions/type-constraints#optional-object-type-attributes
- Terraform v1.3.0 release notes for optional object type attributes: https://github.com/hashicorp/terraform/releases/tag/v1.3.0
- Terraform AWS provider documentation for `aws_security_group`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/security_group
- Terraform AWS provider documentation for `aws_lb`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/lb
- Terraform AWS provider documentation for `aws_cloudfront_distribution`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/cloudfront_distribution
- Terraform AWS provider documentation for `aws_cloudfront_cache_policy`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/data-sources/cloudfront_cache_policy

## Issues Found
- The security group examples used inline `ingress` and `egress` blocks without mentioning that current AWS provider documentation recommends standalone `aws_vpc_security_group_ingress_rule` and `aws_vpc_security_group_egress_rule` resources for production security group rules. Added a short caveat while keeping the inline blocks as valid dynamic block examples.
- The CloudFront distribution example omitted required origin and cache behavior configuration, so the resource would not validate as written. Added a `custom_origin_config` block and a managed cache policy data source, then referenced that policy from `default_cache_behavior`.
- The post described `optional()` as a function. Terraform documentation calls it an `optional` modifier in object type constraints, so the wording was corrected.

## Review Notes
The Terraform dynamic block patterns are accurate: a `dynamic` block emits one nested block per element in its `for_each` collection, so an empty collection emits no blocks, and a one-element list is a valid boolean-toggle pattern. Optional object attributes are stable starting in Terraform 1.3. The Application Load Balancer `access_logs` example matches the AWS provider schema; in real modules, callers should validate that `logging_bucket` is non-empty when logging is enabled.
