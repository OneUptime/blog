# Validation Summary: How to Connect to an EC2 Instance Using SSH

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Amazon EC2
- SSH and OpenSSH
- EC2 key pairs
- EC2 Instance Connect
- AWS Systems Manager Session Manager
- PuTTY and PuTTYgen
- SCP
- SSH local port forwarding

## Sources Consulted
- AWS EC2 User Guide: Connect to your Linux instance using an SSH client - https://docs.aws.amazon.com/en_us/AWSEC2/latest/UserGuide/AccessingInstancesLinux.html
- AWS EC2 User Guide: General connection prerequisites - https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/connection-prereqs-general.html
- AWS EC2 User Guide: Manage system users on your Amazon EC2 Linux instance - https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/managing-users.html
- AWS EC2 User Guide: Connect to a Linux instance using EC2 Instance Connect - https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/ec2-instance-connect-methods.html
- AWS EC2 User Guide: Install EC2 Instance Connect on your EC2 instances - https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/ec2-instance-connect-set-up.html
- AWS EC2 User Guide: Connect to your Linux instance using PuTTY - https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/connect-linux-inst-from-windows.html
- AWS EC2 User Guide: Connect to your Amazon EC2 instance using Session Manager - https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/connect-with-systems-manager-session-manager.html
- AWS EC2 User Guide: Troubleshoot issues connecting to your Amazon EC2 Linux instance - https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/TroubleshootingInstancesConnecting.html
- Microsoft Learn: Windows Terminal SSH - https://learn.microsoft.com/en-us/windows/terminal/tutorials/ssh
- OpenBSD manual: ssh-keygen(1) - https://man.openbsd.org/ssh-keygen.1

## Issues Found
- The post stated that an instance with no public IP is in a private subnet. This is not always true; a public-subnet instance can also lack an assigned public IPv4 address. Updated the wording to say it may be in a private subnet or may not have a public address assigned, and added EC2 Instance Connect Endpoint as another valid private-connectivity option.
- The SSH config example used `StrictHostKeyChecking no`, which disables normal host-key protection and is not appropriate for a security-focused guide. Changed it to `StrictHostKeyChecking accept-new`, which still avoids repeated first-connect prompts for new hosts while preserving protection against changed host keys.
- The PuTTY instructions told readers to enter only the public IP in the Host Name field. AWS documentation recommends entering `instance-user-name@instance-public-dns-name` or equivalent. Updated the instruction to include the username.

## Review Notes
- The default username table matches AWS documentation for the listed AMI families, though some distributions have multiple possible usernames depending on AMI provider, such as CentOS, Fedora, RHEL, and SUSE.
- EC2 Instance Connect availability is version-specific: it is preinstalled on AL2023 standard AMIs, Amazon Linux 2 2.0.20190618 or later, and Ubuntu 20.04 or later. The post's high-level statement is accurate for common current AMIs.
