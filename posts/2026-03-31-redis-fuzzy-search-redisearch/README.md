# How to Implement Fuzzy Search with RediSearch

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, RediSearch, Fuzzy Search, Typo Tolerance, Search

Description: Add typo-tolerant fuzzy search to your application using RediSearch's built-in Levenshtein distance matching.

---

Users make typos. A search for "headphnes" should still find headphones. RediSearch supports fuzzy matching using Levenshtein distance - one percent sign (`%`) per allowed edit distance - requiring no additional libraries or algorithms.

## Setting Up the Search Index

```python
import redis
from redis.commands.search.field import TextField, TagField, NumericField
from redis.commands.search.indexDefinition import IndexDefinition, IndexType

r = redis.Redis(host='localhost', port=6379, decode_responses=True)

def create_search_index():
    schema = (
        TextField("$.name", as_name="name", weight=5.0),
        TextField("$.description", as_name="description"),
        TagField("$.category", as_name="category"),
        NumericField("$.price", as_name="price"),
    )
    r.ft("idx:fuzzy").create_index(
        schema,
        definition=IndexDefinition(prefix=["item:"], index_type=IndexType.JSON),
    )
```

## Fuzzy Query Syntax

RediSearch uses `%term%` for Levenshtein distance 1, `%%term%%` for distance 2:

```python
from redis.commands.search.query import Query
import json

def fuzzy_search(term: str, edit_distance: int = 1, limit: int = 10) -> list:
    pct = "%" * edit_distance
    fuzzy_term = f"{pct}{term}{pct}"

    query = Query(fuzzy_term).paging(0, limit)
    results = r.ft("idx:fuzzy").search(query)

    return [
        {"id": doc.id, "score": doc.score, **json.loads(doc.json)}
        for doc in results.docs
    ]
```

## Multi-Term Fuzzy Search

```python
def multi_term_fuzzy_search(query_text: str,
                             edit_distance: int = 1) -> list:
    terms = query_text.strip().split()
    pct = "%" * edit_distance

    # Wrap each term in fuzzy markers
    fuzzy_terms = " ".join(f"{pct}{t}{pct}" for t in terms)
    results = r.ft("idx:fuzzy").search(Query(fuzzy_terms).paging(0, 20))
    return [json.loads(doc.json) for doc in results.docs]
```

## Combining Exact and Fuzzy Matches

Return exact matches first, then fuzzy fallbacks:

```python
def smart_search(query_text: str, limit: int = 10) -> list:
    # Try exact search first
    exact_results = r.ft("idx:fuzzy").search(
        Query(query_text).paging(0, limit)
    )

    if exact_results.total >= 3:
        return [json.loads(doc.json) for doc in exact_results.docs]

    # Fall back to fuzzy
    terms = query_text.split()
    fuzzy_terms = " ".join(f"%{t}%" for t in terms)
    fuzzy_results = r.ft("idx:fuzzy").search(
        Query(fuzzy_terms).paging(0, limit)
    )
    return [json.loads(doc.json) for doc in fuzzy_results.docs]
```

## Testing Typo Tolerance

```python
# Index a sample item
r.json().set("item:001", "$", {
    "name": "Bluetooth Headphones",
    "description": "Wireless over-ear with noise cancellation",
    "category": "audio",
    "price": 89.99,
})

# These all return the headphones item:
print(fuzzy_search("headphnes"))   # missing 'o'
print(fuzzy_search("bluethooth"))  # extra 'h'
print(fuzzy_search("headphone"))   # missing 's'
```

```bash
# Test in redis-cli
redis-cli FT.SEARCH idx:fuzzy "%headphnes%" LIMIT 0 5
redis-cli FT.SEARCH idx:fuzzy "%%bluethooth%%" LIMIT 0 5
```

## Performance Notes

```text
Edit distance 1: ~2-3x slower than exact search
Edit distance 2: ~5-10x slower - avoid on large indexes
Recommendation: Use distance 1 for most cases
```

## Monitoring

Use [OneUptime](https://oneuptime.com) to track the latency of fuzzy vs exact search queries, ensuring typo-tolerant queries don't exceed your latency budget.

## Summary

RediSearch fuzzy matching uses the `%term%` syntax to find terms within Levenshtein edit distance 1 or 2 without any additional configuration. A smart search strategy tries exact matches first and falls back to fuzzy only when results are sparse, balancing relevance and performance. Edit distance 2 should be reserved for short queries where users are more likely to have multiple typos.
