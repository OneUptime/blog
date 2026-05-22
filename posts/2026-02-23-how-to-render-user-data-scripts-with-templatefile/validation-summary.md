# Validation Summary: How to Render User Data Scripts with templatefile

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Terraform `templatefile`
- Terraform string templates, interpolation, directives, and strip markers
- AWS EC2 user data
- AWS launch templates
- Cloud-init cloud-config YAML
- Bash bootstrap scripts

## Sources Consulted
- HashiCorp Terraform `templatefile` function documentation: https://developer.hashicorp.com/terraform/language/functions/templatefile
- HashiCorp Terraform strings and templates documentation: https://developer.hashicorp.com/terraform/language/expressions/strings
- HashiCorp Terraform `abspath` function documentation for relative path behavior: https://developer.hashicorp.com/terraform/language/functions/abspath
- Terraform AWS Provider `aws_instance` resource documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/instance
- Terraform AWS Provider `aws_launch_template` resource documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/launch_template
- AWS EC2 user data documentation: https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/user-data.html
- Cloud-init module reference for `runcmd`: https://docs.cloud-init.io/en/latest/reference/modules.html

## Issues Found
- The post said the `templatefile` path is relative to the root module directory. Updated this to explain that relative paths are resolved against the current working directory and that `${path.module}` should be used for module-relative templates.
- The first EC2 example used a hardcoded AMI ID. Replaced it with `var.ami_id` because AMI IDs are region-specific and become stale.
- The pitfalls section said `$HOME` and `$(command)` must be escaped. Corrected this because Terraform template interpolation starts with `${`, so only shell forms like `${HOME}` need escaping as `$${HOME}`.
- The pitfalls section said every variable in the vars map must be used and that unused vars can error in older versions. Replaced this with the correct requirement: every variable referenced by the template must be present in the vars map.
- Added a short caveat that complex YAML should be rendered with `yamlencode` where practical, matching HashiCorp's guidance for avoiding invalid JSON/YAML from manual template escaping.

## Review Notes
Terraform was not installed in the local workspace, so validation was performed against official HashiCorp, AWS, and cloud-init documentation rather than local `terraform validate` or `terraform console` checks. The examples are illustrative and still omit surrounding Terraform declarations such as variables, provider configuration, security groups, and database resources.
