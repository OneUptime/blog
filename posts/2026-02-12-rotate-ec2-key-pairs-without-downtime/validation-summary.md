# Validation Summary: How to Rotate EC2 Key Pairs Without Downtime

## Status
validated

## Post Type
Technical guide / tutorial

## Technologies Covered
- Amazon EC2 key pairs
- SSH and OpenSSH `ssh-keygen`
- Linux `authorized_keys`
- AWS Systems Manager Run Command
- AWS Systems Manager Session Manager
- AWS CLI
- IAM managed policy `AmazonSSMManagedInstanceCore`
- AWS CloudTrail, Amazon S3, and Amazon CloudWatch Logs for Session Manager logging

## Sources Consulted
- Amazon EC2 User Guide: Amazon EC2 key pairs and instances: https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/ec2-key-pairs.html
- Amazon EC2 User Guide: Create a key pair for your Amazon EC2 instance: https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/create-key-pairs.html
- AWS CLI Command Reference: `aws ssm send-command`: https://docs.aws.amazon.com/cli/latest/reference/ssm/send-command.html
- AWS CLI Command Reference: `aws ssm wait command-executed`: https://docs.aws.amazon.com/cli/latest/reference/ssm/wait/command-executed.html
- AWS CLI Command Reference: `aws ec2 import-key-pair`: https://docs.aws.amazon.com/cli/latest/reference/ec2/import-key-pair.html
- Amazon EC2 User Guide: Connect to your Amazon EC2 instance using Session Manager: https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/connect-with-systems-manager-session-manager.html
- AWS Systems Manager User Guide: Start a session: https://docs.aws.amazon.com/systems-manager/latest/userguide/session-manager-working-with-sessions-start.html
- AWS Systems Manager User Guide: Session Manager logging: https://docs.aws.amazon.com/systems-manager/latest/userguide/session-manager-logging.html
- AWS Systems Manager User Guide: Logging session activity: https://docs.aws.amazon.com/systems-manager/latest/userguide/session-manager-auditing.html
- Local OpenSSH `ssh-keygen` usage output for key type and option syntax.

## Issues Found
- The post described ED25519 as "more secure than RSA" and implied RSA might be required by an instance. AWS documents EC2 support for RSA and ED25519, with ED25519 for Linux instances only and not for Windows instances. I changed the wording to say ED25519 is supported for Linux instances and RSA may be needed for older clients, older servers, or Windows workflows.
- The manual and SSM key-removal examples used plain `grep -v` with an identifier that might be a fingerprint or other pattern-like value. Because `grep` treats its pattern as a regular expression by default, metacharacters could remove the wrong lines. I changed those examples to `grep -F -v` for fixed-string matching.
- The manual removal comment referred to `OLD_KEY_CONTENT`, but the command used `OLD_KEY_IDENTIFIER`. I corrected the comment so the placeholder is consistent.
- The automated fleet script waited for only the first SSM command invocation and ignored waiter failure with `|| true`, then proceeded to SSH verification and key removal. Since `aws ssm wait command-executed` waits for a single managed node invocation, this could miss failures on other targets. I updated the script to collect all invocation instance IDs, abort if none are found, and wait for each invocation.
- The Session Manager section overstated audit logging by saying Session Manager provides "full audit logging" and "every session is logged." AWS documents CloudTrail logging for Session Manager API activity and optional session data logging to S3 or CloudWatch Logs. AWS also documents that session-data logging is not available for SSH sessions through Session Manager because SSH encrypts the tunneled data. I changed the wording to distinguish CloudTrail API logging, configurable interactive session data logging, and the SSH-over-Session-Manager limitation.

## Review Notes
The remaining commands and explanations are technically consistent with AWS documentation. The SSM examples assume the target Linux user is `ec2-user` and that the user's `.ssh` directory already exists, which is reasonable for an EC2 SSH key rotation guide but should be adapted for Ubuntu, Debian, or custom AMIs.
