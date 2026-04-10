# Validation Summary: How to Use OBJECT FREQ in Redis with LFU Eviction Policy

## Status
validated

## Post Type
Tutorial / Reference

## Technologies Covered
- Redis (OBJECT FREQ command)
- LFU (Least Frequently Used) eviction policy
- Redis memory management configuration (maxmemory-policy, lfu-log-factor, lfu-decay-time)

## Sources Consulted
- Redis official documentation for OBJECT FREQ: https://redis.io/docs/latest/commands/object-freq/
- Redis eviction policies documentation: https://redis.io/docs/latest/develop/reference/eviction/
- Redis source code (object.c) for error message text and LFU_INIT_VAL constant
- Redis source code (evict.c) for LFULogIncr probability formula

## Issues Found

1. **Incorrect error message (line 101)**: The blog showed `ERR object freq is not allowed when maxmemory-policy is not set to an LFU policy.` but the actual Redis error message is `An LFU maxmemory policy is not selected, access frequency not tracked. Please note that when switching between policies at runtime LRU and LFU data will take some time to adjust.` Fixed to match the real output.

2. **False claim about initial value configurability (line 117)**: The blog stated "The initial value is configurable via `lfu-log-factor`." This is incorrect. The initial LFU counter value of 5 is a hardcoded constant (`LFU_INIT_VAL`) in the Redis source code and cannot be changed at runtime. `lfu-log-factor` controls the rate of counter saturation, not the initial value. Fixed to clarify the constant is hardcoded.

3. **Incorrect increment probability formula (line 123)**: The blog stated the probability is `1 / (counter * lfu_log_factor + 1)` but the actual formula from the Redis source is `1.0 / ((counter - LFU_INIT_VAL) * lfu_log_factor + 1)` where `LFU_INIT_VAL` is 5 (clamped to 0 if negative). This is a meaningful difference: a new key at counter 5 has baseval 0 and probability 1.0 (guaranteed increment), whereas the blog's formula would give ~0.02. Fixed to show the correct formula.

4. **Incorrect table values for lfu-log-factor 0 and 1 (lines 130-131)**: The blog claimed factor 0 reaches 255 at ~18,000 hits and factor 1 at ~90,000 hits. According to the official Redis documentation table, factor 0 saturates at approximately 1,000 hits and factor 1 at approximately 100,000 hits. Fixed to match official documentation values.

## Review Notes
- The examples showing OBJECT FREQ output values (5 for a new key, 12 for a hot key, 0 for a cold key) are reasonable illustrative values, though actual results depend on timing and probabilistic behavior.
- The cold key example shows frequency 0, which could happen if enough time has passed for decay, but a freshly created key would start at 5. The example implicitly assumes some time has passed for decay. This is acceptable for illustrative purposes.
- The mermaid diagram is a reasonable high-level representation of the LFU mechanics.
- The description of lfu-decay-time as "minutes between decrement ticks" is a slight simplification — decay actually happens when a key is sampled/accessed and found to be older than the configured time, not on a regular clock. This is acceptable for a tutorial-level explanation.
