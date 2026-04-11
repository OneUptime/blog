# Validation Summary: How to Export Redis Keys to JSON

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Redis (key-value store, sorted sets, hashes, lists, sets)
- Node.js
- ioredis (Node.js Redis client library)
- JSON serialization
- redis-cli

## Sources Consulted
- ioredis GitHub repository and API documentation: https://github.com/redis/ioredis
- Redis ZRANGE command documentation: https://redis.io/commands/zrange
- Redis SCAN command documentation: https://redis.io/commands/scan
- ioredis pipeline documentation and issues (#361, #1011) regarding pipeline reuse behavior
- redis-dump npm package: https://www.npmjs.com/package/redis-dump

## Issues Found

1. **`zrangeWithScores` is not a standard ioredis method** (Batch Export section, line ~141): The code used `valuePipeline.zrangeWithScores(keys[i], 0, -1)`. ioredis maps directly to Redis commands, and there is no `ZRANGEWITHSCORES` Redis command — `WITHSCORES` is a flag on the `ZRANGE` command. Changed to `valuePipeline.zrange(keys[i], 0, -1, 'WITHSCORES')` to match the pattern already used correctly in the single-key export function earlier in the post.

2. **Zset value format inconsistency in batch export** (Batch Export section): After fixing the method call, `zrange` with `WITHSCORES` returns a flat array (`['member1', 'score1', 'member2', 'score2']`), but the import function expects `[{member, score}]` objects. Added post-processing to convert the flat array into the structured format, consistent with the single-key `exportKey` function and compatible with `importFromJSON`.

3. **Pipeline reuse bug in `importFromJSON`** (Re-importing section, line ~178-213): The pipeline was declared with `const` and reused after `exec()`. ioredis pipelines do not clear their command queue after `exec()`, so reusing the same pipeline causes previously executed commands to be re-sent on the next `exec()` call. Changed `const pipeline` to `let pipeline` and added `pipeline = redis.pipeline()` after each batch `exec()` to create a fresh pipeline.

## Review Notes
- The `redis-dump` npm package referenced in the CLI section is a third-party package that may not be actively maintained. Users should verify it works with their Redis version.
- The `npx redis-load < backup.json` command assumes the `redis-dump` package registers `redis-load` as a binary — users may need to install `redis-dump` globally first for this to work.
- For very large datasets, the `importFromJSON` function reads the entire JSON file into memory with `fs.readFileSync`. A streaming JSON parser would be more memory-efficient for large exports, but this is an enhancement suggestion rather than a correctness issue.
