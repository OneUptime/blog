# How to Use RedisInsight CLI for Redis Administration

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, RedisInsight, CLI, Administration, Command

Description: Learn how to use the built-in CLI in RedisInsight to run Redis commands with syntax highlighting, history, and auto-complete for faster administration.

---

RedisInsight includes a built-in CLI panel that lets you run Redis commands directly from the browser interface. Unlike the terminal-based `redis-cli`, it offers auto-completion, syntax highlighting, command history, and inline documentation.

## Opening the CLI

In RedisInsight, click the "CLI" icon at the bottom-left of the screen (looks like `>`). A terminal-like panel opens at the bottom.

## Running Basic Commands

Type any Redis command and press Enter:

```text
> SET greeting "Hello, World!"
OK

> GET greeting
"Hello, World!"

> HSET user:1 name "Alice" age "30"
(integer) 2

> HGETALL user:1
1) "name"
2) "Alice"
3) "age"
4) "30"
```

## Auto-Completion

As you type, RedisInsight shows suggestions based on the command name and arguments. For example, typing `CONFIG G` will suggest `CONFIG GET`.

Use `Tab` to accept a suggestion, or `Arrow Down` to cycle through options.

## Viewing Command Documentation

After typing a command name, RedisInsight shows inline documentation in the panel:

```text
> EXPIRE

EXPIRE key seconds [NX | XX | GT | LT]
Sets a timeout on key. After the timeout, the key is deleted.
Time complexity: O(1)
```

This saves switching to the Redis documentation site.

## Command History

Press `Arrow Up` to cycle through previously executed commands. History persists across sessions within the same database connection.

## Switching Databases

To switch to a different Redis logical database (0-15):

```text
> SELECT 3
OK

> DBSIZE
(integer) 42
```

## Running Admin Commands

The CLI is useful for admin tasks that are harder to do in the Browser:

```text
> INFO server
# Server
redis_version:7.2.4
redis_mode:standalone
...

> CONFIG SET maxmemory 512mb
OK

> SLOWLOG GET 10
...

> CLIENT LIST
id=1 addr=127.0.0.1:6379 ...
...
```

## Running Multiple Commands

Type multiple commands separated by newlines or run them in sequence - each runs immediately. For batch operations, use the Workbench tab instead.

## Clearing the CLI Output

Click the trash icon at the top of the CLI panel to clear the output history.

## Connecting to a Specific Node in a Cluster

In cluster mode, the CLI defaults to the primary node that owns the slot for a given key. You can switch to a specific node using the node selector dropdown above the CLI input.

## Summary

RedisInsight's built-in CLI provides a more user-friendly alternative to the terminal-based redis-cli, with auto-completion, inline documentation, and command history. It is ideal for ad-hoc queries and administration tasks when you want context and guidance alongside the command output.
