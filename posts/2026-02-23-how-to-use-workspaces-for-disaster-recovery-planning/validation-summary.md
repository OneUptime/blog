# Validation Summary: How to Use Workspaces for Disaster Recovery Planning

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform CLI workspaces
- Terraform HCL
- HashiCorp AWS provider
- Amazon VPC and inter-region VPC peering
- Amazon RDS for PostgreSQL read replicas and backups
- Amazon ECS on Fargate
- Elastic Load Balancing
- Amazon Route 53 failover routing and health checks
- Amazon CloudWatch alarms
- Bash scripting

## Sources Consulted
- HashiCorp Terraform CLI workspace command documentation: https://developer.hashicorp.com/terraform/cli/commands/workspace/new
- HashiCorp Terraform state workspace documentation: https://docs.hashicorp.com/terraform/language/state/workspaces
- HashiCorp AWS provider `aws_db_instance` resource documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/db_instance
- HashiCorp AWS provider `aws_db_instance_automated_backups_replication` resource documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/db_instance_automated_backups_replication
- HashiCorp AWS provider `aws_vpc_peering_connection` resource documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/vpc_peering_connection
- HashiCorp AWS provider `aws_route53_record` resource documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/route53_record
- HashiCorp AWS provider `aws_route53_health_check` resource documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/route53_health_check
- AWS VPC peering limitations documentation: https://docs.aws.amazon.com/vpc/latest/peering/vpc-peering-basics.html#vpc-peering-limitations
- AWS RDS cross-Region automated backups documentation: https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/USER_ReplicateBackups.html
- AWS RDS cross-Region read replica documentation: https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/USER_ReadRepl.XRgn.html
- AWS Application Load Balancer CloudWatch metrics documentation: https://docs.aws.amazon.com/elasticloadbalancing/latest/application/load-balancer-cloudwatch-metrics.html
- Linked OneUptime workspace state isolation post: https://oneuptime.com/blog/post/2026-02-23-how-to-handle-workspace-state-isolation-in-terraform/view

## Issues Found
- The primary and DR VPC examples both used `10.0.0.0/16`, but the post later creates a VPC peering connection. AWS does not allow VPC peering between matching or overlapping CIDR blocks. I changed the DR workspace to use `10.1.0.0/16` and made the VPC and subnet CIDRs derive from the workspace configuration.
- The subnet examples referenced `data.aws_availability_zones.available` without declaring the data source. I added the `aws_availability_zones` data source to make the snippet complete.
- The failover, failback, and drill scripts passed `instance_count`, `db_instance_class`, and `is_standby` variables, but the Terraform example only defined those values inside `dr_config`. I added nullable override variables and merged them into the selected workspace configuration so the script commands are valid.
- The RDS example said `backup_target = "region"` enabled automated backups to the DR region. In the AWS provider, `backup_target = "region"` stores backups in the instance's AWS Region; cross-Region automated backup replication uses separate RDS functionality and the Terraform `aws_db_instance_automated_backups_replication` resource. I corrected the comment.
- The inter-region VPC peering example did not mention that the peering request must be accepted in the peer region. I added a short comment noting the need for `aws_vpc_peering_connection_accepter` or an equivalent acceptance workflow.

## Review Notes
Terraform was not installed in the local environment, so I could not run `terraform validate`. The review was performed against official Terraform, HashiCorp AWS provider, and AWS documentation. Several snippets still assume surrounding resources and variables exist, such as security groups, subnet groups, task definitions, hosted zone IDs, and outputs; that is acceptable for a blog-level example but should be expanded in a full runnable module.
