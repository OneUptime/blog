# Validation Summary: How to Export Redis Data to JSON/CSV

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Redis
- redis-cli
- Redis SCAN, KEYS, GET, TYPE, TTL, XRANGE, LRANGE, SMEMBERS, ZRANGE, ZREVRANGE commands
- Redis Streams, hashes, lists, sets, and sorted sets
- Python
- redis-py
- JSON, JSON Lines, CSV, gzip

## Sources Consulted
- Redis SCAN command documentation: https://redis.io/docs/latest/commands/scan/
- Redis KEYS command documentation: https://redis.io/docs/latest/commands/keys/
- Redis CLI documentation for `--scan`, `--pattern`, and `--count`: https://redis.io/docs/latest/develop/tools/cli/
- Redis XRANGE command documentation: https://redis.io/docs/latest/commands/xrange/
- redis-py command reference: https://redis.readthedocs.io/en/stable/commands.html
- Python syntax validation with `compile()` for all Python code blocks in the post.

## Issues Found
- The shell JSONL example could emit invalid JSON because it interpolated raw Redis values directly into a JSON object. Changed it to use `python3 -c` with `json.dumps()` and `redis-cli --raw` so normal string values and escaping are handled correctly.
- The shell key-reading loops used plain `read`, which can mishandle backslashes and leading/trailing whitespace. Changed them to `IFS= read -r`.
- The streaming exporter only emitted strings and hashes even though the section describes streaming Redis data generally. Added list, set, sorted set, and stream handling consistent with the earlier exporter examples.
- `export_stream_to_csv()` looked up stream fields using encoded byte keys only when fields were strings, which fails for Redis clients configured with `decode_responses=True`. Updated it to try the field as provided first, then fall back to the encoded form.
- The CLI accepted `--compress` for formats where the shown exporter did not write gzip data and accepted `--include-ttl` for formats where TTLs were ignored. Added parser errors so unsupported option combinations fail explicitly.

## Review Notes
- `redis-cli` was not installed in the local environment, so CLI flags were checked against the official Redis CLI documentation instead of local `--help` output.
- The `KEYS` example is technically valid, but the post correctly recommends `SCAN` for production use later in the best practices section.
- The Python examples are syntactically valid after the fixes. Runtime behavior still depends on Redis server availability, key sizes, and whether very large individual values or streams fit in memory.
