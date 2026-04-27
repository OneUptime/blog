# Validation Summary: How to Pass Data to Provisioner Scripts in OpenTofu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTofu (HCL configuration language)
- Terraform AWS Provider (`aws_instance`, `aws_db_instance`, `aws_s3_bucket`, `aws_elasticache_cluster`)
- HashiCorp Local Provider (`local_file`)
- `null_resource`
- Provisioners: `local-exec`, `remote-exec`, `file`
- `templatefile()` and `jsonencode()` functions
- Bash scripting

## Sources Consulted
- OpenTofu `local-exec` provisioner docs: https://opentofu.org/docs/language/resources/provisioners/local-exec/
- OpenTofu `file` provisioner docs: https://opentofu.org/docs/language/resources/provisioners/file/
- Terraform AWS Provider — `aws_instance` attribute reference: https://github.com/hashicorp/terraform-provider-aws/blob/main/website/docs/r/instance.html.markdown and https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/instance
- HashiCorp Local Provider — `local_file` attribute reference: https://github.com/hashicorp/terraform-provider-local/blob/main/docs/resources/file.md

## Issues Found
- **`self.vpc_id` is not an exported attribute of `aws_instance`.** The "Accessing Self Attributes" section listed `VPC_ID = self.vpc_id`, but the AWS provider does not export `vpc_id` on `aws_instance`. To obtain a VPC ID one must look it up via the subnet or network interface. Replaced the line with `ARN = self.arn`, which is documented as an exported attribute, preserving the structure of the example while keeping it technically accurate.

## Review Notes
- All other `self.*` references checked are valid: `id`, `public_ip`, `private_ip`, `public_dns`, `private_dns`, `subnet_id`, `instance_type`, and `instance_state` are either documented exported attributes or arguments accessible via `self`.
- `local_file.content_md5` is a valid read-only attribute exported by the HashiCorp Local provider.
- Cross-resource references (`aws_db_instance.main.address`, `aws_db_instance.main.port`, `aws_db_instance.main.endpoint`, `aws_elasticache_cluster.main.cache_nodes[0].address`, `aws_s3_bucket.assets.bucket`) are all valid attributes of their respective AWS provider resources.
- The `templatefile()` syntax, `local-exec` `environment` block, and `file` provisioner with a `connection` block are all correct.
- HashiCorp's broader guidance is to treat provisioners as a last resort (cloud-init / user_data, configuration management tools, or AMI baking are usually preferable). The post does not mention this, but doing so was outside the scope of fixing technical errors.
