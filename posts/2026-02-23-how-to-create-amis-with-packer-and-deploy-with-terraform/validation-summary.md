# Validation Summary: How to Create AMIs with Packer and Deploy with Terraform

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- HashiCorp Packer
- HashiCorp Terraform
- AWS EC2 AMIs
- AWS Auto Scaling Groups
- AWS Launch Templates
- AWS Systems Manager Agent
- Amazon CloudWatch Agent
- Ubuntu 22.04
- Node.js and npm
- Nginx
- systemd

## Sources Consulted
- HashiCorp Packer Amazon plugin documentation: https://developer.hashicorp.com/packer/integrations/hashicorp/amazon
- HashiCorp Packer Amazon EBS builder documentation: https://developer.hashicorp.com/packer/integrations/hashicorp/amazon/latest/components/builder/ebs
- HashiCorp Packer Amazon AMI data source documentation: https://developer.hashicorp.com/packer/integrations/hashicorp/amazon/latest/components/data-source/ami
- HashiCorp AWS provider `aws_autoscaling_group` documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/autoscaling_group
- HashiCorp AWS provider `aws_ami` data source documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/data-sources/ami
- Amazon EC2 Auto Scaling instance refresh documentation: https://docs.aws.amazon.com/autoscaling/ec2/userguide/instance-refresh-overview.html
- AWS Systems Manager documentation for installing SSM Agent on Ubuntu: https://docs.aws.amazon.com/systems-manager/latest/userguide/agent-install-ubuntu.html
- npm CLI install/config documentation: https://docs.npmjs.com/cli/v11/commands/npm-install and https://docs.npmjs.com/cli/v11/using-npm/config
- NodeSource binary distributions documentation: https://deb.nodesource.com/ and https://github.com/nodesource/distributions

## Issues Found
- The application Packer example used `var.aws_region` without declaring `aws_region` in the shown `app-image.pkr.hcl` file. Added the same `aws_region` variable and Amazon plugin requirement used in the base image example so the standalone snippet is complete.
- The SSM Agent install step always ran `snap install amazon-ssm-agent`, but AWS notes that Ubuntu AMIs commonly already include SSM Agent. Changed the command to install only when the snap is absent and to enable/start the service.
- The npm dependency install command used `npm install --production`, which npm documents as a deprecated alias for omitting dev dependencies. Updated it to `npm install --omit=dev`.
- The rolling update ASG used `version = "$Latest"` while relying on Terraform `instance_refresh`. HashiCorp's AWS provider documentation notes that `$Latest` does not trigger instance refresh when the launch template changes. Updated it to `aws_launch_template.app.latest_version`.

## Review Notes
- Packer and Terraform CLIs were not installed in the local environment, so syntax validation was performed by reviewing the snippets against official documentation rather than running `packer validate` or `terraform validate`.
- The blue-green example is a simplified pattern. A production implementation should usually validate the inactive color before switching traffic, often with separate target groups and listener rule changes.
