# Validation Summary: How to Fix 'Permission Denied (publickey)' When SSH-ing to EC2

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Amazon EC2
- AWS CLI
- AWS Systems Manager Session Manager
- EC2 Instance Connect
- OpenSSH client and server
- Linux file permissions
- SELinux
- AppArmor

## Sources Consulted
- AWS EC2 User Guide: Manage system users on your Amazon EC2 Linux instance - https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/managing-users.html
- AWS EC2 User Guide: Add or replace a public key on your Linux instance - https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/replacing-key-pair.html
- AWS EC2 User Guide: Connect using EC2 Instance Connect - https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/connect-linux-inst-eic.html
- AWS EC2 User Guide: Install EC2 Instance Connect - https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/ec2-instance-connect-set-up.html
- AWS CLI Command Reference: ec2 describe-instances - https://docs.aws.amazon.com/cli/latest/reference/ec2/describe-instances.html
- AWS CLI Command Reference: ec2-instance-connect send-ssh-public-key - https://docs.aws.amazon.com/cli/latest/reference/ec2-instance-connect/send-ssh-public-key.html
- AWS CLI Command Reference: ssm start-session - https://docs.aws.amazon.com/cli/latest/reference/ssm/start-session.html
- AWS Systems Manager User Guide: ssm-user permissions - https://docs.aws.amazon.com/systems-manager/latest/userguide/session-manager-getting-started-ssm-user-permissions.html
- OpenSSH manual pages: ssh, ssh-add, and sshd_config - https://www.openbsd.org/openssh/manual.html
- Ubuntu Server documentation: OpenSSH server - https://ubuntu.com/server/docs/how-to/security/openssh-server/
- Red Hat Enterprise Linux documentation: OpenSSH server management - https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/

## Issues Found
- The default username table was too narrow for several AMIs. Updated CentOS, RHEL, SUSE, and Fedora entries to include documented alternatives from the AWS EC2 User Guide.
- The Session Manager recovery commands assumed direct access to `/home/ec2-user/.ssh` without privilege escalation. Updated the commands to use `sudo` and `sudo tee`, which matches the default Session Manager behavior of starting sessions as `ssm-user` with sudo permissions.
- The SSH daemon restart command only showed `systemctl restart sshd`, which is correct for Red Hat-family systems but not typical for Ubuntu/Debian. Added the `systemctl restart ssh` alternative.
- The EC2 Instance Connect preinstallation statement was imprecise. Updated it to list the documented AMI/version thresholds: AL2023 standard AMIs, Amazon Linux 2 2.0.20190618 or later, and Ubuntu 20.04 or later.

## Review Notes
The root volume detach/attach recovery procedure is technically plausible, but device names can vary on Nitro-based instances and across Linux distributions. Future improvements could mention checking `lsblk` before mounting.
