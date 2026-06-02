# Validation Summary: How to Set Up Security Groups for EC2 Instances

## Status
validated

## Post Type
Technical guide / tutorial

## Technologies Covered
- AWS
- Amazon EC2
- Amazon VPC
- Security groups
- AWS CLI
- Network ACLs
- IPv4 and IPv6 CIDR rules

## Sources Consulted
- Amazon EC2 User Guide: Amazon EC2 security groups for your EC2 instances - https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/ec2-security-groups.html
- Amazon VPC User Guide: Security group rules - https://docs.aws.amazon.com/vpc/latest/userguide/security-group-rules.html
- Amazon VPC User Guide: Create a security group for your VPC - https://docs.aws.amazon.com/vpc/latest/userguide/creating-security-groups.html
- Amazon VPC User Guide: Associate security groups with multiple VPCs - https://docs.aws.amazon.com/vpc/latest/userguide/security-group-assoc.html
- Amazon VPC User Guide: Amazon VPC quotas - https://docs.aws.amazon.com/vpc/latest/userguide/amazon-vpc-limits.html
- AWS CLI Command Reference: create-security-group - https://docs.aws.amazon.com/cli/latest/reference/ec2/create-security-group.html
- AWS CLI Command Reference: authorize-security-group-ingress - https://docs.aws.amazon.com/cli/latest/reference/ec2/authorize-security-group-ingress.html
- AWS CLI Command Reference: authorize-security-group-egress - https://docs.aws.amazon.com/cli/latest/reference/ec2/authorize-security-group-egress.html
- AWS CLI Command Reference: revoke-security-group-egress - https://docs.aws.amazon.com/cli/latest/reference/ec2/revoke-security-group-egress.html
- AWS CLI Command Reference: modify-instance-attribute - https://docs.aws.amazon.com/cli/latest/reference/ec2/modify-instance-attribute.html

## Issues Found
- The post stated that security groups are strictly per-VPC and can only be attached to instances in that VPC. AWS still creates security groups for a specific VPC, but current AWS documentation also describes Security Group VPC Associations, which can associate supported security groups with additional VPCs in the same Region. Updated the wording to keep the VPC-scoped concept while noting this current feature.
- The AWS CLI create-security-group example comment said it created the group in the default VPC, but the command explicitly passes `--vpc-id`. Updated the comment to say the specified VPC.
- The limits section described the 2,500 security group quota as per VPC. Current Amazon VPC quotas document this as "VPC security groups per Region." Updated the limit text to "per Region."

## Review Notes
- The AWS CLI was not installed in the local workspace, so command validation was performed against the official AWS CLI Command Reference rather than local `aws --help` output.
- The sample security group IDs such as `sg-microservices-internal`, `sg-loadbalancer`, and `sg-appserver` are placeholders, not valid AWS-formatted IDs. This is acceptable in context, but production examples should use realistic `sg-...` IDs or clearly label symbolic placeholders.
