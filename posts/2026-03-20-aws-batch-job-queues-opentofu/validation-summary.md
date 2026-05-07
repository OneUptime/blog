# Validation Summary: How to Create AWS Batch Job Queues with OpenTofu

## Status
validated

## Post Type
Guide

## Technologies Covered
- OpenTofu CLI
- HCL / OpenTofu configuration
- AWS Batch
- AWS IAM
- Amazon CloudWatch Logs
- Amazon ECR

## Sources Consulted
- AWS Batch job queues: https://docs.aws.amazon.com/batch/latest/userguide/job_queues.html
- AWS Batch `JobQueueDetail` API reference: https://docs.aws.amazon.com/batch/latest/APIReference/API_JobQueueDetail.html
- AWS Batch job definitions: https://docs.aws.amazon.com/batch/latest/userguide/job_definitions.html
- AWS Batch `ContainerProperties` API reference: https://docs.aws.amazon.com/batch/latest/APIReference/API_ContainerProperties.html
- AWS Batch automated job retries: https://docs.aws.amazon.com/batch/latest/userguide/job_retries.html
- AWS Batch `EvaluateOnExit` API reference: https://docs.aws.amazon.com/batch/latest/APIReference/API_EvaluateOnExit.html
- AWS Batch Spot best practices: https://docs.aws.amazon.com/us_en/batch/latest/userguide/bestpractice6.html
- Terraform AWS provider `aws_batch_job_queue`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/batch_job_queue
- Terraform AWS provider `aws_batch_job_definition`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/batch_job_definition
- Terraform AWS provider `aws_iam_role`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/iam_role
- Terraform AWS provider `aws_iam_role_policy`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/iam_role_policy
- OpenTofu `plan` command: https://opentofu.org/docs/cli/commands/plan/
- OpenTofu `apply` command: https://opentofu.org/docs/v1.11/cli/commands/apply/

## Issues Found
- The job definition used `vcpus` and `memory` inside `container_properties`. AWS Batch now documents both fields as deprecated for container job definitions in favor of `resourceRequirements`, so I replaced them with `VCPU` and `MEMORY` entries.
- The retry strategy used `action = "FAILED"` in `evaluate_on_exit`. AWS Batch only accepts `RETRY` or `EXIT` for this field, so I changed it to `EXIT`.
- The retry comment described `on_status_reason = "Host EC2*"` as a Spot-termination-only condition. AWS documents that pattern more broadly for host-caused failures and instance reclamation handling, so I corrected the comment.
- The introduction and summary implied that queue priority directly controls job execution order. AWS documents queue priority as affecting queue evaluation order, not guaranteeing strict execution order, so I revised that wording.

## Review Notes
- OpenTofu was not installed in this workspace on May 7, 2026, so CLI syntax was validated against the official OpenTofu documentation rather than local `tofu --help` output.
- The example job definition uses a host volume mounted from `/tmp`, which is appropriate for EC2-based AWS Batch compute environments like the EC2 and Spot examples shown here, but would not be appropriate for Fargate-based jobs.
