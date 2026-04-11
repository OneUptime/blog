# How Redis Intset Implementation Works

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Internal, Data Structure, Set, Memory

Description: Discover how Redis uses the intset encoding to store sets of integers in a compact sorted array, saving memory compared to a full hash table.

---

When you add only integers to a Redis Set and the count stays below a threshold, Redis internally uses an `intset` rather than a hash table. This encoding is dramatically more memory-efficient and worth understanding for cache-heavy workloads.

## What Is an Intset?

An intset is a sorted array of integers stored in a single contiguous block of memory. The structure looks like:

```text
+----------+---------+----------------------------+
| encoding | length  | contents[] (sorted ints)   |
| (4 bytes)| (4 bytes)| (2, 4, or 8 bytes each)   |
+----------+---------+----------------------------+
```

The encoding field tracks whether values fit in 16-bit, 32-bit, or 64-bit integers, keeping the array as tight as possible.

## When Intset Is Used

Redis uses intset when both conditions are true:

1. Every member is an integer
2. The set size is below `set-max-intset-entries` (default 512)

```bash
CONFIG GET set-max-intset-entries
# 512
```

## Observing the Encoding

```bash
SADD myset 1 2 3 100 200
OBJECT ENCODING myset
# "intset"

# Exceed the threshold or add a non-integer
SADD myset "hello"
OBJECT ENCODING myset
# "listpack" or "hashtable"
```

## Memory Comparison

```bash
# Intset set: 512 integers
SADD intset_example $(seq 1 512 | tr '\n' ' ')
MEMORY USAGE intset_example
# ~4KB

# Hashtable set: same 512 integers (after encoding upgrade)
CONFIG SET set-max-intset-entries 0
SADD hashtable_example $(seq 1 512 | tr '\n' ' ')
MEMORY USAGE hashtable_example
# ~25KB
```

Intset is roughly 5-6x more memory-efficient for integer sets.

## Upgrade on Overflow

If you add an integer larger than the current encoding can hold, Redis upgrades the encoding in place. For example, adding a value that exceeds the 32-bit range causes Redis to re-encode every element as 64-bit:

```bash
SADD small_set 1 2 3
OBJECT ENCODING small_set   # intset (16-bit)

SADD small_set 99999999999  # > 32-bit range
OBJECT ENCODING small_set   # intset (64-bit, upgraded)
```

Note: encoding only upgrades, never downgrades. Removing the large value keeps the 64-bit encoding.

## Search Complexity

Because intset is sorted, Redis uses binary search to find members:

- `SISMEMBER` - O(log N)
- `SADD` - O(N) due to insertion in sorted order
- `SMEMBERS` - O(N)

This is slower than hash table O(1) lookup, but for small sets the constant-factor memory savings dominate.

## Tuning the Threshold

For workloads with many small integer sets, increase the threshold:

```text
# redis.conf
set-max-intset-entries 1024
```

For workloads needing O(1) member testing, keep it low:

```text
set-max-intset-entries 128
```

## Summary

Redis intset stores integer sets as a compact sorted array with binary search, upgrading the integer width automatically when values exceed the current encoding range. For sets with fewer than 512 integers, it saves 5-6x memory versus a hash table. Tune `set-max-intset-entries` based on whether your workload prioritizes memory density or O(1) lookup speed.
