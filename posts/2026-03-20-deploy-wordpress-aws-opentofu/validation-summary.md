# Validation Summary: How to Deploy a WordPress Site with OpenTofu on AWS

## Status
validated

## Post Type
Guide

## Technologies Covered
- OpenTofu
- AWS VPC
- Amazon ECS Fargate
- Amazon RDS for MySQL
- Amazon EFS
- AWS Secrets Manager
- Amazon CloudFront
- WordPress Docker Official Image

## Sources Consulted
- OpenTofu write-only attributes docs: https://opentofu.org/docs/v1.11/language/ephemerality/write-only-attributes/
- AWS provider `aws_db_instance` docs: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/db_instance
- `terraform-aws-vpc` module README: https://github.com/terraform-aws-modules/terraform-aws-vpc/blob/master/README.md
- Amazon ECS task networking for Fargate: https://docs.aws.amazon.com/AmazonECS/latest/developerguide/fargate-task-networking.html
- Amazon ECS secrets injection from Secrets Manager: https://docs.aws.amazon.com/AmazonECS/latest/developerguide/secrets-envvar-secrets-manager.html
- Amazon ECS EFS task definition configuration: https://docs.aws.amazon.com/AmazonECS/latest/developerguide/specify-efs-config.html
- WordPress Docker Official Image docs: https://github.com/docker-library/docs/blob/master/wordpress/README.md
- AWS Shield Standard overview: https://docs.aws.amazon.com/waf/latest/developerguide/ddos-standard-summary.html
- AWS WordPress best practices for dynamic content with CloudFront: https://docs.aws.amazon.com/whitepapers/latest/best-practices-wordpress/dynamic-content.html

## Issues Found
- The VPC example placed ECS tasks in private subnets but did not enable NAT gateways. For this architecture, the tasks need outbound connectivity to pull the WordPress image and reach launch-time dependencies. I added `enable_nat_gateway = true` to the VPC module example.
- The RDS example set `skip_final_snapshot = false` without a `final_snapshot_identifier`. The AWS provider requires `final_snapshot_identifier` when final snapshot creation is enabled, so I added `final_snapshot_identifier = "wordpress-${var.environment}-final"`.
- The ECS task definition pinned the container image to `wordpress:6.4-apache`, which is stale relative to the current official WordPress image tags. I updated it to `wordpress:6.9-apache`.
- The summary recommended write-only attributes without noting the OpenTofu version requirement. I updated the wording to specify that this applies with OpenTofu 1.11+.

## Review Notes
- The post is now technically accurate after the fixes above.
- The snippets are partial examples and assume supporting resources such as the ALB, target group, IAM roles, Secrets Manager secret, and related security groups already exist.
- Using CloudFront in front of WordPress is valid, but cache behavior for dynamic pages, cookies, and headers must be configured carefully to avoid caching personalized or administrative content.
