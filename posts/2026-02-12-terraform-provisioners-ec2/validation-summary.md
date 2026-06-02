# Validation Summary: How to Use Terraform Provisioners with EC2 (and Why You Should Avoid Them)

## Status
validated

## Post Type
Tutorial / technical guide

## Technologies Covered
- Terraform provisioners
- Terraform AWS provider
- Amazon EC2
- EC2 user data and cloud-init
- AWS Systems Manager Run Command
- AWS CLI
- Packer
- Ansible

## Sources Consulted
- HashiCorp Terraform provisioners documentation: https://developer.hashicorp.com/terraform/language/provisioners
- HashiCorp Terraform resource block reference for provisioner arguments: https://developer.hashicorp.com/terraform/language/block/resource
- HashiCorp Terraform `pathexpand` function documentation: https://developer.hashicorp.com/terraform/language/functions/pathexpand
- HashiCorp Terraform `terraform_data` resource documentation: https://developer.hashicorp.com/terraform/language/resources/terraform-data
- HashiCorp null provider migration guide for `terraform_data`: https://registry.terraform.io/providers/hashicorp/null/latest/docs/guides/terraform-migration
- HashiCorp AWS provider `aws_instance` documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/instance
- AWS EC2 user data documentation: https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/user-data.html
- AWS CLI `ssm send-command` command reference: https://docs.aws.amazon.com/cli/latest/reference/ssm/send-command.html

## Issues Found
- The examples used `file("~/.ssh/deploy-key")` for SSH private keys. Terraform's `file()` function does not itself expand the `~` home directory shorthand; HashiCorp documents `pathexpand()` for this use case in connection and provisioner blocks. Updated the examples to use `file(pathexpand("~/.ssh/deploy-key"))`.
- The `file` provisioner directory upload copied `${path.module}/scripts/` to `/tmp/scripts` over SSH without ensuring the destination directory exists. Terraform's documentation says SSH directory upload destinations must already exist. Added a preceding `remote-exec` provisioner to run `mkdir -p /tmp/scripts`.
- The Slack `local-exec` example interpolated `var.slack_webhook` directly into a shell command. Terraform recommends using the `environment` argument for variable substitution in `local-exec` commands to reduce shell injection risk. Updated the command to read `$SLACK_WEBHOOK` from `environment` and added a JSON content type header.
- The detached provisioner examples used `null_resource`. Terraform 1.4 and later provide `terraform_data` as the built-in replacement for this pattern. Updated both examples to use `terraform_data` with `triggers_replace`.
- The SSM example used `md5(file(...))` for a file change trigger. This works, but `filesha256()` is a clearer current filesystem hash function for tracking a file's contents. Updated the trigger to `filesha256("${path.module}/configs/app.conf")`.

## Review Notes
- The article's core guidance is consistent with Terraform documentation: provisioners should be used only after exhausting alternatives because Terraform cannot predictably model their behavior.
- The SSM Run Command example is syntactically consistent with AWS CLI documentation, but a production EC2 instance also needs the SSM Agent, an instance profile with the required Systems Manager permissions, and network access to Systems Manager endpoints.
- `terraform` was not installed in the local environment, so I could not run `terraform validate`; the HCL snippets were reviewed manually against the official documentation.
