# Validation Summary: What Is New in Redis 7.4 (Hash Field Expiration)

## Status
validated

## Post Type
Reference / Feature overview

## Technologies Covered
- Redis 7.4
- Redis Hash data type
- Redis CLI

## Sources Consulted
- Redis HEXPIRE command documentation: https://redis.io/docs/latest/commands/hexpire/
- Redis HPEXPIRE command documentation: https://redis.io/docs/latest/commands/hpexpire/
- Redis HEXPIREAT command documentation: https://redis.io/docs/latest/commands/hexpireat/
- Redis HPEXPIREAT command documentation: https://redis.io/docs/latest/commands/hpexpireat/
- Redis HTTL command documentation: https://redis.io/docs/latest/commands/httl/
- Redis HPTTL command documentation: https://redis.io/docs/latest/commands/hpttl/
- Redis HEXPIRETIME command documentation: https://redis.io/docs/latest/commands/hexpiretime/
- Redis HPEXPIRETIME command documentation: https://redis.io/docs/latest/commands/hpexpiretime/
- Redis HPERSIST command documentation: https://redis.io/docs/latest/commands/hpersist/
- Redis 7.4 release notes: https://redis.io/docs/latest/operate/oss_and_stack/stack-with-enterprise/release-notes/redisce/redisce-7.4-release-notes/

## Issues Found
No technical issues found.

All command syntaxes are correct:
- HEXPIRE/HPEXPIRE/HEXPIREAT/HPEXPIREAT use the correct `key time FIELDS numfields field` format.
- Condition flags (NX, GT) are correctly placed before the FIELDS keyword.
- HTTL/HPTTL/HEXPIRETIME/HPERSIST use the correct `key FIELDS numfields field` format.
- Return values shown in examples match official documentation (1 = success, -1 = no expiry for HTTL, 1 = expiry removed for HPERSIST).

## Review Notes
- The post does not cover HPEXPIRETIME (millisecond-precision absolute expiry timestamp retrieval), which also exists in Redis 7.4. This is not an error — the post covers the most important commands in the family.
- The post mentions only the NX and GT condition flags. Redis also supports XX (set only if field already has a TTL) and LT (set only if new TTL is less than current). These omissions are fine for a feature overview.
- The HEXPIRE return value can also be 0 (condition not met), 2 (field deleted because past timestamp), or -2 (field does not exist). The post only shows the success case (1), which is appropriate for introductory examples.
