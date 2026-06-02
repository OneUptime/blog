# Validation Summary: How to Fix 'Connection Timed Out' When Connecting to EC2

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Amazon EC2
- Amazon VPC
- AWS CLI
- Security groups
- Network ACLs
- Route tables and internet gateways
- Elastic IP addresses
- AWS Systems Manager Session Manager
- EC2 Instance Connect
- SSH and Linux host firewalls

## Sources Consulted
- Amazon EC2 User Guide: Troubleshoot issues connecting to your Amazon EC2 Linux instance - https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/TroubleshootingInstancesConnecting.html
- Amazon VPC User Guide: Subnet route tables - https://docs.aws.amazon.com/vpc/latest/userguide/subnet-route-tables.html
- Amazon VPC User Guide: Control subnet traffic with network access control lists - https://docs.aws.amazon.com/vpc/latest/userguide/vpc-network-acls.html
- Amazon VPC User Guide: Example network ACL rules for SSH access - https://docs.aws.amazon.com/vpc/latest/userguide/nacl-examples.html
- Amazon VPC User Guide: Default network ACL for a VPC - https://docs.aws.amazon.com/vpc/latest/userguide/default-network-acl.html
- Amazon EC2 User Guide: Security groups for your EC2 instances - https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/using-network-security.html
- Amazon EC2 User Guide: Amazon EC2 instance IP addressing - https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/using-instance-addressing.html
- AWS Systems Manager User Guide: Start a session - https://docs.aws.amazon.com/systems-manager/latest/userguide/session-manager-working-with-sessions-start.html
- Amazon EC2 User Guide: Connect to a Linux instance using EC2 Instance Connect - https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/ec2-instance-connect-methods.html
- AWS CLI Command Reference: ec2-instance-connect send-ssh-public-key - https://docs.aws.amazon.com/cli/latest/reference/ec2-instance-connect/send-ssh-public-key.html

## Issues Found
- The post said a timeout means traffic is not reaching the instance at all. This was too absolute because host firewalls can drop packets after they reach the instance. Changed the explanation to say the SSH client is not getting a TCP response and packets are usually being dropped between the client and SSH service.
- The post said to start an instance if it is stopped or terminated. Terminated EC2 instances cannot be started. Changed the guidance to start stopped instances and launch a replacement for terminated instances.
- The route table lookup only checked explicit subnet associations. AWS subnets can be implicitly associated with the VPC main route table. Added a fallback AWS CLI command to check the VPC main route table.
- The post said a stopped SSH daemon can cause a timeout if there is no firewall. With no listener and no packet-dropping firewall, the normal symptom is "Connection refused." Updated the statement accordingly.
- The EC2 Instance Connect example omitted the Availability Zone parameter used in AWS's documented `send-ssh-public-key` examples. Added `--availability-zone us-east-1a` to make the example align with the official documented workflow.

## Review Notes
The AWS CLI is not installed in this workspace, so command validation was performed against current official AWS documentation rather than local `aws --help` output.
