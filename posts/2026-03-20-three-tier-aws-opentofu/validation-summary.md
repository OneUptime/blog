# Validation Summary: How to Build a Three-Tier Web Application Architecture with OpenTofu on AWS

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTofu
- HCL
- AWS VPC
- terraform-aws-modules VPC module
- Application Load Balancer
- Amazon ECS Fargate
- Amazon ECR
- AWS Secrets Manager
- Amazon RDS Aurora PostgreSQL
- AWS KMS
- Amazon CloudWatch Logs

## Sources Consulted
- OpenTofu module source documentation: https://opentofu.org/docs/v1.9/language/modules/sources/
- OpenTofu `depends_on` meta-argument documentation: https://opentofu.org/docs/v1.11/language/meta-arguments/depends_on/
- terraform-aws-modules VPC module documentation: https://github.com/terraform-aws-modules/terraform-aws-vpc
- Terraform AWS Provider `aws_lb` documentation: https://github.com/hashicorp/terraform-provider-aws/blob/main/website/docs/r/lb.html.markdown
- Terraform AWS Provider `aws_lb_listener` documentation: https://github.com/hashicorp/terraform-provider-aws/blob/main/website/docs/r/lb_listener.html.markdown
- Terraform AWS Provider `aws_ecs_task_definition` documentation: https://github.com/hashicorp/terraform-provider-aws/blob/main/website/docs/r/ecs_task_definition.html.markdown
- Terraform AWS Provider `aws_ecs_service` documentation: https://github.com/hashicorp/terraform-provider-aws/blob/main/website/docs/r/ecs_service.html.markdown
- Terraform AWS Provider `aws_rds_cluster` documentation: https://github.com/hashicorp/terraform-provider-aws/blob/main/website/docs/r/rds_cluster.html.markdown
- Terraform AWS Provider `aws_rds_cluster_instance` documentation: https://github.com/hashicorp/terraform-provider-aws/blob/main/website/docs/r/rds_cluster_instance.html.markdown
- Amazon ECS Application Load Balancer documentation: https://docs.aws.amazon.com/AmazonECS/latest/developerguide/alb.html
- Amazon ECS Secrets Manager environment variable documentation: https://docs.aws.amazon.com/AmazonECS/latest/developerguide/secrets-envvar-secrets-manager.html
- Amazon RDS password management with Secrets Manager: https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/rds-secrets-manager.html
- AWS Secrets Manager Aurora integration documentation: https://docs.aws.amazon.com/secretsmanager/latest/userguide/integrating-AUR.html
- AWS Aurora PostgreSQL version announcement for 15.17: https://aws.amazon.com/about-aws/whats-new/2026/04/amazon-aurora-postgresql-17-9-16-13-15-17-14-22/
- Elastic Load Balancing access log documentation: https://docs.aws.amazon.com/elasticloadbalancing/latest/application/enable-access-logging.html
- Elastic Load Balancing security policy documentation: https://docs.aws.amazon.com/elasticloadbalancing/latest/application/describe-ssl-policies.html

## Issues Found
- The overview described the presentation tier as "load balancer + static assets," but the architecture shown provisions an Application Load Balancer and does not include static asset hosting. Changed the wording to "Application Load Balancer."
- The VPC module snippet set `single_nat_gateway = false` with a "One per AZ" comment. The module documents `one_nat_gateway_per_az = true` as the explicit one-per-AZ mode, so I added that argument.
- The ALB and ECS snippets referenced `aws_lb_target_group.app` without defining it. Added an `aws_lb_target_group` configured with `target_type = "ip"`, which AWS requires for ECS tasks using `awsvpc` networking/Fargate.
- The ECS task injected `DB_PASSWORD` from `aws_secretsmanager_secret.db_password.arn`, but the RDS cluster uses `manage_master_user_password = true`. Changed the secret reference to `aws_rds_cluster.aurora.master_user_secret[0].secret_arn` and selected the `password` JSON key using the ECS Secrets Manager ARN suffix syntax.
- The ECS service could be created before the target group is associated with the ALB listener because it does not directly reference the listener. Added an explicit `depends_on` for the HTTPS listener with a short comment explaining the hidden dependency.
- The Aurora PostgreSQL engine version was `15.4`, which is older than the current AWS-announced PostgreSQL 15 minor version. Updated it to `15.17` and made the cluster instances inherit `engine` and `engine_version` from the cluster.
- The summary said Aurora accepts connections from the application subnet. With security groups, the accurate restriction is from the application security group, so I corrected that wording and clarified that containers receive traffic from the ALB and connect to the database.

## Review Notes
The snippets remain focused examples and still assume prerequisite resources such as security groups, ACM certificate, S3 log bucket and bucket policy, IAM roles, ECR repository, KMS key, and CloudWatch log group are defined elsewhere. For a future full deployment post, consider adding those prerequisites or explicitly labeling the snippets as excerpts. ALB access logging also requires the S3 bucket to be in the same Region with the required Elastic Load Balancing write policy.
