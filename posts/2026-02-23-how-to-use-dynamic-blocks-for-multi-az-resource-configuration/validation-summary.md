# Validation Summary: How to Use Dynamic Blocks for Multi-AZ Resource Configuration

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Terraform
- Terraform dynamic blocks and `for_each`
- AWS VPC, subnets, route tables, Internet Gateways, Elastic IPs, and NAT Gateways
- Amazon EC2 Auto Scaling Groups
- Amazon Aurora / Amazon RDS
- Amazon ElastiCache for Redis
- Amazon ECS on Fargate

## Sources Consulted
- Terraform dynamic blocks documentation: https://developer.hashicorp.com/terraform/language/expressions/dynamic-blocks
- Terraform `for_each` meta-argument documentation: https://developer.hashicorp.com/terraform/language/meta-arguments/for_each
- Terraform AWS provider `aws_nat_gateway` documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/nat_gateway
- Terraform AWS provider `aws_autoscaling_group` documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/autoscaling_group
- Terraform AWS provider `aws_rds_cluster` documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/rds_cluster
- Terraform AWS provider `aws_elasticache_replication_group` documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/elasticache_replication_group
- Amazon Aurora DB cluster overview: https://docs.aws.amazon.com/AmazonRDS/latest/AuroraUserGuide/Aurora.Overview.html
- Amazon Aurora cluster creation prerequisites: https://docs.aws.amazon.com/AmazonRDS/latest/AuroraUserGuide/Aurora.CreateInstance.html
- Amazon RDS CreateDBSubnetGroup API reference: https://docs.aws.amazon.com/AmazonRDS/latest/APIReference/API_CreateDBSubnetGroup.html
- Amazon ECS task placement documentation: https://docs.aws.amazon.com/AmazonECS/latest/developerguide/task-placement.html
- Amazon ECS service definition parameters: https://docs.aws.amazon.com/AmazonECS/latest/developerguide/service_definition_parameters.html

## Issues Found
- The VPC subnet example created subnets but did not create an Internet Gateway, public route table, or public route table associations. Added those resources so the "public subnet" and later NAT Gateway examples have the required routing foundation.
- The NAT Gateway example created private route tables but did not associate them with the private subnets. Added `aws_route_table_association.private` so private subnets actually use the NAT routes.
- The NAT Gateway resource did not explicitly depend on the Internet Gateway. Added `depends_on = [aws_internet_gateway.main]`, matching the AWS provider's documented recommendation for public NAT Gateway ordering.
- The RDS section said Aurora automatically places replicas in different AZs and skipped the first AZ because "writer is there," but the Terraform snippet did not create a writer instance. Updated the explanation and added an `aws_rds_cluster_instance.writer` resource, because Aurora DB instances are created separately when using Terraform/API-style provisioning.
- The RDS section did not state Aurora's DB subnet group requirement clearly. Added that the Aurora DB subnet group must cover at least two AZs.
- The ECS Fargate service example used `ordered_placement_strategy`, but AWS documentation says task placement strategies and constraints are not supported for Fargate tasks. Removed the dynamic placement strategy block and updated the explanation to rely on Fargate spreading across accessible AZs when subnets from those AZs are supplied.

## Review Notes
Terraform was not installed in the workspace, so validation used manual HCL review and official documentation rather than `terraform fmt` or `terraform validate`. The examples still reference surrounding resources and variables such as security groups, launch templates, and instance class variables that are intentionally outside the shown snippets.
