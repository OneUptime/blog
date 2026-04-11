# Validation Summary: How to Set Up Redis Authentication with requirepass

## Status
validated

## Post Type
Tutorial / Configuration Guide

## Technologies Covered
- Redis (general, and specifically Redis 6.0+ ACL system)
- redis-cli
- systemd (systemctl)
- OpenSSL (for password generation)

## Sources Consulted
- Redis official documentation on AUTH command: https://redis.io/docs/latest/commands/auth/
- Redis official documentation on requirepass directive: https://redis.io/docs/latest/operate/oss_and_stack/management/config-file/
- Redis official documentation on ACL SETUSER: https://redis.io/docs/latest/commands/acl-setuser/
- Redis official documentation on protected-mode: https://redis.io/docs/latest/operate/oss_and_stack/management/security/
- Redis official documentation on CONFIG SET / CONFIG REWRITE: https://redis.io/docs/latest/commands/config-set/

## Issues Found
1. **Inaccurate description of protected-mode behavior** (Binding Redis to Localhost section):
   - **What was wrong:** The post stated that `protected-mode yes` "requires a password if Redis is bound to non-loopback interfaces." This is misleading. Protected-mode does not "require a password" — it rejects non-loopback connections entirely when two conditions are both true: (a) no password is configured via `requirepass`, and (b) no explicit `bind` directive is set. If an explicit `bind 0.0.0.0` is configured, protected-mode does not activate regardless of password settings.
   - **What was changed:** Replaced the sentence with: "Or rely on `protected-mode yes` (the default), which rejects connections from non-loopback interfaces when no password is set and no explicit `bind` directive is configured."
   - **Why:** The original phrasing could lead readers to believe that setting `bind 0.0.0.0` with `protected-mode yes` would enforce password authentication for external connections, which is incorrect and could result in an unprotected Redis instance exposed to the network.

## Review Notes
- The `ACL SETUSER default on >yourpassword ~* +@all` example is a reasonable simplification for Redis 6.0. In Redis 6.2+, the default user also has `&*` (pub/sub channel permissions), so the full equivalent would include that. Since the post is illustrating the password-setting concept rather than documenting the complete default user ACL, this is acceptable.
- The generated base64 password (`9K+mZ3X2vLqRwN5pT8cAjUh1DsYeF0bG7OiQlnVkCdM=`) contains `+` and `=` characters. If used in a Redis URI (the `-u` flag example), these would need to be URL-encoded. The post uses a placeholder password in the URI example so this isn't an error, but readers combining the two sections could run into issues.
- The `redis-cli -a` flag prints a warning in modern Redis versions: "Warning: Using a password with '-a' or '-u' option on the command line interface may not be safe." This is not an error in the post but could be worth noting for completeness.
