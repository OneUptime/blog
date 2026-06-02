# Validation Summary: How to Migrate from EC2-Classic to VPC

## Status
validated

## Post Type
Technical migration guide

## Technologies Covered
- Amazon EC2
- EC2-Classic
- Amazon VPC
- AWS CLI
- EC2 security groups
- Elastic IP addresses
- ClassicLink
- Amazon RDS
- Route 53

## Sources Consulted
- Amazon RDS User Guide: Moving a DB instance not in a VPC into a VPC - https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/USER_VPC.Non-VPC2VPC.html
- Amazon RDS API Reference: ModifyDBInstance - https://docs.aws.amazon.com/AmazonRDS/latest/APIReference/API_ModifyDBInstance.html
- AWS CLI Command Reference: modify-vpc-attribute - https://docs.aws.amazon.com/cli/latest/reference/ec2/modify-vpc-attribute.html
- AWS CLI Command Reference: describe-security-groups - https://docs.aws.amazon.com/cli/latest/reference/ec2/describe-security-groups.html
- AWS CLI Command Reference: run-instances - https://docs.aws.amazon.com/cli/latest/reference/ec2/run-instances.html
- AWS CLI Command Reference: enable-vpc-classic-link - https://docs.aws.amazon.com/cli/latest/reference/ec2/enable-vpc-classic-link.html
- Amazon EC2 API Reference: MoveAddressToVpc - https://docs.aws.amazon.com/AWSEC2/latest/APIReference/API_MoveAddressToVpc.html
- Amazon VPC User Guide: Enable internet access for a VPC using an internet gateway - https://docs.aws.amazon.com/vpc/latest/userguide/VPC_Internet_Gateway.html
- Amazon VPC User Guide: Subnet route tables - https://docs.aws.amazon.com/vpc/latest/userguide/subnet-route-tables.html
- Amazon EC2 User Guide: Create an Amazon EBS-backed AMI - https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/creating-an-ami-ebs.html

## Issues Found
- The post described EC2-Classic as being phased out, but AWS documentation now states EC2-Classic was retired on August 15, 2022. Updated the introduction to reflect the current status.
- The security group comparison described VPC security groups as "instance and subnet level." Updated this to distinguish instance/ENI-level security groups from subnet-level network ACLs.
- The Classic security group inventory command attempted to filter `vpc-id` to an empty value. Updated it to use a JMESPath query for security groups without `VpcId`.
- The VPC DNS attribute commands omitted the required boolean structure shown in the AWS CLI docs. Updated both commands to pass `{"Value":true}`.
- The VPC setup section said it created public and private subnets but only created public subnets. Updated the wording to match the commands.
- The public subnet setup created a route table with an internet gateway route but did not associate the route table with the new subnets. Updated the example to capture subnet IDs and associate them with the route table.
- The ClassicLink section presented a deprecated API as a useful current migration strategy and incorrectly said ClassicLink gives the instance a VPC private IP. Updated the section to mark ClassicLink as deprecated historical behavior and clarified that it enabled private IPv4 communication without moving the instance into the VPC or assigning a VPC subnet IP.
- The Elastic IP note said the move was irreversible. Updated it to match the current API wording: after moving, the address is no longer available for EC2-Classic, and users should not rely on moving it back.
- The conclusion recommended ClassicLink for gradual migrations. Updated it to recommend avoiding ClassicLink because it is deprecated.

## Review Notes
The topic is legacy because EC2-Classic and related APIs are retired or deprecated, but AWS still publishes documentation for some migration-related paths, including RDS instances not in a VPC and deprecated EC2 API operations. The AWS CLI was not installed in the local workspace, so CLI verification was performed against official AWS CLI documentation rather than local `--help` output.
