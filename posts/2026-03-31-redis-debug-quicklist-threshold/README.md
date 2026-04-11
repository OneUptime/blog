# How to Use DEBUG QUICKLIST-PACKED-THRESHOLD in Redis

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Debug, Quicklist, Encoding, Memory

Description: Learn how to use DEBUG QUICKLIST-PACKED-THRESHOLD to control the listpack node size threshold in Redis quicklists, useful for testing encoding transitions.

---

## Introduction

Redis lists are internally stored as quicklists -- a doubly-linked list of listpack (formerly ziplist) nodes. Each node holds multiple list entries in a compact listpack encoding. The `DEBUG QUICKLIST-PACKED-THRESHOLD` command overrides the element size threshold that determines whether individual elements in a quicklist are stored inside packed (listpack) nodes or as separate PLAIN nodes. It is primarily a testing and debugging tool.

## Basic Syntax

```redis
DEBUG QUICKLIST-PACKED-THRESHOLD size
```

- `size` - the new threshold in bytes. Elements with a serialized size below this threshold are stored inside packed (listpack) nodes; elements at or above it are stored as individual PLAIN nodes. Set to 0 to restore the default behavior.

Returns `OK`.

## Quicklist Architecture

```mermaid
flowchart LR
    subgraph Quicklist
        N1["Node 1\n(listpack)\nentry1, entry2, entry3"]
        N2["Node 2\n(listpack)\nentry4, entry5"]
        N3["Node 3\n(listpack)\nentry6"]
    end
    N1 <--> N2
    N2 <--> N3
```

Each node is a listpack that stores multiple entries compactly. When a new element's size meets or exceeds the packed threshold, it is stored in its own separate PLAIN node rather than being added to a packed (listpack) node.

## Examples

### Set a low threshold to force unpacked nodes quickly

```redis
DEBUG QUICKLIST-PACKED-THRESHOLD 10
# OK
```

Now any element with a serialized size of 10 bytes or more will be stored as a PLAIN node instead of inside a packed (listpack) node.

### Create a list and observe encoding

```redis
RPUSH mylist "hello" "world" "foo" "bar"

OBJECT ENCODING mylist
# "listpack"   (small list fits in a single listpack node)
```

### Force quicklist encoding and observe packed threshold

The `DEBUG QUICKLIST-PACKED-THRESHOLD` command controls packed vs. plain node storage within a quicklist, but does not itself trigger the listpack-to-quicklist encoding change. To force quicklist encoding, set `list-max-listpack-size` to a low positive value:

```redis
CONFIG SET list-max-listpack-size 1
# OK

DEL mylist
RPUSH mylist "hello" "world" "foo" "bar" "baz"
OBJECT ENCODING mylist
# "quicklist"   (max 1 entry per node forces quicklist encoding)
```

With `DEBUG QUICKLIST-PACKED-THRESHOLD` set to a low value, elements within the quicklist are stored as individual PLAIN nodes rather than inside packed listpack nodes:

```redis
DEBUG QUICKLIST-PACKED-THRESHOLD 1
# OK
```

### Reset to default

```redis
DEBUG QUICKLIST-PACKED-THRESHOLD 0
# OK
```

### Checking current quicklist configuration

The `list-max-listpack-size` config controls the maximum listpack node size and element count:

```redis
CONFIG GET list-max-listpack-size
# 1) "list-max-listpack-size"
# 2) "-2"   (-2 = 8kb per node)
```

Values:
- `-1` = 4 KB
- `-2` = 8 KB (default)
- `-3` = 16 KB
- `-4` = 32 KB
- `-5` = 64 KB
- Positive integer = max number of entries per node

## Relationship to list-max-ziplist-size

In Redis 7.0+, `list-max-ziplist-size` was renamed to `list-max-listpack-size`. Both names are accepted for backward compatibility.

```redis
CONFIG GET list-max-ziplist-size
CONFIG GET list-max-listpack-size
```

## When to Use This Command

- **Unit testing encoding transitions**: Verify that your application correctly handles lists regardless of internal encoding
- **Benchmarking**: Measure performance differences between packed and unpacked quicklist nodes
- **Memory analysis**: Understand how encoding choices affect `MEMORY USAGE` on list keys
- **Development**: Force specific encodings to reproduce edge-case bugs

## Production Considerations

`DEBUG QUICKLIST-PACKED-THRESHOLD` is an internal testing command and is not intended for production use. Changes made with this command affect all lists globally and reset on restart. Restrict access:

```redis
ACL SETUSER app_user ~* +@all -DEBUG
```

## Summary

`DEBUG QUICKLIST-PACKED-THRESHOLD size` overrides the byte threshold at which Redis quicklist nodes use the packed (listpack) encoding. Set it to a low value to force quicklist encoding for testing, or to 0 to restore default behavior. This command is intended for development, testing, and memory analysis -- not for production configuration.
