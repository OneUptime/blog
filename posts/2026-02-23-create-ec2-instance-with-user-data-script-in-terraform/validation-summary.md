# Validation Summary: How to Create EC2 Instance with User Data Script in Terraform

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Terraform
- AWS Provider for Terraform
- Amazon EC2
- EC2 user data
- cloud-init
- AWS Systems Manager Parameter Store
- AWS CLI
- Bash

## Sources Consulted
- Terraform AWS Provider `aws_instance` documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/instance
- Terraform AWS Provider `aws_launch_template` documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/launch_template
- Terraform `templatefile` function documentation: https://developer.hashicorp.com/terraform/language/functions/templatefile
- Terraform strings and templates documentation: https://developer.hashicorp.com/terraform/language/expressions/strings
- Terraform Cloud-init Provider `cloudinit_config` documentation: https://registry.terraform.io/providers/hashicorp/cloudinit/latest/docs/data-sources/config
- Amazon EC2 user data documentation: https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/user-data.html
- Amazon EC2 instance metadata documentation: https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/instancedata-data-retrieval.html
- cloud-init user-data formats documentation: https://cloudinit.readthedocs.io/topics/format.html
- cloud-init log file documentation: https://docs.cloud-init.io/en/25.1/reference/user_files.html
- AWS CLI `ssm get-parameter` documentation: https://docs.aws.amazon.com/cli/latest/reference/ssm/get-parameter.html

## Issues Found
- The post said changing `user_data` forces Terraform to destroy and recreate an `aws_instance` by default. Current Terraform AWS Provider documentation says user data changes trigger a stop/start by default, and replacement happens only when `user_data_replace_on_change = true`. Updated the explanation and example.
- The bootstrap script copied files into `/opt/app` before creating that directory. Added `mkdir -p /opt/app` before writing configuration files there.
- The debugging command for reading instance user data used an IMDSv1-only `curl` request. Updated it to use an IMDSv2 token, which works when IMDSv2 is required.

## Review Notes
- The SSM Parameter Store example keeps secrets out of EC2 user data, which is correct. If the secret value is created by Terraform as shown, teams should still protect Terraform state because provider documentation notes that `SecureString` values can be stored in state.
- The first example uses a fixed AMI ID, which is common in short examples but region-specific and time-sensitive. A data source or SSM public parameter is more portable for production code.
