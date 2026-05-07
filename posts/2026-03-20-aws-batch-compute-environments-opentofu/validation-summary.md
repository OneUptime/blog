# Validation Summary: How to Create AWS Batch Compute Environments with OpenTofu

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- OpenTofu CLI
- AWS Batch
- AWS IAM
- AWS EC2 Spot Fleet
- AWS Fargate
- AWS provider for Terraform/OpenTofu
- HCL

## Sources Consulted
- AWS Batch User Guide: Managed compute environments - https://docs.aws.amazon.com/batch/latest/userguide/managed_compute_environments.html
- AWS Batch User Guide: Create IAM roles for your compute environments and container instances - https://docs.aws.amazon.com/batch/latest/userguide/create-an-iam-role.html
- AWS Batch User Guide: Using roles for AWS Batch - https://docs.aws.amazon.com/batch/latest/userguide/using-service-linked-roles-batch-general.html
- AWS Batch User Guide: Amazon EC2 spot fleet role - https://docs.aws.amazon.com/batch/latest/userguide/spot_fleet_IAM_role.html
- AWS Batch User Guide: Create Amazon EC2 spot fleet roles with the AWS CLI - https://docs.aws.amazon.com/batch/latest/userguide/spot-fleet-roles-cli.html
- AWS CLI Command Reference: `create-compute-environment` - https://docs.aws.amazon.com/cli/latest/reference/batch/create-compute-environment.html
- OpenTofu docs: `tofu plan` - https://opentofu.org/docs/cli/commands/plan/
- OpenTofu docs: `tofu apply` - https://opentofu.org/docs/v1.11/cli/commands/apply/
- Terraform Registry: `aws_batch_compute_environment` - https://registry.terraform.io/providers/hashicorp/aws/6.43.0/docs/resources/batch_compute_environment.html
- Terraform Registry: AWS provider v6 upgrade guide - https://registry.terraform.io/providers/hashicorp/aws/latest/docs/guides/version-6-upgrade
- Terraform Registry: `aws_iam_service_linked_role` - https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/iam_service_linked_role

## Issues Found
- The post description said it covered managed and unmanaged compute environments, but the article only demonstrated managed EC2, Spot, and Fargate environments. I corrected the description to match the actual content.
- The `aws_batch_compute_environment` examples used `compute_environment_name`, which has been renamed to `name` in AWS provider v6. I updated all three compute environment resources to use the current argument name.
- The Spot compute environment referenced `aws_iam_role.spot_fleet.arn`, but no Spot Fleet IAM role was defined. I added the missing `spot_fleet` IAM role and attached the required `AmazonEC2SpotFleetTaggingRole` managed policy.
- Spot compute environments also require the EC2 Spot and EC2 Spot Fleet service-linked roles to exist. I added `aws_iam_service_linked_role` resources for `spot.amazonaws.com` and `spotfleet.amazonaws.com`.
- The Spot compute environment used `instance_type = ["optimal"]`. AWS documents that `optimal` changed behavior on November 1, 2025 and now maps to the newer x86 default selection. I replaced it with `default_x86_64` so the example uses the current explicit value.
- The compute environment resources were missing the `depends_on` relationship that the current AWS provider documentation recommends to avoid IAM policy attachment deletion races that can leave environments stuck in `DELETING`. I added the documented dependency to the examples.
- The IAM role comment and introduction text were slightly inaccurate for Fargate because they framed the configuration only around EC2 instances and instance types. I updated that wording to refer to compute resources more generally.

## Review Notes
- The post still uses a custom Batch service role with the `AWSBatchServiceRole` managed policy. This remains valid, but AWS now recommends using the `AWSServiceRoleForBatch` service-linked role, or allowing AWS Batch to create it automatically, especially for enhanced compute environment updates.
- `tofu` was not installed in the local review environment, so the deployment commands were validated against the official OpenTofu documentation rather than local CLI help output.
