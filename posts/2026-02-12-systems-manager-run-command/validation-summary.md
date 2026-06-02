# Validation Summary: How to Use Systems Manager Run Command

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- AWS Systems Manager Run Command
- AWS Systems Manager SSM Agent
- AWS CLI
- Amazon EC2
- IAM instance profiles and AWS managed policies
- Amazon S3 command output logging
- Amazon CloudWatch Logs command output logging
- SSM Command documents
- EC2 Instance Metadata Service

## Sources Consulted
- AWS CLI Command Reference: `aws ssm send-command` - https://docs.aws.amazon.com/cli/latest/reference/ssm/send-command.html
- AWS CLI Command Reference: `aws ssm list-documents` - https://docs.aws.amazon.com/cli/latest/reference/ssm/list-documents.html
- AWS Systems Manager User Guide: Understanding command statuses - https://docs.aws.amazon.com/systems-manager/latest/userguide/monitor-commands.html
- AWS Systems Manager User Guide: Working with SSM Agent - https://docs.aws.amazon.com/systems-manager/latest/userguide/ssm-agent.html
- AWS Systems Manager User Guide: VPC endpoints for Systems Manager - https://docs.aws.amazon.com/systems-manager/latest/userguide/setup-create-vpc.html
- AWS Systems Manager User Guide: SSM document schemas, features, and examples - https://docs.aws.amazon.com/systems-manager/latest/userguide/documents-schemas-features.html
- AWS Systems Manager User Guide: Configure instance permissions required for Systems Manager - https://docs.aws.amazon.com/systems-manager/latest/userguide/setup-instance-permissions.html
- Amazon CloudWatch User Guide: Install the CloudWatch agent using AWS Systems Manager - https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/installing-cloudwatch-agent-ssm.html
- Amazon EC2 User Guide: Use the Instance Metadata Service to access instance metadata - https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/configuring-instance-metadata-service.html

## Issues Found
- The S3 output example used `netstat -tlnp`. `netstat` is from the older net-tools suite and is often absent on current Linux distributions. Changed it to `ss -tlnp`, the current iproute2 equivalent for listing listening TCP sockets and processes.
- The log collection script retrieved the EC2 instance ID with an IMDSv1 metadata request. Updated it to request an IMDSv2 token and pass the token when reading `instance-id`, so it works on instances where IMDSv2 is required.
- The CloudWatch agent example was labeled "Install or update the CloudWatch agent" while the `AmazonCloudWatch-ManageAgent` command shown configures and starts an already installed agent. Updated the comment to "Configure and start the CloudWatch agent" and added `optionalRestart:["yes"]`, matching the documented Run Command workflow.

## Review Notes
The Run Command syntax, target selectors, output configuration flags, rate control flags, built-in document names, custom Command document schema version 2.2 usage, and command status retrieval examples are consistent with current AWS documentation. The custom document uses raw parameter interpolation, which works, but future revisions could consider `interpolationType: ENV_VAR` for stronger command-injection protection when accepting untrusted parameter values.
