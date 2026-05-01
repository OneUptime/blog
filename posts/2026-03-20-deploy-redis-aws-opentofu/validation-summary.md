# Validation Summary: How to Deploy Redis on AWS ElastiCache with OpenTofu

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- OpenTofu / Terraform-style HCL
- AWS ElastiCache for Redis OSS
- AWS VPC security groups
- Amazon CloudWatch Logs

## Sources Consulted
- HashiCorp AWS Provider docs: `aws_elasticache_replication_group` - https://github.com/hashicorp/terraform-provider-aws/blob/main/website/docs/r/elasticache_replication_group.html.markdown
- HashiCorp AWS Provider docs: `aws_elasticache_parameter_group` - https://github.com/hashicorp/terraform-provider-aws/blob/main/website/docs/r/elasticache_parameter_group.html.markdown
- HashiCorp AWS Provider docs: `aws_elasticache_subnet_group` - https://github.com/hashicorp/terraform-provider-aws/blob/main/website/docs/r/elasticache_subnet_group.html.markdown
- HashiCorp AWS Provider docs: `aws_security_group` - https://github.com/hashicorp/terraform-provider-aws/blob/main/website/docs/r/security_group.html.markdown
- AWS ElastiCache User Guide: Replication cluster mode disabled vs. enabled - https://docs.aws.amazon.com/AmazonElastiCache/latest/dg/Replication.Redis-RedisCluster.html
- AWS ElastiCache User Guide: Engine specific parameters - https://docs.aws.amazon.com/AmazonElastiCache/latest/dg/ParameterGroups.Engine.html
- AWS ElastiCache User Guide: Finding replication group endpoints - https://docs.aws.amazon.com/AmazonElastiCache/latest/dg/Replication.Endpoints.html
- AWS ElastiCache User Guide: In-transit encryption - https://docs.aws.amazon.com/AmazonElastiCache/latest/dg/in-transit-encryption.html
- AWS ElastiCache User Guide: Authenticating with the Valkey and Redis OSS AUTH command - https://docs.aws.amazon.com/AmazonElastiCache/latest/dg/auth.html
- AWS ElastiCache User Guide: Log delivery - https://docs.aws.amazon.com/AmazonElastiCache/latest/dg/Log_Delivery.html
- AWS ElastiCache User Guide: Engine versions and upgrading in ElastiCache - https://docs.aws.amazon.com/AmazonElastiCache/latest/dg/engine-versions.html
- AWS ElastiCache API Reference: CreateReplicationGroup - https://docs.aws.amazon.com/AmazonElastiCache/latest/APIReference/API_CreateReplicationGroup.html

## Issues Found
- The parameter group example set `activerehashing` on Redis OSS 7. AWS documents this parameter as hidden and non-modifiable in Redis OSS 7, so I removed it from the sample.
- The standard replication-group example used `Mon:04:00-Mon:05:00` for `maintenance_window`. AWS expects lowercase day abbreviations such as `mon`, so I corrected the format to `mon:04:00-mon:05:00`.
- The cluster-mode example reused a non-cluster parameter group. For sharded Redis OSS deployments, AWS requires a parameter group with `cluster-enabled=yes`; I changed the sample to use `default.redis7.cluster.on`.
- The cluster-mode example enabled transit encryption but omitted the AUTH token even though the post’s guidance recommends using AUTH tokens with encrypted Redis deployments. I added `auth_token = var.redis_auth_token` to keep the example aligned with the post’s security guidance.
- The output description said the reader endpoint was "load balanced". AWS documents the reader endpoint as DNS round robin across replicas rather than a true load balancer, so I corrected the wording.

## Review Notes
- Redis OSS `7.1` is still a supported ElastiCache engine version as of 2026-05-01, so the version references in the post remain valid.
- The provider still supports inline `ingress` blocks on `aws_security_group`, but current provider guidance prefers separate `aws_vpc_security_group_ingress_rule` and `aws_vpc_security_group_egress_rule` resources for new configurations.
