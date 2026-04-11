# Validation Summary: How to Configure Redis Log Rotation

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Redis (logging and log file configuration)
- logrotate (Linux log rotation utility)
- Linux system administration (file permissions, directory setup)

## Sources Consulted
- Redis signal handling documentation: https://redis.io/docs/latest/operate/oss_and_stack/reference/signals/
- Redis GitHub issue #337 (logreopen / SIGUSR1 feature request): https://github.com/redis/redis/issues/337
- Redis DEBUG command documentation: https://redis.io/docs/latest/commands/debug/
- Redis CONFIG REWRITE documentation: https://redis.io/docs/latest/commands/config-rewrite/
- Ubuntu bug #1236329 (Redis logrotate copytruncate discussion): https://bugs.launchpad.net/ubuntu/+source/redis/+bug/1236329
- Redis source code (`src/server.c`, `serverLogRaw()` function) confirming open-write-close logging behavior

## Issues Found

### Issue 1: Incorrect postrotate script using CONFIG SET and DEBUG SLEEP
**What was wrong:** The first logrotate configuration used `redis-cli CONFIG SET loglevel notice` and `redis-cli DEBUG SLEEP 0` in a postrotate script. Neither command causes Redis to reopen its log file. `CONFIG SET loglevel` only changes verbosity, and `DEBUG SLEEP 0` is a no-op that sleeps for zero seconds.
**What was changed:** Removed the entire postrotate block (and the `sharedscripts` directive which is only needed with scripts) from the logrotate configuration.
**Why:** No postrotate script is needed at all. Redis opens and closes the log file on every single log write (`fopen("a")` / `fclose()`), so after logrotate renames the old file, Redis automatically creates a new file at the configured path.

### Issue 2: False claim that SIGUSR1 causes Redis to reopen the log file
**What was wrong:** The "Sending a Signal to Redis to Reopen the Log File" section claimed that `SIGUSR1` causes Redis to reopen its log file. This is false. Per the official Redis signal documentation, `SIGUSR1` terminates the background RDB-saving child process. Redis creator Salvatore Sanfilippo explicitly addressed this in GitHub issue #337, explaining that Redis always reopens the log after every message, so no signal is needed.
**What was changed:** Replaced the entire section with "Why No Postrotate Script Is Needed," explaining Redis's open-close-on-every-write behavior and noting that `SIGUSR1` does not affect logging.
**Why:** Sending SIGUSR1 to Redis has no effect on logging. On Redis versions before 2.6.10 where SIGUSR1 was unhandled, sending it could actually terminate the process — making this advice potentially dangerous.

### Issue 3: False claim about CONFIG REWRITE
**What was wrong:** The text stated "The standard approach is to use `CONFIG REWRITE` or send a `SIGUSR1` signal." `CONFIG REWRITE` persists runtime configuration changes to redis.conf — it has nothing to do with log file reopening.
**What was changed:** Removed as part of the section rewrite in Issue 2.
**Why:** Misleading readers about the purpose of CONFIG REWRITE.

### Issue 4: Unnecessary PID file section
**What was wrong:** The "Enable a PID File in Redis" section existed solely to support the SIGUSR1 signal-based approach, which was incorrect.
**What was changed:** Removed the section entirely.
**Why:** Since no signal needs to be sent to Redis for log rotation, configuring a PID file is not relevant to this topic.

### Issue 5: Multiple instances config used SIGUSR1
**What was wrong:** The multiple instances logrotate configuration included a postrotate script sending `pkill -USR1 redis-server`.
**What was changed:** Removed the postrotate script and `sharedscripts` directive; added `create 640 redis redis` for proper permissions.
**Why:** Same as Issues 1-2 — no signal is needed.

### Issue 6: Summary referenced SIGUSR1
**What was wrong:** The summary paragraph stated "Send a SIGUSR1 signal in the postrotate script so Redis reopens the log file after rotation."
**What was changed:** Updated to explain that no postrotate is needed because Redis opens/closes the log on every write.
**Why:** Consistency with the corrected content.

## Review Notes
- Redis's open-close-on-every-write logging behavior means that `copytruncate` is also unnecessary (though it would work). The standard `create`-based rotation used in the corrected post is the most efficient approach.
- The `delaycompress` directive is still appropriate — it allows the most recent rotated file to remain uncompressed for easier debugging of recent issues.
- The logrotate `--debug` and `--force` commands shown in the testing section are correct.
- The `redis-cli CONFIG GET logfile` command for checking the log location is correct.
