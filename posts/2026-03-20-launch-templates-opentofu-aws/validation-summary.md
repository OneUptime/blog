# Validation Summary: How to Use Launch Templates with OpenTofu on AWS

## Status
validated

## Post Type
Guide

## Technologies Covered
- OpenTofu
- AWS EC2 Launch Templates
- Amazon EC2 Auto Scaling
- AWS provider for OpenTofu/Terraform-compatible workflows
- Bash user data scripts

## Sources Consulted
- OpenTofu provider requirements: https://opentofu.org/docs/language/providers/requirements/
- OpenTofu CLI commands: https://opentofu.org/docs/cli/commands/
- OpenTofu `tofu init`: https://opentofu.org/docs/v1.8/cli/commands/init/
- OpenTofu `tofu plan`: https://opentofu.org/docs/cli/commands/plan/
- OpenTofu `tofu apply`: https://opentofu.org/docs/cli/commands/apply
- OpenTofu lifecycle behavior: https://opentofu.org/docs/language/resources/behavior/
- AWS EC2 launch templates user guide: https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/ec2-launch-templates.html
- AWS Auto Scaling launch templates guide: https://docs.aws.amazon.com/autoscaling/ec2/userguide/launch-templates.html
- AWS Auto Scaling launch configurations guide: https://docs.aws.amazon.com/autoscaling/ec2/userguide/launch-configurations.html
- AWS CloudWatch agent startup docs: https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/start-CloudWatch-Agent-on-premise-SSM-onprem.html
- AWS provider `aws_launch_template` resource docs: https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/launch_template.html.markdown
- AWS provider `aws_autoscaling_group` resource docs: https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/autoscaling_group.html.markdown

## Issues Found
- The original HCL examples referenced `aws_security_group.app`, `aws_iam_instance_profile.app_profile`, and `var.subnet_ids` without defining them. I replaced the resource references with input variables, added the missing variable declarations, and updated the deployment commands so the example is self-consistent.
- The original user data example installed and started the CloudWatch agent without fetching or providing an agent configuration file. AWS documents `amazon-cloudwatch-agent-ctl -a fetch-config ... -s` as the supported startup pattern, so I replaced the snippet with a simple generic bootstrap script that works as written.
- The post said launch templates "replace" launch configurations. AWS currently treats launch configurations as legacy and recommends launch templates as their successor, but launch configurations still exist for older accounts. I corrected that wording.
- The versioning section said "Reference a specific version" while using the dynamic `latest_version` attribute. I changed that section to show an explicitly pinned launch template version and updated the Auto Scaling Group example to use the provider's documented `latest_version` pattern.
- The best-practices section implied `create_before_destroy` avoids downtime during updates. OpenTofu documents it as a replacement-ordering control, not a downtime guarantee, so I revised that guidance to focus on pairing it with `name_prefix` to avoid name collisions during replacement.

## Review Notes
- The post is technically relevant and salvageable after the corrections above.
- The example values for AMI, subnet, and security group IDs are placeholders and must be replaced with real IDs in the target AWS account.
- The post pins the AWS provider to `~> 5.0`. That is syntactically valid, but readers may want to review newer provider major versions before adopting the example unchanged.
