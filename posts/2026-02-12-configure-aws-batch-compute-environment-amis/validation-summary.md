# Validation Summary: How to Configure AWS Batch Compute Environment AMIs

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- AWS Batch managed EC2 compute environments
- AWS Batch `ec2Configuration` and AMI selection
- Amazon ECS-optimized AMIs
- Amazon Linux 2023 and Amazon Linux 2
- Amazon EC2 AMI creation
- AWS Systems Manager Parameter Store
- EC2 Image Builder
- Docker host configuration

## Sources Consulted
- AWS Batch API Reference: Ec2Configuration - https://docs.aws.amazon.com/batch/latest/APIReference/API_Ec2Configuration.html
- AWS Batch User Guide: Compute resource AMIs - https://docs.aws.amazon.com/batch/latest/userguide/compute_resource_AMIs.html
- AWS Batch User Guide: Compute resource AMI specification - https://docs.aws.amazon.com/batch/latest/userguide/batch-ami-spec.html
- AWS Batch User Guide: Tutorial: Create a compute resource AMI - https://docs.aws.amazon.com/batch/latest/userguide/create-batch-ami.html
- AWS Batch User Guide: Use a GPU workload AMI - https://docs.aws.amazon.com/batch/latest/userguide/batch-gpu-ami.html
- AWS Batch User Guide: AMI selection order - https://docs.aws.amazon.com/batch/latest/userguide/ami-selection-order.html
- AWS CLI Command Reference: batch create-compute-environment - https://docs.aws.amazon.com/cli/latest/reference/batch/create-compute-environment.html
- Amazon ECS Developer Guide: Amazon ECS-optimized Linux AMIs - https://docs.aws.amazon.com/AmazonECS/latest/developerguide/ecs-optimized_AMI.html
- Amazon ECS Developer Guide: Retrieving Amazon ECS-optimized Linux AMI metadata - https://docs.aws.amazon.com/AmazonECS/latest/developerguide/retrieve-ecs-optimized_AMI.html
- Amazon ECS Developer Guide: Using EC2 Image Builder to build customized Amazon ECS-optimized AMIs - https://docs.aws.amazon.com/AmazonECS/latest/developerguide/image-builder-tutorial.html
- Amazon Linux 2023 User Guide: Package management tool - https://docs.aws.amazon.com/linux/al2023/ug/package-management.html

## Issues Found
- The post described Amazon Linux 2 AMIs as the default path for new AWS Batch ECS compute environments. Updated the default AMI discussion, table, examples, SSM parameter paths, and Image Builder parent image to prefer Amazon Linux 2023, matching AWS Batch's January 12, 2026 default change and June 30, 2026 AL2 creation block notice.
- The GPU example used `ECS_AL2_NVIDIA` and included `p3`. Updated it to `ECS_AL2023_NVIDIA` and removed `p3`, because AWS documents that `ECS_AL2023_NVIDIA` does not support `p3` or `g3` instance types.
- The post implied custom AMIs are required whenever GPU drivers are needed. Clarified that Batch provides GPU AMIs, and custom AMIs are needed for specific driver versions or other host customization.
- The dataset examples referred to pre-loading data on instance storage. Changed this to AMI-backed EBS volumes, because ephemeral instance store contents are not baked into an AMI.
- The AMI build steps omitted ECS agent checkpoint cleanup. Added `systemctl stop ecs` and removal of `/var/lib/ecs/data/*`, which AWS documents as required when the ECS agent has run before AMI creation.
- Updated AL2023 package-management commands from `yum` to `dnf` and removed the unverified `tripwire` package from the example.
- Replaced invalid placeholder AMI and instance IDs with syntactically valid placeholder IDs.

## Review Notes
- The AWS CLI is not installed in this workspace, so command validation was performed against official AWS CLI and service documentation rather than local `aws --help` output.
- The examples still use placeholder subnet, security group, role, and account values; users must replace them with real values in their own accounts.
