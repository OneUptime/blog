# Validation Summary: How to Use Dapr AWS Bindings with Instance Profiles

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Dapr (bindings, sidecar architecture)
- AWS EC2 Instance Profiles and IAM Roles
- AWS ECS Task Roles
- AWS DynamoDB (as binding target)
- AWS S3 (as binding target)
- AWS IMDSv2 (Instance Metadata Service v2)
- AWS CLI (IAM, EC2, STS, ECS commands)

## Sources Consulted
- Dapr AWS DynamoDB binding component reference (https://docs.dapr.io/reference/components-reference/supported-bindings/dynamodb/)
- AWS IAM CLI reference for `create-role`, `put-role-policy`, `create-instance-profile`, `add-role-to-instance-profile`
- AWS EC2 CLI reference for `associate-iam-instance-profile`, `modify-instance-metadata-options`
- AWS IAM ARN format documentation (https://docs.aws.amazon.com/IAM/latest/UserGuide/reference-arns.html)
- AWS ECS task role documentation (https://docs.aws.amazon.com/AmazonECS/latest/developerguide/task-iam-roles.html)
- AWS IMDSv2 documentation (https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/configuring-instance-metadata-service.html)
- Cross-referenced with other validated Dapr AWS blog posts in this repository

## Issues Found
No technical issues found.

## Review Notes
- The `--http-put-response-hop-limit 1` in the IMDSv2 section is correct for processes running directly on an EC2 host. However, if Dapr is run inside Docker containers on EC2 (not ECS), the hop limit should be set to 2 to allow the IMDSv2 token PUT request to traverse the container network namespace. The post covers ECS separately (which uses task role credentials, not IMDS), so this is not an error, but readers running Dapr in Docker on EC2 should be aware.
- The `--region us-east-1` flag on `aws sts get-caller-identity` is unnecessary (STS works against the global endpoint by default) but is not incorrect.
- The Dapr component spec (`apiVersion: dapr.io/v1alpha1`, type `bindings.aws.dynamodb`, version `v1`, metadata fields `table` and `region`) is all correct per official Dapr documentation.
- All AWS CLI commands use valid subcommands, flags, and parameter syntax.
- IAM ARNs correctly use the double-colon format (`arn:aws:iam::ACCOUNT:role/NAME`) since IAM is a global service with no region segment.
- The ECS task role trust policy correctly uses `ecs-tasks.amazonaws.com` as the service principal.
