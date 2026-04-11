# How to Use FT.CONFIG in Redis to Set Search Configuration

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, RediSearch, Search, Configuration, Command

Description: Learn how to use FT.CONFIG SET and FT.CONFIG GET in Redis to read and modify RediSearch module-level configuration at runtime without restarting.

---

## How FT.CONFIG Works

`FT.CONFIG` provides `SET` and `GET` subcommands to read and modify RediSearch module configuration options at runtime. Many settings control search behavior globally: the default language for text analysis, the number of background threads for indexing, memory limits, timeout values, and more. Changes take effect immediately without restarting Redis.

```mermaid
graph TD
    A["FT.CONFIG SET option value"]
    A --> B["RediSearch module configuration"]
    B --> C["MAXSEARCHRESULTS"]
    B --> D["MAXAGGREGATERESULTS"]
    B --> E["TIMEOUT"]
    B --> F["MINPREFIX"]
    B --> G["MAXEXPANSIONS"]
    B --> H["DEFAULT_DIALECT"]
```

## Syntax

```redis
FT.CONFIG SET option value
FT.CONFIG GET option
FT.CONFIG GET *
```

- `SET option value` - update a configuration option
- `GET option` - retrieve the current value of one option
- `GET *` - retrieve all configuration options and their values

## Viewing Current Configuration

### Get All Configuration Options

```redis
FT.CONFIG GET *
```

```text
 1) 1) "MAXSEARCHRESULTS"
    2) "1000000"
 2) 1) "MAXAGGREGATERESULTS"
    2) "-1"
 3) 1) "TIMEOUT"
    2) "500"
 4) 1) "MINPREFIX"
    2) "2"
 5) 1) "MAXEXPANSIONS"
    2) "200"
 6) 1) "MAXDOCTABLESIZE"
    2) "1000000"
 7) 1) "MIN_PHONETIC_TERM_LEN"
    2) "3"
 8) 1) "WORKERS"
    2) "0"
```

### Get a Specific Option

```redis
FT.CONFIG GET TIMEOUT
```

```text
1) 1) "TIMEOUT"
   2) "500"
```

## Key Configuration Options

### MAXSEARCHRESULTS

The maximum number of results `FT.SEARCH` will return in total across all pages. Default is `1000000`:

```redis
FT.CONFIG GET MAXSEARCHRESULTS
FT.CONFIG SET MAXSEARCHRESULTS 50000
```

Set to `-1` to remove the limit (use with caution on large indexes).

### MAXAGGREGATERESULTS

The maximum number of rows `FT.AGGREGATE` returns. Default is `-1` (unlimited):

```redis
FT.CONFIG SET MAXAGGREGATERESULTS 100000
```

### TIMEOUT

Query execution timeout in milliseconds. Queries exceeding this limit return partial results:

```redis
FT.CONFIG GET TIMEOUT
-- Default: 500 ms

FT.CONFIG SET TIMEOUT 2000
-- Allow up to 2 seconds for complex queries
```

Set to `0` to disable timeout (not recommended for production).

### MINPREFIX

The minimum number of characters required for prefix queries (`term*`):

```redis
FT.CONFIG GET MINPREFIX
-- Default: 2

-- Require at least 3 characters for prefix search
FT.CONFIG SET MINPREFIX 3
```

Shorter prefixes match more documents and use more CPU.

### MAXEXPANSIONS

The maximum number of terms that a fuzzy or prefix query expands to:

```redis
FT.CONFIG GET MAXEXPANSIONS
-- Default: 200

FT.CONFIG SET MAXEXPANSIONS 500
```

Increasing this allows fuzzier matching at the cost of query performance.

### DEFAULT_DIALECT

The default query dialect version used by `FT.SEARCH` and `FT.AGGREGATE`:

```redis
FT.CONFIG GET DEFAULT_DIALECT
-- Default: 1

FT.CONFIG SET DEFAULT_DIALECT 2
```

Note that the language for text analysis (stemming) is set per-index using the `LANGUAGE` option in `FT.CREATE`, not via `FT.CONFIG`.

### WORKERS

The number of worker threads for query processing and background tasks (0 means single-threaded):

```redis
FT.CONFIG GET WORKERS
FT.CONFIG SET WORKERS 4
```

Increasing workers improves query throughput and background task performance at the cost of more CPU.

### MIN_PHONETIC_TERM_LEN

The minimum term length (in characters) required for phonetic matching to be applied:

```redis
FT.CONFIG GET MIN_PHONETIC_TERM_LEN
-- Default: 3
```

## Practical Configuration Scenarios

### High-Throughput Search Service

Optimize for fast query responses:

```redis
FT.CONFIG SET TIMEOUT 1000
FT.CONFIG SET MAXEXPANSIONS 100
FT.CONFIG SET MINPREFIX 3
FT.CONFIG SET MAXSEARCHRESULTS 10000
```

### Background Data Ingestion

Optimize for throughput when loading bulk data:

```redis
FT.CONFIG SET WORKERS 8
FT.CONFIG SET TIMEOUT 0
```

Restore to normal after ingestion completes.

## Configuration Persistence

Runtime `FT.CONFIG SET` changes are not persisted across Redis restarts. To make them permanent, set them in the Redis configuration file or as module load arguments:

```text
# redis.conf
loadmodule /path/to/redisearch.so MAXSEARCHRESULTS 50000 TIMEOUT 2000 WORKERS 4
```

## Summary

`FT.CONFIG SET` and `FT.CONFIG GET` let you read and modify RediSearch module-level configuration at runtime. Use them to tune query timeouts, result limits, prefix query thresholds, fuzzy expansion limits, worker thread counts, and query dialect. Changes take effect immediately but are not persisted across restarts unless specified in the Redis configuration file.
