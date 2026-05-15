# Validation Summary: How to Use AWS Systems Manager with RHEL Instances

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- AWS Systems Manager
- SSM Agent
- AWS CLI
- Amazon EC2 IAM instance profiles
- RHEL 8 and RHEL 9
- Systems Manager Session Manager
- Systems Manager Patch Manager
- Systems Manager Inventory

## Sources Consulted
- AWS Systems Manager: Install SSM Agent on RHEL 8.x, 9.x, and 10.x: https://docs.aws.amazon.com/systems-manager/latest/userguide/agent-install-rhel-8-9.html
- AWS Systems Manager: Configure instance permissions required for Systems Manager: https://docs.aws.amazon.com/systems-manager/latest/userguide/setup-instance-permissions.html
- AWS Systems Manager Session Manager: https://docs.aws.amazon.com/systems-manager/latest/userguide/session-manager.html
- AWS CLI `ssm start-session` command reference: https://docs.aws.amazon.com/cli/latest/reference/ssm/start-session.html
- AWS CLI `ssm send-command` command reference: https://docs.aws.amazon.com/cli/latest/reference/ssm/send-command.html
- AWS CLI `ssm create-patch-baseline` command reference: https://docs.aws.amazon.com/cli/latest/reference/ssm/create-patch-baseline.html
- AWS Systems Manager Patch Manager patch baselines: https://docs.aws.amazon.com/systems-manager/latest/userguide/sysman-patch-baselines.html
- AWS CLI `ssm create-maintenance-window` command reference: https://docs.aws.amazon.com/cli/latest/reference/ssm/create-maintenance-window.html
- AWS Systems Manager Inventory CLI configuration: https://docs.aws.amazon.com/systems-manager/latest/userguide/inventory-collection-cli.html
- AWS CLI `ssm get-inventory` command reference: https://docs.aws.amazon.com/cli/latest/reference/ssm/get-inventory.html
- AWS CLI `ec2 associate-iam-instance-profile` command reference: https://docs.aws.amazon.com/cli/latest/reference/ec2/associate-iam-instance-profile.html

## Issues Found
- The architecture diagram showed Systems Manager connecting directly to the SSM Agent. I changed the arrows so the agents point to Systems Manager, which better reflects SSM Agent establishing outbound communication and avoids implying inbound connectivity to the instances.
- The inventory viewing command used `--result-attributes "TypeName=AWS:Application"`. Current AWS CLI/API documentation lists `AWS:InstanceInformation` as the valid `ResultAttributes` type name. I changed the example to filter by instance ID and query the `AWS:Application` inventory data from the returned entity instead.

## Review Notes
- The SSM Agent install command shown is the official global x86_64 RPM URL for RHEL 8, 9, and 10. ARM64 RHEL instances require the `linux_arm64` RPM URL.
- `aws ssm start-session` requires the Session Manager plugin on the client machine when using the AWS CLI.
- Managed instances still need outbound HTTPS connectivity to Systems Manager endpoints, either over the internet/NAT path or through VPC endpoints.
