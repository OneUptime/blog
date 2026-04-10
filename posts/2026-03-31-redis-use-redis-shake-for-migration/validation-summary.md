# Validation Summary: How to Use redis-shake for Redis Data Migration

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Redis
- RedisShake (redis-shake) v4.x
- Redis CLI (redis-cli)
- TOML configuration format

## Sources Consulted
- RedisShake GitHub repository: https://github.com/tair-opensource/RedisShake
- RedisShake example configuration files (`shake.toml`) in the repository
- RedisShake source code for reader/writer/filter/advanced configuration structs
- RedisShake releases page for download URL and asset naming conventions

## Issues Found

1. **GitHub organization is wrong**: The blog used `github.com/alibaba/RedisShake`. The project has moved to `github.com/tair-opensource/RedisShake`. Fixed the download URL and added a note about the maintainer change.

2. **Download URL asset name is wrong**: The blog used a generic `redis-shake.tar.gz`. Actual release assets include the platform in the name, e.g., `redis-shake-linux-amd64.tar.gz`. Fixed to use the correct asset name pattern.

3. **Configuration sections are completely wrong**: The blog used `[source]` and `[target]` sections with a `type` field (e.g., `type = "standalone"`). RedisShake v4 uses typed reader/writer sections: `[sync_reader]`, `[scan_reader]`, `[rdb_reader]` for sources and `[redis_writer]` for targets. The section name determines the mode — there is no `type` field. Rewrote all configuration examples.

4. **RDB restore config is wrong**: The blog used `[source] type = "rdb" address = "/path/to/dump.rdb"`. The correct config is `[rdb_reader] filepath = "/path/to/dump.rdb"`. Fixed.

5. **Scan mode config is wrong**: The blog used `[source] type = "scan"`. The correct config uses a `[scan_reader]` section. Fixed.

6. **Cluster config is wrong**: The blog used `type = "cluster"` in source/target sections. The correct approach is to set `cluster = true` within the reader/writer section. Fixed.

7. **Key filtering config is entirely wrong**: The blog placed `filter_key_pattern` and `exclude_key_pattern` in `[advanced]`. These fields do not exist. Filtering uses a separate `[filter]` section with fields like `allow_key_prefix`, `block_key_prefix`, `allow_db`, etc. Fixed.

8. **`source_db` / `target_db` do not exist**: The blog used these in `[advanced]`. The correct approach is `allow_db` / `block_db` arrays in the `[filter]` section. Fixed.

9. **`parallel` setting does not exist**: The blog used `parallel = 4` in `[advanced]`. This field does not exist. The closest equivalent is `ncpu` which controls `runtime.GOMAXPROCS`. Fixed to use `ncpu`.

10. **Log level values are wrong**: The blog listed valid levels as `debug, info, warning, error`. The correct values are `debug, info, warn`. Fixed.

11. **Default config filename**: The blog used `redis-shake.toml` throughout. The convention in the repository is `shake.toml`. Updated for consistency with official examples.

## Review Notes
- The post was written against what appears to be RedisShake v2.x or v3.x configuration format. RedisShake v4 introduced a fundamentally different TOML configuration structure. Nearly every configuration example needed to be rewritten.
- The redis-cli validation commands and cutover steps sections were technically correct and did not need changes.
- RedisShake also supports AOF import via `[aof_reader]` and file export via `[file_writer]`, which the post does not cover. This is fine for the scope of the tutorial.
- Sentinel support is available via nested sub-tables (e.g., `[sync_reader.sentinel]`) rather than a separate type. The blog does not cover sentinel, which is acceptable.
