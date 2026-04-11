# How to Use FT.DICTADD in Redis to Add Custom Dictionary Terms

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, RediSearch, Dictionary, Spell Check, Full-Text Search

Description: Learn how to use FT.DICTADD in Redis to add custom terms to a RediSearch dictionary for use with spell checking and query correction.

---

## What Is FT.DICTADD?

`FT.DICTADD` adds one or more terms to a RediSearch custom dictionary. These dictionaries are used by the `FT.SPELLCHECK` command to provide suggestions for misspelled query terms. Custom dictionaries allow you to include domain-specific terminology, product names, brand names, or any terms not found in the built-in dictionary.

## Basic Syntax

```text
FT.DICTADD dict term [term ...]
```

Parameters:
- `dict` - the name of the dictionary (created automatically if it doesn't exist)
- `term` - one or more terms to add

Returns the number of new terms added (terms already in the dictionary are not counted).

## Adding Terms to a Dictionary

```bash
# Create a dictionary and add terms
FT.DICTADD products_dict "redis" "nosql" "keyvalue" "inmemory"
# Returns: 4 (4 new terms added)

# Add more terms
FT.DICTADD products_dict "elasticsearch" "mongodb" "cassandra"
# Returns: 3

# Adding an existing term returns 0 for that term
FT.DICTADD products_dict "redis" "postgresql"
# Returns: 1 (only postgresql is new)
```

## Viewing Dictionary Contents

After adding terms, verify them with `FT.DICTDUMP`:

```bash
FT.DICTDUMP products_dict
# Returns:
# 1) "redis"
# 2) "nosql"
# 3) "keyvalue"
# 4) "inmemory"
# 5) "elasticsearch"
# 6) "mongodb"
# 7) "cassandra"
# 8) "postgresql"
```

## Using a Custom Dictionary with FT.SPELLCHECK

The main purpose of `FT.DICTADD` is to support spell checking. Without a custom dictionary, `FT.SPELLCHECK` may incorrectly flag domain-specific terms as misspelled.

```bash
# Create an index
FT.CREATE tech_docs ON HASH PREFIX 1 doc: SCHEMA content TEXT

# Without custom dictionary - "redis" may be flagged
FT.SPELLCHECK tech_docs "resdis nosql"
# May suggest corrections for "resdis" but also flag "nosql"

# Include custom dictionary in spell check
FT.SPELLCHECK tech_docs "resdis nosql" TERMS INCLUDE products_dict
# "nosql" is now recognized from our dictionary
# Only "resdis" gets correction suggestions
```

## Building a Product Name Dictionary

```bash
# Add brand/product names that should never be corrected
FT.DICTADD brands_dict \
  "kubernetes" \
  "prometheus" \
  "grafana" \
  "opentelemetry" \
  "jaeger" \
  "zipkin" \
  "istio" \
  "envoy"

FT.DICTDUMP brands_dict
```

## Adding Terms in Bulk with Python

```python
import redis

r = redis.Redis(host='localhost', port=6379, decode_responses=True)

# Load terms from a file or list
domain_terms = [
    'redis', 'nosql', 'keyvalue', 'pubsub', 'pipeline',
    'lua', 'scripting', 'replication', 'sentinel', 'cluster',
    'sharding', 'persistence', 'rdb', 'aof', 'eviction',
    'lru', 'lfu', 'ttl', 'expiry', 'keyspace',
]

# Add all terms at once
added = r.ft().dict_add('redis_dict', *domain_terms)
print(f"Added {added} new terms to redis_dict")

# Verify
all_terms = r.ft().dict_dump('redis_dict')
print(f"Dictionary now has {len(all_terms)} terms")
```

## Using Multiple Dictionaries

You can create multiple specialized dictionaries and use them together in spell check:

```bash
# Separate dictionaries for different domains
FT.DICTADD tech_dict "kubernetes" "docker" "terraform" "ansible"
FT.DICTADD product_dict "oneuptime" "uptime" "monitoring" "alerting"

# Use both in spell check
FT.SPELLCHECK my_index "kubernetez monitoring" \
  TERMS INCLUDE tech_dict \
  TERMS INCLUDE product_dict
```

## Excluding Terms from Spell Check

You can also use dictionaries to exclude terms from being flagged as misspelled:

```bash
# Add internal jargon that should be excluded
FT.DICTADD internal_codes "SKU123" "PROD-X9" "CUST-456"

FT.SPELLCHECK product_index "SKU123 chekout" TERMS EXCLUDE internal_codes TERMS INCLUDE corrections_dict
```

## Python Dictionary Management Class

```python
import redis

class RediSearchDictionary:
    def __init__(self, redis_client, dict_name):
        self.r = redis_client
        self.dict_name = dict_name

    def add(self, *terms):
        return self.r.execute_command('FT.DICTADD', self.dict_name, *terms)

    def remove(self, *terms):
        return self.r.execute_command('FT.DICTDEL', self.dict_name, *terms)

    def dump(self):
        return self.r.execute_command('FT.DICTDUMP', self.dict_name)

    def __len__(self):
        return len(self.dump())

r = redis.Redis(host='localhost', port=6379, decode_responses=True)
d = RediSearchDictionary(r, 'my_dict')
d.add('redis', 'nosql', 'cache')
print(f"Dictionary size: {len(d)}")
```

## Summary

`FT.DICTADD` is used to populate custom RediSearch dictionaries with domain-specific terms that should be recognized during spell checking. This prevents valid product names, technical jargon, or proprietary terms from being incorrectly flagged as misspelled. Custom dictionaries are named arbitrarily and can be referenced by any index's `FT.SPELLCHECK` command using the `INCLUDE` option. Use `FT.DICTDEL` to remove terms and `FT.DICTDUMP` to list all current entries.
