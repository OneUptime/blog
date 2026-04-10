# Validation Summary: How to Configure Redis for SOC 2 Compliance

## Status
validated

## Post Type
Guide

## Technologies Covered
- Redis 6.2+ (TLS, ACLs, Slowlog, Keyspace Notifications)
- SOC 2 Trust Services Criteria
- Python redis-py client library
- AWS ElastiCache (mentioned)
- Bash scripting

## Sources Consulted
- Redis official TLS documentation: https://redis.io/docs/latest/operate/oss_and_stack/management/security/encryption/
- Redis ACL documentation: https://redis.io/docs/latest/operate/oss_and_stack/management/security/acl/
- Redis ACL SETUSER command reference: https://redis.io/docs/latest/commands/acl-setuser/
- Redis Keyspace Notifications documentation: https://redis.io/docs/latest/develop/use/keyspace-notifications/
- Redis SLOWLOG command reference: https://redis.io/docs/latest/commands/slowlog-get/
- Redis 6.2 release notes (Pub/Sub ACL channel patterns): https://redis.io/blog/redis-6-2-the-community-edition-is-now-available/

## Issues Found

1. **ACL version requirement incorrect (Section 2)**: The post stated ACLs work with "Redis 6+" but the `&*` Pub/Sub channel pattern selector used in the `ACL SETUSER` examples was introduced in Redis 6.2. Running these commands on Redis 6.0 or 6.1 would produce a syntax error. Changed "(Redis 6+)" to "(Redis 6.2+)".

2. **Port mismatch in network isolation check (Section 4)**: Section 1 configures `port 0` (disabling the default non-TLS port) and `tls-port 6380`. However, Section 4's `ss` command grepped for port 6379 and the expected output showed Redis listening on 6379. With the TLS configuration from Section 1 applied, Redis would only listen on port 6380. Changed `grep 6379` to `grep 6380` and updated the expected output accordingly.

3. **Slowlog compliance check always passes (Section 6)**: The command `redis-cli config get slowlog-log-slower-than | grep -qv "^0$"` always returns true because `config get` outputs two lines (the key name and the value), and the key name line never matches `^0$`, so the inverted grep always finds at least one non-matching line. Added `tail -1` to extract only the value line before the grep check.

## Review Notes
- The post lists CC6.7 (Data at rest encryption) in the SOC 2 controls table but never addresses data at rest encryption in any configuration section. Redis does not natively support data at rest encryption — it requires encrypted filesystems, encrypted storage volumes, or Redis Enterprise. A future revision could note this gap explicitly.
- The `+DEL +EXPIRE` in the app_user ACL is redundant since `+@write` already includes both commands. Not incorrect, but could be simplified.
- The `MONITOR` command granted to the monitoring user can significantly impact Redis performance in production environments. A note about using it cautiously would be beneficial.
- The TLS section's note about `transit_encryption_enabled` for AWS ElastiCache is a Terraform/CloudFormation parameter, not a redis.conf directive. The sentence is slightly ambiguous about this distinction but not incorrect.
