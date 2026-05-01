# Validation Summary: How to Configure EC2 Instance Metadata Options with OpenTofu

## Status
validated

## Post Type
Guide

## Technologies Covered
- OpenTofu
- AWS EC2
- EC2 Instance Metadata Service (IMDSv2)
- AWS Config
- HCL
- Bash

## Sources Consulted
- OpenTofu CLI docs: https://opentofu.org/docs/cli/commands/
- OpenTofu `init`: https://opentofu.org/docs/v1.11/cli/commands/init/
- OpenTofu `plan`: https://opentofu.org/docs/cli/commands/plan/
- OpenTofu `apply`: https://opentofu.org/docs/v1.11/cli/commands/apply/
- Amazon EC2 User Guide, Configure the Instance Metadata Service options: https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/configuring-instance-metadata-options.html
- Amazon EC2 User Guide, Access instance metadata for an EC2 instance: https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/instancedata-data-retrieval.html
- Amazon EC2 User Guide, Retrieve security credentials from instance metadata: https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/instance-metadata-security-credentials.html
- AWS Config managed rule `ec2-imdsv2-check`: https://docs.aws.amazon.com/config/latest/developerguide/ec2-imdsv2-check.html
- AWS Config managed rules overview: https://docs.aws.amazon.com/config/latest/developerguide/evaluate-config_use-managed-rules.html
- AWS Config API `PutConfigRule`: https://docs.aws.amazon.com/config/latest/APIReference/API_PutConfigRule.html
- Terraform AWS Provider `aws_instance`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/instance
- Terraform AWS Provider `aws_launch_template`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/launch_template
- Terraform AWS Provider `aws_config_config_rule`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/config_config_rule

## Issues Found
- The hop-limit comments described `http_put_response_hop_limit` too broadly and claimed that a value of `1` prevents container access. I changed the wording to match AWS documentation: it controls the IMDSv2 token response hop limit, `1` is typical, and `2` is used when containerized workloads need IMDS access.
- Step 4 was titled as enforcement, but the `EC2_IMDSV2_CHECK` managed rule evaluates compliance rather than enforcing or remediating settings. I changed the step title to a compliance check and added a note that AWS Config must already be enabled with a configuration recorder.
- The IMDS validation example claimed to get IAM credentials by calling `.../iam/security-credentials/`, but that path returns the attached role name. I updated the example to first retrieve the role name and then request `.../iam/security-credentials/$ROLE_NAME` to get the credentials document.
- The prerequisites only mentioned EC2 permissions even though the post includes an AWS Config rule. I updated the prerequisites to include AWS Config permissions and the AWS Config recorder prerequisite for Step 4.
- The introduction and conclusion described IMDSv2 protection too absolutely. I softened the wording to say it helps protect against SSRF-based metadata access, which is closer to AWS guidance.

## Review Notes
- The examples assume the surrounding OpenTofu configuration already defines `data.aws_ami.amazon_linux` and `var.subnet_id`.
- `metadata_options` behavior here is driven by the AWS provider and AWS EC2 APIs; it is not specific to OpenTofu 1.6 beyond normal CLI compatibility.
