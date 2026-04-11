# Validation Summary: How to Use FUNCTION LIST and FUNCTION DELETE in Redis

## Status
validated

## Post Type
Reference / Tutorial

## Technologies Covered
- Redis 7+
- Redis Functions (FUNCTION LIST, FUNCTION DELETE)
- Lua scripting engine for Redis
- redis-cli

## Sources Consulted
- Redis official documentation for FUNCTION LIST: https://redis.io/docs/latest/commands/function-list/
- Redis official documentation for FUNCTION DELETE: https://redis.io/docs/latest/commands/function-delete/
- Redis Functions Introduction: https://redis.io/docs/latest/develop/programmability/functions-intro/
- Redis source code (functions.c): https://github.com/redis/redis/blob/7.2/src/functions.c

## Issues Found
1. **Incorrect error message after calling a deleted function (line 149)**: The post claimed that calling `FCALL` after deleting a library returns `(error) ERR Library not loaded. Please use FUNCTION LOAD.` This error message does not exist in Redis. The actual error returned by Redis is `(error) ERR Function not found`. Fixed to show the correct error message.

## Review Notes
- The related commands table omits `FUNCTION KILL`, which is part of the FUNCTION command family and can be used to terminate a running function. This is a minor omission and not an error, since the table covers the most commonly used commands.
- The syntax, output format, WITHCODE behavior, LIBRARYNAME glob filtering, and FUNCTION DELETE return values are all accurate per official Redis documentation.
- The summary section mentions "Lua function libraries" which is technically accurate but worth noting that Redis Functions also support other engines (though Lua is the only built-in one as of Redis 7.x).
