# Validation Summary: What Is New in Redis 6.0 (ACLs, SSL, Client-Side Caching)

## Status
validated

## Post Type
Reference / Feature overview

## Technologies Covered
- Redis 6.0
- Redis ACLs (Access Control Lists)
- Redis TLS/SSL support
- Redis client-side caching (CLIENT TRACKING)
- Redis threaded I/O
- RESP3 protocol

## Sources Consulted
- Redis 6.0 release notes: https://raw.githubusercontent.com/redis/redis/6.0/00-RELEASENOTES
- Redis ACL documentation: https://redis.io/docs/latest/operate/oss_and_stack/management/security/acl/
- Redis TLS documentation: https://redis.io/docs/latest/operate/oss_and_stack/management/security/encryption/
- Redis CLIENT TRACKING documentation: https://redis.io/docs/latest/commands/client-tracking/
- Redis HELLO command documentation: https://redis.io/docs/latest/commands/hello/
- Redis 6.2 release notes (for Pub/Sub ACL channel selectors): https://raw.githubusercontent.com/redis/redis/6.2/00-RELEASENOTES

## Issues Found

### 1. Pub/Sub channel ACL selector `&*` used in Redis 6.0 examples
- **What was wrong:** The ACL SETUSER commands and ACL LIST output included `&*` (Pub/Sub channel ACL selector), which was introduced in Redis 6.2, not Redis 6.0. Running these commands on Redis 6.0 would produce a syntax error.
- **What was changed:** Removed `&*` from all three ACL examples: the readonly user creation, the app-user creation, and the ACL LIST output.
- **Why:** The post is specifically about Redis 6.0 features, so the examples should be accurate for that version. Pub/Sub channel restrictions via the `&` selector were added in Redis 6.2.

## Review Notes
- Readers running Redis 6.2+ or 7.x may want to add `&*` back to their ACL commands to explicitly grant Pub/Sub channel access, as later versions restrict channel access by default when it is not specified.
- The client-side caching section shows `CLIENT TRACKING on` without `REDIRECT`, which requires RESP3. This is a correct usage but readers using RESP2 clients would need to use `CLIENT TRACKING on REDIRECT <client-id>` instead. This is an acceptable simplification for an overview post.
- Redis 6.0 release date of "April 2020" is confirmed correct (released April 30, 2020).
- All TLS configuration directives, threaded I/O settings, and RESP3 protocol details are accurate.
