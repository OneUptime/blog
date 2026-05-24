# Validation Summary: How to Create IAM Roles for EC2 Instances in Terraform

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform (HCL, AWS provider)
- AWS IAM (roles, policies, instance profiles, trust policies, policy documents)
- AWS EC2 (instances, launch templates, Auto Scaling Groups)
- AWS Systems Manager (Session Manager, Run Command, Patch Manager)
- AWS CloudWatch (logs, metrics, agent)
- AWS Secrets Manager
- AWS S3
- Instance Metadata Service v2 (IMDSv2)

## Sources Consulted
- Terraform AWS Provider documentation — `aws_iam_role`, `aws_iam_instance_profile`, `aws_iam_role_policy_attachment`, `aws_iam_policy`, `aws_iam_policy_document` (https://registry.terraform.io/providers/hashicorp/aws/latest/docs)
- Terraform AWS Provider — `aws_instance`, `aws_launch_template` (metadata_options arguments: http_endpoint, http_tokens, http_put_response_hop_limit, instance_metadata_tags), `aws_autoscaling_group`
- AWS IAM service-linked role / managed policies — `CloudWatchAgentServerPolicy` and `AmazonSSMManagedInstanceCore` ARNs verified against AWS managed policy reference (https://docs.aws.amazon.com/aws-managed-policy/latest/reference/)
- AWS EC2 IAM Roles for EC2 / Instance Metadata Service v2 documentation (https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/configuring-instance-metadata-service.html)
- AWS IAM Policy Reference — `cloudwatch:namespace` condition key (https://docs.aws.amazon.com/IAM/latest/UserGuide/list_amazoncloudwatch.html)
- AWS Systems Manager Session Manager prerequisites (https://docs.aws.amazon.com/systems-manager/latest/userguide/session-manager-prerequisites.html)
- HCL2 syntax — comment handling inside object expressions passed to `jsonencode`

## Issues Found
No technical issues found.

## Review Notes
- The AMI ID `ami-0c55b159cbfafe1f0` is a commonly used placeholder/example value. It is region-specific and not guaranteed to be available; readers must substitute a current AMI for their region. This is conventional for example code and the post does not claim the AMI is current.
- The post correctly enforces IMDSv2 (`http_tokens = "required"`) and accurately describes its role in mitigating SSRF-based credential exfiltration.
- The custom-policy examples follow least-privilege principles (e.g., scoped `Resource` ARNs, `cloudwatch:namespace` condition).
- Trust policy uses the `ec2.amazonaws.com` service principal, which is correct for EC2 instance role assumption in standard AWS partitions. For GovCloud / China partitions, the principal differs, but standard tutorial scope does not require calling this out.
- The `for_each = toset(...)` pattern for conditional policy attachment is idiomatic and valid Terraform.
- HCL comments (`#`) embedded inside the object expression passed to `jsonencode` are valid — HCL strips comments before evaluating the expression, so the generated JSON is well-formed.
