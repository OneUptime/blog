# Validation Summary: How to Use Redis Lists in Ruby

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Redis (Lists data structure)
- Ruby
- redis-rb gem
- JSON (Ruby standard library)

## Sources Consulted
- Redis LPUSH/RPOP/LPOP/BRPOP/LMOVE/LINSERT command documentation — https://redis.io/docs/latest/commands/
- redis-rb gem source (lists.rb) — https://github.com/redis/redis-rb/blob/master/lib/redis/commands/lists.rb
- redis-rb gem RubyDoc — https://rubydoc.info/gems/redis/Redis/Commands/Lists
- redis-rb CHANGELOG (lmove availability) — https://github.com/redis/redis-rb/blob/master/CHANGELOG.md

## Issues Found

1. **Incorrect `rpop` return value comment (line 31)**: The comment said `# job-1` but after three LPUSH calls (`job-3`, `job-2`, `job-1`), the list is `[job-1, job-2, job-3]`. RPOP removes from the right (tail), returning `job-3`. Fixed to `# job-3`.

2. **Incorrect `lpop` return value comment (line 34)**: The comment said `# job-2` but after the RPOP removed `job-3`, the remaining list is `[job-1, job-2]`. LPOP removes from the left (head), returning `job-1`. Fixed to `# job-1`.

3. **Incorrect `lrange` output comment (line 43)**: The comment said `# ["job-3"]` but after both pops, only `job-2` remains in the queue. Fixed to `# ["job-2"]`.

4. **`process_job` method defined after infinite loop (lines 78-81)**: The `def process_job` was placed after the `loop do...end` block, meaning it would never be reached or defined when called inside the loop. Moved the method definition above the loop.

## Review Notes
- The post does not show `require 'json'` which is needed for `JSON.parse` and `to_json`, but this is a common omission in blog tutorials and does not affect the pedagogical value.
- `lmove` requires Redis 6.2+ on the server side. The post does not mention this version requirement, which could be worth noting for readers on older Redis versions.
- The `brpop` worker example uses a top-level `redis` local variable inside a `def` method, which would not actually work in Ruby since `def` creates a new scope. This is a common simplification in blog examples where the code is meant to be illustrative rather than copy-paste runnable.
