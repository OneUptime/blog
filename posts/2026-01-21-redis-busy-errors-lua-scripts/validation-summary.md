# Validation Summary: How to Fix Redis 'BUSY' Errors from Lua Scripts

## Status
validated

## Post Type
Technical troubleshooting guide

## Technologies Covered
- Redis Lua scripting
- Redis Functions
- Redis CLI commands
- Redis server configuration
- Python redis-py client examples
- Bash emergency script

## Sources Consulted
- Redis programmability documentation: https://redis.io/docs/latest/develop/programmability/
- Redis `SCRIPT KILL` command documentation: https://redis.io/docs/latest/commands/script-kill/
- Redis `SCRIPT EXISTS` command documentation: https://redis.io/docs/latest/commands/script-exists/
- Redis `SCRIPT DEBUG` command documentation: https://redis.io/docs/latest/commands/script-debug/
- Redis `FUNCTION DELETE` command documentation: https://redis.io/docs/latest/commands/function-delete/
- Redis `FUNCTION LIST` command documentation: https://redis.io/docs/latest/commands/function-list/
- Redis `SCAN` command documentation: https://redis.io/docs/latest/commands/scan/
- Redis `KEYS` command documentation: https://redis.io/docs/latest/commands/keys/
- Redis `SLOWLOG GET` command documentation: https://redis.io/docs/latest/commands/slowlog-get/
- Redis configuration example: https://raw.githubusercontent.com/redis/redis/unstable/redis.conf

## Issues Found
- The post used `lua-time-limit` as the primary current timeout setting. Current Redis documentation names this setting `busy-reply-threshold`, with `lua-time-limit` retained as a legacy alias. Updated the explanation, command examples, section heading, and quick-reference table to use `busy-reply-threshold` while preserving the alias note.
- The post included `redis-cli DEBUG SCRIPT EXISTS` as a way to see all loaded scripts. Redis documents `SCRIPT EXISTS sha1 [sha1 ...]` for checking known script hashes, but does not document a `DEBUG SCRIPT EXISTS` command for listing cached scripts. Removed the invalid command and renamed the section to "Check Cached Scripts."
- The post listed "network calls" as a cause of slow Lua scripts while also noting scripts cannot make external calls. Reworded this to "Large Redis command replies" to match Redis's sandboxed script model.
- The circuit breaker Python example imported `wraps` but did not use it. Removed the unused import.
- The pre-flight validation example checked for `#keys` when detecting key validation, but Redis Lua scripts use the uppercase global `KEYS`. Corrected the heuristic to check `#KEYS`.

## Review Notes
The Python examples were syntax-checked locally with `ast.parse` and all five Python code blocks parse successfully. `redis-cli` was not installed in the local environment, so Redis command verification was performed against official Redis documentation instead of local CLI help.
