# Validation Summary: How to Use Template Files in OpenTofu

## Status
validated

## Post Type
Tutorial / guide

## Technologies Covered
- OpenTofu `templatefile()` function
- OpenTofu HCL string templates, interpolation, loops, conditionals, and heredocs
- AWS provider resources: `aws_instance`, `aws_ssm_parameter`, `aws_s3_bucket_policy`, and `aws_elasticache_cluster`
- EC2 user data shell scripts
- JSON, YAML, and Nginx configuration templates

## Sources Consulted
- OpenTofu `templatefile` function documentation: https://opentofu.org/docs/language/functions/templatefile/
- OpenTofu strings and templates documentation: https://opentofu.org/docs/language/expressions/strings/
- OpenTofu references to named values documentation: https://opentofu.org/docs/language/expressions/references/
- HashiCorp Template provider deprecation documentation: https://registry.terraform.io/providers/hashicorp/template/latest/docs
- AWS provider `aws_ssm_parameter` resource documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/ssm_parameter
- AWS provider `aws_s3_bucket_policy` resource documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/s3_bucket_policy
- AWS provider `aws_elasticache_cluster` resource documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/elasticache_cluster
- AWS IAM JSON policy grammar documentation: https://docs.aws.amazon.com/IAM/latest/UserGuide/reference_policies_grammar.html

## Issues Found
- The SSM Parameter example passed `enable_cache = var.environment == "prod"` while computing `cache_endpoint` from `var.enable_cache`. If those values diverged, the rendered YAML could include an empty cache host or omit a configured cache. Changed `enable_cache` to use `var.enable_cache` so the template condition matches the endpoint expression.
- The S3 bucket policy template included `// templates/s3-policy.json.tpl` inside the JSON template. Because `templatefile()` emits the template contents and the bucket policy must be valid JSON after rendering, that comment would make the rendered policy invalid. Removed the comment line from the JSON template.

## Review Notes
- OpenTofu recommends the `*.tftpl` suffix for template files, but `.tpl` remains valid.
- OpenTofu documentation recommends `jsonencode` and `yamlencode` for generated JSON or YAML to avoid manual escaping and delimiter issues. The post's examples are valid after the fixes, but an encode-based version would be more robust in a future revision.
