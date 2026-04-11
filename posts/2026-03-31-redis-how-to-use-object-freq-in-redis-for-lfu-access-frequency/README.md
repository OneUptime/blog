# How to Use OBJECT FREQ in Redis for LFU Access Frequency

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, LFU, Eviction, Command, Memory Management

Description: Learn how to use OBJECT FREQ in Redis to retrieve the LFU (Least Frequently Used) access frequency counter for a key, useful for understanding eviction behavior.

---

## What Is OBJECT FREQ

`OBJECT FREQ` returns the logarithmic access frequency counter for a key when Redis is configured to use an LFU eviction policy. LFU (Least Frequently Used) eviction removes keys that are accessed least often rather than those accessed least recently (LRU). The counter is a logarithmically scaled approximation of access frequency.

```text
OBJECT FREQ key
```

Returns an integer representing the LFU frequency counter (0-255), or an error if LFU is not enabled.

## Prerequisites - Enabling LFU

`OBJECT FREQ` only works when an LFU-based eviction policy is active:

```bash
# View current policy
CONFIG GET maxmemory-policy

# Set an LFU policy
CONFIG SET maxmemory-policy allkeys-lfu
# or
CONFIG SET maxmemory-policy volatile-lfu
```

Or in `redis.conf`:

```text
maxmemory-policy allkeys-lfu
```

Without an LFU policy, `OBJECT FREQ` returns an error:

```text
An LFU maxmemory policy is not selected, access frequency not tracked. Please note that when switching between policies at runtime LRU and LFU data will take some time to adjust.
```

## LFU Eviction Policies

| Policy | Behavior |
|--------|----------|
| `allkeys-lfu` | Evict least frequently used keys from all keys |
| `volatile-lfu` | Evict least frequently used keys with TTL set |

## Basic Usage

```bash
CONFIG SET maxmemory-policy allkeys-lfu

SET popular:key "hot data"
# Access it many times to build up frequency
GET popular:key
# ... repeat many times ...

SET rarely:used:key "cold data"
# Access only once
GET rarely:used:key

OBJECT FREQ popular:key
# (integer) 10   <- higher frequency

OBJECT FREQ rarely:used:key
# (integer) 5    <- lower frequency (initial value) - more likely to be evicted
```

## How the LFU Counter Works

The counter is logarithmic and probabilistic, not a direct access count. It ranges from 0 to 255:

- Starts at 5 for new keys
- Increases logarithmically with access (harder to increase at higher values)
- Decays over time based on `lfu-decay-time` (default 1 minute)
- A counter of 100 might represent tens of thousands of accesses (with default factor of 10)

```bash
# Configure LFU parameters
CONFIG SET lfu-log-factor 10        # Default: 10 (higher = slower increase)
CONFIG SET lfu-decay-time 1         # Default: 1 (minutes between decay)
```

## Practical Example in Python

```python
import redis

# Must use allkeys-lfu or volatile-lfu policy
client = redis.Redis(host='localhost', port=6379, decode_responses=True)
client.config_set('maxmemory-policy', 'allkeys-lfu')

# Create test keys
client.set('hot:key', 'frequently accessed')
client.set('warm:key', 'sometimes accessed')
client.set('cold:key', 'rarely accessed')

# Simulate access patterns
for _ in range(100):
    client.get('hot:key')

for _ in range(10):
    client.get('warm:key')

client.get('cold:key')  # Just once

# Check LFU frequency
keys = ['hot:key', 'warm:key', 'cold:key']
print("LFU Frequency Counters:")
for key in keys:
    freq = client.object("freq", key)
    print(f"  {key}: {freq}")
```

## Practical Example in Node.js

```javascript
const { createClient } = require('redis');

(async () => {
  const client = createClient();
  await client.connect();

  // Enable LFU policy
  await client.configSet('maxmemory-policy', 'allkeys-lfu');

  // Set and access keys with different frequency
  await client.set('hot', 'data');
  await client.set('cold', 'data');

  // Access 'hot' many times
  for (let i = 0; i < 50; i++) {
    await client.get('hot');
  }

  // Access 'cold' once
  await client.get('cold');

  // Check frequencies
  const hotFreq = await client.objectFreq('hot');
  const coldFreq = await client.objectFreq('cold');

  console.log(`Hot key frequency: ${hotFreq}`);
  console.log(`Cold key frequency: ${coldFreq}`);

  await client.quit();
})();
```

## Finding Keys Most Likely to Be Evicted

```python
import redis

client = redis.Redis(host='localhost', port=6379, decode_responses=True)
client.config_set('maxmemory-policy', 'allkeys-lfu')

def get_lowest_freq_keys(pattern='*', sample_size=100):
    """Find keys with lowest LFU frequency (most likely to be evicted)."""
    key_freqs = []
    cursor = 0

    while True:
        cursor, keys = client.scan(cursor, match=pattern, count=sample_size)
        for key in keys:
            try:
                freq = client.object("freq", key)
                key_freqs.append((key, freq))
            except redis.ResponseError:
                pass  # Key may have expired
        if cursor == 0:
            break

    # Sort by frequency ascending (lowest freq = most likely to be evicted)
    key_freqs.sort(key=lambda x: x[1])
    return key_freqs[:10]

cold_keys = get_lowest_freq_keys(pattern='cache:*')
print("Keys most likely to be evicted:")
for key, freq in cold_keys:
    print(f"  {key}: freq={freq}")
```

## Tuning LFU Parameters

```bash
# Higher lfu-log-factor means slower frequency increase
# Use higher values for large working sets
CONFIG SET lfu-log-factor 10   # Default
CONFIG SET lfu-log-factor 100  # Very slow increase - more discrimination

# lfu-decay-time in minutes
# Higher = slower decay, keeps history longer
CONFIG SET lfu-decay-time 1    # Default: decay every 1 minute
CONFIG SET lfu-decay-time 5    # Slower decay
```

```python
import redis

client = redis.Redis(host='localhost', port=6379, decode_responses=True)

def get_lfu_config():
    policy = client.config_get('maxmemory-policy')['maxmemory-policy']
    log_factor = client.config_get('lfu-log-factor')['lfu-log-factor']
    decay_time = client.config_get('lfu-decay-time')['lfu-decay-time']

    return {
        'policy': policy,
        'lfu_log_factor': log_factor,
        'lfu_decay_time_minutes': decay_time,
    }

config = get_lfu_config()
print(f"LFU Policy: {config['policy']}")
print(f"Log Factor: {config['lfu_log_factor']}")
print(f"Decay Time: {config['lfu_decay_time_minutes']} minutes")
```

## OBJECT FREQ vs OBJECT IDLETIME

| Command | Works With | Returns |
|---------|-----------|---------|
| `OBJECT FREQ` | LFU policies | Access frequency counter |
| `OBJECT IDLETIME` | All non-LFU policies | Seconds since last access |

You can only use one at a time effectively since you choose either LRU or LFU eviction policy.

## Summary

`OBJECT FREQ` returns the LFU logarithmic frequency counter for a key, available only when using `allkeys-lfu` or `volatile-lfu` eviction policies. The counter (0-255) represents approximate access frequency and decays over time based on `lfu-decay-time`. Use it to identify hot and cold keys, understand which data Redis is most likely to evict, and tune `lfu-log-factor` and `lfu-decay-time` for your access patterns.
