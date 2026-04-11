# Validation Summary: How to Use CONFIG GET and CONFIG SET in Redis

## Status
validated

## Post Type
Reference / Tutorial

## Technologies Covered
- Redis (CONFIG GET, CONFIG SET, CONFIG REWRITE commands)
- Redis configuration parameters (maxmemory, save, loglevel, slowlog, appendonly, etc.)

## Sources Consulted
- Redis official documentation: CONFIG GET — https://redis.io/docs/latest/commands/config-get/
- Redis official documentation: CONFIG SET — https://redis.io/docs/latest/commands/config-set/
- Redis official documentation: CONFIG REWRITE — https://redis.io/docs/latest/commands/config-rewrite/
- Redis official documentation: SLOWLOG — https://redis.io/docs/latest/commands/slowlog/

## Issues Found

### 1. Missing Redis 7.0+ version note for CONFIG GET multiple parameters
**What was wrong:** The CONFIG GET syntax section showed `CONFIG GET parameter [parameter ...]` (multi-parameter form) without noting that multiple parameters require Redis 7.0+. The "Read Multiple Parameters" example (`CONFIG GET maxmemory maxmemory-policy`) and the multi-glob example (`CONFIG GET bind* timeout*`) were also not labeled with a version requirement. This was inconsistent with the CONFIG SET section, which correctly labeled its multi-parameter example as "(Redis 7.0+)".

**What was changed:** Split the CONFIG GET syntax into the single-parameter form (all versions) and the multi-parameter form (Redis 7.0+). Added "(Redis 7.0+)" labels to the "Read Multiple Parameters" example heading and the multi-glob example text.

### 2. CONFIG SET syntax section missing version note for multi-parameter form
**What was wrong:** The CONFIG SET syntax section showed `CONFIG SET parameter value [parameter value ...]` without noting the version requirement, even though the specific multi-parameter example later was correctly labeled "(Redis 7.0+)".

**What was changed:** Split the CONFIG SET syntax into the single-pair form (all versions) and the multi-pair form (Redis 7.0+), matching the treatment given to CONFIG GET.

## Review Notes
- All code examples are syntactically correct and use proper Redis command syntax.
- The memory calculations are accurate (536870912 = 512 MB, 268435456 = 256 MB).
- The log levels listed (debug, verbose, notice, warning) are correct.
- The slowlog-log-slower-than unit is correctly described as microseconds in the table, and the 10000 = 10ms equivalence is correct.
- The CONFIG REWRITE explanation is accurate — it persists in-memory CONFIG SET changes to the config file.
- The `CONFIG SET save ""` syntax for disabling RDB persistence is correct.
- All configuration parameter names in the table are valid Redis parameters.
