# Validation Summary: How to Deploy a Multi-AZ Architecture with OpenTofu on AWS

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTofu (Terraform-compatible HCL)
- AWS provider (hashicorp/aws)
- AWS VPC, subnets, NAT Gateway
- AWS RDS (PostgreSQL, Multi-AZ)
- AWS ECS (services, task definitions)
- AWS Availability Zones
- Mermaid (diagram syntax)

## Sources Consulted
- AWS Terraform provider — `aws_ecs_service` resource: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/ecs_service
- AWS Terraform provider — `aws_db_instance` resource: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/db_instance
- AWS Terraform provider — `aws_subnet` resource: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/subnet
- AWS Terraform provider — `aws_availability_zones` data source: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/data-sources/availability_zones
- AWS ECS task placement documentation (constraints vs. strategies): https://docs.aws.amazon.com/AmazonECS/latest/developerguide/task-placement.html
- AWS RDS Multi-AZ deployments documentation: https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/Concepts.MultiAZ.html
- OpenTofu language functions (`min`, `length`, `slice`, `cidrsubnet`): https://opentofu.org/docs/language/functions/

## Issues Found

1. **Incorrect ECS placement mechanism for forcing AZ spread.** The original snippet used `placement_constraints { type = "distinctInstance" }` with the comment "Force spreading across AZs". This is technically wrong:
   - `distinctInstance` only ensures each task runs on a different EC2 container instance; it makes no AZ-spreading guarantee. If all instances happened to be in one AZ, tasks would still co-locate.
   - It is also EC2-launch-type only (not supported on Fargate).
   - The correct AWS-documented pattern for spreading tasks across AZs is `ordered_placement_strategy` with `type = "spread"` and `field = "attribute:ecs.availability-zone"`.

   **Fix:** Replaced the `placement_constraints` block with an `ordered_placement_strategy` block using `spread` on `attribute:ecs.availability-zone`, and clarified the comment to note this applies to the EC2 launch type.

## Review Notes
- The remaining HCL is syntactically and semantically correct: `aws_availability_zones` data source, `cidrsubnet()` math for non-overlapping public/private subnet CIDRs, `aws_nat_gateway` per-AZ pattern, and `aws_db_instance` with `multi_az = true` (the classic single-standby Multi-AZ instance deployment — note: Multi-AZ DB *clusters* with two readable standbys are a separate feature exposed via `aws_rds_cluster`, but the post's "Active-standby across two AZs" comment is accurate for `aws_db_instance`).
- The example assumes supporting resources (e.g., `aws_eip.nat`, `aws_db_subnet_group.main`, `aws_security_group.rds`, `aws_security_group.ecs`, `aws_ecs_cluster.main`, `aws_ecs_task_definition.app`) are defined elsewhere; this is reasonable for a focused tutorial.
- For Fargate users, `ordered_placement_strategy` is also unsupported — Fargate spreads tasks across the AZs of the supplied subnets automatically. A future revision could call out the launch-type distinction explicitly.
- The post does not pin AWS provider or OpenTofu versions; readers should pin versions in real deployments to avoid breakage from future provider releases.
