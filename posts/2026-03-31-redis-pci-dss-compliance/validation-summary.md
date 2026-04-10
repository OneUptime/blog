# Validation Summary: How to Configure Redis for PCI DSS Compliance

## Status
validated

## Post Type
Guide

## Technologies Covered
- Redis (TLS, ACLs, rename-command, slowlog, logging)
- PCI DSS v4.0 (Requirements 2, 4, 7, 8, 10)
- OpenSSL (TLS verification, password generation)
- Filebeat (log shipping to Elasticsearch/SIEM)
- AWS Secrets Manager (credential rotation)

## Sources Consulted
- Redis TLS configuration documentation: https://redis.io/docs/latest/operate/oss_and_stack/management/security/encryption/
- Redis ACL documentation: https://redis.io/docs/latest/operate/oss_and_stack/management/security/acl/
- Redis configuration file (redis.conf) reference: https://redis.io/docs/latest/operate/oss_and_stack/management/config/
- Redis rename-command documentation: https://redis.io/docs/latest/operate/oss_and_stack/management/security/
- Redis source code (config.c) for TLS directive validation (tls-port, tls-protocols, tls-ciphers, tls-auth-clients enum values)
- PCI DSS v4.0 requirement summaries: https://www.pcisecuritystandards.org/

## Issues Found

### 1. Validation script used plain redis-cli without TLS (lines 130-148)
**What was wrong:** The validation script at the end of the post used bare `redis-cli` commands (e.g., `redis-cli config get tls-port`, `redis-cli config get loglevel`, `redis-cli FLUSHALL`) without any TLS flags. Since the post's own configuration sets `port 0` to disable the non-TLS listener and only enables `tls-port 6380`, these commands would fail to connect to the Redis server.

Additionally, the `ACL LIST` check used `redis-cli -u redis://:adminpass@localhost:6380` which specifies port 6380 but uses the `redis://` URI scheme instead of `rediss://` (TLS), and hardcoded a password that doesn't match any ACL user defined in the post.

**What was changed:** Replaced all bare `redis-cli` calls with a `$REDIS_CLI` variable that includes `--tls -p 6380 --cert --key --cacert` flags for mutual TLS authentication, consistent with the `tls-auth-clients yes` configuration earlier in the post. Removed the hardcoded password from the ACL LIST check.

**Why:** The validation script must be able to actually connect to the Redis instance it's validating. Without TLS flags, every check would fail with a connection error, making the script useless.

## Review Notes
- The `rename-command` directive used in the "Requirement 2" section is deprecated in favor of ACLs. The Redis documentation warns: "avoid using this option if possible. Instead use ACLs to remove commands from the default user." The post already uses ACLs in later sections, so a future revision could consolidate command restrictions into the ACL configuration and remove the `rename-command` block.
- The `+@read` and `+@write` ACL categories in the payment_service user are quite broad. The explicit `+DEL +EXPIRE` additions are redundant since they're already included in `+@write`. For stricter least-privilege access, individual commands could be specified instead of categories.
- The filebeat configuration snippet uses the `log` input type, which has been superseded by the `filestream` type in newer Filebeat versions (8.x+). This is not incorrect for older versions but may warrant updating in the future.
- The `slowlog-log-slower-than 0` setting logs every single command to the slow log. While useful for compliance auditing, this can have performance implications in high-throughput environments. The post could note this tradeoff.
