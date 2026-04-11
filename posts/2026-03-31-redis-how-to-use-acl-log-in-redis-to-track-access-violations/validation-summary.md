# Validation Summary: How to Use ACL LOG in Redis to Track Access Violations

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Redis (ACL system, 6.0+)
- Python (redis-py client library)
- Node.js (node-redis client library)

## Sources Consulted
- Redis ACL LOG official documentation: https://redis.io/docs/latest/commands/acl-log/
- Redis ACL SETUSER official documentation: https://redis.io/docs/latest/commands/acl-setuser/
- redis-py (Python Redis client) source and API documentation
- node-redis (Node.js Redis client) source and API documentation

## Issues Found

1. **Incorrect error message prefix**: The post used `ERR` as the prefix for ACL denial errors (e.g., `ERR No permissions to access a key`). Redis actually returns `NOPERM` as the error prefix. Also the key error message text was wrong — changed to `NOPERM this user has no permissions to access one of the keys used as arguments`.

2. **Incomplete `reason` field values**: The table listed `command`, `key`, or `channel` but omitted `auth` (for failed AUTH/HELLO attempts). Added `auth` to the list.

3. **Vague `context` field values**: The table said `toplevel`, `multi`, `lua`, etc. but did not mention `module`. Replaced "etc." with the explicit fourth value `module`.

4. **Missing fields in documentation table**: The example output showed `entry-id`, `timestamp-created`, and `timestamp-last-updated` fields, but the fields table below it omitted them. Added these three fields to the table with a note that they require Redis 7.2+.

5. **Incorrect Python API for resetting ACL log**: The post used `client.acl_log(reset=True)`, but redis-py does not accept a `reset` parameter on `acl_log()`. The correct method is `client.acl_log_reset()`. Fixed in both the practical example and the monitoring script.

6. **Incorrect Node.js API for resetting ACL log**: The post used `adminClient.aclLog({ count: 'RESET' })`, but node-redis exposes a separate `aclLogReset()` method for this purpose. Fixed to `adminClient.aclLogReset()`.

## Review Notes
- The `entry-id`, `timestamp-created`, and `timestamp-last-updated` fields shown in the example output are only available in Redis 7.2+. The post does not specify a target Redis version, so readers on Redis 6.x or early 7.x will not see these fields. The table now notes the version requirement.
- The ACL SETUSER example uses `~data:*` which grants both read and write key access. Since `+@read` already restricts to read-only commands, this works as intended, but readers should be aware that for Redis 7.0+ the `%R~data:*` syntax exists for read-only key permissions.
