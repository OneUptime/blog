# Redis List Commands Cheat Sheet

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, List, Command, Cheat Sheet, Queue

Description: Complete Redis list commands reference covering LPUSH, RPUSH, LPOP, RPOP, LRANGE, LINSERT, LMOVE, and blocking operations.

---

Redis lists are ordered sequences of strings implemented as a doubly linked list (or listpack for small lists). They are used for queues, stacks, timelines, and activity logs. Here is the complete command reference.

## Push and Pop

```bash
# Push to the left (head)
LPUSH mylist "a" "b" "c"    # list is now: c, b, a

# Push to the right (tail)
RPUSH mylist "d" "e"        # list is now: c, b, a, d, e

# Push only if key exists
LPUSHX mylist "z"
RPUSHX mylist "z"

# Pop from left
LPOP mylist                  # returns "c"
LPOP mylist 3                # returns up to 3 elements

# Pop from right
RPOP mylist
RPOP mylist 2
```

## Reading the List

```bash
# Get range (0 = first, -1 = last)
LRANGE mylist 0 -1           # all elements
LRANGE mylist 0 9            # first 10
LRANGE mylist -5 -1          # last 5

# Get element by index
LINDEX mylist 0              # first element
LINDEX mylist -1             # last element

# Get list length
LLEN mylist
```

## Modifying the List

```bash
# Set value at index
LSET mylist 2 "new_value"

# Insert before or after a pivot value
LINSERT mylist BEFORE "b" "x"
LINSERT mylist AFTER "b" "y"

# Remove N occurrences of value
LREM mylist 2 "a"    # remove 2 occurrences from head
LREM mylist -2 "a"   # remove 2 occurrences from tail
LREM mylist 0 "a"    # remove all occurrences

# Trim list to range (discard the rest)
LTRIM mylist 0 99    # keep only first 100 elements
```

## Atomic Move Between Lists

```bash
# Move element from one list to another (atomic)
LMOVE source destination LEFT RIGHT
LMOVE source destination LEFT LEFT
```

## Blocking Operations (Queue Pattern)

```bash
# Block until an element is available (timeout in seconds, 0 = forever)
BLPOP queue1 queue2 5     # block up to 5 seconds, check queue1 then queue2
BRPOP queue1 0            # block indefinitely

# Blocking move between lists (reliable queue)
BLMOVE source destination LEFT RIGHT 5
```

## Common Patterns

```bash
# Simple job queue (producer pushes, consumer pops)
RPUSH jobs:email '{"to":"user@example.com","subject":"Welcome"}'
BLPOP jobs:email 0   # worker blocks waiting for jobs

# Capped activity log (keep last 1000 entries)
LPUSH activity:user:42 '{"event":"login","ts":1711900000}'
LTRIM activity:user:42 0 999

# Stack (LIFO)
LPUSH stack "item1"
LPOP stack

# Circular buffer
RPUSH buffer "data"
LTRIM buffer -100 -1   # keep last 100 items
```

## Summary

Redis list commands enable queues (RPUSH + BLPOP), stacks (LPUSH + LPOP), capped logs (LPUSH + LTRIM), and atomic message passing between lists (LMOVE). Blocking commands like BLPOP make Redis a simple, efficient job queue without polling overhead.
