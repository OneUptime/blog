# Validation Summary: How to Configure Redis bind and protected-mode

## Status
validated

## Post Type
Guide

## Technologies Covered
- Redis (versions 3.2 through 7.0+)
- Redis `bind` directive
- Redis `protected-mode` directive
- Redis TLS/SSL configuration (Redis 6.0+)
- Redis `requirepass` authentication

## Sources Consulted
- Official Redis 7.0 default configuration file (https://raw.githubusercontent.com/redis/redis/7.0/redis.conf) — verified default bind value, `-` prefix syntax, and protected-mode behavior
- Redis 3.2 source code (`src/networking.c`) — verified protected-mode introduction and original check logic
- Redis 6.2 source code — verified protected-mode check included `bindaddr_count == 0` condition
- Redis 7.0 source code — verified protected-mode check no longer includes bind address count
- Redis 6.0 release notes — verified TLS support introduction

## Issues Found

### 1. Incorrect protected-mode behavior description (lines 43-46)
**What was wrong:** The post stated that protected-mode refuses connections unless BOTH conditions are met: (1) a non-loopback bind is configured AND (2) a password is set. This AND-based description was incorrect — the conditions are OR-based.

**What was changed:** Corrected to explain that setting a password via `requirepass` alone is sufficient to disable the protected-mode block. Added version-specific clarification: in Redis 3.2-6.2, setting either an explicit bind directive or a password would disable the check; in Redis 7.0+, the bind directive is no longer part of the protected-mode check since the default bind already restricts to loopback.

**Why:** The Redis source code shows the protected-mode check uses AND conditions (all must be true for the block to activate), meaning any single remedy (password OR explicit bind in <=6.2) disables it. The post's AND-based description of the required remedies was the logical inverse of the actual behavior.

### 2. Incorrect flowchart (lines 54-66)
**What was wrong:** The flowchart showed that when bind includes a non-loopback address AND protected-mode is yes, connections are still DENIED if requirepass is not set. This is incorrect — in Redis <=6.2, explicitly setting bind bypasses protected-mode entirely; in Redis 7.0+, the flowchart structure was misleading by branching first on bind configuration rather than on connection source and protected-mode state.

**What was changed:** Replaced with a simpler, accurate flowchart for Redis 7.0+ that correctly shows: loopback connections are always allowed; for non-loopback connections, protected-mode blocks only when enabled AND no password is set. Added "(Redis 7.0+)" qualifier to the heading.

**Why:** The original flowchart would lead readers to believe they must always configure both bind and requirepass together, when in fact setting a password alone is sufficient to bypass protected-mode.

## Review Notes
- The `-::1` syntax (dash prefix) in `bind 127.0.0.1 -::1` is correctly used but only briefly mentioned as "optionally" without explaining the mechanism. The `-` prefix means Redis will not fail to start if that address is unavailable (e.g., on systems without IPv6). This is accurate but could be more explicit in a future revision.
- The Container/Kubernetes example recommends `protected-mode no` with `requirepass`, which is a valid and common pattern. However, it could note that `protected-mode yes` with `requirepass` would also work since the password alone satisfies protected-mode.
- The TLS configuration section is correct for Redis 6.0+ but minimal. It omits `tls-auth-clients` and `tls-replication` directives that are commonly needed in production, but this is acceptable for a security-focused overview post.
- The `redis-cli CONFIG GET bind` command and `ss` command examples are correct.
