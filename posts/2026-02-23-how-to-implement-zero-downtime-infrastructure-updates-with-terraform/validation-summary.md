# Validation Summary: How to Implement Zero-Downtime Infrastructure Updates with Terraform

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Terraform
- HashiCorp Terraform lifecycle meta-arguments
- AWS provider for Terraform
- Amazon EC2
- Elastic Load Balancing / Application Load Balancer
- Amazon EC2 Auto Scaling Groups and instance refresh
- Amazon RDS Blue/Green Deployments
- Amazon ECS services
- Amazon Route 53 weighted routing
- HashiCorp HTTP provider

## Sources Consulted
- Terraform lifecycle meta-argument reference: https://docs.hashicorp.com/terraform/language/meta-arguments/lifecycle
- Terraform AWS provider `aws_lb_listener_rule` resource documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/lb_listener_rule
- Terraform AWS provider `aws_autoscaling_group` resource documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/autoscaling_group
- Terraform AWS provider `aws_db_instance` resource documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/db_instance
- AWS RDS Blue/Green Deployments supported engines documentation: https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/Concepts.RDS_Fea_Regions_DB-eng.Feature.BlueGreenDeployments.html
- Terraform AWS provider `aws_ecs_service` resource documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/ecs_service
- Amazon ECS deployment configuration API reference: https://docs.aws.amazon.com/AmazonECS/latest/APIReference/API_DeploymentConfiguration.html
- Terraform AWS provider `aws_route53_record` resource documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/route53_record
- HashiCorp HTTP provider `http` data source documentation: https://registry.terraform.io/providers/hashicorp/http/latest/docs/data-sources/http
- Terraform AWS provider `aws_instance` resource documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/instance

## Issues Found
- The blue-green `aws_lb_listener_rule` example omitted a required `condition` block. Added a `path_pattern` condition so the listener rule is structurally valid.
- The Auto Scaling Group example used `version = "$Latest"` while also enabling instance refresh `auto_rollback`. The AWS provider documentation recommends using the launch template `latest_version` attribute to trigger refreshes, and rollback support is not compatible with `$Latest`/`$Default` launch template versions. Changed the launch template version to `aws_launch_template.app.latest_version`.
- The Auto Scaling Group name included the launch template latest version, which would cause an ASG name change instead of demonstrating an in-place instance refresh. Changed the ASG name to a stable value.
- The RDS blue/green example omitted `backup_retention_period`, which the AWS provider requires to be greater than zero for low-downtime updates and RDS Blue/Green deployments. Added `backup_retention_period = 7`.
- The RDS example omitted basic DB instance creation fields that are required for a new PostgreSQL DB instance in the common case. Added `allocated_storage`, `db_name`, `username`, and `password` fields using variables for credentials.

## Review Notes
The examples remain illustrative and still assume surrounding resources and variables exist, such as load balancers, target groups, subnets, task definitions, and provider configuration. `create_before_destroy` is technically correct, but in production it must be used with resource-specific naming and dependency constraints in mind because Terraform cannot automatically resolve uniqueness requirements for every resource type.
