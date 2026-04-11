# Validation Summary: How to Configure set-max-listpack-entries for Memory Savings

## Status
validated

## Post Type
Tutorial / Configuration Guide

## Technologies Covered
- Redis 7.2+ (set encoding internals)
- Redis CLI (`CONFIG GET`, `CONFIG SET`, `OBJECT ENCODING`, `SADD`, `SCARD`, `--scan`)
- Python (`redis-py` client library)
- Bash scripting (scanning for over-threshold sets)

## Sources Consulted
- Redis 7.2 default configuration file: https://raw.githubusercontent.com/redis/redis/7.2/redis.conf — confirmed default values for `set-max-intset-entries` (512), `set-max-listpack-entries` (128), `set-max-listpack-value` (64).
- Redis 7.2 source code (`t_set.c`): https://github.com/redis/redis/blob/7.2/src/t_set.c — confirmed intset-to-listpack conversion logic when adding non-integer elements to small intsets.
- Redis Sets documentation: https://redis.io/docs/latest/develop/data-types/sets/

## Issues Found

1. **Incorrect hashtable example threshold**: The original example used `SADD large_set $(seq 1 200)` and claimed the encoding would be `hashtable`. However, with the default `set-max-intset-entries` of 512, a set of 200 integers remains as `intset`. Changed to `$(seq 1 600)` (exceeding the 512 threshold) so the example correctly demonstrates `hashtable` encoding.

2. **Incorrect intset-to-hashtable conversion claim (Redis 7.2+)**: The section "Adding One Non-Integer Converts intset to hashtable" incorrectly stated that adding a string to a small intset converts it to `hashtable`. In Redis 7.2+, if the set is under `set-max-listpack-entries`, the conversion target is `listpack`, not `hashtable`. Updated the section title, code comment, and explanation to reflect the correct Redis 7.2+ behavior: conversion to `listpack` for small sets, `hashtable` only if the set exceeds the listpack threshold.

## Review Notes
- The Python examples use `redis.Redis()` without `decode_responses=True`, so `object_encoding()` returns bytes (e.g., `b"intset"`) rather than strings. The format specifier `{enc:12s}` will print the bytes representation. This is a minor style issue — readers will need to add `decode_responses=True` for clean string output.
- The `$(seq 1 600)` shell expansion in the bash code block works when run from the shell as `redis-cli SADD large_set $(seq 1 600)`, but not inside an interactive `redis-cli` session. The block is labeled `bash` which makes this clear enough.
- The memory-per-element estimates (intset 4-8 bytes, listpack 20-30 bytes, hashtable 60-80 bytes) are reasonable approximations, though actual values depend on element size and Redis version.
