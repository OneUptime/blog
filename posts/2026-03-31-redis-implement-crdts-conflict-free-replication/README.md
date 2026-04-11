# How to Implement CRDTs with Redis for Conflict-Free Replication

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, CRDT, Replication

Description: Learn how to simulate conflict-free replicated data types (CRDTs) in Redis using atomic commands to build eventually consistent distributed counters and sets.

---

CRDTs (Conflict-free Replicated Data Types) allow distributed systems to converge to the same state without coordination. Redis Enterprise natively supports CRDTs via Active-Active geo-distribution, but you can also simulate CRDT patterns in open-source Redis using atomic operations for counters, sets, and registers.

## Why CRDTs Matter

In a multi-node setup, two replicas might accept concurrent writes. Traditional replication picks a winner and discards the other write. CRDTs are designed so that every write can be merged - no data is lost regardless of order.

## G-Counter (Grow-Only Counter)

A G-Counter is the simplest CRDT. Each node increments its own slot, and the total is the sum of all slots.

```python
import redis

def increment(r, node_id):
    key = f"gcounter:{node_id}"
    r.incr(key)

def total(r, nodes):
    keys = [f"gcounter:{n}" for n in nodes]
    values = r.mget(keys)
    return sum(int(v) for v in values if v)

r = redis.Redis(host='localhost', port=6379, decode_responses=True)

increment(r, "node1")
increment(r, "node1")
increment(r, "node2")

print(total(r, ["node1", "node2"]))  # 3
```

## PN-Counter (Positive-Negative Counter)

A PN-Counter supports both increment and decrement by tracking increments and decrements in separate G-Counters.

```python
def pn_increment(r, node_id):
    r.incr(f"pncounter:pos:{node_id}")

def pn_decrement(r, node_id):
    r.incr(f"pncounter:neg:{node_id}")

def pn_total(r, nodes):
    pos = sum(int(v) for v in r.mget([f"pncounter:pos:{n}" for n in nodes]) if v)
    neg = sum(int(v) for v in r.mget([f"pncounter:neg:{n}" for n in nodes]) if v)
    return pos - neg

pn_increment(r, "node1")
pn_increment(r, "node1")
pn_decrement(r, "node2")
print(pn_total(r, ["node1", "node2"]))  # 1
```

## OR-Set (Observed-Remove Set)

An OR-Set allows elements to be added and removed without conflict. Each element gets a unique tag on add; removal deletes that specific tag.

```python
import uuid

def or_set_add(r, set_key, element):
    tag = str(uuid.uuid4())
    r.hset(f"{set_key}:tags", f"{element}:{tag}", 1)

def or_set_remove(r, set_key, element):
    # Remove all tags for this element
    tags = r.hkeys(f"{set_key}:tags")
    to_delete = [t for t in tags if t.startswith(f"{element}:")]
    if to_delete:
        r.hdel(f"{set_key}:tags", *to_delete)

def or_set_members(r, set_key):
    tags = r.hkeys(f"{set_key}:tags")
    return set(t.split(":")[0] for t in tags)

or_set_add(r, "myset", "alice")
or_set_add(r, "myset", "bob")
or_set_remove(r, "myset", "alice")
print(or_set_members(r, "myset"))  # {'bob'}
```

## Last-Write-Wins Register (LWW-Register)

For simple values, use a sorted set where the score is the timestamp. The highest score wins.

```python
import time

def lww_write(r, key, value, node_id):
    ts = time.time()
    r.zadd(f"lww:{key}", {f"{value}:{node_id}": ts})
    # Keep only the latest entry
    r.zremrangebyrank(f"lww:{key}", 0, -2)

def lww_read(r, key):
    result = r.zrange(f"lww:{key}", -1, -1)
    return result[0].rsplit(":", 1)[0] if result else None

lww_write(r, "username", "alice", "node1")
lww_write(r, "username", "bob", "node2")
print(lww_read(r, "username"))  # latest write wins
```

## Redis Enterprise Native CRDTs

Redis Enterprise supports true CRDTs across geo-distributed Active-Active databases by applying CRDT semantics transparently to standard Redis data types. Counters use `INCR`/`DECR` with counter CRDT logic, sets use `SADD`/`SREM` with OR-Set semantics, and strings use `SET` with last-write-wins behavior - all without special commands or application-level merge logic.

## Summary

You can implement CRDT patterns in Redis using atomic commands like `INCR`, `HSET`, and `ZADD` to build eventually consistent counters, sets, and registers. These patterns let distributed nodes converge without coordination. For production geo-replication with native CRDT support, Redis Enterprise Active-Active is the recommended approach.
