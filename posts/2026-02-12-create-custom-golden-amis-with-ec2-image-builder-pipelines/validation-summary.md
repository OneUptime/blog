# Validation Summary: How to Create Custom Golden AMIs with EC2 Image Builder Pipelines

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- AWS EC2 Image Builder
- Amazon EC2 AMIs
- AWS CLI
- EC2 Image Builder component documents
- Image Builder image recipes, distribution configurations, and lifecycle policies
- AWS Organizations launch permissions
- IAM / Service Control Policies
- Amazon Linux 2023
- CloudWatch Agent and SSM Agent
- OpenSSH, auditd, iptables, and chrony

## Sources Consulted
- AWS CLI Command Reference: `imagebuilder create-image-recipe` - https://docs.aws.amazon.com/cli/latest/reference/imagebuilder/create-image-recipe.html
- AWS CLI Command Reference: `imagebuilder create-distribution-configuration` - https://docs.aws.amazon.com/cli/latest/reference/imagebuilder/create-distribution-configuration.html
- AWS CLI Command Reference: `imagebuilder create-lifecycle-policy` - https://docs.aws.amazon.com/cli/latest/reference/imagebuilder/create-lifecycle-policy.html
- EC2 Image Builder User Guide: custom YAML component documents - https://docs.aws.amazon.com/imagebuilder/latest/userguide/create-component-yaml.html
- EC2 Image Builder User Guide: AMI distribution configurations - https://docs.aws.amazon.com/imagebuilder/latest/userguide/cr-upd-ami-distribution-settings.html
- AWS Service Authorization Reference: Amazon EC2 actions, resources, and condition keys - https://docs.aws.amazon.com/service-authorization/latest/reference/list_amazonec2.html
- Amazon Linux 2023 User Guide: SSH server default configuration - https://docs.aws.amazon.com/linux/al2023/ug/ssh-host-key.html
- OpenSSH release notes for removal of SSH protocol 1 server support and legacy protocol configuration - https://www.openssh.com/releasenotes.html
- Amazon CloudWatch User Guide: installing and using the CloudWatch agent - https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/install-CloudWatch-Agent-commandline-fleet.html

## Issues Found
- The example ARNs used 9-digit placeholder account IDs (`123456789`), which are not valid AWS account IDs. Updated the component, KMS, Organizations, and IAM role ARNs to use a 12-digit placeholder account ID (`123456789012`).
- The AWS Organizations ARN example used an organization ID that was too short for the documented ARN pattern. Updated it to a plausible placeholder organization ARN (`o-a1b2c3d4e5`).
- The SSH hardening component appended `Protocol 2` to `sshd_config`. Modern OpenSSH removed SSH protocol 1 support and the old protocol configuration is no longer appropriate for Amazon Linux 2023-era OpenSSH. Replaced it with `sshd -t` so the component validates the resulting SSH configuration.
- The CloudWatch agent validation used `which amazon-cloudwatch-agent-ctl`, but the documented control script path is under `/opt/aws/amazon-cloudwatch-agent/bin/`. Updated the check to test that path directly.
- The SCP example used `ec2:ImageTag/Type`, which is not an EC2 condition key for `RunInstances`. Updated it to use `aws:ResourceTag/Type`, which is supported for the AMI image resource.
- The lifecycle policy CLI example omitted required `--resource-selection`. Added a recipe-based selection block for the `golden-ami-linux` recipe.
- The lifecycle policy used `retainAtLeast` with a count filter. AWS documents `value` as the count-based retention setting and `retainAtLeast` for age-based delete behavior, so the count example now uses only `"value": 3`.
- The lifecycle policy action did not specify included AMI resources. Added `includeResources` for AMIs and snapshots to make the delete action explicit.

## Review Notes
The examples are still illustrative and assume the custom components have already been created with matching component names and versions. In a production pipeline, the SSH hardening commands should be tested against the exact Amazon Linux 2023 `sshd_config` shipped in the chosen parent AMI, because commented defaults can vary across OpenSSH and distribution releases.
