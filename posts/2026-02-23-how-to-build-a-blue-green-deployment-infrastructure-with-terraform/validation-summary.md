# Validation Summary: How to Build a Blue-Green Deployment Infrastructure with Terraform

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform
- AWS Application Load Balancer
- AWS Auto Scaling Groups
- AWS Launch Templates
- Amazon RDS for PostgreSQL
- AWS Lambda
- AWS Step Functions
- Amazon SNS
- Amazon CloudWatch
- Amazon Route53

## Sources Consulted
- HashiCorp Terraform AWS provider documentation for `aws_lb_listener`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/lb_listener
- HashiCorp Terraform AWS provider documentation for `aws_lb_target_group`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/lb_target_group
- HashiCorp Terraform AWS provider documentation for `aws_autoscaling_group`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/autoscaling_group
- HashiCorp Terraform AWS provider documentation for `aws_db_instance`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/db_instance
- HashiCorp Terraform AWS provider documentation for `aws_lambda_function`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/lambda_function
- AWS Elastic Load Balancing documentation for ALB target groups and weighted target group behavior: https://docs.aws.amazon.com/elasticloadbalancing/latest/application/load-balancer-target-groups.html
- AWS Step Functions documentation for Task states and service integrations: https://docs.aws.amazon.com/step-functions/latest/dg/state-task.html
- AWS Step Functions documentation for publishing to Amazon SNS: https://docs.aws.amazon.com/step-functions/latest/dg/connect-sns.html
- Amazon RDS for PostgreSQL release notes and supported version guidance: https://docs.aws.amazon.com/AmazonRDS/latest/PostgreSQLReleaseNotes/postgresql-versions.html

## Issues Found
- The description and architecture claimed DNS-based switching with Route53, but the implementation switches traffic through ALB weighted target groups. Updated the description and architecture bullet so Route53 is only described as an optional alias to the ALB.
- The blue-green explanation said there is never a mixed state and that switchover is atomic, but the workflow uses weighted traffic shifting, which intentionally creates a mixed traffic state. Updated the explanation to distinguish direct blue-green cutover from canary-style weighted routing.
- The RDS snippet pinned PostgreSQL `15.4`, which Amazon RDS documents as having reached end of standard support. Changed the snippet to use major version `15` so RDS can select a supported minor release for that major version.
- The RDS snippet omitted required or practically necessary creation settings for a new DB instance, including allocated storage, master credentials, subnet group, and security group IDs. Added those fields and matching variables.
- The ASG desired capacity was tied directly to traffic weights. This made `green_weight = 0` scale green to zero instances, preventing pre-cutover deployment and health validation. Added `blue_enabled` and `green_enabled` variables so capacity and traffic routing are controlled separately.
- The Lambda health validator used the ALB DNS name as `HEALTH_CHECK_URL`. With green at weight 0, that URL would route to blue and would not validate green before cutover. Removed that environment variable so the validator is based on the green target group ARN.
- The rollback wording said rollback is just reverting weights, even after describing scaling down blue. Updated the wording to clarify that fast rollback by weights only applies while the previous environment is still enabled.

## Review Notes
- The Terraform snippets remain illustrative and still assume surrounding resources such as VPCs, subnets, security groups, IAM roles, ACM certificates, and Lambda package files exist.
- Target group names have AWS length limits, so real modules should constrain `var.environment` or use shorter generated names.
- ALB weighted target groups do not replace application-level compatibility checks. Shared database migrations still need backward-compatible schema changes.
