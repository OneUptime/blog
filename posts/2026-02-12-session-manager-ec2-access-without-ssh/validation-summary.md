# Validation Summary: How to Set Up Session Manager for EC2 Access Without SSH

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- AWS Systems Manager Session Manager
- Amazon EC2
- AWS Identity and Access Management (IAM)
- AWS CLI
- AWS PrivateLink / VPC interface endpoints
- Amazon S3
- Amazon CloudWatch Logs
- Terraform AWS provider

## Sources Consulted
- AWS Systems Manager Session Manager overview: https://docs.aws.amazon.com/systems-manager/latest/userguide/session-manager.html
- AWS Session Manager prerequisites: https://docs.aws.amazon.com/systems-manager/latest/userguide/session-manager-prerequisites.html
- AWS SSM Agent preinstalled AMIs: https://docs.aws.amazon.com/systems-manager/latest/userguide/ami-preinstalled-agent.html
- AWS Session Manager instance profile permissions: https://docs.aws.amazon.com/systems-manager/latest/userguide/session-manager-getting-started-instance-profile.html
- AWS custom IAM role for Session Manager and logging: https://docs.aws.amazon.com/systems-manager/latest/userguide/getting-started-create-iam-instance-profile.html
- AWS managed policy AmazonSSMManagedInstanceCore: https://docs.aws.amazon.com/aws-managed-policy/latest/reference/AmazonSSMManagedInstanceCore.html
- AWS sample IAM policies for Session Manager: https://docs.aws.amazon.com/systems-manager/latest/userguide/getting-started-restrict-access-quickstart.html
- AWS additional Session Manager IAM policy examples: https://docs.aws.amazon.com/systems-manager/latest/userguide/getting-started-restrict-access-examples.html
- AWS start-session documentation, including port forwarding: https://docs.aws.amazon.com/systems-manager/latest/userguide/session-manager-working-with-sessions-start.html
- AWS Session Manager document schema: https://docs.aws.amazon.com/systems-manager/latest/userguide/session-manager-schema.html
- AWS update Session Manager preferences from CLI: https://docs.aws.amazon.com/systems-manager/latest/userguide/getting-started-configure-preferences-cli.html
- AWS Session Manager logging requirements and limitations: https://docs.aws.amazon.com/systems-manager/latest/userguide/session-manager-logging.html
- AWS Systems Manager VPC endpoint guidance: https://docs.aws.amazon.com/systems-manager/latest/userguide/setup-create-vpc.html
- AWS CLI run-instances command reference: https://docs.aws.amazon.com/cli/latest/reference/ec2/run-instances.html
- Terraform AWS provider aws_vpc_endpoint resource documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/vpc_endpoint

## Issues Found
- Corrected broad logging claims. Session Manager can log commands and output for standard shell sessions, but AWS documents that logging is not available for port forwarding or SSH sessions.
- Added the AWS CLI Session Manager plugin prerequisite, which AWS requires for running Session Manager session commands from the CLI.
- Adjusted the SSM Agent prerequisite wording because AWS says the agent is preinstalled on some AMIs and should still be verified.
- Fixed the end-user IAM policy by adding permission for the default session document and `ssmmessages:OpenDataChannel`, and by using the documented `${aws:userid}` session ARN pattern.
- Fixed the Session Manager preferences JSON by adding the required `cloudWatchStreamingEnabled` input.
- Changed the logging example so it does not enable S3 or CloudWatch encryption without first creating encrypted destinations, and added creation of the CloudWatch Logs log group.
- Disabled Run As in the logging preferences example because `ec2-user` does not exist on every supported OS and AWS says sessions fail if the configured Run As user is absent.
- Added a note that S3 and/or CloudWatch Logs endpoints are needed for log delivery when private instances use VPC endpoints without NAT.
- Added the SSM Agent version requirement for `AWS-StartPortForwardingSessionToRemoteHost`.

## Review Notes
The Terraform and AWS CLI examples use placeholder IDs and remain structurally valid. The logging permissions are called out in prose rather than expanded into a larger IAM policy to keep the tutorial focused.
