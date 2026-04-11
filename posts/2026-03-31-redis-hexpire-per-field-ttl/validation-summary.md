# Validation Summary: How to Use HEXPIRE in Redis to Set Per-Field TTL (Redis 7.4+)

## Status
validated

## Post Type
Tutorial / Command Reference

## Technologies Covered
- Redis 7.4+
- HEXPIRE command (per-field hash expiration)
- HTTL command (per-field TTL inspection)
- HPERSIST command (remove field expiration)
- Redis hash data structure

## Sources Consulted
- Official Redis HEXPIRE documentation: https://redis.io/docs/latest/commands/hexpire/
- Official Redis HTTL documentation: https://redis.io/docs/latest/commands/httl/

## Issues Found

### 1. Incorrect HEXPIRE return value codes
**What was wrong:** The return value documentation listed 5 codes (2, 1, 0, -1, -2) with incorrect descriptions. According to official Redis docs, there are only 4 return codes and no `-1` code exists for HEXPIRE.
- Code `2` was described as "field was updated with the new expiry" but actually means "field was deleted because the specified expiration is in the past or zero."
- Code `0` was described as "field does not exist" but actually means "condition (NX/XX/GT/LT) was not met."
- Code `-1` was listed as "condition not met" but this code does not exist for HEXPIRE. The condition-not-met code is `0`.
**What was changed:** Corrected the return value table to match the official documentation, removing the non-existent `-1` code and fixing descriptions for codes `2` and `0`.

### 2. Incorrect example output for conditional NX expiry
**What was wrong:** The second `HEXPIRE NX` call showed a return value of `-1` and the explanatory text said "returned -1 (condition not met)."
**What was changed:** Changed to `0` and updated text to "returned 0 (condition not met)" to match the actual HEXPIRE return codes.

### 3. Incorrect example output for conditional GT expiry
**What was wrong:** The third `HEXPIRE GT` call (100s < current 600s) showed a return value of `-1` and the text said "returned -1 and was rejected by GT."
**What was changed:** Changed to `0` and updated text to "returned 0 and was rejected by GT."

## Review Notes
- The syntax, conditional flags (NX/XX/GT/LT), and general explanation of HEXPIRE behavior are accurate.
- The HTTL examples and usage are correct.
- The mention of HPERSIST in the summary is accurate.
- The version claim (Redis 7.4+) is correct — HEXPIRE was introduced in Redis 7.4.0.
- The mermaid diagram correctly illustrates the per-field expiration concept.
- The comparison table between key-level EXPIRE and per-field HEXPIRE is accurate.
