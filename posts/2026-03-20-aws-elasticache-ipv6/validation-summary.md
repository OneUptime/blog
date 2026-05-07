# Validation Summary: How to Configure IPv6 for AWS ElastiCache

## Status
validated

## Post Type
Guide

## Technologies Covered
- Amazon ElastiCache
- AWS CLI
- Terraform AWS Provider
- Redis OSS / redis-py
- Memcached
- Amazon VPC security groups
- IPv6 / dual-stack networking

## Sources Consulted
- AWS ElastiCache User Guide: Choosing a network type in ElastiCache
  https://docs.aws.amazon.com/AmazonElastiCache/latest/dg/network-type.html
- AWS CLI Command Reference: `create-replication-group`
  https://docs.aws.amazon.com/cli/latest/reference/elasticache/create-replication-group.html
- AWS ElastiCache User Guide: Finding replication group endpoints
  https://docs.aws.amazon.com/AmazonElastiCache/latest/dg/Replication.Endpoints.html
- AWS ElastiCache API Reference: `ReplicationGroup`
  https://docs.aws.amazon.com/AmazonElastiCache/latest/APIReference/API_ReplicationGroup.html
- AWS ElastiCache API Reference: `NodeGroup`
  https://docs.aws.amazon.com/AmazonElastiCache/latest/APIReference/API_NodeGroup.html
- AWS ElastiCache User Guide: Subnets and subnet groups
  https://docs.aws.amazon.com/AmazonElastiCache/latest/dg/SubnetGroups.html
- AWS ElastiCache User Guide: Engine versions and upgrading in ElastiCache
  https://docs.aws.amazon.com/AmazonElastiCache/latest/dg/engine-versions.html
- AWS VPC User Guide: Security group rules
  https://docs.aws.amazon.com/vpc/latest/userguide/security-group-rules.html
- Terraform AWS Provider docs: `aws_elasticache_replication_group`
  https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/elasticache_replication_group.html.markdown
- Terraform AWS Provider docs: `aws_elasticache_cluster`
  https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/elasticache_cluster.html.markdown
- redis-py docs: connection parameters and SSL support
  https://redis.readthedocs.io/en/latest/connections.html

## Issues Found
- The AWS CLI example used `--description`, but `create-replication-group` requires `--replication-group-description`. I corrected the flag to match the AWS CLI command reference.
- The AWS CLI example used invalid enum values: `--ip-discovery DUAL_STACK` and `--network-type DUAL_STACK`. AWS documents `network_type` as `ipv4`, `ipv6`, or `dual_stack`, and `ip_discovery` as only `ipv4` or `ipv6`. I changed the example to `--network-type dual_stack` and `--ip-discovery ipv6`.
- The post queried `ConfigurationEndpoint` after creating a cluster-mode-disabled replication group with `--num-cache-clusters 2`. AWS documents the configuration endpoint for cluster-mode-enabled Redis OSS, while cluster-mode-disabled replication groups use primary and reader endpoints. I changed the query and explanation to use `PrimaryEndpoint` and `ReaderEndpoint`.
- The Python example used a `clustercfg...` endpoint, which is a configuration endpoint associated with cluster-mode-enabled Redis OSS, but the post’s creation example creates a cluster-mode-disabled replication group. I updated the example to use a standard primary endpoint consistent with the CLI example and kept the client as `redis.Redis`.
- The introduction and conclusion overstated how dual-stack and `ip_discovery` behave. AWS documents that dual-stack enables both IPv4 and IPv6 connectivity, while `ip_discovery` selects the IP family advertised through discovery protocols, and for TLS-enabled dual-stack clusters the client’s DNS resolution preference determines the protocol actually used. I corrected that wording.
- The Terraform security-group comment labeled a referenced security group rule as IPv4-only, which was misleading. I updated the comments so they accurately distinguish a security-group reference from a CIDR-based IPv6 rule.

## Review Notes
- The post is technically valid after the corrections above.
- The AWS CLI was not installed in the workspace, so command verification was done against the official AWS CLI command reference instead of local `aws ... help` output.
- Redis OSS `7.0` and Memcached `1.6.17` are still documented by AWS as supported ElastiCache engine versions as of May 7, 2026.
