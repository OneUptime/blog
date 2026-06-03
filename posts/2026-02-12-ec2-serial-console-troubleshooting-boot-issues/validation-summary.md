# Validation Summary: How to Use EC2 Serial Console for Troubleshooting Boot Issues

## Status
validated

## Post Type
Tutorial / troubleshooting guide

## Technologies Covered
- Amazon EC2
- EC2 Serial Console
- EC2 Instance Connect
- AWS CLI
- IAM policies
- Linux systemd getty
- GRUB boot configuration
- Terraform EC2 user data
- Linux troubleshooting commands

## Sources Consulted
- AWS EC2 User Guide: Configure access to the EC2 Serial Console - https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/configure-access-to-serial-console.html
- AWS EC2 User Guide: Prerequisites for the EC2 Serial Console - https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/ec2-serial-console-prerequisites.html
- AWS EC2 User Guide: Connect to the EC2 Serial Console - https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/connect-to-serial-console.html
- AWS CLI Command Reference: ec2-instance-connect send-serial-console-ssh-public-key - https://docs.aws.amazon.com/cli/latest/reference/ec2-instance-connect/send-serial-console-ssh-public-key.html

## Issues Found
- The IAM policy omitted `ec2:DescribeInstanceTypes`, which AWS includes with `ec2:DescribeInstances` and `ec2:GetSerialConsoleAccessStatus` for serial console access. Added it to the policy.
- The tag-based IAM condition used `ec2:ResourceTag/AllowSerialConsole`. AWS's serial console IAM example uses `aws:ResourceTag/...`, so the condition key was updated.
- The password setup section said SSH keys do not work for the serial console. That was misleading because CLI access uses an SSH key to authenticate to the EC2 Serial Console service, while Linux troubleshooting still requires a password-based OS user. Reworded the explanation.
- The `/etc/securetty` command was described as enabling password authentication for the serial console. `/etc/securetty` is relevant to root login on distributions that use it, not general password authentication for `ec2-user`. Reworded the comment.
- The CLI example did not specify the AWS Region while using a Region-specific serial console endpoint. Added `--region us-east-1` to match the endpoint.
- The GRUB example only added `console=ttyS0` and did not include AWS-documented GRUB serial terminal settings needed for GRUB interaction. Added `GRUB_TERMINAL` and `GRUB_SERIAL_COMMAND`, and noted the Ubuntu cloud image GRUB settings file.
- The Terraform user data regenerated GRUB only inside the `console=ttyS0` conditional and did not configure the GRUB serial terminal. Added the serial terminal settings and ensured `grub2-mkconfig` runs after those changes.

## Review Notes
The remaining troubleshooting commands are distribution-sensitive but technically plausible for the named Linux families. The Terraform example still stores the rescue password through Terraform input/state, which the post warns against for production by recommending Secrets Manager.
