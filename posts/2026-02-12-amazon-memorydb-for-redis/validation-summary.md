# Validation Summary: How to Use Amazon MemoryDB for Redis

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Amazon MemoryDB
- AWS CLI
- AWS CloudWatch metrics
- Terraform AWS provider
- Redis OSS / Redis Cluster
- redis-py
- ioredis

## Sources Consulted
- Amazon MemoryDB FAQ: https://aws.amazon.com/memorydb/faqs/
- Amazon MemoryDB ACL documentation: https://docs.aws.amazon.com/memorydb/latest/devguide/clusters.acls.html
- AWS CLI create-cluster command reference: https://docs.aws.amazon.com/cli/latest/reference/memorydb/create-cluster.html
- AWS CLI update-cluster command reference: https://docs.aws.amazon.com/cli/latest/reference/memorydb/update-cluster.html
- Amazon MemoryDB consistency documentation: https://docs.aws.amazon.com/memorydb/latest/devguide/consistency.html
- Amazon MemoryDB CloudWatch metrics documentation: https://docs.aws.amazon.com/memorydb/latest/devguide/metrics.memorydb.html
- Terraform AWS provider aws_memorydb_cluster resource: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/memorydb_cluster
- Terraform AWS provider aws_memorydb_acl resource: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/memorydb_acl
- Terraform AWS provider aws_memorydb_parameter_group resource: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/memorydb_parameter_group
- redis-py advanced features documentation: https://redis.readthedocs.io/en/stable/advanced_features.html
- Redis Cluster specification: https://redis.io/docs/latest/operate/oss_and_stack/reference/cluster-spec/
- Redis transactions documentation: https://redis.io/docs/latest/develop/using-commands/transactions/

## Issues Found
- The article claimed data survives "cluster failures" and "without losing a single write." I narrowed this to acknowledged writes surviving node failures and AZ outages, which matches MemoryDB's durability claim without overstating every possible failure mode.
- The AWS CLI and Terraform ACL examples added the built-in `default` user to a custom ACL. AWS documents that the default user can only be a member of the immutable `open-access` ACL, so I removed `default` from both examples.
- The connection section said TLS is always required. MemoryDB supports clusters without TLS when using the `open-access` ACL, so I changed the wording to apply TLS and authentication to the password-protected ACL example being shown.
- The ioredis replica-read example did not warn about stale reads. I updated the comment to say replica reads are for workloads that can tolerate replica lag.
- The transaction example used two arbitrary account keys in a Redis Cluster transaction. Redis Cluster transactions require all keys to share one hash slot, so I added that caveat and changed the example to use a shared hash tag.
- The CloudWatch examples queried node-level metrics with only the cluster dimension. I added a `NodeId` dimension.
- The CloudWatch example labeled `PrimaryLinkHealthStatus` as endpoint latency. I corrected the label to primary link health status.

## Review Notes
The post remains accurate as a MemoryDB/Redis OSS guide. Future updates could mention that AWS now describes MemoryDB as Valkey- and Redis OSS-compatible, but the Redis OSS-focused examples are still technically valid for the stated engine version.
