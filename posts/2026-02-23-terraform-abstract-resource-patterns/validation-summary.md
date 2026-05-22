# Validation Summary: How to Use Abstract Resource Patterns in Terraform

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Terraform language and modules
- Terraform input variable validation and optional object attributes
- AWS provider resources for ECS, Elastic Load Balancing, SQS, security groups, and RDS
- Google provider Cloud SQL resource
- Kubernetes provider ConfigMap resource

## Sources Consulted
- HashiCorp Terraform module block reference: https://developer.hashicorp.com/terraform/language/block/module
- HashiCorp Terraform type constraints and optional object attributes: https://developer.hashicorp.com/terraform/language/expressions/type-constraints
- HashiCorp AWS provider `aws_ecs_task_definition` resource: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/ecs_task_definition
- HashiCorp AWS provider `aws_ecs_service` resource: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/ecs_service
- HashiCorp AWS provider `aws_sqs_queue` resource: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/sqs_queue
- HashiCorp AWS provider `aws_db_instance` resource: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/db_instance
- HashiCorp Google provider `google_sql_database_instance` resource: https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/sql_database_instance
- HashiCorp Kubernetes provider `kubernetes_config_map` resource: https://registry.terraform.io/providers/hashicorp/kubernetes/latest/docs/resources/config_map

## Issues Found
- The `email_worker` example set `QUEUE_URL = module.email_worker.queue_url` inside the same `module "email_worker"` block. A module call cannot use its own output as one of its input values. Changed the example environment variable to a literal `LOG_LEVEL` value so the module call is acyclic.
- The adapter example used `source = "./modules/database/${var.cloud_provider}"`. Terraform module sources must be known during configuration loading and cannot be selected from a normal runtime variable in this form. Changed the example to show a concrete adapter source path, `source = "./modules/database/aws"`.
- The AWS database adapter output used `aws_db_instance.main.endpoint`, which is in `address:port` format. The GCP adapter outputs a host address and the consumer separately passes `DB_PORT`, so the AWS adapter now outputs `aws_db_instance.main.address` for a consistent host-only interface.

## Review Notes
- The ECS service example is intentionally illustrative and omits production details such as task execution roles, listener rules, IAM permissions, logging, and security group rules for load balancer ingress.
- The optional object attribute syntax requires a Terraform version that supports optional object attributes with defaults.
