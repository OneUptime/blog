# Validation Summary: How to Configure list-max-listpack-size for Memory Savings

## Status
validated

## Post Type
Tutorial / Configuration Guide

## Technologies Covered
- Redis (quicklist, listpack internals)
- Redis CLI (`CONFIG GET`, `CONFIG SET`, `OBJECT ENCODING`)
- Python (`redis-py` library)
- Redis configuration file (`redis.conf`)

## Sources Consulted
- Official Redis 7.2 `redis.conf` default configuration file (https://github.com/redis/redis/blob/7.2/redis.conf)
- Redis 7.0 source code `t_list.c` and `quicklist.c` (https://github.com/redis/redis/tree/7.0/src)
- Redis 7.2 source code `t_list.c`, `quicklist.c`, `config.c`, and `object.c` (https://github.com/redis/redis/tree/7.2/src)
- Redis documentation on configuration (https://redis.io/docs/latest/operate/oss_and_stack/management/config/)

## Issues Found

1. **Negative value table missing minus signs (lines 37-43):** The table listing byte-size limits showed values `1` through `5` but these should be `-1` through `-5`. Positive values represent element counts, while negative values represent byte-size limits. Without the minus signs, readers would interpret these as element counts (e.g., "max 1 element per node"), which is the opposite of the intended meaning. Fixed by adding the negative signs.

2. **Incorrect Redis version for pure listpack encoding (lines 131-134):** The post stated "Redis 7.0" introduced the pure listpack encoding for short lists. Based on source code analysis, Redis 7.0's `t_list.c` has zero references to `OBJ_ENCODING_LISTPACK` for lists, while Redis 7.2 has full support including `listTypeTryConvertListpack()` and `listTypeTryConvertQuicklist()`. Fixed both the comment in the `OBJECT ENCODING` example and the explanatory paragraph to say "Redis 7.2".

## Review Notes
- The Python benchmark script passes config values as strings (e.g., `"-2"`). This works correctly with `redis-py`'s `config_set()` method, which accepts string arguments.
- The claim that LZF compression reduces memory by 30-50% is a reasonable general estimate for compressible data, though actual results vary by payload.
- The `list-max-ziplist-size` alias is confirmed as backward-compatible in Redis 7.0+ source code (`config.c`).
- All Redis CLI commands shown use correct syntax.
