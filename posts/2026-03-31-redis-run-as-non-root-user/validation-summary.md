# Validation Summary: How to Run Redis as a Non-Root User

## Status
validated

## Post Type
Tutorial / Security Hardening Guide

## Technologies Covered
- Redis (7.x)
- Linux (useradd, file permissions)
- systemd (service units, security directives)
- Docker / Docker Compose

## Sources Consulted
- Redis official documentation on the `supervised` config directive: https://redis.io/docs/latest/operate/oss_and_stack/management/config/
- Redis official documentation on `rename-command`: https://redis.io/docs/latest/operate/oss_and_stack/management/security/
- systemd `Type=notify` documentation: https://www.freedesktop.org/software/systemd/man/systemd.service.html
- Official Redis Docker image entrypoint: https://github.com/docker-library/redis
- Linux `useradd` man page for `--system`, `--no-create-home`, `--shell` flags
- systemd security directives (`NoNewPrivileges`, `ProtectSystem`, `ProtectHome`, `ReadWritePaths`, `PrivateTmp`)

## Issues Found

### 1. Missing `supervised systemd` directive in redis.conf
- **What was wrong:** The systemd service file uses `Type=notify`, which requires Redis to send a `READY=1` notification via `sd_notify()`. However, the redis.conf example did not include the `supervised systemd` directive. Without this, Redis will not send the readiness notification, and systemd will wait indefinitely (or until `TimeoutStartSec` expires) before potentially killing the process.
- **What was changed:** Added `supervised systemd` to the redis.conf configuration block, before the `dir` directive.
- **Why:** This directive tells Redis to send systemd-compatible readiness notifications, which is required for `Type=notify` to function correctly.

### 2. Unreliable Docker verification command
- **What was wrong:** The post claimed `docker run --rm redis:7 whoami` would output `redis`. The official Redis Docker image entrypoint uses `gosu` to switch to the `redis` user only when the command is `redis-server`. For arbitrary commands like `whoami`, the entrypoint falls through to `exec "$@"` without switching users, so the output depends on the Dockerfile's `USER` directive rather than the entrypoint's `gosu` logic. This makes the command an unreliable way to verify the running user.
- **What was changed:** Replaced the `whoami` one-liner with a `docker run -d` / `docker top` workflow that inspects the actual running `redis-server` process user, which is the authoritative way to confirm the process runs as non-root.
- **Why:** `docker top` shows the real UID of the running process, making it a reliable verification method regardless of entrypoint implementation details.

## Review Notes
- The `rename-command` directives (FLUSHALL, FLUSHDB, CONFIG, DEBUG) are technically correct but Redis 7.x recommends using ACLs instead for more granular access control. `rename-command` is not deprecated but may be in future versions.
- Renaming `CONFIG` to `""` prevents runtime configuration changes via `redis-cli`. This is intentional for security but operators should be aware it also blocks `CONFIG REWRITE` and `CONFIG SET` commands.
- The Docker Compose snippet is missing the top-level `volumes:` declaration for `redis-data`. While Docker Compose will auto-create unnamed volumes, best practice is to declare them explicitly. This was not fixed since the snippet is clearly a partial example.
- `TimeoutStopSec=0` disables the stop timeout entirely, meaning systemd will wait forever for Redis to shut down. In production, a finite timeout (e.g., 300s) may be more appropriate to avoid hung shutdowns blocking system operations.
