# Validation Summary: How to Use AWS CLI to Manage EC2 Instances

## Status
validated

## Post Type
Technical guide / CLI tutorial

## Technologies Covered
- AWS CLI v2
- Amazon EC2
- EC2 instance lifecycle operations
- EC2 security groups
- Amazon Machine Images
- Amazon EBS volumes
- EC2 Instance Connect
- AWS Systems Manager Session Manager
- Bash automation scripts
- JMESPath queries

## Sources Consulted
- AWS CLI User Guide: Installing or updating the latest version of the AWS CLI - https://docs.aws.amazon.com/cli/latest/userguide/getting-started-install.html
- AWS CLI User Guide: Configuration and credential file settings / named profiles - https://docs.aws.amazon.com/cli/latest/userguide/cli-configure-files.html
- AWS CLI Command Reference: ec2 run-instances - https://docs.aws.amazon.com/cli/latest/reference/ec2/run-instances.html
- AWS CLI Command Reference: ec2 describe-instances - https://docs.aws.amazon.com/cli/latest/reference/ec2/describe-instances.html
- AWS CLI Command Reference: ec2 wait instance-running - https://docs.aws.amazon.com/cli/latest/reference/ec2/wait/instance-running.html
- AWS CLI Command Reference: ec2 modify-instance-attribute - https://docs.aws.amazon.com/cli/latest/reference/ec2/modify-instance-attribute.html
- AWS CLI Command Reference: ec2 authorize-security-group-ingress - https://docs.aws.amazon.com/cli/latest/reference/ec2/authorize-security-group-ingress.html
- AWS CLI Command Reference: ec2 revoke-security-group-ingress - https://docs.aws.amazon.com/cli/latest/reference/ec2/revoke-security-group-ingress.html
- AWS CLI Command Reference: ec2 create-image - https://docs.aws.amazon.com/cli/latest/reference/ec2/create-image.html
- AWS CLI Command Reference: ec2 describe-volumes - https://docs.aws.amazon.com/cli/latest/reference/ec2/describe-volumes.html
- AWS CLI Command Reference: ec2-instance-connect ssh - https://docs.aws.amazon.com/cli/latest/reference/ec2-instance-connect/ssh.html
- AWS CLI Command Reference: ec2-instance-connect send-ssh-public-key - https://docs.aws.amazon.com/cli/latest/reference/ec2-instance-connect/send-ssh-public-key.html
- AWS Systems Manager User Guide: Start a session - https://docs.aws.amazon.com/systems-manager/latest/userguide/session-manager-working-with-sessions-start.html
- AWS Systems Manager User Guide: Session Manager prerequisites - https://docs.aws.amazon.com/systems-manager/latest/userguide/session-manager-prerequisites.html

## Issues Found
- Several placeholder AWS resource IDs were too short or contained invalid characters, especially instance IDs such as `i-0abc123` and `i-0ghi789`. Updated the examples to use valid-looking EC2, AMI, VPC, subnet, and security group ID formats.
- The termination protection comment said "Enable/disable termination protection", but the shown `--disable-api-termination` command only enables termination protection. Updated the comment to "Enable termination protection".
- The "Find and clean up unattached EBS volumes" heading overstated the script behavior because the script only lists available volumes. Updated the heading to "Find unattached EBS volumes".
- The "Get a cost estimate based on running instances" heading overstated the script behavior because it counts running instances by type but does not calculate pricing. Updated the heading to "Count running instances by type for cost review".
- The EC2 Instance Connect example used `send-ssh-public-key`, which pushes a public key but does not itself start an SSH session. Replaced it with the current `aws ec2-instance-connect ssh` command for connecting by instance ID.
- The Session Manager command was correct, but the comment did not mention setup prerequisites. Updated the comment to note that Session Manager setup is required.

## Review Notes
The commands are generally accurate for AWS CLI v2 and Unix-like shell quoting. Users still need to replace placeholder IDs, AMI IDs, key names, profiles, and script paths with values from their own AWS account and region. Session Manager also requires a managed instance with the necessary SSM Agent, IAM permissions, and local CLI/plugin prerequisites.
