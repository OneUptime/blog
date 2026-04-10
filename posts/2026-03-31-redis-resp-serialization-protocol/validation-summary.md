# Validation Summary: How the RESP (Redis Serialization Protocol) Works

## Status
validated

## Post Type
Reference / Tutorial

## Technologies Covered
- Redis
- RESP (Redis Serialization Protocol) - RESP2 and RESP3
- Python (socket programming, RESP parsing)
- netcat (nc) for raw protocol inspection

## Sources Consulted
- Redis RESP protocol specification: https://redis.io/docs/latest/develop/reference/protocol-spec/
- RESP3 specification: https://github.com/redis/redis-specifications/blob/master/protocol/RESP3.md
- Redis HELLO command documentation: https://redis.io/docs/latest/commands/hello/

## Issues Found

1. **RESP3 Map prefix was incorrect**: The post listed `| Map` as the RESP3 prefix for Map types. The correct prefix is `% Map`. In RESP3, `|` is the prefix for the Attribute type, not Map. Fixed by changing `|` to `%` in the RESP3 data types table.

2. **Python array parser bug**: In the simplified `parse_resp` function, the array parsing line `return [lines[i*2+1].decode() for i in range(count)]` was incorrect. After splitting a RESP array response by `\r\n`, element data values are at indices `i*2+2` (not `i*2+1`). The original expression returned the bulk string length headers (e.g., `$3`) instead of the actual data values (e.g., `foo`). Fixed by changing `i*2+1` to `i*2+2`.

## Review Notes
- The Python parser is explicitly labeled as "simplified" and is intended to illustrate the protocol, not serve as a production parser. It does not handle nested arrays or mixed-type arrays, which is acceptable for educational purposes.
- The netcat examples use `\$` to escape the dollar sign in the shell's `printf`, which is correct for bash.
- All RESP2 wire format examples are accurate and correctly demonstrate the protocol encoding.
- The HELLO command usage and RESP3 behavioral description (e.g., HGETALL returning a Map) are accurate for Redis 6.0+.
