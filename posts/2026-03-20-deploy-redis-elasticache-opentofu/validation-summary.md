# Validation Summary: How to Deploy Redis on AWS ElastiCache with OpenTofu - Elasticache

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTofu / HCL
- AWS ElastiCache
- Redis OSS
- AWS VPC security groups
- Terraform AWS Provider resources for ElastiCache

## Sources Consulted
- Terraform AWS Provider: `aws_elasticache_replication_group` — https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/elasticache_replication_group
- Terraform AWS Provider: `aws_elasticache_parameter_group` — https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/elasticache_parameter_group
- Terraform AWS Provider: `aws_elasticache_subnet_group` — https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/elasticache_subnet_group
- Terraform AWS Provider: `aws_security_group` — https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/security_group
- Amazon ElastiCache User Guide: Engine specific parameters — https://docs.aws.amazon.com/AmazonElastiCache/latest/dg/ParameterGroups.Engine.html
- Amazon ElastiCache User Guide: Authenticating with the Valkey and Redis OSS AUTH command — https://docs.aws.amazon.com/AmazonElastiCache/latest/dg/auth.html
- Amazon ElastiCache User Guide: ElastiCache in-transit encryption (TLS) — https://docs.aws.amazon.com/AmazonElastiCache/latest/dg/in-transit-encryption.html
- Amazon ElastiCache User Guide: At-Rest Encryption in ElastiCache — https://docs.aws.amazon.com/AmazonElastiCache/latest/dg/at-rest-encryption.html
- Amazon ElastiCache User Guide: Finding replication group endpoints — https://docs.aws.amazon.com/AmazonElastiCache/latest/dg/Replication.Endpoints.html
- Amazon ElastiCache User Guide: Engine versions and upgrading in ElastiCache — https://docs.aws.amazon.com/AmazonElastiCache/latest/dg/engine-versions.html

## Issues Found
No technical issues found.

## Review Notes
- The post is accurate for a Redis OSS cluster-mode-disabled replication group: `primary_endpoint_address` is the correct write endpoint output, and `reader_endpoint_address` is the correct read endpoint output for that topology.
- As of 2026-05-01, AWS documentation still lists Redis OSS 7.0 as a supported node-based ElastiCache version, but newer Redis OSS 7.1 and Valkey 7.2 families are also available.
- The `reader_endpoint_address` guidance is correct, but readers should know the reader endpoint is DNS round robin rather than a traditional load balancer.
- The `aws_security_group` example uses inline rules, which the current AWS provider documentation still supports, though it recommends the standalone `aws_vpc_security_group_ingress_rule` and `aws_vpc_security_group_egress_rule` resources as the current best practice.
