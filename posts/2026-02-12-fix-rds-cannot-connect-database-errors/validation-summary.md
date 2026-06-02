# Validation Summary: How to Fix RDS 'Cannot Connect to Database' Errors

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Amazon RDS
- AWS CLI
- Amazon EC2 security groups
- Amazon VPC subnets, route tables, DNS attributes, and network ACLs
- AWS Systems Manager Session Manager port forwarding
- MySQL, MariaDB, PostgreSQL, SQL Server, and Oracle database connectivity
- RDS Proxy
- Amazon CloudWatch metrics

## Sources Consulted
- Amazon RDS User Guide: Viewing instance status - https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/accessing-monitoring.html
- Amazon RDS User Guide: Stopping and starting DB instances - https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/USER_StopInstance.html
- Amazon RDS User Guide: Controlling access with security groups - https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/Overview.RDSSecurityGroups.html
- Amazon RDS User Guide: Working with a DB instance in a VPC - https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/USER_VPC.WorkingWithRDSInstanceinaVPC.html
- Amazon RDS User Guide: Scenarios for accessing a DB instance in a VPC - https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/USER_VPC.Scenarios.html
- Amazon VPC User Guide: Network ACL basics - https://docs.aws.amazon.com/vpc/latest/userguide/vpc-network-acls.html
- Amazon VPC User Guide: Custom network ACLs and ephemeral ports - https://docs.aws.amazon.com/vpc/latest/userguide/custom-network-acl.html
- AWS Systems Manager User Guide: Starting a port forwarding session to a remote host - https://docs.aws.amazon.com/systems-manager/latest/userguide/session-manager-working-with-sessions-start.html
- AWS CLI Command Reference: start-session - https://docs.aws.amazon.com/cli/latest/reference/ssm/start-session.html
- AWS CLI Command Reference: modify-db-instance - https://awscli.amazonaws.com/v2/documentation/api/latest/reference/rds/modify-db-instance.html
- AWS CLI Command Reference: authorize-security-group-ingress - https://docs.aws.amazon.com/cli/latest/reference/ec2/authorize-security-group-ingress.html
- Amazon RDS User Guide: Quotas and constraints for maximum database connections - https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/CHAP_Limits.html
- Amazon RDS User Guide: RDS Proxy - https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/rds-proxy.html

## Issues Found
- The public accessibility wording said the RDS instance must be in a public subnet. AWS documents this requirement at the DB subnet group level: for a publicly accessible DB instance, the subnets in the DB subnet group must be public and have internet gateway routing. Updated the wording to refer to DB subnet group subnets.
- The private subnet wording implied that the public accessibility setting itself was impossible. Clarified that private DB subnet group subnets prevent direct internet reachability and that bastion, Session Manager, or VPN-style access should be used instead.
- The NACL guidance said to allow the database port in both directions. Because NACLs are stateless, return traffic generally uses client ephemeral ports. Updated the guidance to distinguish inbound database-port access from outbound ephemeral-port response traffic, and noted the corresponding client subnet NACL requirements.
- The VPC DNS command output wording said both commands should return `true`. The AWS CLI returns response objects with `Value` fields, so the text now says both `Value` fields should be `true`.

## Review Notes
The AWS CLI examples use current command names and options. The `--apply-immediately` flag on the `modify-db-instance --publicly-accessible` example is accepted by the AWS CLI, but AWS applies public accessibility changes immediately regardless of that flag. The post could eventually add route table inspection commands for public/private subnet validation, but the existing guidance is technically correct after the fixes above.
