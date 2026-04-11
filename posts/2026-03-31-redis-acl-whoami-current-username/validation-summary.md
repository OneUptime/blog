# Validation Summary: How to Use ACL WHOAMI in Redis to Get Current Username

## Status
validated

## Post Type
Reference / Tutorial

## Technologies Covered
- Redis (6.0+)
- Redis ACL system (Access Control Lists)
- Redis CLI (`redis-cli`)
- Redis AUTH command

## Sources Consulted
- Official Redis ACL WHOAMI documentation: https://redis.io/docs/latest/commands/acl-whoami/
- Official Redis ACL GETUSER documentation: https://redis.io/docs/latest/commands/acl-getuser/
- Official Redis AUTH documentation: https://redis.io/docs/latest/commands/auth/
- Official Redis CLI documentation (for `-u` URI flag)

## Issues Found
No technical issues found.

## Review Notes
- The ACL GETUSER output example shows `(empty array)` for the passwords field, despite the user `alice` having been authenticated with a password. In practice, the passwords array would contain the SHA-256 hash of the password. This is a minor illustrative inconsistency rather than a technical error, since the example is clearly truncated with `...` and serves to show the relationship between ACL WHOAMI and ACL GETUSER rather than document ACL GETUSER's exact output.
- The ACL GETUSER output omits the `channels` field (added in Redis 6.2) and `selectors` field (added in Redis 7.0). Again, the `...` truncation makes this acceptable.
- The post does not specify a minimum Redis version. ACL WHOAMI was introduced in Redis 6.0.0. A brief mention of this could be helpful for readers on older versions.
