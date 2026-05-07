# Validation Summary: How to Configure Prefix Lists for IPv4 CIDR Blocks in AWS

## Status
validated

## Post Type
Guide

## Technologies Covered
- AWS
- Amazon VPC
- AWS CLI
- EC2 security groups
- VPC route tables
- AWS Resource Access Manager (RAM)
- Managed prefix lists

## Sources Consulted
- AWS CLI `create-managed-prefix-list`: https://docs.aws.amazon.com/cli/latest/reference/ec2/create-managed-prefix-list.html
- AWS CLI `describe-managed-prefix-lists`: https://docs.aws.amazon.com/cli/latest/reference/ec2/describe-managed-prefix-lists.html
- AWS CLI `get-managed-prefix-list-entries`: https://docs.aws.amazon.com/cli/latest/reference/ec2/get-managed-prefix-list-entries.html
- AWS CLI `modify-managed-prefix-list`: https://docs.aws.amazon.com/cli/latest/reference/ec2/modify-managed-prefix-list.html
- AWS CLI `authorize-security-group-ingress`: https://docs.aws.amazon.com/cli/latest/reference/ec2/authorize-security-group-ingress.html
- AWS CLI `create-route`: https://docs.aws.amazon.com/cli/latest/reference/ec2/create-route.html
- AWS CLI `create-resource-share`: https://docs.aws.amazon.com/cli/latest/reference/ram/create-resource-share.html
- Amazon VPC User Guide, managed prefix lists overview: https://docs.aws.amazon.com/vpc/latest/userguide/managed-prefix-lists.html
- Amazon VPC User Guide, work with customer-managed prefix lists: https://docs.aws.amazon.com/vpc/latest/userguide/work-with-cust-managed-prefix-lists.html
- Amazon VPC User Guide, reference prefix lists in security groups and route tables: https://docs.aws.amazon.com/vpc/latest/userguide/managed-prefix-lists-referencing.html
- Amazon VPC User Guide, AWS-managed prefix lists: https://docs.aws.amazon.com/vpc/latest/userguide/working-with-aws-managed-prefix-lists.html
- Amazon VPC User Guide, share customer-managed prefix lists: https://docs.aws.amazon.com/vpc/latest/userguide/sharing-managed-prefix-lists.html

## Issues Found
- The post described creatable prefix lists as "AWS managed prefix lists". I changed this to "customer-managed prefix lists" where appropriate because AWS-managed prefix lists are predefined by AWS and cannot be created or edited by customers.
- The security group example passed the `--ip-permissions` shorthand structure without shell quoting. I wrapped the value in quotes to match AWS CLI documentation and avoid shell parsing or globbing issues.
- The AWS-managed lookup example used `describe-prefix-lists`. I updated it to `describe-managed-prefix-lists` with `owner-id=AWS` and `prefix-list-name` filters to align with the current VPC documentation for finding AWS-managed prefix lists.
- The RAM section implied that any prefix list can be shared. I corrected this to customer-managed prefix lists only, because AWS-managed prefix lists cannot be shared.
- The route table example comment was too broad. I clarified that the example applies to a subnet route table, because prefix lists cannot be referenced in a gateway route table.

## Review Notes
- Prefix list references consume resource quota based on the prefix list's maximum entry count, and AWS-managed prefix lists also have service-specific weight values. The post is still technically correct without this detail, but it is an important operational caveat for production use.
- The CLI examples assume the user is operating in the correct AWS Region for the prefix list and related resources.
