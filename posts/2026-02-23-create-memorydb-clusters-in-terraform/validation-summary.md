# Validation Summary: How to Create MemoryDB Clusters in Terraform

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform
- HashiCorp AWS Provider
- Amazon MemoryDB
- Redis OSS
- AWS KMS
- Amazon SNS
- Amazon CloudWatch

## Sources Consulted
- Terraform AWS Provider `aws_memorydb_cluster` documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/memorydb_cluster
- Terraform AWS Provider `aws_memorydb_user` documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/memorydb_user
- Terraform AWS Provider `aws_memorydb_acl` documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/memorydb_acl
- Terraform AWS Provider `aws_memorydb_parameter_group` documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/memorydb_parameter_group
- Terraform AWS Provider `aws_memorydb_snapshot` documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/memorydb_snapshot
- Amazon MemoryDB parameter group documentation: https://docs.aws.amazon.com/memorydb/latest/devguide/parametergroups.redis.html
- Amazon MemoryDB ACL documentation: https://docs.aws.amazon.com/memorydb/latest/devguide/clusters.acls.html
- Amazon MemoryDB supported node types: https://docs.aws.amazon.com/memorydb/latest/devguide/nodes.supportedtypes.html
- Amazon MemoryDB endpoints documentation: https://docs.aws.amazon.com/memorydb/latest/devguide/endpoints.html
- Amazon MemoryDB CloudWatch metrics documentation: https://docs.aws.amazon.com/memorydb/latest/devguide/metrics.memorydb.html
- Amazon MemoryDB CloudWatch monitoring examples: https://docs.aws.amazon.com/memorydb/latest/devguide/cloudwatchmetrics.html

## Issues Found
- The Redis 7.1 cluster examples did not explicitly set `engine = "redis"`. The Terraform AWS provider now supports both `redis` and `valkey`, so the examples were updated to make the intended Redis OSS engine explicit.
- The endpoint output returned the full `cluster_endpoint` object while the description said it returned the endpoint for application connections. Updated it to return `cluster_endpoint[0].address`, the DNS hostname field documented by the provider and AWS.
- The CloudWatch alarm examples used only `ClusterName` as a metric dimension. AWS documents MemoryDB metrics as node-level metrics and its monitoring examples include both `ClusterName` and `NodeId`, so the examples were updated to target node `0001` and the alarm comments/descriptions now say node-level monitoring.

## Review Notes
- The Terraform and AWS CLI binaries were not installed in the review environment, so the snippets were verified against official documentation rather than by running `terraform validate`.
- For production monitoring, the node-level alarm examples should be repeated for each MemoryDB node or replaced with metric math/search expressions that aggregate the desired node metrics.
