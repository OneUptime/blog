# Validation Summary: How to Use Terraform with cloud-init for VM Bootstrap

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform
- Terraform AWS provider
- Terraform cloudinit provider
- AWS EC2 user data
- AWS EC2 launch templates and Auto Scaling groups
- cloud-init cloud-config and multi-part user data
- Bash
- Docker and Docker Compose

## Sources Consulted
- Terraform `cloudinit_config` data source documentation: https://registry.terraform.io/providers/hashicorp/cloudinit/latest/docs/data-sources/config
- Terraform AWS `aws_instance` resource documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/instance
- Terraform AWS `aws_launch_template` resource documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/launch_template
- Terraform `templatefile` function documentation: https://developer.hashicorp.com/terraform/language/functions/templatefile
- Terraform `yamlencode` function documentation: https://developer.hashicorp.com/terraform/language/functions/yamlencode
- AWS EC2 user data documentation: https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/user-data.html
- cloud-init user-data script format documentation: https://docs.cloud-init.io/en/latest/explanation/format/user-data-script.html
- cloud-init user-data formats documentation: https://docs.cloud-init.io/en/22.4.2/topics/format.html
- cloud-init boot stages documentation: https://docs.cloud-init.io/en/22.4.2/topics/boot.html
- cloud-init runcmd documentation: https://docs.cloud-init.io/en/latest/reference/yaml_examples/boot_cmds.html
- cloud-init schema validation documentation: https://docs.cloud-init.io/en/24.1/howto/debug_user_data.html
- cloud-init phone_home documentation: https://docs.cloud-init.io/en/latest/reference/yaml_examples/phone_home.html

## Issues Found
- The shell script part in the multi-part cloud-init example called `cloud-init status --wait` while running as cloud-init user data. cloud-init user-data scripts run during cloud-init's final stage, so waiting for cloud-init completion from inside that script can block completion. Removed the wait command.
- The Auto Scaling Group example used `aws ecr get-login-password` from user data but did not attach an instance profile. AWS documents that user-data scripts calling AWS APIs need instance profile credentials. Added an `iam_instance_profile` block to the launch template.
- The troubleshooting example piped status JSON through `jq`, but the debug instance snippet did not install `jq`. Changed the command to `cat /run/cloud-init/status.json` so the example works on a base image without an extra package.

## Review Notes
- The examples remain illustrative and depend on surrounding Terraform inputs and data sources such as `var.*`, `data.aws_ami.ubuntu`, and security groups.
- `cloudinit_config` output encoding is handled correctly in the shown EC2 instance and launch template examples: `user_data_base64` receives base64 output, while launch template `user_data` receives explicitly base64-encoded output.
- `cloud-init schema --config-file` is a valid validation command, though `--annotate` can be useful when troubleshooting schema errors.
