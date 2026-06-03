# Validation Summary: How to Create ElastiCache Clusters with Terraform

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- AWS ElastiCache
- Terraform AWS provider
- Redis OSS
- Memcached
- AWS VPC security groups
- AWS KMS
- Amazon SNS

## Sources Consulted
- Terraform AWS provider `aws_elasticache_cluster` documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/elasticache_cluster
- Terraform AWS provider `aws_elasticache_replication_group` documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/elasticache_replication_group
- Terraform AWS provider `aws_elasticache_serverless_cache` documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/elasticache_serverless_cache
- AWS ElastiCache in-transit encryption documentation: https://docs.aws.amazon.com/AmazonElastiCache/latest/dg/in-transit-encryption.html
- AWS ElastiCache at-rest encryption documentation: https://docs.aws.amazon.com/AmazonElastiCache/latest/dg/at-rest-encryption.html
- AWS ElastiCache engine-specific parameter documentation: https://docs.aws.amazon.com/AmazonElastiCache/latest/dg/ParameterGroups.Engine.html
- AWS CloudFormation ElastiCache parameter group family reference: https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/aws-resource-elasticache-parametergroup.html

## Issues Found
- The shared security group allowed only Redis port 6379, but the Memcached example reused the same security group while listening on port 11211. Added a Memcached ingress rule for TCP port 11211 from the application security group.
- The Memcached explanation said Memcached does not support encryption at rest. AWS documents that Memcached at-rest encryption is supported only for serverless caches, so the statement was narrowed to node-based Memcached clusters.

## Review Notes
- Terraform is not installed in this workspace, so I could not run `terraform fmt` or `terraform validate`. The HCL resource names, arguments, parameter group families, Redis OSS 7.1 references, Memcached 1.6.22 references, and ElastiCache Serverless fields were checked against official Terraform provider and AWS documentation.
- AWS now uses "Redis OSS" terminology in ElastiCache documentation, while Terraform still uses `engine = "redis"` for Redis OSS resources.
