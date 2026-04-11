# How to Use COMMAND in Redis to Get Command Documentation

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Command, Documentation, Introspection, CLI

Description: Learn how to use the COMMAND command in Redis to get metadata about all available commands including arity, flags, and key positions.

---

## What Is the COMMAND Command?

`COMMAND` is Redis's built-in command introspection tool. It returns metadata about every Redis command the server supports - including arity, complexity flags, and where keys appear in the argument list.

This is used internally by Redis clients to understand command structure and by operators to explore what a Redis server supports.

## Basic Usage

```bash
redis-cli COMMAND
```

Returns a long array where each entry describes one command. This can be hundreds of lines for a full Redis installation.

## Output Structure

Each command entry contains:

```text
1) Command name (lowercase)
2) Arity (-N means minimum N args; N means exactly N args)
3) Flags (write, read-only, denyoom, fast, etc.)
4) First key position
5) Last key position
6) Key step
```

Example for `SET`:

```text
1) "set"
2) (integer) -3
3) 1) write
   2) denyoom
4) (integer) 1
5) (integer) 1
6) (integer) 1
```

## Getting Info for a Specific Command

```bash
redis-cli COMMAND INFO get
redis-cli COMMAND INFO set hget zadd
```

Returns the same metadata structure but only for the named commands.

## Checking If a Command Exists

```bash
redis-cli COMMAND INFO somecommand
```

If the command does not exist, that entry returns `(nil)`.

## Listing Command Names

```bash
redis-cli COMMAND DOCS | head -20
```

Or using `COMMAND COUNT` to see how many commands exist:

```bash
redis-cli COMMAND COUNT
```

## Understanding Arity

Arity indicates the number of required arguments:

- Positive value: exactly N arguments required
- Negative value: at least N arguments (variable)

| Command | Arity | Meaning |
|---------|-------|---------|
| `PING` | -1 | At least 1 (0 extra args optional) |
| `GET` | 2 | Exactly 2 (command + key) |
| `SET` | -3 | At least 3 |
| `MSET` | -3 | At least 3, variadic |

## Using COMMAND in Client Libraries

Redis client libraries call `COMMAND` or `COMMAND INFO` at startup to understand which commands are available and how to route keys in cluster mode. The key positions tell the client which arguments contain Redis keys for proper hash slot routing.

## Practical Example: Checking Flags

```bash
redis-cli COMMAND INFO flushall
```

The output includes the `@dangerous` ACL category among others, which is why `redis-cli` prompts for confirmation in interactive mode.

## Summary

`COMMAND` is Redis's built-in API documentation system. It provides machine-readable metadata about every available command - covering arity, flags, and key positions. This metadata powers client-side cluster routing, security filters, and discovery tools.
