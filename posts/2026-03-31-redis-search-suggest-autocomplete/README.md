# How to Use Redis for Search Suggest and Autocomplete

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Autocomplete, Search

Description: Learn how to build fast autocomplete and search suggest features using Redis Sorted Sets, covering prefix matching, ranking by popularity, and result caching.

---

Redis Sorted Sets make an excellent foundation for autocomplete because they support lexicographic range queries (`ZRANGEBYLEX`) and score-based ranking in a single data structure - all at sub-millisecond latency.

## Approach 1: Prefix Indexing with Sorted Sets

Store all prefixes of each term as members of a sorted set. Every member must have the same score (0) because `ZRANGEBYLEX` only produces correct results when all scores are identical. Popularity scores are stored in a separate hash:

```python
import redis

client = redis.Redis(host="localhost", port=6379, decode_responses=True)

def add_term(index_key: str, term: str, score: float = 1.0):
    """Add a term and all its prefixes to the autocomplete index."""
    term = term.lower()
    pipe = client.pipeline()
    # Add each prefix with score 0 (no suffix marker)
    for i in range(1, len(term)):
        pipe.zadd(index_key, {term[:i]: 0})
    # Full term with * suffix marker, also score 0 for ZRANGEBYLEX
    pipe.zadd(index_key, {term + "*": 0})
    # Store popularity score in a separate hash
    pipe.hset(index_key + ":scores", term, score)
    pipe.execute()

def autocomplete(index_key: str, prefix: str, limit: int = 10) -> list:
    """Return completions for the given prefix, sorted by score."""
    prefix = prefix.lower()
    # Get all terms starting with prefix
    candidates = client.zrangebylex(
        index_key,
        f"[{prefix}",
        f"[{prefix}\xff",
    )
    # Filter to full terms (ending with *) and strip the marker
    completions = [c[:-1] for c in candidates if c.endswith("*")]

    # Get scores from the separate hash and sort by popularity
    if completions:
        pipe = client.pipeline()
        for c in completions:
            pipe.hget(index_key + ":scores", c)
        scores = pipe.execute()
        scored = [(c, float(s) if s else 0) for c, s in zip(completions, scores)]
        scored.sort(key=lambda x: -x[1])
        return [c for c, _ in scored[:limit]]
    return []
```

## Approach 2: Using RediSearch FT.SUGADD

RediSearch has a dedicated suggestion engine:

```bash
# Add suggestions with weights
FT.SUGADD suggest "apple iphone" 100
FT.SUGADD suggest "apple watch" 80
FT.SUGADD suggest "apple macbook" 90

# Get completions
FT.SUGGET suggest "apple" FUZZY WITHSCORES MAX 5
```

```python
# Python with redis-py
client.execute_command("FT.SUGADD", "suggest", "apple iphone", 100)
client.execute_command("FT.SUGADD", "suggest", "apple watch", 80)

results = client.execute_command("FT.SUGGET", "suggest", "apple", "MAX", 5)
```

## Cache Search Suggest Results

For high-traffic autocomplete, cache the results per prefix:

```python
import json

def cached_autocomplete(
    index_key: str,
    prefix: str,
    limit: int = 10,
    ttl: int = 60,
) -> list:
    cache_key = f"ac:cache:{index_key}:{prefix.lower()}"

    cached = client.get(cache_key)
    if cached:
        return json.loads(cached)

    results = autocomplete(index_key, prefix, limit)
    client.set(cache_key, json.dumps(results), ex=ttl)
    return results
```

## Increment Scores Based on User Selection

Boost terms that users actually click:

```python
def record_selection(index_key: str, selected_term: str):
    """Increase score when user selects a suggestion."""
    term = selected_term.lower()
    # Increment score by 1 in the separate scores hash
    client.hincrbyfloat(index_key + ":scores", term, 1)
    # Also invalidate cached completions for this prefix
    for i in range(1, len(term) + 1):
        cache_key = f"ac:cache:{index_key}:{term[:i]}"
        client.delete(cache_key)
```

## Summary

Redis autocomplete works best with sorted sets using lexicographic prefix indexing for simple use cases, or RediSearch `FT.SUGADD`/`FT.SUGGET` for more advanced fuzzy matching and relevance. Cache suggestion results per prefix with short TTLs to handle high-frequency typing events efficiently, and increment term scores on user selection to continuously improve suggestion ranking.
