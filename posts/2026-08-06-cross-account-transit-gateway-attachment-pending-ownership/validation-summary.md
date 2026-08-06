# Validation Summary: Fix a Pending Cross-Account Transit Gateway Attachment

## Status
validated

## Post Type
Technical troubleshooting guide

## Technologies Covered

- AWS Transit Gateway
- Amazon VPC and VPC route tables
- AWS Resource Access Manager (AWS RAM)
- AWS Organizations
- AWS Identity and Access Management (IAM)
- AWS Command Line Interface (AWS CLI)
- AWS CloudTrail
- VPC and Transit Gateway Flow Logs

## Sources Consulted

- [Amazon VPC attachments in AWS Transit Gateway](https://docs.aws.amazon.com/vpc/latest/tgw/tgw-vpc-attachments.html)
- [Accept a shared attachment in AWS Transit Gateway](https://docs.aws.amazon.com/vpc/latest/tgw/acccept-tgw-attach.html)
- [Work with AWS Transit Gateway](https://docs.aws.amazon.com/vpc/latest/tgw/working-with-transit-gateways.html)
- [Transit gateways in AWS Transit Gateway](https://docs.aws.amazon.com/vpc/latest/tgw/tgw-transit-gateways.html)
- [How AWS Transit Gateway works](https://docs.aws.amazon.com/vpc/latest/tgw/how-transit-gateways-work.html)
- [Create a VPC attachment in AWS Transit Gateway](https://docs.aws.amazon.com/vpc/latest/tgw/create-vpc-attachment.html)
- [Sharing your AWS resources](https://docs.aws.amazon.com/ram/latest/userguide/getting-started-sharing.html)
- [Sharing Regional resources compared to global resources](https://docs.aws.amazon.com/ram/latest/userguide/working-with-regional-vs-global.html)
- [AWS CLI: describe-transit-gateway-vpc-attachments](https://docs.aws.amazon.com/cli/latest/reference/ec2/describe-transit-gateway-vpc-attachments.html)
- [AWS CLI: accept-transit-gateway-vpc-attachment](https://docs.aws.amazon.com/cli/latest/reference/ec2/accept-transit-gateway-vpc-attachment.html)
- [AWS Transit Gateway pricing](https://aws.amazon.com/transit-gateway/pricing/)
- [Flexible cost allocation](https://docs.aws.amazon.com/vpc/latest/tgw/metering-policy.html)
- [AWS Transit Gateway Flow Logs](https://docs.aws.amazon.com/vpc/latest/tgw/tgw-flow-logs.html)
- [IAM policy evaluation logic](https://docs.aws.amazon.com/IAM/latest/UserGuide/reference_policies_evaluation-logic_policy-eval-denyallow.html)

## Issues Found

- The billing section stated unconditionally that Transit Gateway data processing is charged to the VPC owner that sends traffic. That is the default allocation, but AWS Transit Gateway flexible cost allocation, introduced before this post's publication date, lets the Transit Gateway owner use metering policies to allocate supported data usage to the source attachment owner, destination attachment owner, or Transit Gateway owner. Updated the responsibility table and billing section to distinguish the unchanged VPC attachment hourly charge from configurable data-processing allocation, and added the official flexible cost allocation documentation link.

## Review Notes

- Both AWS CLI examples use current command names, required flags, valid resource-ID shapes, and a valid JMESPath query. Their syntax was also validated with the installed AWS CLI v2.27.31 command skeleton generator.
- The lifecycle state names correctly distinguish the hyphenated documentation prose from the camel-case API values, and the two-hour visibility period for failed, rejected, and deleted attachments matches the current lifecycle documentation.
- The routing, one-subnet-per-Availability-Zone, cross-account Availability Zone ID, shared-subnet ownership, unsharing, and either-account deletion statements match current AWS documentation.
- No deprecated APIs or version-specific incompatibilities were found.
