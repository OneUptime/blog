# How to Implement Autocomplete with Redis

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Search, Autocomplete, Performance, Backend, Python, Node.js

Description: Build fast autocomplete functionality using Redis sorted sets and lexicographical ordering. Learn multiple approaches including prefix matching, scoring, and fuzzy search.

---

Autocomplete needs to be fast. Users expect suggestions within 100 milliseconds of typing. Redis excels at this because it keeps data in memory and provides data structures designed for sorted, ranked retrieval. This guide covers multiple approaches to building autocomplete with Redis.

## Basic Prefix Matching with Sorted Sets

The simplest autocomplete uses sorted sets with lexicographical ordering. Redis can return all members that fall within a lexicographical range using ZRANGEBYLEX.

```python
import redis

r = redis.Redis(host='localhost', port=6379, db=0)

def add_term(term):
    """
    Add a term to the autocomplete index.
    Score of 0 ensures lexicographical ordering.
    """
    # Store lowercase for case-insensitive matching
    term_lower = term.lower()
    r.zadd('autocomplete:terms', {term_lower: 0})

def search_prefix(prefix, limit=10):
    """
    Find all terms starting with the given prefix.
    Uses ZRANGEBYLEX for O(log(N)+M) performance.
    """
    prefix_lower = prefix.lower()

    # The range is [prefix, prefix + highest char)
    # \xff is the highest possible byte value
    start = f'[{prefix_lower}'
    end = f'[{prefix_lower}\xff'

    results = r.zrangebylex(
        'autocomplete:terms',
        start,
        end,
        start=0,
        num=limit
    )

    return [r.decode() for r in results]

# Build the index
terms = [
    'python', 'postgresql', 'pandas', 'pytest',
    'redis', 'react', 'ruby', 'rust',
    'javascript', 'java', 'json', 'jquery'
]

for term in terms:
    add_term(term)

# Search examples
print(search_prefix('py'))    # ['pandas', 'pytest', 'python']
print(search_prefix('r'))     # ['react', 'redis', 'ruby', 'rust']
print(search_prefix('java'))  # ['java', 'javascript']
```

## Weighted Autocomplete with Popularity Scores

Real autocomplete often ranks results by popularity or relevance. Use the sorted set score to weight results.

```python
import redis
import time

r = redis.Redis(host='localhost', port=6379, db=0)

class WeightedAutocomplete:
    def __init__(self, name):
        self.key = f'autocomplete:{name}'
        self.scores_key = f'autocomplete:{name}:scores'

    def add_term(self, term, score=1):
        """
        Add or update a term with its popularity score.
        Higher scores appear first in results.
        """
        term_lower = term.lower()
        r.zadd(self.scores_key, {term_lower: score})

    def increment_score(self, term, amount=1):
        """
        Increment score when a term is selected.
        This learns from user behavior.
        """
        term_lower = term.lower()
        r.zincrby(self.scores_key, amount, term_lower)

    def search(self, prefix, limit=10):
        """
        Search with prefix matching, ordered by score.
        Uses a temporary set for intersection.
        """
        prefix_lower = prefix.lower()

        # Get all terms matching the prefix
        # We need to check each term against the prefix
        # For large datasets, consider a trie structure

        # Get top scored terms
        all_terms = r.zrevrange(self.scores_key, 0, -1, withscores=True)

        matches = []
        for term, score in all_terms:
            term_str = term.decode() if isinstance(term, bytes) else term
            if term_str.startswith(prefix_lower):
                matches.append((term_str, score))
                if len(matches) >= limit:
                    break

        return matches

# Usage example
ac = WeightedAutocomplete('products')

# Add products with initial popularity scores
products = [
    ('iPhone 15', 1000),
    ('iPhone 14', 800),
    ('iPhone Case', 500),
    ('iPad Pro', 900),
    ('iPad Air', 700),
    ('AirPods Pro', 850),
    ('AirPods Max', 400),
]

for product, score in products:
    ac.add_term(product, score)

# Search returns results ordered by score
results = ac.search('iph')
for term, score in results:
    print(f'{term}: {score}')
# iPhone 15: 1000.0
# iPhone 14: 800.0
# iPhone Case: 500.0

# When user selects a result, boost its score
ac.increment_score('iPhone Case', 10)
```

