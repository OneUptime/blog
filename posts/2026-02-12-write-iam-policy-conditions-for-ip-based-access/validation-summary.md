# Validation Summary: How to Write IAM Policy Conditions for IP-Based Access

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- AWS IAM policies
- AWS IAM condition keys and condition operators
- AWS Organizations Service Control Policies
- AWS VPC endpoints
- AWS CLI IAM policy simulator
- IPv4, IPv6, and CIDR notation

## Sources Consulted
- AWS IAM User Guide: IAM JSON policy elements - Condition: https://docs.aws.amazon.com/IAM/latest/UserGuide/reference_policies_elements_condition.html
- AWS IAM User Guide: IAM JSON policy elements - Condition operators: https://docs.aws.amazon.com/IAM/latest/UserGuide/reference_policies_elements_condition_operators.html
- AWS IAM User Guide: AWS global condition context keys: https://docs.aws.amazon.com/IAM/latest/UserGuide/reference_policies_condition-keys.html
- AWS CLI Command Reference: iam simulate-custom-policy: https://docs.aws.amazon.com/cli/latest/reference/iam/simulate-custom-policy.html
- AWS Organizations User Guide: Service control policy examples: https://docs.aws.amazon.com/organizations/latest/userguide/orgs_manage_policies_scps_examples.html
- AWS IAM User Guide: Create a service-linked role: https://docs.aws.amazon.com/IAM/latest/UserGuide/id_roles_create-service-linked-role.html

## Issues Found
- The multiple-IP example included `10.0.0.0/8` under `aws:SourceIp`. AWS documents `aws:SourceIp` as the originating IP for public API requests and notes that it is not present when requests use VPC endpoints. I removed the private CIDR from the example and clarified that the list should contain public egress IP ranges.
- The service-to-service exception explanation treated `aws:ViaAWSService` as a general exception for all AWS service calls. AWS documents it specifically for requests made using forward access sessions, while direct service-principal calls should be handled with `aws:PrincipalIsAWSService`. I updated the examples and explanation to use both conditions.
- The SCP example used `arn:aws:iam::*:role/AWSServiceRole*` to match service-linked roles. AWS documents service-linked role ARNs under the reserved `role/aws-service-role/.../AWSServiceRoleFor...` path. I corrected the ARN pattern.
- The common mistakes section said Lambda functions would be protected by the `aws:ViaAWSService` exception. Lambda execution role calls are workload egress, not necessarily forward access sessions, so I revised the note to mention NAT gateways, VPC endpoints, or other egress paths explicitly.
- The IPv6 note claimed some AWS SDKs and tools prefer IPv6 when available. The AWS IAM documentation only supports the narrower claim that some AWS services support IPv6 and policies should include IPv6 ranges for those services. I adjusted the wording.

## Review Notes
The JSON policy examples are syntactically valid after the changes. The AWS CLI `simulate-custom-policy` command uses documented flags and context-entry shorthand syntax. The linked OneUptime SCP article URL is plausible but was not an external official source.
