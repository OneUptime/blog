# Validation Summary: How to Enable ElastiCache Redis Encryption

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Amazon ElastiCache for Redis OSS
- AWS KMS
- AWS CLI
- Redis AUTH
- TLS encryption
- Python redis-py
- Node.js ioredis
- Go go-redis
- Terraform AWS provider

## Sources Consulted
- Amazon ElastiCache: At-Rest Encryption in ElastiCache - https://docs.aws.amazon.com/AmazonElastiCache/latest/dg/at-rest-encryption.html
- Amazon ElastiCache: In-transit encryption (TLS) - https://docs.aws.amazon.com/AmazonElastiCache/latest/dg/in-transit-encryption.html
- Amazon ElastiCache: Enabling in-transit encryption - https://docs.aws.amazon.com/AmazonElastiCache/latest/dg/in-transit-encryption-enable.html
- Amazon ElastiCache: Authenticating with the Valkey and Redis OSS AUTH command - https://docs.aws.amazon.com/AmazonElastiCache/latest/dg/auth.html
- AWS CLI Command Reference: create-replication-group - https://docs.aws.amazon.com/cli/latest/reference/elasticache/create-replication-group.html
- AWS CLI Command Reference: modify-replication-group - https://docs.aws.amazon.com/cli/latest/reference/elasticache/modify-replication-group.html
- Amazon ElastiCache: Restricted commands - https://docs.aws.amazon.com/AmazonElastiCache/latest/dg/ClientConfig.RestrictedCommands.html
- Terraform AWS Provider: aws_elasticache_replication_group - https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/elasticache_replication_group
- redis-py connection documentation - https://redis.readthedocs.io/en/stable/connections.html
- go-redis documentation - https://github.com/redis/go-redis
- ioredis documentation - https://github.com/redis/ioredis

## Issues Found
- The TLS section stated that in-transit encryption must be enabled only at creation time. Current ElastiCache documentation supports modifying in-transit encryption on existing Redis OSS 7+ and Valkey 7.2+ replication groups, so the wording was narrowed to the new-replication-group case.
- The AUTH token examples used `@`, which is not an allowed nonalphanumeric character for ElastiCache AUTH tokens. The sample tokens were changed to use only allowed characters.
- The AUTH token requirements listed only a few disallowed characters. This was changed to the current AWS constraint: only `!`, `&`, `#`, `$`, `^`, `<`, `>`, and `-` are allowed as nonalphanumeric characters.
- The AUTH rotation commands had `SET` and `ROTATE` reversed. AWS uses `ROTATE` to add the new token while keeping the previous token active, then `SET` to make the new token the only required token.
- The performance section gave a specific 5-10% TLS latency estimate and described at-rest encryption as negligible. AWS documents workload-dependent performance impact and recommends benchmarking, so the claims were made less absolute.
- The migration section recommended the Redis `MIGRATE` command, but ElastiCache restricts `MIGRATE` for Redis OSS clusters. The migration steps were changed to the AWS-documented backup-and-restore flow for enabling at-rest encryption.

## Review Notes
- The AWS CLI and Terraform field names used in the examples are valid for the current AWS CLI and Terraform AWS provider documentation.
- The Python, Node.js, and Go TLS client snippets use current client configuration patterns. Production deployments should also consider connection pooling and endpoint selection for cluster-mode versus cluster-mode-disabled deployments.
