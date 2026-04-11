# Validation Summary: How to Monitor Redis with the INFO Command (All Sections)

## Status
validated

## Post Type
Reference Guide

## Technologies Covered
- Redis 7.2.x
- Redis CLI (`redis-cli`)
- Redis INFO command (sections: server, clients, memory, stats, replication, cpu, keyspace)
- Python (`redis-py` library)

## Sources Consulted
- Redis INFO command official documentation: https://redis.io/docs/latest/commands/info/
- Redis 7.0 release notes: https://raw.githubusercontent.com/redis/redis/7.0/00-RELEASENOTES
- redis-py PyPI page and documentation: https://pypi.org/project/redis/
- Python 3.12 datetime deprecation notes: https://docs.python.org/3/library/datetime.html

## Issues Found

1. **Fabricated INFO field `total_keys_processed_by_maxmemory`**: This field does not exist in Redis INFO stats output for any version. Removed it from the example stats output.

2. **Incorrect `used_memory_peak_perc` explanation**: The post claimed that being near 100% means "you almost hit maxmemory." In reality, `used_memory_peak_perc` is the ratio of current memory usage to the historical peak (`used_memory / used_memory_peak`). Being near 100% means current usage is at its historic peak, not that it is near `maxmemory`. Fixed the explanation to accurately describe the metric.

3. **Wrong section count in summary**: The summary stated "eight sections" but the post only covers seven sections (server, clients, memory, stats, replication, cpu, keyspace). Corrected to "seven key sections."

4. **Deprecated `redis.StrictRedis`**: Since redis-py 3.0, `StrictRedis` is a backward-compatibility alias for `redis.Redis`. Updated to use the canonical `redis.Redis`.

5. **Deprecated `datetime.utcnow()`**: Deprecated since Python 3.12 and emits a `DeprecationWarning`. Replaced with `datetime.now(timezone.utc)` and added the `timezone` import.

## Review Notes
- The post title says "All Sections" but only covers 7 of the ~14 standard Redis INFO sections. Missing sections include persistence, commandstats, latencystats, errorstats, cluster, and modules. This is a scope/editorial choice rather than a technical error.
- `INFO all` excludes module-generated sections; `INFO everything` (added in Redis 7.0) includes them. The post's comment "Get all sections" for `INFO all` is slightly imprecise but acceptable for most use cases.
- The alert thresholds in the table are reasonable industry recommendations, not official Redis guidance.
