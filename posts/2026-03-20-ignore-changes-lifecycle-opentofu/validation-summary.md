# Validation Summary: How to Use ignore_changes Lifecycle in OpenTofu

## Status
validated

## Post Type
Guide

## Technologies Covered
- OpenTofu
- HCL
- AWS Provider for Terraform/OpenTofu
- AWS EC2
- AWS Auto Scaling
- AWS RDS
- AWS S3

## Sources Consulted
- OpenTofu docs: Resource Behavior / lifecycle customizations — https://opentofu.org/docs/language/resources/behavior/
- OpenTofu docs: `timestamp` function — https://opentofu.org/docs/language/functions/timestamp/
- OpenTofu docs: `terraform_data` managed resource type — https://opentofu.org/docs/language/resources/tf-data/
- AWS provider docs: `aws_instance` — https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/instance
- AWS provider docs: `aws_autoscaling_group` — https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/autoscaling_group
- AWS provider docs: `aws_db_instance` — https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/db_instance
- AWS provider docs: `aws_ecs_task_definition` — https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/ecs_task_definition
- AWS provider docs: `aws_eks_cluster` — https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/eks_cluster

## Issues Found
1. The introduction and basic `aws_instance` example treated `ami` as though it were typically changed externally. `ignore_changes` does support ignoring `ami`, but that use case is about ignoring later configuration changes after creation, not an in-place external AMI mutation. I corrected the wording and inline comment.
2. The Auto Scaling Group examples were incomplete for real use because they omitted subnet or availability zone placement. I added `vpc_zone_identifier = var.subnet_ids` so the ASG snippets have the minimum required shape alongside `min_size`, `max_size`, and `launch_template`.
3. The tag example used `AutoScalingGroupName` on a standalone `aws_instance`, which was an inconsistent example of externally managed tags. I changed the ignored keys to generic automation-managed tags.
4. The RDS password example implied `ignore_changes = [password]` was primarily for externally rotated passwords. Current AWS provider docs support `manage_master_user_password` for Secrets Manager-managed passwords, and the plain `password` argument is better described as a bootstrap value whose later configuration changes should be ignored. I corrected the explanation and added the required `allocated_storage` argument.
5. The “Ignoring Computed Values” ECS example was technically wrong. `container_definitions` is a configured argument, not an AWS-computed revision counter, and the resource docs expose `revision` separately. I replaced the section with an official OpenTofu-supported pattern using `timestamp()` plus `terraform_data` and `ignore_changes` to preserve an initial creation-time value.
6. The “Nested Attribute Ignoring” section was mislabeled and the example comments were inaccurate. The example is really about ignoring multiple top-level ASG arguments, not nested attributes. I renamed the section and corrected the comments.
7. The S3 example used a fixed bucket name that is unlikely to be available globally. I changed it to `bucket_prefix` so the example is valid in practice.
8. The EKS lifecycle-combination example was inaccurate. The claim that EKS updates `kubernetes_network_config` during maintenance was not supported by the provider docs, and the snippet omitted required `role_arn` and `vpc_config`. I replaced it with a valid ASG example that accurately combines `create_before_destroy` with `ignore_changes`.

## Review Notes
- The examples still rely on surrounding configuration such as `var.subnet_ids` and `aws_launch_template.web`; that is acceptable for a focused guide, but those supporting values/resources must exist in a real deployment.
- `ignore_changes = all` is valid, but it effectively turns OpenTofu into create/delete-only management for that resource. The post already warns about this, and that warning is technically appropriate.
