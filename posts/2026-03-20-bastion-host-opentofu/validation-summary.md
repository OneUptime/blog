# Validation Summary: How to Deploy a Bastion Host with OpenTofu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTofu / HCL
- AWS EC2
- AWS VPC security groups and interface VPC endpoints
- AWS Systems Manager Session Manager
- Amazon CloudWatch agent and CloudWatch Logs
- AWS IAM
- SSH / ProxyJump

## Sources Consulted
- OpenTofu Output Values documentation — https://opentofu.org/docs/v1.9/language/values/outputs/
- Terraform Registry: `aws_instance` resource — https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/instance
- Amazon EC2: Configure the Instance Metadata Service options — https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/configuring-instance-metadata-options.html
- Amazon VPC: Security group rules — https://docs.aws.amazon.com/vpc/latest/userguide/security-group-rules.html
- Amazon CloudWatch: Download the CloudWatch agent package — https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/download-CloudWatch-Agent-on-EC2-Instance-commandline-first.html
- Amazon CloudWatch: Prerequisites for the CloudWatch agent — https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/prerequisites.html
- AWS Managed Policy Reference: `CloudWatchAgentServerPolicy` — https://docs.aws.amazon.com/aws-managed-policy/latest/reference/CloudWatchAgentServerPolicy.html
- AWS Systems Manager Session Manager — https://docs.aws.amazon.com/systems-manager/latest/userguide/session-manager.html
- AWS Systems Manager: Logging session activity — https://docs.aws.amazon.com/systems-manager/latest/userguide/session-manager-auditing.html
- AWS Systems Manager: Enabling and disabling session logging — https://docs.aws.amazon.com/systems-manager/latest/userguide/session-manager-logging.html
- AWS Systems Manager: Improve the security of EC2 instances by using VPC endpoints for Systems Manager — https://docs.aws.amazon.com/systems-manager/latest/userguide/setup-create-vpc.html
- AWS Systems Manager: Reference: `ec2messages`, `ssmmessages`, and other API operations — https://docs.aws.amazon.com/systems-manager/latest/userguide/systems-manager-setting-up-messageAPIs.html

## Issues Found
1. **The bastion security group egress rules would block the documented bootstrap flow.** The original snippet allowed outbound traffic only to the VPC CIDR, which would prevent the bastion from reaching package repositories and AWS APIs used by the CloudWatch agent. I changed the egress rules to allow SSH to private instances on port 22 within the VPC and HTTPS on port 443 for package installation and AWS service access.

2. **The EC2 `user_data` example was double-encoded.** In the AWS provider, `user_data` expects plain UTF-8 text, while pre-encoded content belongs in `user_data_base64`. I removed `base64encode(...)` and left the heredoc as plain `user_data`.

3. **The bastion IAM role was missing the policy required by the CloudWatch agent.** AWS documents `CloudWatchAgentServerPolicy` as the standard instance-role policy for the agent. I added the missing policy attachment to the bastion role.

4. **The Parameter Store path used for the CloudWatch agent config would not be readable with the managed CloudWatch agent policy.** `CloudWatchAgentServerPolicy` grants `ssm:GetParameter` only for parameters matching `AmazonCloudWatch-*`. I changed the example to use `ssm:AmazonCloudWatch-${var.environment}` so it matches the documented managed-policy scope.

5. **The Session Manager endpoint guidance was too broad for current AWS Regions.** The post unconditionally created an `ec2messages` interface endpoint, but AWS now documents `ec2messages` as supported only in Regions launched before 2024, while current SSM Agent prefers `ssmmessages`. I removed the unconditional `ec2messages` resource and replaced it with an explanatory note.

6. **The conclusion overstated what CloudTrail records for Session Manager.** CloudTrail records Session Manager API activity, not full interactive shell transcripts. I corrected the text to distinguish CloudTrail API auditing from session-data logging to CloudWatch Logs or Amazon S3 when Session Manager logging is enabled.

## Review Notes
- The snippets assume surrounding resources already exist, including the VPC, subnets, private-instance security group, bastion key pair, and the IAM role/profile for private instances.
- Session Manager still requires the target instances to be managed nodes with SSM Agent available and an instance role such as `AmazonSSMManagedInstanceCore`.
- If readers want fully private Session Manager logging or KMS-encrypted Session Manager sessions, they may also need additional interface endpoints such as `logs` and optionally `kms`; the post now accurately scopes the endpoint section to Systems Manager traffic itself.