## Multi-Word Autocomplete

For searching phrases or multi-word terms, index each word position:

```python
import redis

r = redis.Redis(host='localhost', port=6379, db=0)

class MultiWordAutocomplete:
    def __init__(self, name):
        self.name = name

    def add_phrase(self, phrase, data=None):
        """
        Index a phrase by each word for flexible matching.
        Stores the full phrase and optional metadata.
        """
        phrase_id = f'{self.name}:phrase:{phrase.lower()}'

        # Store the original phrase and metadata
        if data:
            r.hset(phrase_id, mapping={'phrase': phrase, **data})
        else:
            r.hset(phrase_id, 'phrase', phrase)

        # Index by each word
        words = phrase.lower().split()
        for i, word in enumerate(words):
            # Index full word
            key = f'{self.name}:word:{word}'
            r.sadd(key, phrase_id)

            # Index prefixes for partial matching
            for j in range(1, len(word) + 1):
                prefix = word[:j]
                prefix_key = f'{self.name}:prefix:{prefix}'
                r.sadd(prefix_key, phrase_id)

    def search(self, query, limit=10):
        """
        Search for phrases matching any word in the query.
        Returns phrases sorted by match quality.
        """
        words = query.lower().split()

        if not words:
            return []

        # Get phrase IDs matching each word prefix
        keys_to_union = []
        for word in words:
            keys_to_union.append(f'{self.name}:prefix:{word}')

        # Find all matching phrase IDs
        if len(keys_to_union) == 1:
            phrase_ids = r.smembers(keys_to_union[0])
        else:
            # Union finds phrases matching ANY word
            phrase_ids = r.sunion(keys_to_union)

        # Retrieve and score results
        results = []
        for phrase_id in phrase_ids:
            phrase_data = r.hgetall(phrase_id)
            if phrase_data:
                phrase = phrase_data.get(b'phrase', b'').decode()

                # Simple scoring: count matching words
                phrase_words = set(phrase.lower().split())
                query_words = set(words)
                score = len(phrase_words & query_words)

                results.append((phrase, score, phrase_data))

        # Sort by score descending
        results.sort(key=lambda x: x[1], reverse=True)

        return results[:limit]

# Usage
ac = MultiWordAutocomplete('movies')

movies = [
    ('The Dark Knight', {'year': '2008', 'genre': 'action'}),
    ('The Dark Knight Rises', {'year': '2012', 'genre': 'action'}),
    ('Dark Shadows', {'year': '2012', 'genre': 'comedy'}),
    ('Knight and Day', {'year': '2010', 'genre': 'action'}),
]

for title, data in movies:
    ac.add_phrase(title, data)

# Search by partial words
results = ac.search('dark')
for phrase, score, data in results:
    print(f'{phrase} ({data.get(b"year", b"").decode()})')
```

## Real-Time Autocomplete with Node.js

Here is a complete autocomplete API using Node.js and Express:

