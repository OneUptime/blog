# Validation Summary: How to Provision AWS ElastiCache Redis with Terraform

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- AWS ElastiCache for Redis
- Terraform (AWS provider)
- AWS VPC (subnets, security groups)
- AWS CloudWatch Logs

## Sources Consulted
- Terraform AWS Provider: aws_elasticache_replication_group resource documentation (https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/elasticache_replication_group)
- Terraform AWS Provider: aws_elasticache_subnet_group resource documentation (https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/elasticache_subnet_group)
- Terraform AWS Provider: aws_security_group resource documentation (https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/security_group)
- AWS ElastiCache supported Redis versions documentation (https://docs.aws.amazon.com/AmazonElastiCache/latest/red-ug/supported-engine-versions.html)
- Terraform CLI variable passing documentation (https://developer.hashicorp.com/terraform/language/values/variables#variables-on-the-command-line)

## Issues Found

1. **Undefined resource reference in security group ingress rule**: The security group's ingress rule referenced `aws_security_group.app.id`, but no `aws_security_group.app` resource was defined anywhere in the post. This would cause a Terraform error during plan/apply. Fixed by adding an `app_security_group_id` variable and using `var.app_security_group_id` in the ingress rule instead.

2. **`terraform apply` missing required `-var` flags**: The deploy section passed `-var` flags to `terraform plan` but not to `terraform apply`. Since the configuration has required variables with no defaults (`vpc_id`, `private_subnet_ids`, `redis_auth_token`), the apply command would fail or prompt interactively. Fixed by adding the same `-var` flags to the `terraform apply` command.

3. **Description mentioned "parameter groups" not covered in the post**: The post description claimed it covers "parameter groups" but no parameter group resource or configuration was included. Fixed the description to accurately reflect the content: "subnet groups, replication groups, and security configuration."

## Review Notes
- The Terraform HCL syntax, resource attributes, and attribute names are all correct for the current AWS provider.
- `engine_version = "7.1"` is a valid ElastiCache Redis version.
- The `auth_token` correctly requires `transit_encryption_enabled = true`, which is properly set.
- The `automatic_failover_enabled = true` correctly requires `num_cache_clusters >= 2`, which is satisfied.
- The `log_delivery_configuration` block uses valid values for `destination_type`, `log_format`, and `log_type`.
- The output attributes `primary_endpoint_address` and `reader_endpoint_address` are correct for replication groups.
- For production use, readers may also want to add a custom `aws_elasticache_parameter_group` resource to tune Redis parameters, though the defaults work fine for getting started.
