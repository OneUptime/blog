# How to Implement a Trie (Prefix Tree) with Redis

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Trie, Autocomplete

Description: Build a prefix tree (trie) in Redis using sorted sets and hashes to power fast autocomplete, prefix search, and word completion features.

---

A trie enables instant prefix lookups - the foundation of autocomplete. Rather than scanning a list, you traverse a tree where each edge represents a character. In Redis, you can represent the trie using sorted sets for efficient prefix range queries.

## Approach: Sorted Set Lexicographic Range

Redis supports lexicographic range queries on sorted sets (all members with score 0 sorted alphabetically). This makes ZRANGEBYLEX the perfect tool for prefix searches:

```python
import redis

r = redis.Redis(host='localhost', port=6379, decode_responses=True)

TRIE_KEY = "trie:words"

def trie_insert(word: str, metadata: dict = None):
    """Insert a word into the trie."""
    # Add the full word with score 0
    r.zadd(TRIE_KEY, {word: 0})
    # Store optional metadata
    if metadata:
        r.hset(f"trie:meta:{word}", mapping=metadata)

def trie_search(prefix: str, limit: int = 10) -> list:
    """Return up to `limit` words starting with `prefix`."""
    # Lexicographic range: [prefix, prefix + \xff] captures all words starting with prefix
    results = r.zrangebylex(TRIE_KEY, f"[{prefix}", f"[{prefix}\xff", start=0, num=limit)
    return results

def trie_delete(word: str):
    r.zrem(TRIE_KEY, word)
    r.delete(f"trie:meta:{word}")
```

## Autocomplete with Scoring

For scored autocomplete (e.g., most searched terms first), use a separate sorted set with popularity scores alongside the lexicographic trie:

```python
AUTOCOMPLETE_KEY = "autocomplete:popular"

def record_search(query: str):
    """Increment search count for a term."""
    r.zincrby(AUTOCOMPLETE_KEY, 1, query.lower())
    r.zadd(TRIE_KEY, {query.lower(): 0})

def autocomplete(prefix: str, limit: int = 5) -> list:
    """Return top completions by popularity."""
    # Get all words with this prefix
    candidates = trie_search(prefix.lower(), limit=50)
    if not candidates:
        return []

    # Score each candidate from the popularity set
    pipe = r.pipeline(transaction=False)
    for word in candidates:
        pipe.zscore(AUTOCOMPLETE_KEY, word)
    scores = pipe.execute()

    # Sort by score descending, return top N
    scored = sorted(
        zip(candidates, [s or 0 for s in scores]),
        key=lambda x: x[1],
        reverse=True
    )
    return [w for w, _ in scored[:limit]]
```

## Bulk Insert

Load a dictionary into the trie efficiently:

```python
def bulk_insert(words: list[str], batch_size: int = 1000):
    for i in range(0, len(words), batch_size):
        batch = words[i:i + batch_size]
        pipe = r.pipeline(transaction=False)
        for word in batch:
            pipe.zadd(TRIE_KEY, {word.lower(): 0})
        pipe.execute()
```

## Prefix Count

Count how many words share a given prefix:

```python
def prefix_count(prefix: str) -> int:
    return len(r.zrangebylex(TRIE_KEY, f"[{prefix}", f"[{prefix}\xff"))
```

## Retrieving Word Metadata

```python
def get_word_metadata(word: str) -> dict:
    return r.hgetall(f"trie:meta:{word}")
```

## Delete by Prefix

Remove all words that start with a prefix (e.g., purge deprecated terms):

```python
def delete_by_prefix(prefix: str) -> int:
    words = trie_search(prefix, limit=10000)
    if not words:
        return 0
    pipe = r.pipeline(transaction=False)
    for word in words:
        pipe.zrem(TRIE_KEY, word)
        pipe.delete(f"trie:meta:{word}")
    pipe.execute()
    return len(words)
```

## Summary

Redis ZRANGEBYLEX turns a sorted set into a high-performance prefix search structure. Pairing it with a popularity-scored sorted set gives you autocomplete that returns the most relevant results first. This approach handles millions of words with sub-millisecond query times and no external search engine required.
