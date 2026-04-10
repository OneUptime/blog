# Validation Summary: How to Set Up Redis VPC Networking with Terraform

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- AWS ElastiCache Redis
- Terraform (AWS Provider)
- AWS VPC (subnets, route tables, security groups)
- AWS VPC Peering
- redis-cli
- netcat (nc)

## Sources Consulted
- Terraform AWS Provider documentation for `aws_elasticache_replication_group`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/elasticache_replication_group
- Terraform AWS Provider documentation for `aws_elasticache_subnet_group`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/elasticache_subnet_group
- Terraform AWS Provider documentation for `aws_vpc_peering_connection`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/vpc_peering_connection
- AWS ElastiCache documentation on in-transit encryption: https://docs.aws.amazon.com/AmazonElastiCache/latest/red-ug/in-transit-encryption.html
- AWS VPC Peering documentation: https://docs.aws.amazon.com/vpc/latest/peering/what-is-vpc-peering.html
- redis-cli documentation: https://redis.io/docs/connect/cli/

## Issues Found

1. **`redis-cli` missing `--tls` flag**: The ElastiCache replication group is configured with `transit_encryption_enabled = true`, which requires TLS connections. The `redis-cli` command was missing the `--tls` flag and would fail with a connection error. Added `--tls` to the command and a comment explaining why it is needed.

2. **VPC peering missing return route**: The cross-VPC access section only included a route from the app VPC to the Redis VPC. VPC peering requires routes in both directions for traffic to flow. Without a return route from the Redis VPC to the app VPC, response packets from Redis cannot reach the application. Added an `aws_route` resource for the return path (`redis_to_app`).

## Review Notes
- The `auto_accept = true` on the VPC peering connection only works when both VPCs are in the same AWS account and region. Cross-account or cross-region peering requires a separate accepter resource. This is a common simplification in tutorials and is acceptable given the scope.
- The post references `aws_security_group.redis` in the replication group but does not define it. This is likely intentional (keeping the post focused on networking), but readers will need to define the security group themselves with an ingress rule allowing TCP port 6379 from the application subnets.
- The `description` attribute on `aws_elasticache_replication_group` is correct for AWS provider v5.0+ (released May 2023), which renamed it from `replication_group_description`.
