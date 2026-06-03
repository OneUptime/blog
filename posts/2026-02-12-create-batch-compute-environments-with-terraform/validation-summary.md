# Validation Summary: How to Create Batch Compute Environments with Terraform

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- AWS Batch
- Terraform
- AWS IAM
- Amazon ECS
- AWS Fargate
- Amazon EC2 Spot Instances
- Amazon CloudWatch Logs
- Amazon S3

## Sources Consulted
- AWS Batch User Guide: Job queues - https://docs.aws.amazon.com/batch/latest/userguide/job_queues.html
- AWS Batch User Guide: Create a job queue - https://docs.aws.amazon.com/batch/latest/userguide/create-job-queue.html
- AWS CLI Command Reference: batch create-compute-environment - https://docs.aws.amazon.com/cli/latest/reference/batch/create-compute-environment.html
- AWS Batch User Guide: Using roles for AWS Batch - https://docs.aws.amazon.com/batch/latest/userguide/using-service-linked-roles-batch-general.html
- AWS Batch User Guide: Check your account's Amazon ECS instance role - https://docs.aws.amazon.com/batch/latest/userguide/batch-check-ecsinstancerole.html
- AWS Batch User Guide: Amazon EC2 spot fleet role - https://docs.aws.amazon.com/batch/latest/userguide/spot_fleet_IAM_role.html
- AWS Batch User Guide: Job definitions on Fargate - https://docs.aws.amazon.com/batch/latest/userguide/fargate-job-definitions.html
- AWS Batch API Reference: EvaluateOnExit - https://docs.aws.amazon.com/batch/latest/APIReference/API_EvaluateOnExit.html
- AWS Batch API Reference: RetryStrategy - https://docs.aws.amazon.com/batch/latest/APIReference/API_RetryStrategy.html
- Terraform Registry: aws_batch_compute_environment - https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/batch_compute_environment
- Terraform Registry: aws_batch_job_definition - https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/batch_job_definition

## Issues Found
- The Batch service role example used a manually created `AWSBatchServiceRole`. Updated it to use the AWS Batch service-linked role, which is the current AWS-recommended role model for Batch compute environments.
- The EC2 and GPU compute environment snippets omitted the required ECS instance profile for EC2-backed compute resources. Added an EC2-assumable ECS instance role, attached `AmazonEC2ContainerServiceforEC2Role`, created an instance profile, and referenced it with `instance_role`.
- The Spot compute environment referenced `aws_iam_role.spot_fleet` without defining it. Added a Spot Fleet role with the recommended `AmazonEC2SpotFleetTaggingRole` managed policy.
- The Spot allocation explanation said `SPOT_PRICE_CAPACITY_OPTIMIZED` chooses the cheapest capacity. Updated it to explain that AWS Batch considers both price and interruption risk.
- The GPU compute environment used `ECS_AL2_NVIDIA` and included `p3.2xlarge`. Updated the image type to `ECS_AL2023_NVIDIA` and replaced `p3.2xlarge` with `p4d.24xlarge`, because AWS Batch now defaults ECS compute environments to AL2023 and the AL2023 NVIDIA image does not support P3/G3 instance types.
- The high priority queue comment incorrectly said it used on-demand EC2 while the queue pointed to the Fargate compute environment. Corrected the comment to say Fargate.
- The retry strategy used `on_reason = "Host EC2*"` and `on_exit_code = "*"`. Updated the host failure match to `on_status_reason = "Host EC2*"` and changed the fallback exit rule to `on_reason = "*"`, matching AWS Batch retry strategy examples and API semantics.
- Clarified that the shown Fargate job definition should be submitted to a Fargate queue, and that the EC2 Spot queue needs a separate EC2 job definition.

## Review Notes
- `aws_iam_service_linked_role.batch` is appropriate for a fresh Terraform-managed account, but existing AWS accounts may already have `AWSServiceRoleForBatch`; in that case, teams should import the existing role or omit `service_role` and let AWS Batch use the service-linked role.
- The snippets still rely on prerequisite variables and resources such as `var.vpc_id`, `var.private_subnet_ids`, `var.data_bucket`, `var.ecr_repo_url`, `var.aws_region`, and `var.environment`.
