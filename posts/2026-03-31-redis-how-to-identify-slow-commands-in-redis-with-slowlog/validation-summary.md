# Validation Summary: How to Identify Slow Commands in Redis with SLOWLOG

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Redis (SLOWLOG, CONFIG SET, SCAN, SSCAN, HSCAN)
- Python (redis-py client library)
- Bash scripting (cron-based collection)
- SMTP (email alerting)

## Sources Consulted
- [Redis SLOWLOG GET official documentation](https://redis.io/docs/latest/commands/slowlog-get/)
- [Redis SLOWLOG command documentation](https://redis.io/docs/latest/commands/slowlog/)
- [redis-py source code — parse_slowlog_get in helpers.py](https://github.com/redis/redis-py/blob/master/redis/_parsers/helpers.py)
- [redis-py issue #1374 — slowlog fields added in Redis 4](https://github.com/redis/redis-py/issues/1374)
- [redis-py PR #3441 — SLOWLOG GET response parsing fix](https://github.com/redis/redis-py/pull/3441)

## Issues Found

### Issue 1: Python analysis script — `command` field treated as a list (FIXED)
- **What was wrong:** `entry['command'][0].upper()` and `' '.join(entry['command'][:3])` assumed the `command` field is a list. In redis-py, `parse_slowlog_get` joins the command arguments into a single string with `space.join()`, so `entry['command']` is a string like `"KEYS user:*"`, not a list like `["KEYS", "user:*"]`. Indexing `[0]` on a string returns the first character (`'K'`), not the first word.
- **Fix:** Changed to `entry['command'].split()` to split the string into a list of words, then index into that.

### Issue 2: Python analysis script — wrong dictionary key for client address (FIXED)
- **What was wrong:** `entry['client_addr']` used the key `client_addr`, but redis-py uses `client_address` as the dictionary key. This would raise a `KeyError` at runtime.
- **Fix:** Changed to `entry.get('client_address', 'N/A')` (using `.get()` since the field is optional depending on the Redis environment).

### Issue 3: Python alerting script — `command` field treated as a list (FIXED)
- **What was wrong:** `worst['command'][0]` had the same bug as Issue 1 — indexing into a string instead of splitting first. Without `decode_responses=True`, the command is bytes, and `bytes[0]` returns an integer (byte value) in Python 3, so the alert would report a number instead of a command name.
- **Fix:** Changed to `worst['command'].split()[0]`.

### Issue 4: Bash collection script — unused THRESHOLD variable (FIXED)
- **What was wrong:** `THRESHOLD=128` was defined but the comparison used a hardcoded `5` (`if [ "$count" -gt 5 ]`). The variable was never referenced.
- **Fix:** Changed to use `$THRESHOLD` in the comparison and set `THRESHOLD=5` to match the original intended logic.

## Review Notes
- The alerting script does not set `decode_responses=True`, so `worst['command']` will be bytes. After splitting, `worst['command'].split()[0]` returns a bytes object (e.g., `b'KEYS'`), which will display with a `b'...'` prefix in the alert email. Authors may want to add `decode_responses=True` or decode the value for cleaner output, but this is a stylistic preference, not a correctness error.
- The `client_address` and `client_name` fields in slowlog entries were added in Redis 4.0 and are optional in some Redis environments (e.g., Redis Software). The use of `.get()` with a fallback is the safest approach.
- The post's Redis CLI commands, configuration directives, SLOWLOG output format, and the table of slow commands/fixes are all accurate per current Redis documentation.
