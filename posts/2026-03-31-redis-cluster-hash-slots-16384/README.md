# How Redis Cluster Hash Slots Work (16384 Slots)

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Cluster, Hash Slot, Sharding, Architecture

Description: Understand how Redis Cluster distributes keys across 16384 hash slots, how the CRC16 hash function works, and how slots map to nodes.

---

Redis Cluster uses a fixed hash space of 16384 slots to distribute keys across multiple nodes. Understanding this system is fundamental to working with Redis Cluster effectively.

## Why 16384 Slots?

Redis Cluster uses exactly 16384 slots (2^14) rather than a typical hash ring. This number was chosen as a pragmatic balance:

```text
- Small enough that the slot bitmap fits in a heartbeat message (2KB for 16384 bits)
- Large enough to accommodate hundreds of nodes (each node gets ~160 slots for 100 nodes)
- Powers of 2 make modulo operations fast: key_slot = CRC16(key) & 0x3FFF
```

## Computing a Key's Slot

Redis uses CRC16 to compute which slot a key belongs to:

```python
# Python equivalent of Redis slot computation
def redis_slot(key):
    # Check for hash tag
    start = key.find('{')
    if start != -1:
        end = key.find('}', start + 1)
        if end != -1 and end > start + 1:
            key = key[start+1:end]  # Hash only the part inside {}

    crc = 0
    for byte in key.encode('utf-8'):
        crc = (crc ^ (byte << 8)) & 0xFFFF
        for _ in range(8):
            if crc & 0x8000:
                crc = ((crc << 1) ^ 0x1021) & 0xFFFF
            else:
                crc = (crc << 1) & 0xFFFF

    return crc % 16384

# Examples
print(redis_slot("user:1001"))   # e.g., 5712
print(redis_slot("session:abc")) # e.g., 14788
```

Using Redis directly:

```bash
redis-cli CLUSTER KEYSLOT user:1001
# 5712
redis-cli CLUSTER KEYSLOT session:abc
# 14788
```

## Slot Distribution Across Nodes

With a 3-node cluster, slots are distributed roughly evenly:

```text
Node A (192.168.1.10): slots 0-5460
Node B (192.168.1.11): slots 5461-10922
Node C (192.168.1.12): slots 10923-16383
```

Check the current slot assignment:

```bash
redis-cli -p 7001 CLUSTER SLOTS
```

```text
1) 1) (integer) 0       <- slot start
   2) (integer) 5460    <- slot end
   3) 1) "192.168.1.10"
      2) (integer) 7001
      3) "node-id-1"
```

## How a Key Is Routed

When a client issues a command, the cluster node receiving it checks if the key belongs to a local slot:

```text
Client: SET user:1001 "Alice"
-> Compute slot: CRC16("user:1001") % 16384 = 5712
-> Slot 5712 is on Node B
-> If request went to Node C: MOVED 5712 192.168.1.11:7001
-> Client redirects to Node B
```

## Keys Per Slot

```bash
# Count keys in a specific slot
redis-cli CLUSTER COUNTKEYSINSLOT 5712

# List keys in a slot (useful for debugging)
redis-cli CLUSTER GETKEYSINSLOT 5712 10
```

## Slot Coverage and Availability

All 16384 slots must be covered for the cluster to accept writes:

```bash
redis-cli CLUSTER INFO | grep cluster_state
# cluster_state:ok   (all slots covered)
# cluster_state:fail (some slots missing)
```

```bash
redis-cli CLUSTER INFO | grep cluster_slots_assigned
# cluster_slots_assigned:16384  (all slots assigned)
```

## Summary

Redis Cluster distributes all keys across exactly 16384 hash slots using `CRC16(key) % 16384`. Each node owns a range of slots, and requests for keys on other nodes return a MOVED redirect. Understanding slot computation is essential for designing key schemas, using hash tags for co-location, and resharding clusters efficiently.
