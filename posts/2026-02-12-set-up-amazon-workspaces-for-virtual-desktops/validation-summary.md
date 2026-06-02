# Validation Summary: How to Set Up Amazon WorkSpaces for Virtual Desktops

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- Amazon WorkSpaces Personal
- AWS Directory Service
- AWS CLI
- Amazon VPC, private subnets, and NAT Gateway
- Amazon CloudWatch metrics
- Python boto3 WorkSpaces client

## Sources Consulted
- AWS CLI Command Reference: register-workspace-directory - https://docs.aws.amazon.com/cli/latest/reference/workspaces/register-workspace-directory.html
- AWS CLI Command Reference: create-workspaces - https://docs.aws.amazon.com/cli/latest/reference/workspaces/create-workspaces.html
- AWS CLI Command Reference: create-workspace-bundle - https://docs.aws.amazon.com/cli/latest/reference/workspaces/create-workspace-bundle.html
- AWS CLI Command Reference: create-ip-group - https://awscli.amazonaws.com/v2/documentation/api/2.34.7/reference/workspaces/create-ip-group.html
- Amazon WorkSpaces Administration Guide: IP address and port requirements - https://docs.aws.amazon.com/workspaces/latest/adminguide/workspaces-port-requirements.html
- Amazon WorkSpaces Administration Guide: Manage the running mode - https://docs.aws.amazon.com/workspaces/latest/adminguide/running-mode.html
- Amazon WorkSpaces Administration Guide: CloudWatch metrics - https://docs.aws.amazon.com/workspaces/latest/adminguide/cloudwatch-metrics.html
- Amazon WorkSpaces Administration Guide: Self-service WorkSpace management - https://docs.aws.amazon.com/workspaces/latest/adminguide/enable-user-self-service-workspace-management.html
- Amazon WorkSpaces pricing - https://aws.amazon.com/workspaces-family/workspaces/pricing/
- AWS Directory Service CLI references for create-directory and create-microsoft-ad - https://docs.aws.amazon.com/cli/latest/reference/ds/

## Issues Found
- Removed the `--enable-work-docs` flag from `aws workspaces register-workspace-directory`. Current AWS CLI v2 documentation no longer lists this option, so leaving it would make the command fail on current CLI versions.
- Clarified AutoStop behavior. AWS documents AutoStop as stopping after the WorkSpace is disconnected and the configured timeout elapses, not simply after generic inactivity.
- Updated billing wording for AutoStop. AWS pricing uses hourly metering plus a monthly infrastructure/fixed fee, so the original "hourly rate" wording was incomplete.
- Qualified the "roughly 80 hours" break-even statement. The exact break-even point varies by Region, bundle, operating system, and volume sizes.
- Corrected network guidance so port requirements apply to WorkSpaces clients and client-side networks/firewalls, not VPC security groups for the WorkSpace itself.
- Updated protocol wording from WSP to DCV (formerly WSP) and added current port 443 fallback context for DCV desktop traffic.

## Review Notes
The remaining AWS CLI command shapes, WorkSpaces request fields, batch size of 25 WorkSpaces per create call, IP access control group rule format, and listed CloudWatch metric names match current AWS documentation. The local environment did not have the AWS CLI installed, so command validation was performed against official AWS documentation rather than local `aws help` output.
