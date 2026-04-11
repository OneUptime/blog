# How to Use Redis Bloom Filters in Python

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Python, Bloom Filter, Probabilistic Data Structure, RedisBloom

Description: Learn how to use Redis Bloom Filters in Python to efficiently check membership with minimal memory, including creation, adding items, and querying.

---

## What Is a Bloom Filter?

A Bloom filter is a probabilistic data structure that answers "Is this item in the set?" with two possible outcomes:

- "Definitely not in the set" - guaranteed accurate
- "Possibly in the set" - small probability of false positive

Benefits:
- Extremely memory efficient (orders of magnitude less than a set)
- O(1) add and lookup time
- Perfect for duplicate detection, spam filtering, and cache optimization

Redis provides native Bloom filter support through the RedisBloom module (included in Redis Stack).

## Setup

```bash
# Run Redis Stack with RedisBloom
docker run -p 6379:6379 redis/redis-stack:latest

# Install client
pip install redis
```

## Creating a Bloom Filter

```python
from redis import Redis

r = Redis(host='localhost', port=6379, decode_responses=True)

# Create a Bloom filter with target false positive rate and capacity
r.bf().create(
    'email:blacklist',
    errorRate=0.001,     # 0.1% false positive rate
    capacity=1000000     # Expected number of items
)
print("Bloom filter created")
```

## Adding Items

```python
from redis import Redis

r = Redis(host='localhost', port=6379, decode_responses=True)

# Add a single item
r.bf().add('email:blacklist', 'spam@example.com')

# Add multiple items at once (madd)
emails = [
    'phishing@badsite.com',
    'scam@fraud.com',
    'noreply@spam.net',
    'abuse@malicious.org',
]
results = r.bf().madd('email:blacklist', *emails)
print(f"Items added: {results}")
# [1, 1, 1, 1] means all newly added (not seen before)
# 0 would mean item was likely already in the filter
```

## Checking Membership

```python
from redis import Redis

r = Redis(host='localhost', port=6379, decode_responses=True)

# Check a single item
is_blacklisted = r.bf().exists('email:blacklist', 'spam@example.com')
print(f"spam@example.com blacklisted: {is_blacklisted}")  # True

is_clean = r.bf().exists('email:blacklist', 'alice@valid.com')
print(f"alice@valid.com blacklisted: {is_clean}")  # False

# Check multiple items
emails_to_check = [
    'spam@example.com',      # Added earlier
    'alice@valid.com',       # Never added
    'phishing@badsite.com',  # Added earlier
]
results = r.bf().mexists('email:blacklist', *emails_to_check)
print(f"Membership results: {results}")
# [True, False, True]
```

## Practical Use Case - Email Validation

```python
from redis import Redis

r = Redis(host='localhost', port=6379, decode_responses=True)

class EmailBlacklist:
    def __init__(self, key='email:blacklist', capacity=500000, error_rate=0.001):
        self.key = key
        try:
            r.bf().create(key, errorRate=error_rate, capacity=capacity)
        except Exception:
            pass  # Already exists

    def add(self, email):
        return r.bf().add(self.key, email.lower())

    def add_many(self, emails):
        normalized = [e.lower() for e in emails]
        return r.bf().madd(self.key, *normalized)

    def is_blacklisted(self, email):
        return r.bf().exists(self.key, email.lower())

    def filter_valid(self, emails):
        normalized = [e.lower() for e in emails]
        results = r.bf().mexists(self.key, *normalized)
        return [e for e, blacklisted in zip(emails, results) if not blacklisted]

# Usage
bl = EmailBlacklist()
bl.add_many(['spam@bad.com', 'phishing@evil.net', 'scam@fraud.io'])

incoming_emails = ['alice@company.com', 'spam@bad.com', 'bob@valid.org', 'phishing@evil.net']
valid_emails = bl.filter_valid(incoming_emails)
print(f"Valid emails: {valid_emails}")
# ['alice@company.com', 'bob@valid.org']
```

## Checking Filter Info

```python
from redis import Redis

r = Redis(host='localhost', port=6379, decode_responses=True)

info = r.bf().info('email:blacklist')
print(f"Capacity: {info.capacity}")
print(f"Size (bytes): {info.size}")
print(f"Number of filters: {info.filterNum}")
print(f"Items inserted: {info.insertedNum}")
print(f"Expansion rate: {info.expansionRate}")
```

## Using INSERT with Auto-Create

```python
from redis import Redis

r = Redis(host='localhost', port=6379, decode_responses=True)

# Insert with options - creates the filter if it doesn't exist
r.bf().insert(
    'user:seen',
    ['user:1001', 'user:1002', 'user:1003'],
    capacity=10000,
    error=0.01,
    noCreate=False  # Create if not exists
)
```

## Deduplication Stream Example

```python
from redis import Redis
import hashlib

r = Redis(host='localhost', port=6379, decode_responses=True)

def get_event_fingerprint(event):
    """Create a unique fingerprint for an event."""
    key = f"{event['type']}:{event['user_id']}:{event['timestamp']}"
    return hashlib.md5(key.encode()).hexdigest()

def process_events(events):
    filter_key = 'events:seen'
    try:
        r.bf().create(filter_key, errorRate=0.001, capacity=1000000)
    except Exception:
        pass

    processed = 0
    skipped = 0

    for event in events:
        fingerprint = get_event_fingerprint(event)
        if r.bf().add(filter_key, fingerprint):
            # New event - process it
            print(f"Processing event: {event['type']} for user {event['user_id']}")
            processed += 1
        else:
            # Duplicate - skip
            skipped += 1

    print(f"Processed: {processed}, Skipped (duplicates): {skipped}")

events = [
    {'type': 'click', 'user_id': '1', 'timestamp': '1000'},
    {'type': 'click', 'user_id': '1', 'timestamp': '1000'},  # Duplicate
    {'type': 'view', 'user_id': '2', 'timestamp': '1001'},
]
process_events(events)
```

## Summary

Redis Bloom Filters in Python via redis-py's `bf()` interface provide memory-efficient membership testing with configurable false positive rates. Create filters with appropriate capacity and error rate settings, add items with `add()` or `madd()`, and check membership with `exists()` or `mexists()`. They are ideal for deduplication, blacklisting, and cache optimization scenarios where the occasional false positive is acceptable and memory efficiency is critical.
