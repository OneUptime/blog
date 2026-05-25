# Validation Summary: How to Build a Bastion Host Architecture with Terraform

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform
- AWS EC2
- AWS IAM
- AWS Systems Manager Session Manager
- AWS CloudWatch Logs and CloudWatch Agent
- Amazon S3
- Amazon Route 53
- SSH bastion host architecture

## Sources Consulted
- Terraform AWS Provider: `aws_instance`, `metadata_options`, `root_block_device`, and IAM instance profile arguments: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/instance
- Terraform AWS Provider: `aws_ssm_document`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/ssm_document
- Terraform AWS Provider: `aws_route53_record`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/route53_record
- AWS Systems Manager Session Manager overview and logging behavior: https://docs.aws.amazon.com/systems-manager/latest/userguide/session-manager.html
- AWS Systems Manager Session Manager logging: https://docs.aws.amazon.com/systems-manager/latest/userguide/session-manager-logging.html
- AWS Systems Manager Session document schema: https://docs.aws.amazon.com/systems-manager/latest/userguide/session-manager-schema.html
- AWS Systems Manager Session Manager prerequisites: https://docs.aws.amazon.com/systems-manager/latest/userguide/session-manager-prerequisites.html
- AWS SSM Agent on Amazon Linux 2 and Amazon Linux 2023: https://docs.aws.amazon.com/systems-manager/latest/userguide/agent-install-al2.html
- AWS managed policy `AmazonSSMManagedInstanceCore`: https://docs.aws.amazon.com/aws-managed-policy/latest/reference/AmazonSSMManagedInstanceCore.html
- AWS managed policy `CloudWatchAgentServerPolicy`: https://docs.aws.amazon.com/aws-managed-policy/latest/reference/CloudWatchAgentServerPolicy.html
- Amazon CloudWatch Agent IAM prerequisites: https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/create-iam-roles-for-cloudwatch-agent-commandline.html
- Amazon EC2 user data behavior: https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/user-data.html
- Amazon Linux 2023 package support for `fail2ban`: https://docs.aws.amazon.com/linux/al2023/release-notes/support-info-by-package.html

## Issues Found
- The bastion IAM role attached `AmazonSSMManagedInstanceCore` but not `CloudWatchAgentServerPolicy`, even though the post installs the CloudWatch Agent. Added the managed policy attachment so the agent can write to CloudWatch Logs.
- The CloudWatch Agent install comment implied session logging was complete after package installation. Updated the wording to state that the agent must be configured separately to ship audit logs.
- The Session Manager description said audit logging was built in, which could imply it is automatically enabled. Updated it to "integrated audit logging options" to match AWS documentation.
- The Session Manager requirements omitted network connectivity to Systems Manager endpoints. Added the NAT or VPC interface endpoint requirement.
- The SSH session logging section implied that creating a CloudWatch log group records every command typed on a bastion. Reworded it to clarify that the log group is only the destination and that command recording requires instance-level logging such as shell logging or auditd plus the CloudWatch Agent.

## Review Notes
- Terraform was not installed in the local environment, so I could not run `terraform validate`. The snippets were reviewed against current Terraform AWS Provider documentation and AWS service documentation instead.
- The Auto Scaling example replaces failed bastion instances, but using a stable DNS name or Elastic IP with an Auto Scaling Group requires additional association automation not shown in the post.
