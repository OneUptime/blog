# Validation Summary: How to Set Up ElastiCache Redis Encryption in Transit

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Amazon ElastiCache for Redis
- AWS CLI (`elasticache create-replication-group`, `modify-replication-group`)
- Terraform AWS provider (`aws_elasticache_replication_group`, `aws_secretsmanager_secret`)
- Python redis-py client
- Node.js ioredis client
- Java Lettuce Redis client
- AWS Secrets Manager (boto3, AWS SDK for JS)
- OpenSSL `s_client`
- redis-cli with TLS

## Sources Consulted
- AWS ElastiCache CLI reference for `create-replication-group` and `modify-replication-group` (https://docs.aws.amazon.com/cli/latest/reference/elasticache/)
- AWS ElastiCache documentation on in-transit encryption (https://docs.aws.amazon.com/AmazonElastiCache/latest/red-ug/in-transit-encryption.html)
- AWS ElastiCache documentation on enabling TLS on existing clusters for Redis 7.0+ (https://docs.aws.amazon.com/AmazonElastiCache/latest/red-ug/in-transit-encryption-enable-existing.html)
- OpenSSL `s_client` man page for supported `-starttls` protocols
- Terraform AWS provider docs for `aws_elasticache_replication_group` (https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/elasticache_replication_group)
- redis-py documentation for SSL/TLS parameters
- ioredis documentation for TLS configuration
- Lettuce Redis client documentation for `RedisURI` builder

## Issues Found
1. **`openssl s_client -starttls redis` is invalid**: The `-starttls` flag does not support `redis` as a protocol (supported protocols include smtp, pop3, imap, ftp, xmpp, postgres, mysql, etc.). ElastiCache Redis uses direct TLS (not STARTTLS negotiation), so the `-starttls redis` flag was removed from the command.

2. **Outdated claim that TLS cannot be enabled on existing clusters**: The post stated "Encryption in transit must be enabled when creating a cluster - it cannot be toggled on an existing cluster without migration." This is incorrect for Redis 7.0+. AWS added support for enabling transit encryption on existing replication groups using `--transit-encryption-mode` with `preferred` and `required` values. Updated the introductory text and rewrote the migration section to document both the in-place approach (Redis 7.0+) and the create-and-migrate approach (Redis 6.x and earlier).

3. **Unused Java import**: The `import io.lettuce.core.SslOptions;` was included but never used in the Java code example. Removed it.

4. **Summary paragraph updated**: The concluding summary referenced the outdated claim about needing to create a new cluster. Updated to reflect both migration paths.

## Review Notes
- The auth token rotation workflow (ROTATE then SET) is correctly documented.
- The troubleshooting section correctly states that ElastiCache TLS uses port 6379 (not 6380).
- The auth token constraint of 16-128 characters is correct per AWS documentation.
- All client library code examples (redis-py, ioredis, Lettuce) use correct and current APIs for TLS connections.
- The Terraform configuration correctly uses current attribute names for the AWS provider.
- The post could benefit from mentioning the `--tls-replication` flag for encrypting replication traffic between nodes, but this is an enhancement rather than a correction.
