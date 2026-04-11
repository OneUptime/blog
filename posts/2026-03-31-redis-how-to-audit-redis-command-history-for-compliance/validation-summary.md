# Validation Summary: How to Audit Redis Command History for Compliance

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Redis (6.0+ ACLs, MONITOR, Keyspace Notifications)
- Redis Enterprise (audit logging REST API)
- Python (redis-py client, psycopg2)
- Fluentd (log forwarding)
- Elasticsearch (SIEM destination)
- PostgreSQL (audit dashboard storage)

## Sources Consulted
- Redis ACL LOG documentation: https://redis.io/docs/latest/commands/acl-log/
- Redis MONITOR documentation: https://redis.io/docs/latest/commands/monitor/
- Redis ACL SETUSER documentation: https://redis.io/docs/latest/commands/acl-setuser/
- Redis Keyspace Notifications documentation: https://redis.io/docs/latest/develop/use/keyspace-notifications/
- Redis ACL documentation: https://redis.io/docs/latest/operate/oss_and_stack/management/security/acl/
- Fluentd tail input plugin documentation: https://docs.fluentd.org/input/tail

## Issues Found
1. **Incorrect `ACL LOG` syntax**: The post used `ACL LOG COUNT 10`, but the `COUNT` keyword is not part of the ACL LOG syntax. The correct command is `ACL LOG 10` (just the integer argument). Fixed.
2. **Wrong field name in ACL LOG sample output**: The sample output showed `"age"` as a field name, but the actual field returned by Redis is `"age-seconds"`. Fixed.
3. **Inaccurate MONITOR performance claim**: The post stated MONITOR "doubles CPU usage." The Redis documentation states it "can reduce throughput by more than 50%," which describes throughput reduction, not CPU doubling. Fixed to match the official documentation wording.

## Review Notes
- `datetime.datetime.utcnow()` in the Python keyspace subscriber is deprecated since Python 3.12 in favor of `datetime.datetime.now(datetime.timezone.utc)`. It still works but may generate deprecation warnings in newer Python versions.
- The Fluentd config uses `format none` (v0.12 syntax). In Fluentd v1+, the preferred syntax is a `<parse>` block with `@type none`. The old syntax still works via backward compatibility.
- The Fluentd Elasticsearch output uses `type_name _doc`, which is deprecated in Elasticsearch 7+ and removed in Elasticsearch 8+. For ES 8+ deployments, this parameter should be omitted.
- `redis.StrictRedis` is an older alias; `redis.Redis` is preferred in modern redis-py, though both work identically.
- The `&*` Pub/Sub channel ACL pattern used in the ACL SETUSER example requires Redis 6.2+, not 6.0. The post mentions Redis 6.0 for ACL introduction but doesn't clarify this distinction.
