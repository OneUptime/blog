# Validation Summary: How to Use INFO in Redis to Get Server Statistics

## Status
validated

## Post Type
Reference / Guide

## Technologies Covered
- Redis (INFO command)
- redis-cli
- Prometheus redis_exporter (mentioned)
- Grafana (mentioned)

## Sources Consulted
- Redis official documentation for the INFO command: https://redis.io/docs/latest/commands/info/

## Issues Found
1. **Incorrect description of `all` and `everything` sections**: The post originally stated `everything` / `all` - all sections except `modules` and `commandstats`, treating them as equivalent. This was wrong on two counts:
   - `all` and `everything` are **not** equivalent. `all` returns all standard sections but excludes module-generated sections. `everything` returns all sections including module-generated ones.
   - `all` does **not** exclude `commandstats` — it includes all standard sections; only module-generated sections are excluded.
   - **Fix**: Split the single bullet into two separate bullets correctly describing each: `all` returns all standard sections (excludes module-generated sections), and `everything` returns all sections including module-generated ones.

## Review Notes
- The sections list is not exhaustive (missing `errorstats`, `sentinel`, etc.) but the post doesn't claim to be a complete reference, so this is acceptable.
- The `mem_fragmentation_ratio` threshold of 1.5 is a commonly cited rule of thumb. The official docs note that a high ratio with low absolute fragmentation bytes is not necessarily a problem, so the real-world interpretation is more nuanced. The post's guidance is reasonable for a general audience.
- The `maxclients` field under `INFO clients` is correct for Redis 7.0+. The post does not specify a Redis version, which is fine since it targets modern Redis.
- All code examples, CLI commands, field names, and calculations are correct.
