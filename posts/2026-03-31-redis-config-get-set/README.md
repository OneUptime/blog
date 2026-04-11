# How to Use CONFIG GET and CONFIG SET in Redis

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, CONFIG, Configuration, Operation, Admin

Description: Learn how to use CONFIG GET to read Redis configuration parameters and CONFIG SET to update them at runtime without restarting the server.

---

Redis allows many configuration parameters to be read and modified at runtime without a restart using `CONFIG GET` and `CONFIG SET`. This enables live tuning of memory limits, persistence behavior, log levels, and many other settings in production systems.

## CONFIG GET

`CONFIG GET` reads the current value of one or more configuration parameters. It supports glob patterns to match multiple parameters at once.

### Syntax

```redis
CONFIG GET parameter
```

Since Redis 7.0, multiple parameters can be specified:

```redis
CONFIG GET parameter [parameter ...]
```

### Examples

#### Read a Single Parameter

```redis
CONFIG GET maxmemory
```

Output:

```text
1) "maxmemory"
2) "536870912"
```

#### Read Multiple Parameters (Redis 7.0+)

```redis
CONFIG GET maxmemory maxmemory-policy
```

Output:

```text
1) "maxmemory"
2) "536870912"
3) "maxmemory-policy"
4) "allkeys-lru"
```

#### Use a Glob Pattern

Read all `save` parameters:

```redis
CONFIG GET save
```

Read all `bind` and timeout parameters (Redis 7.0+):

```redis
CONFIG GET bind* timeout*
```

#### Read All Configuration

```redis
CONFIG GET *
```

Returns all current configuration key/value pairs.

---

## CONFIG SET

`CONFIG SET` modifies one or more configuration parameters at runtime. Changes take effect immediately without a server restart.

### Syntax

```redis
CONFIG SET parameter value
```

Since Redis 7.0, multiple parameter/value pairs can be specified:

```redis
CONFIG SET parameter value [parameter value ...]
```

### Examples

#### Set Memory Limit

Set a 512 MB memory limit:

```redis
CONFIG SET maxmemory 536870912
CONFIG SET maxmemory-policy allkeys-lru
```

#### Adjust Log Level

```redis
CONFIG SET loglevel verbose
```

Valid levels: `debug`, `verbose`, `notice`, `warning`

#### Enable Slow Log

Log all commands taking more than 10ms:

```redis
CONFIG SET slowlog-log-slower-than 10000
CONFIG SET slowlog-max-len 128
```

#### Modify RDB Save Schedule

```redis
CONFIG SET save "3600 1 300 100 60 10000"
```

#### Disable RDB Saving

```redis
CONFIG SET save ""
```

#### Set Multiple Parameters at Once (Redis 7.0+)

```redis
CONFIG SET maxmemory 268435456 maxmemory-policy volatile-lru loglevel notice
```

#### Adjust Timeout for Idle Connections

```redis
CONFIG SET timeout 300
```

---

## Commonly Tuned Parameters

| Parameter | Description | Example |
|---|---|---|
| `maxmemory` | Memory cap in bytes | `536870912` |
| `maxmemory-policy` | Eviction policy | `allkeys-lru` |
| `save` | RDB persistence schedule | `"3600 1 300 100"` |
| `appendonly` | Enable AOF | `yes` |
| `loglevel` | Log verbosity | `notice` |
| `slowlog-log-slower-than` | Slow log threshold (microseconds) | `10000` |
| `hz` | Event loop frequency | `10` |
| `bind-source-addr` | Source IP for outbound connections | `""` |
| `lazyfree-lazy-eviction` | Async eviction | `yes` |

## Persisting Changes

`CONFIG SET` changes are in-memory only. They are lost if Redis restarts. To persist them to `redis.conf`, run:

```redis
CONFIG REWRITE
```

Or manually update `redis.conf` to match the runtime values.

## Use Cases

- **Live memory tuning** - adjust `maxmemory` during traffic spikes without a restart
- **Emergency log level changes** - increase log verbosity during incident investigation
- **Persistence control** - temporarily disable RDB saves during bulk data loads
- **Slow log activation** - enable slow log on demand for performance debugging
- **Policy changes** - switch eviction policy without service interruption

## Summary

`CONFIG GET` and `CONFIG SET` are the live configuration interface for Redis. Use `CONFIG GET *` for a full snapshot of the current configuration, and `CONFIG SET` for targeted runtime adjustments. Remember that changes are in-memory only - always follow important changes with `CONFIG REWRITE` to persist them, or document the drift between runtime and file configuration.
