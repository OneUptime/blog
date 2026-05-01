# Validation Summary: How to Use EC2 Launch Templates with OpenTofu

## Status
validated

## Post Type
Guide

## Technologies Covered
- OpenTofu
- AWS EC2
- EC2 Launch Templates
- EC2 Auto Scaling
- AWS provider for OpenTofu

## Sources Consulted
- AWS provider `aws_launch_template` resource docs: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/launch_template
- AWS provider `aws_autoscaling_group` resource docs: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/autoscaling_group
- AWS provider `aws_instance` resource docs: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/instance
- AWS provider `aws_ami` data source docs: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/data-sources/ami
- Amazon EC2 User Guide, launch templates overview: https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/ec2-launch-templates.html
- Amazon EC2 User Guide, manage launch template versions: https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/manage-launch-template-versions.html
- Amazon EC2 Auto Scaling User Guide, launch templates: https://docs.aws.amazon.com/autoscaling/ec2/userguide/launch-templates.html
- Amazon EC2 Auto Scaling User Guide, create a launch template for an Auto Scaling group: https://docs.aws.amazon.com/autoscaling/ec2/userguide/create-launch-template.html
- Amazon EC2 Auto Scaling User Guide, launch configurations: https://docs.aws.amazon.com/autoscaling/ec2/userguide/launch-configurations.html
- OpenTofu docs, `templatefile`: https://opentofu.org/docs/language/functions/templatefile/
- OpenTofu docs, `base64encode`: https://opentofu.org/docs/language/functions/base64encode/
- OpenTofu docs, `tofu init`: https://opentofu.org/docs/cli/commands/init/
- OpenTofu docs, `tofu plan`: https://opentofu.org/docs/cli/commands/plan/
- OpenTofu docs, `tofu apply`: https://opentofu.org/docs/cli/commands/apply/

## Issues Found
- The Step 2 example incorrectly modeled a new launch template version as a second `aws_launch_template` resource with the same AWS launch template name. I changed it to update the existing `aws_launch_template.app` resource instead, because new versions are created by modifying the existing launch template and applying again.
- The Step 2 comment said the example was creating a new version with an updated AMI, but the code changed the instance type. I corrected the wording to match the actual change.
- The post used `lifecycle { create_before_destroy = true }` and concluded that this should always be used to avoid downtime. I removed that guidance because launch template updates create new versions rather than depending on `create_before_destroy`, and the original recommendation was not accurate for this resource.
- The introduction said launch templates “replace” launch configurations. I adjusted this to say AWS recommends launch templates over launch configurations, which matches current AWS guidance more precisely because launch configurations still exist for some accounts but are deprecated and restricted.

## Review Notes
- The `tofu` binary was not installed in the local environment, so the CLI commands were verified against the official OpenTofu command documentation rather than local `--help` output.
