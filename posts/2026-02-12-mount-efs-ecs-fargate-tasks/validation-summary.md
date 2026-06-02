# Validation Summary: How to Mount EFS on ECS Fargate Tasks

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Amazon ECS
- AWS Fargate
- Amazon EFS
- EFS access points
- IAM policies
- AWS CLI
- AWS CloudFormation
- CloudWatch Logs

## Sources Consulted
- Amazon ECS Developer Guide: Specify an Amazon EFS file system in an Amazon ECS task definition: https://docs.aws.amazon.com/AmazonECS/latest/developerguide/specify-efs-config.html
- Amazon ECS Developer Guide: Best practices for using Amazon EFS volumes with Amazon ECS: https://docs.aws.amazon.com/AmazonECS/latest/developerguide/efs-best-practices.html
- Amazon ECS Developer Guide: Troubleshooting ResourceInitializationError errors: https://docs.aws.amazon.com/AmazonECS/latest/developerguide/resource-initialization-error.html
- Amazon ECS Developer Guide: Fargate Linux platform version change log: https://docs.aws.amazon.com/AmazonECS/latest/developerguide/platform-versions-changelog.html
- Amazon EFS User Guide: How Amazon EFS works: https://docs.aws.amazon.com/efs/latest/ug/how-it-works.html
- Amazon EFS User Guide: Features of Amazon EFS / data consistency: https://docs.aws.amazon.com/efs/latest/ug/features.html
- Amazon EFS User Guide: Using VPC security groups: https://docs.aws.amazon.com/efs/latest/ug/network-access.html
- AWS CLI Command Reference: efs create-access-point: https://docs.aws.amazon.com/cli/latest/reference/efs/create-access-point.html
- AWS CloudFormation Template Reference: AWS::ECS::TaskDefinition EFSVolumeConfiguration: https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/aws-properties-ecs-taskdefinition-efsvolumeconfiguration.html
- AWS CloudFormation Template Reference: AWS::ECS::Service: https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/aws-resource-ecs-service.html

## Issues Found
- The task definition used the `awslogs` log driver but did not mention that the `/ecs/web-app` CloudWatch log group must exist. Added an `aws logs create-log-group` command before task definition registration so the logging configuration can initialize successfully.
- The platform version prerequisite said platform version 1.4.0 is "the default now." Updated the wording to clarify that `LATEST` is the default when no platform version is specified, while 1.4.0 is the Fargate Linux platform version that added EFS support.
- The service section said files created by one task are "immediately visible" to others. Updated this to reference EFS/NFS close-to-open consistency semantics.
- The troubleshooting section said the task must run in a subnet that has an EFS mount target. Updated this to the more precise EFS model: one mount target per Availability Zone is enough, and tasks should run in Availability Zones with mount targets for best performance and availability.
- The slow startup section claimed TLS startup latency is usually under 2 seconds. Replaced the unsupported numeric claim with a qualified statement that TLS setup can add latency and that the impact depends on the task and network environment.

## Review Notes
The core ECS task definition fields, EFS authorization configuration, access point CLI syntax, IAM client actions, Fargate platform version requirement, and CloudFormation property names were consistent with current AWS documentation. The examples still use placeholder ARNs, subnet IDs, security group IDs, and file system IDs that must be replaced in a real deployment.
