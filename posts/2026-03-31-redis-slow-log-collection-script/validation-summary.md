# Validation Summary: How to Write a Redis Slow Log Collection Script

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Redis (SLOWLOG commands, CONFIG SET/GET)
- Bash scripting (redis-cli usage)
- Python 3 (redis-py library)
- Cron scheduling

## Sources Consulted
- redis-py source code (`redis/_parsers/helpers.py`, `parse_slowlog_get` function) — installed locally at `/Users/nawazdhandala/Library/Python/3.9/lib/python/site-packages/redis/`
- Redis SLOWLOG documentation: https://redis.io/commands/slowlog-get/
- Redis CONFIG SET documentation: https://redis.io/commands/config-set/

## Issues Found

### 1. Python: `command` field treated as a list instead of a string
**What was wrong:** The `format_entry()` function treated `entry.get("command", [])` as a list of arguments (e.g., `["SET", "key", "value"]`) and indexed into it with `args[0]`, `args[:4]`, and `" ".join(...)`. In redis-py, `slowlog_get()` returns the `command` field as a space-joined string (e.g., `"SET key value"`), not a list. This is confirmed in the `parse_slowlog_get` function which does `space.join(item[3])`. Treating a string as a list would yield individual characters, producing wrong output.

**What was changed:** Changed `args = entry.get("command", [])` to `command = entry.get("command", "")` with `parts = command.split()`, then used `parts[0]` for the command name and `" ".join(parts[:4])` for the args preview.

### 2. Python: `client_addr` key does not exist in redis-py's slowlog response
**What was wrong:** The code used `entry.get("client_addr", "")` to access the client address, but redis-py's `parse_slowlog_get` uses the key `client_address`, not `client_addr`. The `.get()` with a default masked the bug — the field would silently always be empty.

**What was changed:** Changed `entry.get("client_addr", "")` to `entry.get("client_address", "")`.

### 3. Python: Slowest command display treated `command` as a list
**What was wrong:** `slowest.get('command', [])[:2]` sliced the command string to get its first 2 characters rather than its first 2 words. For example, a command `"KEYS *"` would display `"KE"` instead of `"KEYS *"`.

**What was changed:** Replaced with `cmd_preview = " ".join(slowest.get("command", "").split()[:2])` to correctly extract the first two words of the command string.

## Review Notes
- The Bash script reads `LAST_ID` but never actually uses it to filter entries — it always writes all 128 fetched entries. This is a functional gap rather than a syntax error, and the Python version handles deduplication correctly, so the Bash script serves as a simpler starting-point example.
- The Bash script's output file defaults to `.jsonl` extension but writes raw redis-cli text output, not JSON. The inline comment acknowledges this ("redis-cli outputs structured text").
- The Redis CONFIG SET commands and SLOWLOG commands are all correct and current.
- The cron examples are syntactically valid. Using `>> /dev/null` (append) instead of `> /dev/null` (truncate) is unconventional but functionally equivalent for `/dev/null`.
