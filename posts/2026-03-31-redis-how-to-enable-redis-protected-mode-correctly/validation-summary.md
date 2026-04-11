# Validation Summary: How to Enable Redis Protected Mode Correctly

## Status
validated

## Post Type
Guide

## Technologies Covered
- Redis (3.2+ through 7.x)
- Redis protected mode
- Redis configuration (`redis.conf`)
- Redis CLI (`redis-cli`)
- Docker (Redis container deployment)
- OpenSSL (password generation)

## Sources Consulted
- Redis official security documentation: https://redis.io/docs/latest/operate/oss_and_stack/management/security/
- Redis 7.2 source code (`networking.c`) — protected mode check logic
- Redis 6.2 source code (`networking.c`) — older protected mode check with `bindaddr_count == 0`
- Redis 7.2 default `redis.conf` — default bind and protected-mode settings
- Redis `INFO server` command output format documentation

## Issues Found

1. **Incorrect protected mode activation conditions (bind directive)**: The post stated that protected mode activates when "No bind directive is configured, OR the server is bound to `0.0.0.0`." This was inaccurate in two ways: (a) In Redis 7.0+, the bind directive is no longer part of the protected mode check at all — it activates based solely on `protected-mode yes` and no password being set. (b) In older Redis versions (pre-7.0), explicitly setting `bind 0.0.0.0` would actually bypass the protected mode check (since `bindaddr_count` would be non-zero), so the "OR bound to `0.0.0.0`" part was wrong for all versions. Fixed the conditions to list only the two relevant conditions and added a version note about the old bind-related behavior.

2. **Misleading opening paragraph**: The opening stated protected mode applies "when Redis is bound to `0.0.0.0` (all interfaces) without a password." This incorrectly tied protected mode to a specific bind address. Fixed to accurately state that protected mode activates when no password is set, without reference to the bind address.

3. **`INFO server` grep for `bind`**: The verification command `redis-cli INFO server | grep -E "redis_version|tcp_port|bind"` included `bind` in the grep pattern, but `bind` is not a field in the `INFO server` output. The correct way to check bind (via `CONFIG GET bind`) was already shown on the next line. Removed `bind` from the grep pattern.

4. **Incorrect `openssl rand -base64 32` example output**: The example showed a 35-character string (`xK3mP9qR2nL7vB4wT1yJ5sD8cF6hA0eN`), but base64 encoding of 32 bytes produces a 44-character string (including padding). Fixed with a correctly-sized example.

## Review Notes
- The layered security best practices section is well-structured and gives good advice.
- The post mentions Redis ACLs in passing (Layer 3) but doesn't elaborate. This is fine for scope, but readers using Redis 6+ should be aware that ACLs provide more granular access control than `requirepass` alone.
- The Docker example (`redis:7`) is current and uses correct flags.
- The `CONFIG SET` / `CONFIG REWRITE` workflow is correctly documented.
- The common mistakes section provides valuable practical guidance, especially about weak passwords.
