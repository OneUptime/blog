# Validation Summary: How to Set Up Managed Prefix Lists for IP Whitelisting

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- AWS VPC managed prefix lists
- Amazon EC2 security groups
- AWS Resource Access Manager (RAM)
- AWS CLI
- AWS Lambda with Python and Boto3
- Amazon EventBridge scheduled rules
- AWS CloudFormation
- AWS CloudTrail
- GitHub Meta API for GitHub Actions IP ranges

## Sources Consulted
- AWS VPC User Guide: Managed prefix lists - https://docs.aws.amazon.com/vpc/latest/userguide/managed-prefix-lists.html
- AWS VPC User Guide: Work with customer-managed prefix lists - https://docs.aws.amazon.com/vpc/latest/userguide/work-with-cust-managed-prefix-lists.html
- AWS VPC User Guide: Optimize AWS infrastructure management with prefix lists - https://docs.aws.amazon.com/vpc/latest/userguide/managed-prefix-lists-referencing.html
- AWS CLI Command Reference: ec2 create-managed-prefix-list - https://docs.aws.amazon.com/cli/latest/reference/ec2/create-managed-prefix-list.html
- AWS CLI Command Reference: ec2 authorize-security-group-ingress - https://docs.aws.amazon.com/cli/latest/reference/ec2/authorize-security-group-ingress.html
- AWS CLI Command Reference: ram create-resource-share - https://docs.aws.amazon.com/cli/latest/reference/ram/create-resource-share.html
- AWS CLI Command Reference: events put-rule - https://docs.aws.amazon.com/cli/latest/reference/events/put-rule.html
- AWS CLI Command Reference: events put-targets - https://docs.aws.amazon.com/cli/latest/reference/events/put-targets.html
- AWS CLI Command Reference: lambda add-permission - https://docs.aws.amazon.com/cli/latest/reference/lambda/add-permission.html
- Boto3 EC2 documentation: modify_managed_prefix_list - https://docs.aws.amazon.com/boto3/latest/reference/services/ec2/client/modify_managed_prefix_list.html
- Boto3 EC2 documentation: get_managed_prefix_list_entries paginator - https://docs.aws.amazon.com/boto3/latest/reference/services/ec2/paginator/GetManagedPrefixListEntries.html
- AWS CloudFormation Template Reference: AWS::EC2::PrefixList - https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/aws-resource-ec2-prefixlist.html
- AWS CloudFormation Template Reference: AWS::RAM::ResourceShare - https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/aws-resource-ram-resourceshare.html
- GitHub Docs: About GitHub's IP addresses - https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/about-githubs-ip-addresses
- GitHub Docs: REST API endpoints for meta data - https://docs.github.com/rest/meta/meta

## Issues Found
- The post description claimed coverage for NACLs and WAF rules. AWS VPC managed prefix list documentation lists supported references such as security groups, route tables, Transit Gateway route tables, Network Firewall rule groups, Amazon Managed Grafana network access control, and Outposts local gateways, not NACLs or AWS WAF. Updated the description to match the post's security group focus.
- The `aws ec2 create-managed-prefix-list` examples used `--tags`, which is not the supported create-time tagging option for this command. Replaced these with `--tag-specifications` using `ResourceType=prefix-list`.
- The office prefix list example included an overlapping HQ `/24` and VPN `/25`. Changed the HQ CIDR to `/25` so the example entries are non-overlapping.
- Several examples used friendly names such as `pl-offices` where AWS APIs require actual prefix list IDs in `pl-...` format. Replaced them with clearly marked placeholder IDs and added a note to use the IDs returned by the create commands.
- The RAM sharing example omitted the organization-only restriction. Added `--no-allow-external-principals` to the CLI example and `AllowExternalPrincipals: false` to the CloudFormation resource.
- The Lambda sync example read only one page of prefix list entries, did not filter IPv6 values from GitHub's `actions` key before updating an IPv4 prefix list, and applied only the first sliced batch of changes. Updated it to paginate entries, filter IPv4 CIDRs, process add/remove batches, refresh the prefix list version before each modification, and wait for prefix list modifications to complete.
- The EventBridge schedule example added the Lambda target but did not grant EventBridge permission to invoke the function. Added the required `aws lambda add-permission` command.

## Review Notes
- AWS CLI was not installed in the local workspace, so command validation was performed against current official AWS CLI documentation instead of local `--help` output.
- The CloudFormation organization ID remains a placeholder (`o-org123`) and must be replaced before deployment.
None.
