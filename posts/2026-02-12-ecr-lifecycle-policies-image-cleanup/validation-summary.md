# Validation Summary: How to Configure ECR Lifecycle Policies for Image Cleanup

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Amazon ECR lifecycle policies
- AWS CLI
- Terraform AWS provider
- Docker container image tags
- Amazon ECS image usage considerations

## Sources Consulted
- Amazon ECR User Guide: Automate the cleanup of images by using lifecycle policies in Amazon ECR: https://docs.aws.amazon.com/AmazonECR/latest/userguide/LifecyclePolicies.html
- Amazon ECR User Guide: Lifecycle policy properties in Amazon ECR: https://docs.aws.amazon.com/AmazonECR/latest/userguide/lifecycle_policy_parameters.html
- Amazon ECR User Guide: Examples of lifecycle policies in Amazon ECR: https://docs.aws.amazon.com/AmazonECR/latest/userguide/lifecycle_policy_examples.html
- AWS CLI Command Reference: ecr put-lifecycle-policy: https://docs.aws.amazon.com/cli/latest/reference/ecr/put-lifecycle-policy.html
- AWS CLI Command Reference: ecr start-lifecycle-policy-preview: https://docs.aws.amazon.com/cli/latest/reference/ecr/start-lifecycle-policy-preview.html
- AWS CLI Command Reference: ecr get-lifecycle-policy-preview: https://docs.aws.amazon.com/cli/latest/reference/ecr/get-lifecycle-policy-preview.html
- HashiCorp Terraform Registry: aws_ecr_lifecycle_policy: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/ecr_lifecycle_policy
- Amazon ECR pricing: https://aws.amazon.com/ecr/pricing/
- Amazon ECS Developer Guide: Container image pull behavior for EC2 and external instances: https://docs.aws.amazon.com/AmazonECS/latest/developerguide/pull-behavior.html
- Amazon ECS Developer Guide: CannotPullContainer task errors: https://docs.aws.amazon.com/AmazonECS/latest/developerguide/task_cannot_pull_image.html

## Issues Found
- Corrected the lifecycle action description. The post said the action is always `expire`; current ECR lifecycle policies also support `transition` to archive storage, although the cleanup examples correctly use `expire`.
- Corrected lifecycle policy evaluation wording. AWS documents that all rules are evaluated at the same time and then applied by priority, rather than being processed sequentially in priority order.
- Corrected tag prefix matching guidance. Multiple `tagPrefixList` values in one rule are matched as an AND condition, not OR. The production policy now uses separate rules for `feature-` and `pr-` tags.
- Corrected the rule priority example description. The `tagStatus: "any"` rule applies to all images, not only tagged images, and it expires images older than the specified age.
- Corrected the all-repositories Terraform policy description from "Keep last 30 tagged images" to "Keep last 30 images" because `tagStatus: "any"` includes tagged and untagged images.
- Corrected the ECS gotcha. ECR lifecycle policies do not protect images just because an ECS task definition references them; deleting an image can break future task starts or rollbacks that need to pull it.

## Review Notes
The AWS CLI commands and Terraform resource usage are valid. Pricing is region- and storage-class-sensitive in practice, but the $0.10/GB-month example matches AWS's standard private repository pricing example.
