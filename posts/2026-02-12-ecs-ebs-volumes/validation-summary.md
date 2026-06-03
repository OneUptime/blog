# Validation Summary: How to Configure ECS with EBS Volumes

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Amazon ECS
- AWS Fargate
- Amazon EBS
- Amazon EFS
- AWS CLI
- Terraform AWS provider
- IAM
- Docker volume plugins

## Sources Consulted
- Amazon ECS Developer Guide: Use Amazon EBS volumes with Amazon ECS: https://docs.aws.amazon.com/AmazonECS/latest/developerguide/ebs-volumes.html
- Amazon ECS Developer Guide: Specify Amazon EBS volume configuration at Amazon ECS deployment: https://docs.aws.amazon.com/AmazonECS/latest/developerguide/configure-ebs-volume.html
- Amazon ECS API Reference: Volume: https://docs.aws.amazon.com/AmazonECS/latest/APIReference/API_Volume.html
- Amazon ECS API Reference: ServiceManagedEBSVolumeConfiguration: https://docs.aws.amazon.com/AmazonECS/latest/APIReference/API_ServiceManagedEBSVolumeConfiguration.html
- AWS CLI Command Reference: aws ecs create-service: https://docs.aws.amazon.com/cli/latest/reference/ecs/create-service.html
- Amazon ECS Developer Guide: Amazon ECS infrastructure IAM role: https://docs.aws.amazon.com/AmazonECS/latest/developerguide/infrastructure_IAM_role.html
- Amazon EBS User Guide: Amazon EBS volume types: https://docs.aws.amazon.com/ebs/latest/userguide/ebs-volume-types.html
- Terraform Registry: aws_ecs_service resource: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/ecs_service
- OneUptime linked EFS post, verified HTTP 200: https://oneuptime.com/blog/post/2026-02-12-ecs-efs-persistent-storage/view

## Issues Found
- The post implied all ECS-managed EBS volumes can be retained after task termination. AWS documents that only standalone task volumes can be retained; volumes attached to service-managed tasks are always deleted. Updated the lifecycle explanation and EBS/EFS comparison table.
- Terraform used `filesystem_type`, but the `aws_ecs_service.managed_ebs_volume` argument is `file_system_type`. Updated the Terraform example.
- Example AWS account IDs in IAM ARNs used 9 digits. AWS account IDs are 12 digits, so the placeholders were updated to `123456789012`.
- Two `aws ecs create-service` examples only included `--volume-configurations`, which would not run as complete commands. Added the required service, cluster, task definition, desired count, launch type, and network configuration options.
- The `io2` description said ECS-managed EBS volumes support up to 64,000 IOPS. The current ECS API reference lists `io2` support up to 256,000 IOPS. Updated the value.
- The `st1` description said it has no random I/O performance. AWS describes HDD-backed volumes as optimized for large streaming workloads, so the wording was corrected to say `st1` is not designed for small, random I/O.

## Review Notes
AWS CLI and Terraform binaries were not installed in the local environment, so command and provider schema validation was performed against official AWS CLI, ECS API, ECS Developer Guide, EBS User Guide, and Terraform Registry documentation.
