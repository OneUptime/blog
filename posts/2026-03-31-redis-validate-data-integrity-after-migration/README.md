# How to Validate Data Integrity After Redis Migration

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Migration, Validation, Data Integrity, DevOps

Description: Learn how to validate Redis data integrity after migration by comparing key counts, sampling values, checking TTLs, and using automated comparison scripts.

---

After migrating Redis data to a new instance, validating that all data transferred correctly is critical before decommissioning the source. This guide covers a systematic approach to comparing source and target instances.

## Level 1: Quick Sanity Checks

Start with fast checks that take seconds:

```bash
# Compare total key counts
SOURCE_KEYS=$(redis-cli -h source-host -a "source-pwd" --raw DBSIZE)
TARGET_KEYS=$(redis-cli -h target-host -a "target-pwd" --raw DBSIZE)
echo "Source: $SOURCE_KEYS keys"
echo "Target: $TARGET_KEYS keys"

if [ "$SOURCE_KEYS" -eq "$TARGET_KEYS" ]; then
  echo "PASS: Key counts match"
else
  echo "FAIL: Key count mismatch (diff: $((TARGET_KEYS - SOURCE_KEYS)))"
fi
```

```bash
# Compare keyspace info per database
redis-cli -h source-host -a "source-pwd" INFO keyspace
redis-cli -h target-host -a "target-pwd" INFO keyspace

# Compare memory usage (rough indicator)
redis-cli -h source-host -a "source-pwd" INFO memory | grep used_memory_human
redis-cli -h target-host -a "target-pwd" INFO memory | grep used_memory_human
```

## Level 2: Key Type Distribution

```bash
# Check key type distribution on both sides
for TYPE in string hash list set zset stream; do
  SOURCE_COUNT=$(redis-cli -h source-host --scan | xargs -I{} redis-cli -h source-host TYPE {} 2>/dev/null | grep -c "^${TYPE}$")
  echo "Type $TYPE on source: $SOURCE_COUNT"
done
```

For a faster approach with Python:

```python
import redis
from collections import Counter

def get_type_distribution(host, password, sample_size=10000):
    r = redis.Redis(host=host, password=password, decode_responses=True)
    type_counts = Counter()
    count = 0

    for key in r.scan_iter("*", count=500):
        type_counts[r.type(key)] += 1
        count += 1
        if count >= sample_size:
            break

    return type_counts, count

src_types, src_n = get_type_distribution("source-host", "src-pwd")
tgt_types, tgt_n = get_type_distribution("target-host", "tgt-pwd")

print(f"Source sample ({src_n} keys): {dict(src_types)}")
print(f"Target sample ({tgt_n} keys): {dict(tgt_types)}")
```

## Level 3: Value Comparison for Critical Keys

```python
import redis

src = redis.Redis(host="source-host", password="src-pwd", decode_responses=True)
tgt = redis.Redis(host="target-host", password="tgt-pwd", decode_responses=True)

def compare_key(key):
    src_type = src.type(key)
    tgt_type = tgt.type(key)

    if src_type != tgt_type:
        return False, f"type mismatch: {src_type} vs {tgt_type}"

    if src_type == "string":
        src_val = src.get(key)
        tgt_val = tgt.get(key)
        if src_val != tgt_val:
            return False, f"value mismatch"

    elif src_type == "hash":
        src_val = src.hgetall(key)
        tgt_val = tgt.hgetall(key)
        if src_val != tgt_val:
            return False, f"hash mismatch ({len(src_val)} vs {len(tgt_val)} fields)"

    elif src_type == "list":
        src_val = src.lrange(key, 0, -1)
        tgt_val = tgt.lrange(key, 0, -1)
        if src_val != tgt_val:
            return False, f"list mismatch ({len(src_val)} vs {len(tgt_val)} items)"

    elif src_type == "set":
        src_val = src.smembers(key)
        tgt_val = tgt.smembers(key)
        if src_val != tgt_val:
            return False, f"set mismatch"

    elif src_type == "zset":
        src_val = src.zrange(key, 0, -1, withscores=True)
        tgt_val = tgt.zrange(key, 0, -1, withscores=True)
        if src_val != tgt_val:
            return False, f"zset mismatch"

    return True, "ok"


def validate_sample(pattern="*", sample_size=1000):
    matched = 0
    mismatched = 0
    missing = 0

    for key in src.scan_iter(pattern, count=500):
        if matched + mismatched + missing >= sample_size:
            break

        if not tgt.exists(key):
            print(f"MISSING: {key}")
            missing += 1
            continue

        ok, msg = compare_key(key)
        if ok:
            matched += 1
        else:
            print(f"MISMATCH: {key} - {msg}")
            mismatched += 1

    total = matched + mismatched + missing
    print(f"\nResults ({total} keys sampled):")
    print(f"  Matched:    {matched}")
    print(f"  Mismatched: {mismatched}")
    print(f"  Missing:    {missing}")
    return mismatched == 0 and missing == 0

validate_sample(sample_size=5000)
```

## Level 4: TTL Validation

TTLs can differ after migration, especially if time elapsed during transfer:

```python
def validate_ttls(sample_size=500, tolerance_seconds=60):
    issues = 0
    checked = 0
    for key in src.scan_iter("*", count=200):
        if checked >= sample_size:
            break
        checked += 1

        src_ttl = src.ttl(key)
        tgt_ttl = tgt.ttl(key)

        # Both should be either positive (with TTL) or -1 (no TTL)
        if src_ttl == -1 and tgt_ttl != -1:
            print(f"WARNING: {key} has unexpected TTL on target: {tgt_ttl}s")
            issues += 1
        elif src_ttl > 0 and tgt_ttl == -1:
            print(f"WARNING: {key} lost TTL on target (was {src_ttl}s)")
            issues += 1
        elif src_ttl > 0 and tgt_ttl > 0:
            diff = abs(src_ttl - tgt_ttl)
            if diff > tolerance_seconds:
                print(f"WARNING: {key} TTL diff {diff}s exceeds tolerance")
                issues += 1

    print(f"TTL validation: {issues} issues found")
```

## Level 5: Use RIOT Compare

If you used RIOT for migration, use its built-in compare command:

```bash
riot -u redis://:src-password@source-host:6379 compare \
  -u redis://:tgt-password@target-host:6379

# Output:
# Keys matched: 124530
# Keys missing in target: 2
# Keys with different values: 0
# Keys with different TTLs: 15
```

## Summary

Validate Redis migrations at multiple levels: key count comparison first, then type distribution, then value sampling for critical keys, and finally TTL checks. For automated pipelines, integrate RIOT's compare command or the Python sampling script into your migration runbook to catch issues before decommissioning the source.