```javascript
const express = require('express');
const Redis = require('ioredis');

const app = express();
const redis = new Redis();

// Add term to autocomplete index
async function addTerm(namespace, term, score = 0) {
    const termLower = term.toLowerCase();

    // Add to main sorted set with score
    await redis.zadd(`autocomplete:${namespace}:scored`, score, termLower);

    // Add all prefixes for fast lookup
    for (let i = 1; i <= termLower.length; i++) {
        const prefix = termLower.substring(0, i);
        await redis.zadd(`autocomplete:${namespace}:prefix:${prefix}`, score, termLower);
    }

    // Store original case version
    await redis.hset(`autocomplete:${namespace}:original`, termLower, term);
}

// Search with prefix
async function searchPrefix(namespace, prefix, limit = 10) {
    const prefixLower = prefix.toLowerCase();
    const key = `autocomplete:${namespace}:prefix:${prefixLower}`;

    // Get top scored matches for this prefix
    const matches = await redis.zrevrange(key, 0, limit - 1);

    // Get original case versions
    if (matches.length > 0) {
        const originals = await redis.hmget(
            `autocomplete:${namespace}:original`,
            ...matches
        );
        return originals.filter(Boolean);
    }

    return [];
}

// Boost term score when selected
async function boostTerm(namespace, term, amount = 1) {
    const termLower = term.toLowerCase();

    // Increment in main set
    await redis.zincrby(`autocomplete:${namespace}:scored`, amount, termLower);

    // Increment in all prefix sets
    for (let i = 1; i <= termLower.length; i++) {
        const prefix = termLower.substring(0, i);
        await redis.zincrby(
            `autocomplete:${namespace}:prefix:${prefix}`,
            amount,
            termLower
        );
    }
}

// API endpoints
app.get('/autocomplete/:namespace', async (req, res) => {
    const { namespace } = req.params;
    const { q, limit = 10 } = req.query;

    if (!q || q.length < 1) {
        return res.json([]);
    }

    const results = await searchPrefix(namespace, q, parseInt(limit));
    res.json(results);
});

app.post('/autocomplete/:namespace/select', express.json(), async (req, res) => {
    const { namespace } = req.params;
    const { term } = req.body;

    // Boost selected term for learning
    await boostTerm(namespace, term, 1);
    res.json({ success: true });
});

// Initialize with sample data
async function initializeSampleData() {
    const cities = [
        'New York', 'Los Angeles', 'Chicago', 'Houston', 'Phoenix',
        'Philadelphia', 'San Antonio', 'San Diego', 'Dallas', 'San Jose',
        'Austin', 'Jacksonville', 'Fort Worth', 'Columbus', 'Charlotte'
    ];

    for (const city of cities) {
        await addTerm('cities', city, Math.floor(Math.random() * 100));
    }

    console.log('Sample data initialized');
}

app.listen(3000, async () => {
    await initializeSampleData();
    console.log('Autocomplete API running on port 3000');
});
```

## Performance Optimization

For high-traffic autocomplete, optimize with these techniques:

```python
import redis

r = redis.Redis(host='localhost', port=6379, db=0)

# 1. Limit prefix index depth
# Only index prefixes up to a certain length
MAX_PREFIX_LENGTH = 5

def add_term_optimized(term, score=0):
    term_lower = term.lower()

    # Only index prefixes up to MAX_PREFIX_LENGTH
    for i in range(1, min(len(term_lower), MAX_PREFIX_LENGTH) + 1):
        prefix = term_lower[:i]
        r.zadd(f'ac:prefix:{prefix}', {term_lower: score})

    # Store full term separately
    r.hset('ac:terms', term_lower, term)

# 2. Use connection pooling
pool = redis.ConnectionPool(
    host='localhost',
    port=6379,
    db=0,
    max_connections=50
)
r = redis.Redis(connection_pool=pool)

# 3. Pipeline multiple operations
def bulk_add_terms(terms_with_scores):
    pipe = r.pipeline()

    for term, score in terms_with_scores:
        term_lower = term.lower()
        for i in range(1, min(len(term_lower), 5) + 1):
            prefix = term_lower[:i]
            pipe.zadd(f'ac:prefix:{prefix}', {term_lower: score})
        pipe.hset('ac:terms', term_lower, term)

    pipe.execute()

# 4. Set TTL for time-sensitive autocomplete
def add_trending_term(term, score, ttl=3600):
    """Add term that expires after TTL seconds"""
    term_lower = term.lower()
    key = f'ac:trending:{term_lower[:2]}'

    pipe = r.pipeline()
    pipe.zadd(key, {term_lower: score})
    pipe.expire(key, ttl)
    pipe.execute()
```

## Summary

Redis provides multiple approaches for autocomplete:

| Approach | Best For | Complexity |
|----------|----------|------------|
| ZRANGEBYLEX | Simple prefix matching | Low |
| Scored sorted sets | Popularity ranking | Medium |
| Prefix indexing | High performance | Medium |
| Multi-word indexing | Phrase search | High |

Key implementation tips:
- Use sorted sets with score 0 for pure lexicographical ordering
- Use scores for popularity-based ranking
- Index prefixes for O(1) lookup instead of scanning
- Pipeline bulk operations for better throughput
- Set reasonable limits on prefix index depth
- Learn from user selections by boosting scores

With these patterns, you can build autocomplete that returns results in single-digit milliseconds, even with millions of terms.
