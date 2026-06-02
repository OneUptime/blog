# Validation Summary: How to Set Up RDS in a Private Subnet

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Amazon RDS
- Amazon VPC
- AWS CLI
- EC2 security groups
- VPC route tables
- VPC network ACLs
- NAT Gateway
- AWS Systems Manager Session Manager
- Terraform AWS Provider

## Sources Consulted
- Amazon RDS User Guide: Working with a DB instance in a VPC - https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/USER_VPC.WorkingWithRDSInstanceinaVPC.html
- Amazon RDS User Guide: Creating an Amazon RDS DB instance - https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/USER_CreateDBInstance.html
- AWS CLI Command Reference: rds create-db-instance - https://docs.aws.amazon.com/cli/latest/reference/rds/create-db-instance.html
- AWS CLI Command Reference: rds create-db-subnet-group - https://docs.aws.amazon.com/cli/latest/reference/rds/create-db-subnet-group.html
- Amazon VPC User Guide: Enable internet access for a VPC using an internet gateway - https://docs.aws.amazon.com/vpc/latest/userguide/VPC_Internet_Gateway.html
- Amazon VPC User Guide: Subnet route tables - https://docs.aws.amazon.com/vpc/latest/userguide/subnet-route-tables.html
- Amazon VPC User Guide: DNS attributes for your VPC - https://docs.aws.amazon.com/vpc/latest/userguide/vpc-dns.html
- AWS CLI Command Reference: ec2 modify-vpc-attribute - https://docs.aws.amazon.com/cli/latest/reference/ec2/modify-vpc-attribute.html
- AWS CLI Command Reference: ec2 create-network-acl-entry - https://docs.aws.amazon.com/cli/latest/reference/ec2/create-network-acl-entry.html
- AWS CLI Command Reference: ec2 describe-network-acls - https://docs.aws.amazon.com/cli/latest/reference/ec2/describe-network-acls.html
- AWS CLI Command Reference: ec2 replace-network-acl-association - https://docs.aws.amazon.com/cli/latest/reference/ec2/replace-network-acl-association.html
- AWS Systems Manager User Guide: Start a session - https://docs.aws.amazon.com/systems-manager/latest/userguide/session-manager-working-with-sessions-start.html
- Terraform Registry: aws_db_subnet_group - https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/db_subnet_group.html

## Issues Found
- The VPC DNS section stated that DNS hostnames and DNS support must be enabled for RDS endpoints. AWS specifically requires DNS hostnames and DNS resolution for publicly accessible DB instances, while private endpoint resolution depends on DNS support through the Amazon-provided resolver. Updated the wording to distinguish DNS support from DNS hostnames.
- The custom NACL example created rules but did not associate the new NACL with the database subnets, so it would not actually restrict those subnets. Added commands to look up each subnet's current NACL association and replace it with the new database NACL.

## Review Notes
The AWS CLI examples, route table explanation, DB subnet group requirement, RDS `--no-publicly-accessible` usage, Session Manager port-forwarding example, NAT Gateway route pattern, and Terraform DB subnet group snippet are consistent with current official documentation. The AWS CLI was not installed in the local environment, so command verification was performed against official AWS CLI documentation instead of local `--help` output.
