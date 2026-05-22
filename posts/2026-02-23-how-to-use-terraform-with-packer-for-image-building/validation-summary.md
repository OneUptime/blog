# Validation Summary: How to Use Terraform with Packer for Image Building

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- HashiCorp Packer
- HashiCorp Terraform
- Terraform AWS Provider
- AWS EC2 AMIs
- AWS Auto Scaling Groups
- AWS Launch Templates
- AWS Lambda
- Amazon CloudWatch Agent
- Ubuntu on AWS
- Bash and jq

## Sources Consulted
- HashiCorp Packer Amazon EBS builder documentation: https://developer.hashicorp.com/packer/integrations/hashicorp/amazon/latest/components/builder/ebs
- HashiCorp Packer manifest post-processor documentation: https://developer.hashicorp.com/packer/docs/post-processors/manifest
- HashiCorp Packer file provisioner documentation: https://developer.hashicorp.com/packer/docs/provisioners/file
- HashiCorp Packer shell provisioner documentation: https://developer.hashicorp.com/packer/docs/provisioners/shell
- Terraform AWS Provider `aws_ami` data source documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/data-sources/ami
- Terraform AWS Provider `aws_launch_template` resource documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/launch_template
- Terraform AWS Provider `aws_autoscaling_group` resource documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/autoscaling_group
- AWS CloudWatch Agent download documentation: https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/download-CloudWatch-Agent-on-EC2-Instance-commandline-first.html
- Canonical Ubuntu on AWS image discovery documentation: https://documentation.ubuntu.com/aws/aws-how-to/instances/find-ubuntu-images/
- Python PEP 668, externally managed environments: https://peps.python.org/pep-0668/

## Issues Found
- The Packer example used a hard-coded Ubuntu AMI ID. Replaced it with `source_ami_filter` using Canonical's owner ID and a current Ubuntu 24.04 LTS AMI name pattern so Packer selects a valid recent base image.
- The Packer provisioning commands installed Python packages with system-wide `sudo pip3 install`, which fails on modern Ubuntu releases that enforce externally managed Python environments. Changed the example to create a virtual environment under `/opt/app/venv` and install packages there.
- The CloudWatch Agent download command used an older path-style S3 URL. Updated it to the current AWS-documented URL.
- The Auto Scaling Group example used `version = "$Latest"` in the launch template block. Terraform AWS Provider documentation notes this does not start an instance refresh when the launch template changes, so it was changed to `aws_launch_template.app.latest_version`.
- The multiple-image example filtered by `tag:Role` without saying those AMIs must be tagged by Packer. Added a short note that role tags must be set in the Packer templates.

## Review Notes
The snippets are illustrative and omit surrounding provider, variable, IAM, subnet, security group, and Lambda packaging definitions that a complete Terraform module would need. `packer` and `terraform` were not installed in the local environment, so formatter/validator commands could not be run.
