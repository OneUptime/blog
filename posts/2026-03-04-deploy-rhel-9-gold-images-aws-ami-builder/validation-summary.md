# Validation Summary: How to Deploy RHEL Gold Images on AWS with AMI Builder

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Red Hat Enterprise Linux 9
- AWS EC2 Image Builder
- Amazon Machine Images
- AWS CLI
- AWSTOE component YAML
- Amazon CloudWatch Agent
- AWS Organizations AMI launch permissions

## Sources Consulted
- AWS CLI Command Reference: EC2 Image Builder overview: https://docs.aws.amazon.com/cli/latest/reference/imagebuilder/
- AWS CLI Command Reference: create-component: https://docs.aws.amazon.com/cli/latest/reference/imagebuilder/create-component.html
- AWS CLI Command Reference: create-image-recipe: https://docs.aws.amazon.com/cli/latest/reference/imagebuilder/create-image-recipe.html
- AWS CLI Command Reference: create-infrastructure-configuration: https://docs.aws.amazon.com/cli/latest/reference/imagebuilder/create-infrastructure-configuration.html
- AWS CLI Command Reference: create-distribution-configuration: https://docs.aws.amazon.com/cli/latest/reference/imagebuilder/create-distribution-configuration.html
- AWS CLI Command Reference: create-image-pipeline: https://docs.aws.amazon.com/cli/latest/reference/imagebuilder/create-image-pipeline.html
- AWS CLI Command Reference: start-image-pipeline-execution: https://docs.aws.amazon.com/cli/latest/reference/imagebuilder/start-image-pipeline-execution.html
- AWS CLI Command Reference: list-image-pipeline-images: https://docs.aws.amazon.com/cli/latest/reference/imagebuilder/list-image-pipeline-images.html
- EC2 Image Builder User Guide: Create a YAML component document: https://docs.aws.amazon.com/imagebuilder/latest/userguide/create-component-yaml.html
- EC2 Image Builder User Guide: What is Image Builder?: https://docs.aws.amazon.com/imagebuilder/latest/userguide/what-is-image-builder.html
- EC2 Image Builder User Guide: IAM policies and roles resource ARN examples: https://docs.aws.amazon.com/imagebuilder/latest/userguide/security_iam_service-with-iam.html
- Red Hat Enterprise Linux 9 documentation: Managing software with DNF, DNF Automatic: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html-single/managing_software_with_the_dnf_tool/index
- Amazon CloudWatch documentation: Installing the CloudWatch Agent: https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/install-CloudWatch-Agent-on-EC2-Instance.html

## Issues Found
- The package install command included `htop`, which is not available from the standard enabled Red Hat Enterprise Linux 9 repositories. Removed it from the default package list to keep the command reliable on a stock RHEL 9 AWS base image.
- The component attempted to install `amazon-cloudwatch-agent` with `dnf` and validate it inside the custom component. The recipe already includes the AWS-managed `amazon-cloudwatch-agent-linux` Image Builder component, and the custom component validation would run before that managed component. Removed the package and validation from the custom component.
- The SSH hardening used `sed` replacements that only work when the exact commented defaults are present in `/etc/ssh/sshd_config`. Replaced those commands with an idempotent `/etc/ssh/sshd_config.d/99-hardening.conf` drop-in and updated the validation checks accordingly.
- The `create-infrastructure-configuration` command passed `true` to `--terminate-instance-on-failure`, but the AWS CLI defines this as a boolean flag pair. Changed it to `--terminate-instance-on-failure`.
- Several example ARNs used `ACCOUNT` or truncated `arn:aws:imagebuilder:...` placeholders in positions where the AWS CLI ARN patterns require a 12-digit account ID and full resource path. Replaced them with syntactically valid example ARNs using `123456789012`.

## Review Notes
The examples still use placeholder managed image and component versions such as `x.x.x`; this is valid for Image Builder semantic version filters, but users should confirm the desired RHEL 9 and managed component versions in their target AWS Region before running the commands.
