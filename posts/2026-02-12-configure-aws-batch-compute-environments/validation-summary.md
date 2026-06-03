# Validation Summary: How to Configure AWS Batch Compute Environments

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- AWS Batch compute environments
- AWS CLI
- Amazon EC2 On-Demand and Spot Instances
- AWS Fargate
- Amazon ECS optimized AMIs
- EC2 launch templates
- IAM roles and instance profiles

## Sources Consulted
- AWS CLI Command Reference: `aws batch create-compute-environment` - https://docs.aws.amazon.com/cli/latest/reference/batch/create-compute-environment.html
- AWS CLI Command Reference: `aws batch update-compute-environment` - https://docs.aws.amazon.com/cli/latest/reference/batch/update-compute-environment.html
- AWS Batch User Guide: Managed compute environments - https://docs.aws.amazon.com/batch/latest/userguide/managed_compute_environments.html
- AWS Batch User Guide: Create a compute environment - https://docs.aws.amazon.com/batch/latest/userguide/create-compute-environment.html
- AWS Batch User Guide: Instance type allocation strategies - https://docs.aws.amazon.com/batch/latest/userguide/allocation-strategies.html
- AWS Batch User Guide: Perform scaling updates - https://docs.aws.amazon.com/batch/latest/userguide/scaling-updates.html
- AWS Batch User Guide: Update a compute environment - https://docs.aws.amazon.com/batch/latest/userguide/updating-compute-environments.html
- AWS Batch User Guide: Fargate compute environments - https://docs.aws.amazon.com/batch/latest/userguide/fargate-compute-environments.html

## Issues Found
- The post described AWS Batch as supporting exactly three compute environment types. Updated this to the current managed/unmanaged framing and clarified that the listed options are common ECS-backed workload options.
- The Spot example used `SPOT_CAPACITY_OPTIMIZED` as the recommended strategy. AWS currently recommends `SPOT_PRICE_CAPACITY_OPTIMIZED` for most Spot workloads, so the example and explanation were updated.
- The Spot example explicitly set `bidPercentage` to `100`. This is valid, but AWS recommends leaving the field empty for most use cases and the default is already 100%, so the example now omits it and explains the default.
- The GPU example used `ECS_AL2_NVIDIA`. AWS has announced Batch-provided ECS Amazon Linux 2 AMI creation blocking effective June 30, 2026, so the example now uses `ECS_AL2023_NVIDIA`.
- The GPU example mixed `ECS_AL2023_NVIDIA`-incompatible legacy GPU instance families once updated. Removed `p3` instances and used `g4dn`/`g5` examples that fit the AL2023 NVIDIA guidance.
- The custom AMI example used `ECS_AL2`. Updated it to `ECS_AL2023` to align with the current AWS Batch default and AL2 migration guidance.
- The scaling guidance treated `desiredvCpus` as a general hint. Updated it to note that Batch manages the value and that it should not be used to scale down an existing environment.
- The `maxvCpus` guidance omitted the documented exception where certain allocation strategies can exceed `maxvCpus` by up to one instance. Added that caveat.

## Review Notes
The AWS CLI snippets use placeholder subnet, security group, IAM, and AMI identifiers and require account-specific substitutions before execution. The shell snippets were checked with `bash -n` after edits.
