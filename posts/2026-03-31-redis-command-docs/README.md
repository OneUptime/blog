# How to Use COMMAND DOCS in Redis to Get Command Help

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, COMMAND DOCS, Documentation, Introspection, CLI

Description: Learn how to use COMMAND DOCS in Redis 7.0+ to get detailed documentation for commands including arguments, since version, and complexity directly from the server.

---

## What Is COMMAND DOCS?

`COMMAND DOCS` was introduced in Redis 7.0 as an enhanced documentation command. Unlike `COMMAND INFO` which returns machine-readable metadata, `COMMAND DOCS` returns human-readable documentation including argument descriptions, since which version the command was introduced, and time complexity notes.

## Basic Syntax

```text
COMMAND DOCS [command-name [command-name ...]]
```

With no arguments, returns docs for all commands.

## Getting Docs for a Specific Command

```bash
redis-cli COMMAND DOCS set
```

Example output (abbreviated):

```text
1) "set"
2) 1) "summary"
   2) "Set the string value of a key"
   3) "since"
   4) "1.0.0"
   5) "group"
   6) "string"
   7) "complexity"
   8) "O(1)"
   9) "arguments"
  10) 1) 1) "name"
         2) "key"
         3) "type"
         4) "key"
         5) "flags"
         6) 1) "write"
            2) "access"
```

## Getting Docs for Multiple Commands

```bash
redis-cli COMMAND DOCS get set hget
```

All three command docs are returned in one response.

## Key Fields in COMMAND DOCS Output

| Field | Description |
|-------|-------------|
| `summary` | One-line description |
| `since` | Redis version that introduced the command |
| `group` | Command group (string, hash, list, etc.) |
| `complexity` | Big-O time complexity |
| `arguments` | Detailed argument list with types and flags |
| `replaced_by` | If deprecated, what replaces it |
| `doc_flags` | `deprecated` if the command is deprecated |

## Checking When a Command Was Added

```bash
redis-cli COMMAND DOCS lmpop | grep since
```

This is useful when targeting multiple Redis versions and you need to know if a command is available.

## Finding Deprecated Commands

```bash
redis-cli COMMAND DOCS getset
```

Look for `doc_flags: deprecated` in the output. `GETSET` was deprecated in Redis 6.2 in favor of `SET ... GET`.

## Difference Between COMMAND DOCS and COMMAND INFO

| Feature | COMMAND INFO | COMMAND DOCS |
|---------|-------------|--------------|
| Arity | Yes | No |
| Flags | Yes | No |
| Summary | No | Yes |
| Complexity | No | Yes |
| Arguments | No | Yes (detailed) |
| Since version | No | Yes |
| Available from | Redis 2.8.13 | Redis 7.0 |

Use `COMMAND INFO` for cluster routing and key detection; use `COMMAND DOCS` for human-readable documentation.

## Automating Documentation Extraction

```bash
redis-cli COMMAND DOCS zadd | grep -A1 "complexity"
```

This shows the time complexity of `ZADD` directly from the server.

## Summary

`COMMAND DOCS` brings full command documentation directly into the Redis server in Redis 7.0+. It provides summaries, version history, complexity details, and argument documentation without needing to consult external references - making it a powerful tool for client library authors and operators exploring server capabilities.
