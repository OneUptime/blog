# Validation Summary: How to Create and Use EC2 Key Pairs for SSH Access

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Amazon EC2
- EC2 key pairs
- SSH and OpenSSH key files
- AWS CLI
- AWS Systems Manager Session Manager
- EC2 Instance Connect

## Sources Consulted
- Amazon EC2 User Guide: Create a key pair for your Amazon EC2 instance: https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/create-key-pairs.html
- AWS CLI Command Reference: `aws ec2 create-key-pair`: https://docs.aws.amazon.com/cli/latest/reference/ec2/create-key-pair.html
- AWS CLI Command Reference: `aws ec2 import-key-pair`: https://docs.aws.amazon.com/cli/latest/reference/ec2/import-key-pair.html
- AWS CLI Command Reference: `aws ec2-instance-connect send-ssh-public-key`: https://docs.aws.amazon.com/cli/latest/reference/ec2-instance-connect/send-ssh-public-key.html
- Amazon EC2 User Guide: Connect to your Linux instance using EC2 Instance Connect: https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/connect-linux-inst-eic.html
- AWS Systems Manager User Guide: Start a session: https://docs.aws.amazon.com/systems-manager/latest/userguide/session-manager-working-with-sessions-start.html
- OneUptime referenced guide: How to Connect to an EC2 Instance Using SSH: https://oneuptime.com/blog/post/2026-02-12-connect-to-ec2-instance-using-ssh/view

## Issues Found
No technical issues found.

## Review Notes
The post focuses on Linux SSH access, where RSA and ED25519 EC2 key pairs are supported. AWS documents that ED25519 keys are not supported for Windows instances, but the article consistently frames the workflow around Linux SSH access. The AWS CLI `create-key-pair` examples are valid without `--key-format pem` because PEM is the documented default, though adding the flag would make the examples more explicit in a future style pass.
