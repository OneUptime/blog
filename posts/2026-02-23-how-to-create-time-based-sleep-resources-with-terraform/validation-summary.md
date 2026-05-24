# Validation Summary: How to Create Time-Based Sleep Resources with Terraform

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform (>= 1.5.0)
- HashiCorp Time Provider (`hashicorp/time` ~> 0.11) — `time_sleep` resource
- HashiCorp AWS Provider (`hashicorp/aws` ~> 5.0)
- AWS services: IAM, Lambda, Route53, ACM, RDS (PostgreSQL), ElastiCache (Redis), ECS (Fargate), EC2, ELB target groups, VPC security groups

## Sources Consulted
- Terraform Time Provider — `time_sleep` resource: https://registry.terraform.io/providers/hashicorp/time/latest/docs/resources/sleep
- Terraform AWS Provider — `aws_instance`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/instance
- Terraform AWS Provider — `aws_iam_role`, `aws_iam_role_policy_attachment`, `aws_lambda_function`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/
- Terraform AWS Provider — `aws_route53_record`, `aws_acm_certificate`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/route53_record
- Terraform AWS Provider — `aws_db_instance`, `aws_elasticache_cluster`, `aws_ecs_service`, `aws_lb_target_group_attachment`
- AWS Lambda Runtimes documentation (python3.11 is a supported runtime)

## Issues Found
- **`aws_instance` argument mismatch for VPC security groups**: The final "When sleep is NOT needed" example created a security group with `vpc_id` set (a VPC security group) but referenced it on `aws_instance` via the `security_groups` argument. Per the AWS provider docs, `security_groups` is for EC2-Classic / default VPC and expects security group *names*; for VPC security groups passed by ID, the correct argument is `vpc_security_group_ids`. Changed `security_groups = [aws_security_group.app.id]` to `vpc_security_group_ids = [aws_security_group.app.id]` and adjusted alignment.

## Review Notes
- The `time_sleep` resource attributes used (`create_duration`, `destroy_duration`, `triggers`, `depends_on`) are all correct per the provider docs. At least one of `create_duration`/`destroy_duration` must be set; the `graceful-destroy` example sets both, which is valid.
- The `time` provider version constraint `~> 0.11` is acceptable but slightly conservative — it pins to the 0.11.x line and won't pick up 0.12.x. Not incorrect, just a constraint choice.
- For `aws_elasticache_cluster` with `engine = "redis"`, `num_cache_nodes = 1` is correct (Redis cluster mode disabled requires exactly 1 node here).
- The `aws_db_instance` password "temporary" is 9 characters (≥8 required for PostgreSQL), so it passes validation, though hardcoded credentials are obviously illustrative only.
- The `aws_route53_record` `alias` block correctly omits `ttl`, which is required behavior for alias records.
- The IAM propagation delay guidance (up to ~30s for `sts:AssumeRole` to work after role creation) reflects commonly observed AWS behavior and is a well-known use case for `time_sleep`.
