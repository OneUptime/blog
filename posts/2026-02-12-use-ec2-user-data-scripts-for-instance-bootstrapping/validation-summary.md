# Validation Summary: How to Use EC2 User Data Scripts for Instance Bootstrapping

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Amazon EC2
- EC2 user data
- AWS CLI
- Amazon Linux 2023
- cloud-init
- EC2Launch
- Nginx
- Node.js and npm
- PM2
- Docker and Docker Compose
- Amazon CloudWatch Agent
- Amazon S3
- EC2 launch templates

## Sources Consulted
- Amazon EC2 User Guide: Run commands when you launch an EC2 instance with user data input - https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/user-data.html
- Amazon EC2 User Guide: Access instance metadata for an EC2 instance - https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/instancedata-data-retrieval.html
- AWS CLI Command Reference: ec2 run-instances - https://docs.aws.amazon.com/cli/latest/reference/ec2/run-instances.html
- Amazon EC2 Auto Scaling User Guide: Examples for creating and managing launch templates with the AWS CLI - https://docs.aws.amazon.com/autoscaling/ec2/userguide/examples-launch-templates-aws-cli.html
- Amazon Linux 2023 User Guide: Package management tool - https://docs.aws.amazon.com/linux/al2023/ug/package-management.html
- cloud-init documentation: User data formats - https://docs.cloud-init.io/en/25.1/topics/format.html
- cloud-init documentation: Directory layout - https://docs.cloud-init.io/en/22.4.2/topics/dir_layout.html
- Amazon CloudWatch User Guide: CloudWatch Agent configuration file details - https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/CloudWatch-Agent-Configuration-File-Details.html
- Amazon CloudWatch User Guide: Download the CloudWatch agent package - https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/download-CloudWatch-Agent-on-EC2-Instance-commandline-first.html
- Docker Docs: Install the Docker Compose plugin - https://docs.docker.com/compose/install/linux/
- PM2 Documentation: Startup Hook - https://pm2.io/docs/runtime/guide/startup-hook/
- NodeSource distributions repository - https://github.com/nodesource/distributions

## Issues Found
- The console instructions used `#!/bin/python3` as the Python shebang example. Changed it to `#!/usr/bin/python3`, which is the conventional interpreter path on Amazon Linux and most Linux distributions.
- The inline AWS CLI user data example heading implied the user supplied base64 text. Clarified that `aws ec2 run-instances --user-data` is automatically base64 encoded by the AWS CLI.
- The CloudWatch Agent memory metric example used `mem_used_percent` in the `mem.measurement` configuration. Changed it to `used_percent`, matching AWS's documented CloudWatch Agent configuration examples for memory metrics.
- The debugging command used IMDSv1-only metadata access. Replaced it with an IMDSv2 token flow so it works on instances where IMDSv2 is required.

## Review Notes
- Amazon Linux 2023 uses DNF as the default package manager, but AWS documents that `yum` remains available as a pointer to `dnf`, so the `yum` commands are acceptable for the examples.
- The Docker Compose example pins `v2.24.0`; this is syntactically valid, but future maintenance should periodically update pinned tool versions.
- The S3 examples assume the instance has an IAM instance profile with the required S3 permissions, consistent with AWS guidance for using AWS CLI commands in user data.
