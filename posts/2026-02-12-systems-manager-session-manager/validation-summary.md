# Validation Summary: How to Use Systems Manager Session Manager for EC2 Access

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- AWS Systems Manager Session Manager
- Amazon EC2
- SSM Agent
- AWS IAM roles, instance profiles, and user policies
- AWS CLI
- Session Manager plugin
- VPC interface endpoints / AWS PrivateLink
- CloudTrail, CloudWatch Logs, Amazon S3, and AWS KMS session logging/encryption
- SSH and port forwarding through Session Manager

## Sources Consulted
- AWS Systems Manager Session Manager documentation: https://docs.aws.amazon.com/systems-manager/latest/userguide/session-manager.html
- AWS Session Manager setup and VPC endpoint documentation: https://docs.aws.amazon.com/systems-manager/latest/userguide/setup-create-vpc.html
- AWS Session Manager session document schema: https://docs.aws.amazon.com/systems-manager/latest/userguide/session-manager-schema.html
- AWS Session Manager logging documentation: https://docs.aws.amazon.com/systems-manager/latest/userguide/session-manager-logging.html
- AWS Session Manager sample IAM policies: https://docs.aws.amazon.com/systems-manager/latest/userguide/getting-started-restrict-access-quickstart.html
- AWS Session Manager preferences CLI documentation: https://docs.aws.amazon.com/systems-manager/latest/userguide/getting-started-configure-preferences-cli.html
- AWS SSM Agent preinstalled AMI documentation: https://docs.aws.amazon.com/systems-manager/latest/userguide/ami-preinstalled-agent.html
- AWS Session Manager plugin installation documentation: https://docs.aws.amazon.com/systems-manager/latest/userguide/session-manager-working-with-install-plugin.html
- AWS Session Manager plugin macOS installation documentation: https://docs.aws.amazon.com/systems-manager/latest/userguide/install-plugin-macos-overview.html
- AWS Session Manager plugin Debian/Ubuntu installation documentation: https://docs.aws.amazon.com/systems-manager/latest/userguide/install-plugin-debian-and-ubuntu.html

## Issues Found
- The Ubuntu snap service management commands were inaccurate for starting the SSM Agent. Replaced the systemd enable/start commands with `sudo snap start amazon-ssm-agent` and added separate verification commands for deb-based and snap-based installs.
- The Session Manager preferences JSON claimed CloudWatch streaming but omitted `cloudWatchStreamingEnabled`. Added the required setting.
- The KMS example used a 9-digit account ID in the ARN. Updated example account IDs to valid 12-digit AWS account IDs.
- The IAM user policy examples allowed `ssm:StartSession` only on EC2 instance ARNs. Added the default session document ARN and `ssmmessages:OpenDataChannel`, which AWS sample policies require for Session Manager access.
- The IAM policy examples did not include `kms:GenerateDataKey` even though the post configures a KMS key for session encryption. Added the KMS permission to match the configured preferences.
- The VPC endpoint section said only the three Session Manager endpoints were needed. Clarified that CloudWatch Logs or S3 endpoints are also needed when private instances send logs to those services.
- The audit section implied all Session Manager connection types can log commands and output. Clarified that command/output logging applies to standard sessions and is not available for port forwarding or SSH sessions.
- The KMS setting description said it encrypts session data in transit. Adjusted wording to match AWS terminology: KMS further encrypts session data between the client and managed node beyond TLS.

## Review Notes
The remaining examples are illustrative and use placeholder IDs, bucket names, security groups, and endpoints. The commands and JSON shapes were checked against current AWS documentation where possible; the local environment does not have the AWS CLI installed, so CLI behavior was verified against official AWS CLI and Systems Manager documentation rather than local `--help` output.
