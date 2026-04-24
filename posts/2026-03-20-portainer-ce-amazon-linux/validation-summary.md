# Validation Summary: How to Install Portainer CE on Amazon Linux with Docker

## Status
validated

## Post Type
Guide

## Technologies Covered
- Portainer Community Edition
- Amazon Linux 2
- Amazon Linux 2023
- AWS EC2
- AWS Application Load Balancer
- AWS CloudWatch Agent
- Docker

## Sources Consulted
- Portainer install docs for Docker on Linux: https://docs.portainer.io/sts/start/install-ce/server/docker/linux
- Portainer requirements and port usage: https://docs.portainer.io/start/requirements-and-prerequisites
- Portainer lifecycle policy: https://docs.portainer.io/sts/start/lifecycle
- Portainer `--http-enabled` guidance: https://docs.portainer.io/faqs/troubleshooting/access-and-authentication/i-enabled-force-https-only-and-now-im-locked-out-of-portainer.-how-do-i-get-back-in
- Amazon Linux 2 Extras Library: https://docs.aws.amazon.com/linux/al2/ug/al2-extras.html
- Amazon Linux 2 release notes and end-of-life notice: https://docs.aws.amazon.com/AL2/latest/relnotes/relnotes-20260202.html
- Amazon Linux 2023 Docker installation guidance: https://docs.aws.amazon.com/AmazonECS/latest/developerguide/create-container-image.html
- Amazon Linux 2023 container runtime packages: https://docs.aws.amazon.com/linux/al2023/ug/ecs.html
- EC2 Instance Metadata Service (IMDSv2): https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/configuring-instance-metadata-service.html
- CloudWatch agent manual installation: https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/manual-installation.html
- CloudWatch agent startup command: https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/start-CloudWatch-Agent-on-premise-SSM-onprem.html
- CloudWatch agent configuration file reference: https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/CloudWatch-Agent-Configuration-File-Details.html
- Application Load Balancer health checks: https://docs.aws.amazon.com/elasticloadbalancing/latest/application/target-group-health-checks.html

## Issues Found
- The post treated Portainer port `8000` as mandatory. Portainer documents `8000` as optional and only needed for Edge Agent features, so the prerequisites and security group guidance were corrected.
- The EC2 metadata example used an unauthenticated IMDS request. Current AWS guidance uses IMDSv2 tokens, so the public IP lookup command was updated.
- The ALB `docker run` example included inline comments after line-continuation backslashes, which makes the shell command invalid. The command was rewritten so it parses correctly and still enables HTTP on port `9000`.
- The CloudWatch section wrote the agent config file without privileged redirection, started the agent service without fetching the custom configuration, and omitted the required instance IAM policy. The post now writes the file with `sudo tee`, tells readers to attach `CloudWatchAgentServerPolicy`, and starts the agent with `amazon-cloudwatch-agent-ctl -a fetch-config ...`.
- The conclusion implied that an ALB alone provides high availability. That overstates what the guide actually deploys, so the wording was corrected.

## Review Notes
- Amazon Linux 2 is still valid on the review date, but AWS states that Amazon Linux 2 reaches end of life on June 30, 2026. The guide remains usable today, but AL2023 is the better long-term target.
- As of April 24, 2026, Portainer's docs list Community `2.39.1` as the current LTS release and `2.40` as the current STS release. The post's `portainer/portainer-ce:latest` tag is still valid, but for production environments Portainer recommends staying on the latest LTS release in the chosen stream.
