# Validation Summary: How Redis Cluster Hash Slots Work (16384 Slots)

## Status
validated

## Post Type
Technical explainer / Reference guide

## Technologies Covered
- Redis Cluster
- CRC16 hash function (CRC-16/XMODEM variant)
- Python (for code example)
- Redis CLI (`redis-cli`)

## Sources Consulted
- Redis Cluster specification: https://redis.io/docs/latest/operate/oss_and_stack/reference/cluster-spec/
- Redis source code `src/crc16.c` — CRC16 implementation uses initial value `0` (CRC-16/XMODEM), not `0xFFFF` (CRC-16/CCITT)
- Redis CLUSTER KEYSLOT command documentation: https://redis.io/docs/latest/commands/cluster-keyslot/
- Redis CLUSTER SLOTS command documentation: https://redis.io/docs/latest/commands/cluster-slots/
- Redis CLUSTER INFO command documentation: https://redis.io/docs/latest/commands/cluster-info/
- Antirez's explanation of why 16384 slots: https://github.com/redis/redis/issues/2576

## Issues Found

### 1. Wrong CRC16 initial value (critical)
- **What was wrong:** The Python CRC16 implementation used `crc = 0xFFFF` as the initial value. Redis uses the CRC-16/XMODEM variant with initial value `0`, not the CRC-16/CCITT variant which uses `0xFFFF`. This is confirmed by the Redis source code in `src/crc16.c`.
- **What was changed:** Changed `crc = 0xFFFF` to `crc = 0`.
- **Why:** The incorrect initial value produces completely different hash values, meaning any reader who copied this code would get wrong slot assignments.

### 2. Incorrect example slot values (cascading from issue 1)
- **What was wrong:** All example slot values were fabricated and did not match either the (wrong) 0xFFFF-based computation or the correct 0-based computation:
  - `user:1001` was listed as slot 4092; correct value is 5712
  - `session:abc` was listed as slot 9187; correct value is 14788
- **What was changed:** Updated all slot values throughout the post (Python comments, CLUSTER KEYSLOT output, routing example, COUNTKEYSINSLOT/GETKEYSINSLOT examples) to use the correct values.

### 3. Incorrect routing example (cascading from issue 2)
- **What was wrong:** The routing example said slot 4092 is on Node A (slots 0-5460). With the correct slot of 5712, the key falls in Node B's range (5461-10922).
- **What was changed:** Updated the routing example to show slot 5712 on Node B, with the MOVED redirect pointing to Node B's IP (192.168.1.11) and the redirect going to Node B.

## Review Notes
- The `CLUSTER SLOTS` command was deprecated in Redis 7.0 in favor of `CLUSTER SHARDS`. The command still works, but readers using Redis 7.0+ may want to use `CLUSTER SHARDS` instead. This was not changed since `CLUSTER SLOTS` remains functional and the post does not claim a specific Redis version.
- The claim "All 16384 slots must be covered for the cluster to accept writes" is accurate for the default configuration (`cluster-require-full-coverage yes`), but this is configurable. The post does not mention this nuance, which is acceptable for an introductory explainer.
- The hash tag logic in the Python code is correctly implemented per the Redis Cluster specification.
- The 16384 slot count explanation (bitmap size in heartbeat messages, power-of-2 optimization) is accurate and aligns with Antirez's original explanation.
