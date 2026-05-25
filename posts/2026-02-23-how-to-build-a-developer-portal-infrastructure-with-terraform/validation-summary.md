# Validation Summary: How to Build a Developer Portal Infrastructure with Terraform

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Terraform
- AWS RDS for PostgreSQL
- AWS ECS Fargate
- AWS Secrets Manager
- AWS Application Load Balancer
- Amazon Route 53
- Amazon Cognito
- Amazon S3
- AWS IAM
- Backstage
- Backstage TechDocs

## Sources Consulted
- HashiCorp Terraform `timestamp` function documentation: https://developer.hashicorp.com/terraform/language/functions/timestamp
- Terraform AWS provider `aws_db_instance` resource documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/db_instance
- Terraform AWS provider `aws_lb_listener` resource documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/lb_listener
- Terraform AWS provider `aws_security_group` resource documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/security_group
- Amazon ECS documentation for passing Secrets Manager secrets through environment variables: https://docs.aws.amazon.com/AmazonECS/latest/developerguide/secrets-envvar-secrets-manager.html
- Backstage OIDC auth provider documentation: https://backstage.io/docs/auth/oidc/
- Backstage AWS ALB auth provider documentation: https://backstage.io/docs/auth/aws-alb/provider/
- Backstage TechDocs configuration documentation: https://backstage.io/docs/features/techdocs/configuration/

## Issues Found
- The RDS final snapshot identifier used `timestamp()`, which changes on each apply and is not predictable during planning. Replaced it with a stable project-scoped final snapshot identifier.
- The ECS task pulled individual JSON keys from a Secrets Manager secret but did not pass the database name to the container. Added `POSTGRES_DATABASE` from the `dbname` key.
- The ECS task used Secrets Manager values but did not grant the task execution role `secretsmanager:GetSecretValue`. Added an execution-role inline policy for the database secret.
- The Cognito callback URL used `/api/auth/cognito/handler/frame`, but Backstage's official generic OIDC provider uses the `oidc` provider path unless a custom Cognito provider is implemented. Updated the callback URL to `/api/auth/oidc/handler/frame` and clarified the text.
- The ALB defined an HTTP listener for redirects but the ALB security group only allowed HTTPS ingress. Added port 80 ingress so the HTTP-to-HTTPS redirect can be reached.

## Review Notes
Terraform CLI was not installed in the local environment, so I could not run `terraform validate`. The snippets still reference supporting resources that are not shown in the article, such as IAM roles, the ECR repository, CloudWatch log group, VPC, subnets, and ACM certificate. That is acceptable for a focused blog excerpt, but a complete runnable module would need those resources and Backstage app configuration for database, OIDC, and TechDocs settings.
