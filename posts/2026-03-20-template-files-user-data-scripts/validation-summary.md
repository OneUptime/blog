# Validation Summary: How to Use Template Files for User Data Scripts in OpenTofu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTofu
- Terraform-compatible HCL
- AWS EC2 user data
- AWS Launch Templates
- cloud-init
- Bash

## Sources Consulted
- OpenTofu `templatefile` function documentation: https://opentofu.org/docs/language/functions/templatefile/
- OpenTofu strings and templates documentation: https://opentofu.org/docs/language/expressions/strings/
- OpenTofu `base64encode` function documentation: https://opentofu.org/docs/language/functions/base64encode/
- HashiCorp AWS provider `aws_launch_template` resource documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/launch_template
- AWS EC2 user data documentation: https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/user-data.html
- AWS EC2 Launch Template API documentation: https://docs.aws.amazon.com/AWSEC2/latest/APIReference/API_RequestLaunchTemplateData.html
- cloud-init package update/install examples: https://docs.cloud-init.io/en/latest/reference/yaml_examples/package_update_upgrade.html
- cloud-init write_files examples: https://docs.cloud-init.io/en/latest/reference/yaml_examples/write_files.html
- cloud-init boot command examples: https://docs.cloud-init.io/en/latest/reference/yaml_examples/boot_cmds.html
- HashiCorp support note on the deprecated template provider: https://support.hashicorp.com/hc/en-us/articles/6661229902355-Hashicorp-template-has-no-version-for-Apple-Mac-M1

## Issues Found
- The description said the post used the template provider, but the post only uses the built-in `templatefile` function. The template provider is deprecated and superseded by `templatefile`, so the provider mention was removed.
- The Bash user data template wrote to `/etc/myapp/config.env` without creating `/etc/myapp`. With `set -e`, that redirection would fail on a fresh instance if the directory did not already exist. Added `mkdir -p /etc/myapp` before writing the file.
- The launch template example reused `templates/user_data.sh.tpl` but only passed `app_version` and `environment`, while the template also references `db_endpoint` and `s3_bucket`. Added the missing variables so `templatefile` can render successfully.

## Review Notes
The cloud-init example was schema-validated after rendering representative values. OpenTofu/Terraform CLI tooling was not installed locally, so HCL snippets were reviewed against official documentation rather than locally validated. OpenTofu recommends `*.tftpl` as the naming convention for template files, but the `.tpl` filenames in the post are still valid.
