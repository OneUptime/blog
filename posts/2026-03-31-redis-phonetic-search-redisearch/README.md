# How to Implement Phonetic Search with RediSearch

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, RediSearch, Phonetic Search, SOUNDEX, Search

Description: Enable phonetic search in RediSearch to match names that sound alike, using the built-in double metaphone algorithm.

---

Phonetic search finds names that sound similar even when spelled differently - "Smith" and "Smyth", or "Johnson" and "Jonson". RediSearch supports phonetic matching out of the box using double metaphone, making it ideal for people directories, product names, and address search.

## Creating a Phonetic Index

Enable phonetic matching with the `PHONETIC` attribute:

```python
import redis
from redis.commands.search.field import TextField, TagField
from redis.commands.search.indexDefinition import IndexDefinition, IndexType

r = redis.Redis(host='localhost', port=6379, decode_responses=True)

def create_phonetic_index():
    # PHONETIC dm:en enables English double metaphone
    schema = (
        TextField("$.name", as_name="name",
                  phonetic_matcher="dm:en",
                  weight=5.0),
        TextField("$.description", as_name="description"),
        TagField("$.type", as_name="type"),
    )
    r.ft("idx:phonetic").create_index(
        schema,
        definition=IndexDefinition(prefix=["person:"], index_type=IndexType.JSON),
    )
```

## Indexing Records

```python
import json

people = [
    {"id": "1", "name": "John Smith", "type": "customer"},
    {"id": "2", "name": "Jon Smyth", "type": "customer"},
    {"id": "3", "name": "Jonathan Smithe", "type": "employee"},
    {"id": "4", "name": "Sarah Johnson", "type": "customer"},
    {"id": "5", "name": "Sara Jonson", "type": "customer"},
]

for person in people:
    r.json().set(f"person:{person['id']}", "$", person)
```

## Phonetic Search Queries

```python
from redis.commands.search.query import Query

def phonetic_search(name_query: str, limit: int = 10) -> list:
    # Phonetic matching is automatic on fields with PHONETIC attribute
    results = r.ft("idx:phonetic").search(
        Query(name_query).paging(0, limit)
    )
    return [
        {"id": doc.id, **json.loads(doc.json)}
        for doc in results.docs
    ]
```

## Combined Exact and Phonetic Search

```python
def smart_name_search(name: str) -> dict:
    # Exact search (disable phonetic matching)
    exact = r.ft("idx:phonetic").search(
        Query(f"@name:({name})=>{{$phonetic:false}}").paging(0, 5)
    )
    exact_results = [json.loads(d.json) for d in exact.docs]

    # Phonetic search (enabled by default on PHONETIC fields)
    phonetic = r.ft("idx:phonetic").search(
        Query(name).paging(0, 10)
    )
    phonetic_results = [json.loads(d.json) for d in phonetic.docs]

    # Exclude exact matches from phonetic results
    exact_ids = {r["id"] for r in exact_results}
    phonetic_only = [r for r in phonetic_results if r["id"] not in exact_ids]

    return {
        "exact_matches": exact_results,
        "sounds_like": phonetic_only,
    }
```

## Testing Phonetic Matching

```python
# Search for "Smith" - should also find "Smyth" and "Smithe"
results = phonetic_search("Smith")
for r_item in results:
    print(f"  {r_item['name']}")

# Expected output:
# John Smith
# Jon Smyth
# Jonathan Smithe
```

```bash
# Test in redis-cli (phonetic matching is automatic on PHONETIC fields)
redis-cli FT.SEARCH idx:phonetic "Smith" LIMIT 0 10
redis-cli FT.SEARCH idx:phonetic "Johnson" LIMIT 0 10
```

## Supported Phonetic Matchers

```text
dm:en  - English double metaphone (recommended)
dm:fr  - French phonetic
dm:pt  - Portuguese phonetic
dm:es  - Spanish phonetic
```

## Monitoring

Use [OneUptime](https://oneuptime.com) to monitor your people directory or name search API to ensure phonetic queries perform within acceptable latency bounds.

## Summary

RediSearch phonetic matching requires only adding `phonetic_matcher="dm:en"` to a TextField definition - no external libraries needed. The double metaphone algorithm handles common English name variations including silent letters and spelling variants. Separating exact matches from phonetic-only matches in the response gives users clear context about why results were returned.
