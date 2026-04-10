# Validation Summary: How to Set Up Redis as a systemd Service

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Redis (in-memory data store)
- systemd (Linux service manager)
- Linux system administration (user management, file permissions)

## Sources Consulted
- Redis Signal Handling Documentation: https://redis.io/docs/latest/operate/oss_and_stack/reference/signals/
- Redis source code `setupSignalHandlers()` in `src/server.c`: https://github.com/redis/redis/blob/unstable/src/server.c
- Official Redis systemd unit file: https://github.com/redis/redis/blob/unstable/utils/systemd-redis_server.service
- systemd.unit(5) man page (StartLimitIntervalSec/StartLimitBurst documentation)
- systemd.service(5) man page (Type=notify, Restart, ExecStop documentation)
- systemd.exec(5) man page (security hardening directives)

## Issues Found

### 1. ExecStop used SIGQUIT instead of proper shutdown (Critical)
- **What was wrong:** The unit file used `ExecStop=/bin/kill -s QUIT $MAINPID`. Redis does NOT handle SIGQUIT — it only registers signal handlers for SIGTERM and SIGINT for graceful shutdown. Sending SIGQUIT to Redis triggers the default OS action: immediate termination with a core dump. This means no graceful shutdown, no RDB/AOF save, and wasted disk space from core dump files.
- **What was changed:** Replaced with `ExecStop=/usr/local/bin/redis-cli shutdown`, which triggers Redis's built-in graceful shutdown procedure including data persistence.
- **Why:** Redis source code (`setupSignalHandlers()` in `server.c`) only installs shutdown handlers for SIGTERM and SIGINT. The official Redis systemd unit file omits ExecStop entirely (relying on systemd's default SIGTERM). Using `redis-cli shutdown` is the explicit Redis-idiomatic approach.

### 2. StartLimitIntervalSec and StartLimitBurst in wrong section (Minor)
- **What was wrong:** The "Customizing Restart Policy" example placed `StartLimitIntervalSec=60` and `StartLimitBurst=5` in the `[Service]` section.
- **What was changed:** Moved these directives to the `[Unit]` section where they are documented to belong per `systemd.unit(5)`.
- **Why:** These are `[Unit]` section directives as documented in the systemd.unit(5) man page. While systemd accepts them in `[Service]` for backward compatibility, placing them in the wrong section in a tutorial teaches incorrect practices.

## Review Notes
- The `--supervised systemd` flag appears both in the `ExecStart` command line and in the `redis.conf` instructions. This is redundant (command-line takes precedence) but not harmful. Both approaches work.
- The `Environment="REDIS_LOG_LEVEL=verbose"` example in the drop-in override section demonstrates systemd syntax but Redis does not read this environment variable. It won't break anything, but readers should not expect it to change Redis log verbosity. Redis log level is configured via `loglevel` in `redis.conf`.
- The `redis-cli shutdown` approach for ExecStop may fail if Redis is configured with authentication (`requirepass`). In that case, the command would need to include `-a <password>` or operators should omit ExecStop entirely and let systemd send SIGTERM (the default).
- All other technical content (user creation, directory permissions, systemd directives, redis.conf settings, Type=notify behavior, READY=1 notification, systemctl commands, drop-in overrides) is accurate and correct.
