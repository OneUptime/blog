# How to Implement Autocomplete with Redis

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Autocomplete, Search, Type-ahead, Suggestions, User Experience

Description: A comprehensive guide to implementing autocomplete and type-ahead search functionality with Redis, covering prefix matching, weighted suggestions, fuzzy search, and performance optimization techniques.

---

Autocomplete is a ubiquitous feature in modern applications, from search boxes to form inputs. Redis, with its in-memory data structures and sub-millisecond latency, is perfectly suited for building high-performance autocomplete systems. In this guide, we will explore multiple approaches to implementing autocomplete with Redis.

## Why Redis for Autocomplete?

Redis excels at autocomplete because of:

- **Sub-millisecond latency**: Users expect instant suggestions
- **In-memory storage**: Eliminates disk I/O for maximum speed
- **Sorted Sets**: Perfect for weighted suggestions
- **Built-in autocomplete**: RediSearch includes a suggestion feature
- **Scalability**: Handles millions of suggestions efficiently

## Approach 1: Using Sorted Sets

The most common approach uses Redis Sorted Sets to store suggestions with scores representing relevance or popularity.

### Basic Implementation

```bash
# Add suggestions with scores (higher = more popular)
ZADD autocomplete:products 100 "iphone"
ZADD autocomplete:products 95 "iphone 15"
ZADD autocomplete:products 90 "iphone 15 pro"
ZADD autocomplete:products 85 "iphone 15 pro max"
ZADD autocomplete:products 80 "iphone case"
ZADD autocomplete:products 75 "ipad"
ZADD autocomplete:products 70 "ipad pro"
ZADD autocomplete:products 50 "ipod"
```

### Lexicographic Prefix Matching

For prefix matching, use ZRANGEBYLEX:

```bash
# All items starting with "iphone"
ZRANGEBYLEX autocomplete:products "[iphone" "[iphone\xff" LIMIT 0 10

# All items starting with "ip"
ZRANGEBYLEX autocomplete:products "[ip" "[ip\xff" LIMIT 0 10
```

### Python Implementation

```python
import redis
from typing import List, Tuple

class RedisAutocomplete:
    def __init__(self, host='localhost', port=6379, prefix='autocomplete'):
        self.redis = redis.Redis(host=host, port=port, decode_responses=True)
        self.prefix = prefix

    def add_suggestion(self, category: str, text: str, score: float = 1.0):
        """Add a suggestion with a score."""
        key = f"{self.prefix}:{category}"
        # Store normalized (lowercase) version for matching
        normalized = text.lower()
        # Store both the normalized key and original text
        self.redis.zadd(key, {normalized: score})
        # Store original text mapping
        self.redis.hset(f"{self.prefix}:original:{category}", normalized, text)

    def add_suggestions_bulk(self, category: str, suggestions: List[Tuple[str, float]]):
        """Add multiple suggestions at once."""
        key = f"{self.prefix}:{category}"
        mapping = {text.lower(): score for text, score in suggestions}
        self.redis.zadd(key, mapping)

        # Store original texts
        originals = {text.lower(): text for text, _ in suggestions}
        self.redis.hset(f"{self.prefix}:original:{category}", mapping=originals)

    def get_suggestions(self, category: str, prefix: str, limit: int = 10) -> List[str]:
        """Get suggestions matching a prefix, sorted by score."""
        key = f"{self.prefix}:{category}"
        normalized_prefix = prefix.lower()

        # Get matching items using lexicographic range
        matches = self.redis.zrangebylex(
            key,
            f"[{normalized_prefix}",
            f"[{normalized_prefix}\xff",
            start=0,
            num=limit * 2  # Get more to account for score sorting
        )

        if not matches:
            return []

        # Get scores for matches
        scored_matches = []
        for match in matches:
            score = self.redis.zscore(key, match)
            scored_matches.append((match, score))

        # Sort by score (descending) and limit
        scored_matches.sort(key=lambda x: x[1], reverse=True)
        top_matches = scored_matches[:limit]

        # Get original text (preserving case)
        original_key = f"{self.prefix}:original:{category}"
        results = []
        for match, _ in top_matches:
            original = self.redis.hget(original_key, match)
            results.append(original if original else match)

        return results

    def increment_score(self, category: str, text: str, increment: float = 1.0):
        """Increase the score of a suggestion (e.g., when selected)."""
        key = f"{self.prefix}:{category}"
        self.redis.zincrby(key, increment, text.lower())

    def remove_suggestion(self, category: str, text: str):
        """Remove a suggestion."""
        key = f"{self.prefix}:{category}"
        self.redis.zrem(key, text.lower())
        self.redis.hdel(f"{self.prefix}:original:{category}", text.lower())

    def clear_category(self, category: str):
        """Remove all suggestions in a category."""
        self.redis.delete(f"{self.prefix}:{category}")
        self.redis.delete(f"{self.prefix}:original:{category}")


# Usage example
autocomplete = RedisAutocomplete()

# Add product suggestions
products = [
    ("iPhone 15 Pro Max", 100),
    ("iPhone 15 Pro", 95),
    ("iPhone 15", 90),
    ("iPhone 14", 70),
    ("iPhone Case", 60),
    ("iPad Pro", 85),
    ("iPad Air", 80),
    ("iPad Mini", 75),
    ("iPod Classic", 30),
    ("AirPods Pro", 88),
    ("AirPods Max", 82),
    ("Apple Watch", 90),
]

autocomplete.add_suggestions_bulk("products", products)

# Get suggestions
print("Suggestions for 'ip':")
for suggestion in autocomplete.get_suggestions("products", "ip"):
    print(f"  - {suggestion}")

print("\nSuggestions for 'iphone':")
for suggestion in autocomplete.get_suggestions("products", "iphone"):
    print(f"  - {suggestion}")

print("\nSuggestions for 'air':")
for suggestion in autocomplete.get_suggestions("products", "air"):
    print(f"  - {suggestion}")
```

### Node.js Implementation

```javascript
const redis = require('redis');

class RedisAutocomplete {
    constructor(options = {}) {
        this.prefix = options.prefix || 'autocomplete';
        this.client = redis.createClient(options);
    }

    async connect() {
        await this.client.connect();
    }

    async addSuggestion(category, text, score = 1.0) {
        const key = `${this.prefix}:${category}`;
        const normalized = text.toLowerCase();

        await this.client.zAdd(key, { score, value: normalized });
        await this.client.hSet(
            `${this.prefix}:original:${category}`,
            normalized,
            text
        );
    }

    async addSuggestionsBulk(category, suggestions) {
        const key = `${this.prefix}:${category}`;
        const members = suggestions.map(([text, score]) => ({
            score,
            value: text.toLowerCase()
        }));

        await this.client.zAdd(key, members);

        const originals = {};
        suggestions.forEach(([text]) => {
            originals[text.toLowerCase()] = text;
        });
        await this.client.hSet(
            `${this.prefix}:original:${category}`,
            originals
        );
    }

    async getSuggestions(category, prefix, limit = 10) {
        const key = `${this.prefix}:${category}`;
        const normalizedPrefix = prefix.toLowerCase();

        // Get matches using lexicographic range
        const matches = await this.client.zRangeByLex(
            key,
            `[${normalizedPrefix}`,
            `[${normalizedPrefix}\xff`,
            { LIMIT: { offset: 0, count: limit * 2 } }
        );

        if (!matches.length) return [];

        // Get scores for sorting
        const scored = await Promise.all(
            matches.map(async (match) => {
                const score = await this.client.zScore(key, match);
                return { match, score };
            })
        );

        // Sort by score descending and limit
        scored.sort((a, b) => b.score - a.score);
        const topMatches = scored.slice(0, limit);

        // Get original text
        const originalKey = `${this.prefix}:original:${category}`;
        const results = await Promise.all(
            topMatches.map(async ({ match }) => {
                const original = await this.client.hGet(originalKey, match);
                return original || match;
            })
        );

        return results;
    }

    async incrementScore(category, text, increment = 1.0) {
        const key = `${this.prefix}:${category}`;
        await this.client.zIncrBy(key, increment, text.toLowerCase());
    }

    async disconnect() {
        await this.client.quit();
    }
}

// Usage
async function main() {
    const autocomplete = new RedisAutocomplete();
    await autocomplete.connect();

    // Add suggestions
    const products = [
        ['iPhone 15 Pro Max', 100],
        ['iPhone 15 Pro', 95],
        ['iPhone 15', 90],
        ['iPad Pro', 85],
        ['AirPods Pro', 88],
        ['Apple Watch', 90],
    ];

    await autocomplete.addSuggestionsBulk('products', products);

    // Get suggestions
    console.log('Suggestions for "ip":');
    const suggestions = await autocomplete.getSuggestions('products', 'ip');
    suggestions.forEach(s => console.log(`  - ${s}`));

    await autocomplete.disconnect();
}

main().catch(console.error);
```

## Approach 2: Using RediSearch Suggestions

RediSearch includes a built-in autocomplete feature optimized for suggestions.

### Adding Suggestions

```bash
# Add suggestions with optional payload
FT.SUGADD autocomplete:search "iPhone 15 Pro Max" 100
FT.SUGADD autocomplete:search "iPhone 15 Pro" 95
FT.SUGADD autocomplete:search "iPhone 15" 90
FT.SUGADD autocomplete:search "iPad Pro" 85
FT.SUGADD autocomplete:search "AirPods Pro" 88

# Add with payload (additional data)
FT.SUGADD autocomplete:search "MacBook Pro" 92 PAYLOAD '{"category": "laptops", "id": "mbp-2024"}'
```

### Getting Suggestions

```bash
# Basic suggestions
FT.SUGGET autocomplete:search "ip" MAX 5

# With fuzzy matching (allow typos)
FT.SUGGET autocomplete:search "iphon" FUZZY MAX 5

# With scores
FT.SUGGET autocomplete:search "ip" WITHSCORES MAX 5

# With payloads
FT.SUGGET autocomplete:search "mac" WITHPAYLOADS MAX 5
```

### Python with RediSearch Suggestions

```python
import redis
import json

class RediSearchAutocomplete:
    def __init__(self, host='localhost', port=6379):
        self.redis = redis.Redis(host=host, port=port, decode_responses=True)

    def add_suggestion(self, dictionary: str, text: str, score: float = 1.0, payload: dict = None):
        """Add a suggestion to the autocomplete dictionary."""
        args = [dictionary, text, score]
        if payload:
            args.extend(['PAYLOAD', json.dumps(payload)])
        self.redis.execute_command('FT.SUGADD', *args)

    def get_suggestions(self, dictionary: str, prefix: str, max_results: int = 10,
                        fuzzy: bool = False, with_scores: bool = False,
                        with_payloads: bool = False):
        """Get autocomplete suggestions."""
        args = [dictionary, prefix]

        if fuzzy:
            args.append('FUZZY')
        if with_scores:
            args.append('WITHSCORES')
        if with_payloads:
            args.append('WITHPAYLOADS')

        args.extend(['MAX', max_results])

        result = self.redis.execute_command('FT.SUGGET', *args)

        if not result:
            return []

        if with_scores and with_payloads:
            # Result format: [text, score, payload, text, score, payload, ...]
            suggestions = []
            for i in range(0, len(result), 3):
                suggestions.append({
                    'text': result[i],
                    'score': float(result[i + 1]),
                    'payload': json.loads(result[i + 2]) if result[i + 2] else None
                })
            return suggestions
        elif with_scores:
            # Result format: [text, score, text, score, ...]
            suggestions = []
            for i in range(0, len(result), 2):
                suggestions.append({
                    'text': result[i],
                    'score': float(result[i + 1])
                })
            return suggestions
        elif with_payloads:
            # Result format: [text, payload, text, payload, ...]
            suggestions = []
            for i in range(0, len(result), 2):
                suggestions.append({
                    'text': result[i],
                    'payload': json.loads(result[i + 1]) if result[i + 1] else None
                })
            return suggestions
        else:
            return result

    def delete_suggestion(self, dictionary: str, text: str):
        """Delete a suggestion."""
        self.redis.execute_command('FT.SUGDEL', dictionary, text)

    def get_dictionary_size(self, dictionary: str):
        """Get the number of suggestions in the dictionary."""
        return self.redis.execute_command('FT.SUGLEN', dictionary)


# Usage
autocomplete = RediSearchAutocomplete()

# Add suggestions with metadata
products = [
    ("iPhone 15 Pro Max", 100, {"id": "iphone-15-pro-max", "category": "phones"}),
    ("iPhone 15 Pro", 95, {"id": "iphone-15-pro", "category": "phones"}),
    ("iPad Pro 12.9", 90, {"id": "ipad-pro-12", "category": "tablets"}),
    ("MacBook Pro 16", 92, {"id": "macbook-pro-16", "category": "laptops"}),
    ("AirPods Pro 2", 88, {"id": "airpods-pro-2", "category": "audio"}),
]

for text, score, payload in products:
    autocomplete.add_suggestion("products", text, score, payload)

# Get suggestions
print("Suggestions for 'ip':")
for s in autocomplete.get_suggestions("products", "ip", with_scores=True):
    print(f"  - {s['text']} (score: {s['score']})")

# Fuzzy search (handles typos)
print("\nFuzzy suggestions for 'iphon' (typo):")
for s in autocomplete.get_suggestions("products", "iphon", fuzzy=True):
    print(f"  - {s}")

# Get with payloads
print("\nSuggestions with payloads for 'mac':")
for s in autocomplete.get_suggestions("products", "mac", with_payloads=True):
    print(f"  - {s['text']}: {s['payload']}")
```

## Approach 3: Trie-Based Autocomplete with Sorted Sets

For more advanced prefix matching, we can build a trie structure using Redis:

```python
import redis
from typing import List, Set

class TrieAutocomplete:
    def __init__(self, host='localhost', port=6379, prefix='trie'):
        self.redis = redis.Redis(host=host, port=port, decode_responses=True)
        self.prefix = prefix

    def add_word(self, category: str, word: str, score: float = 1.0):
        """Add a word with all its prefixes to enable prefix matching."""
        word_lower = word.lower()

        # Store the complete word with score
        self.redis.zadd(f"{self.prefix}:{category}:words", {word_lower: score})
        self.redis.hset(f"{self.prefix}:{category}:original", word_lower, word)

        # Store all prefixes
        for i in range(1, len(word_lower) + 1):
            prefix = word_lower[:i]
            self.redis.sadd(f"{self.prefix}:{category}:prefix:{prefix}", word_lower)

    def get_suggestions(self, category: str, prefix: str, limit: int = 10) -> List[str]:
        """Get suggestions for a prefix."""
        prefix_lower = prefix.lower()
        prefix_key = f"{self.prefix}:{category}:prefix:{prefix_lower}"

        # Get all words matching this prefix
        matches = self.redis.smembers(prefix_key)

        if not matches:
            return []

        # Get scores for all matches
        words_key = f"{self.prefix}:{category}:words"
        scored_matches = []
        for word in matches:
            score = self.redis.zscore(words_key, word)
            if score:
                scored_matches.append((word, score))

        # Sort by score and limit
        scored_matches.sort(key=lambda x: x[1], reverse=True)
        top_words = [word for word, _ in scored_matches[:limit]]

        # Get original casing
        original_key = f"{self.prefix}:{category}:original"
        results = []
        for word in top_words:
            original = self.redis.hget(original_key, word)
            results.append(original if original else word)

        return results

    def remove_word(self, category: str, word: str):
        """Remove a word and clean up prefixes."""
        word_lower = word.lower()

        # Remove from words set
        self.redis.zrem(f"{self.prefix}:{category}:words", word_lower)
        self.redis.hdel(f"{self.prefix}:{category}:original", word_lower)

        # Remove from prefix sets
        for i in range(1, len(word_lower) + 1):
            prefix = word_lower[:i]
            self.redis.srem(f"{self.prefix}:{category}:prefix:{prefix}", word_lower)


# Usage
trie = TrieAutocomplete()

# Add words
words = [
    ("San Francisco", 100),
    ("San Diego", 90),
    ("San Jose", 85),
    ("Santa Monica", 80),
    ("Santa Barbara", 75),
    ("Seattle", 95),
    ("Sacramento", 70),
]

for word, score in words:
    trie.add_word("cities", word, score)

# Get suggestions
print("Suggestions for 'san':")
for city in trie.get_suggestions("cities", "san"):
    print(f"  - {city}")

print("\nSuggestions for 'santa':")
for city in trie.get_suggestions("cities", "santa"):
    print(f"  - {city}")

print("\nSuggestions for 'sa':")
for city in trie.get_suggestions("cities", "sa"):
    print(f"  - {city}")
```

## Building a Complete Autocomplete API

Here's a complete Flask API for autocomplete:

```python
from flask import Flask, request, jsonify
import redis
import json

app = Flask(__name__)

class AutocompleteService:
    def __init__(self):
        self.redis = redis.Redis(host='localhost', port=6379, decode_responses=True)
        self.default_limit = 10

    def add_item(self, category: str, text: str, score: float = 1.0, metadata: dict = None):
        """Add an item to the autocomplete index."""
        normalized = text.lower()
        key = f"autocomplete:{category}"

        # Add to sorted set
        self.redis.zadd(key, {normalized: score})

        # Store original and metadata
        item_data = {"original": text, "metadata": metadata or {}}
        self.redis.hset(f"autocomplete:data:{category}", normalized, json.dumps(item_data))

    def search(self, category: str, query: str, limit: int = None):
        """Search for matching items."""
        limit = limit or self.default_limit
        normalized = query.lower()
        key = f"autocomplete:{category}"

        # Get matches
        matches = self.redis.zrangebylex(
            key,
            f"[{normalized}",
            f"[{normalized}\xff",
            start=0,
            num=limit * 2
        )

        if not matches:
            return []

        # Get scores and sort
        scored = []
        for match in matches:
            score = self.redis.zscore(key, match)
            scored.append((match, score))

        scored.sort(key=lambda x: x[1], reverse=True)

        # Get data for top matches
        results = []
        data_key = f"autocomplete:data:{category}"
        for match, score in scored[:limit]:
            data = self.redis.hget(data_key, match)
            if data:
                item = json.loads(data)
                results.append({
                    "text": item["original"],
                    "score": score,
                    "metadata": item["metadata"]
                })

        return results

    def record_selection(self, category: str, text: str, boost: float = 1.0):
        """Boost an item's score when selected by a user."""
        normalized = text.lower()
        key = f"autocomplete:{category}"
        self.redis.zincrby(key, boost, normalized)


autocomplete = AutocompleteService()


@app.route('/api/autocomplete/<category>', methods=['GET'])
def get_suggestions(category):
    """Get autocomplete suggestions."""
    query = request.args.get('q', '')
    limit = request.args.get('limit', 10, type=int)

    if not query:
        return jsonify({"error": "Query parameter 'q' is required"}), 400

    if len(query) < 1:
        return jsonify({"suggestions": []})

    suggestions = autocomplete.search(category, query, limit)
    return jsonify({"suggestions": suggestions})


@app.route('/api/autocomplete/<category>', methods=['POST'])
def add_suggestion(category):
    """Add a new suggestion."""
    data = request.json
    text = data.get('text')
    score = data.get('score', 1.0)
    metadata = data.get('metadata', {})

    if not text:
        return jsonify({"error": "Text is required"}), 400

    autocomplete.add_item(category, text, score, metadata)
    return jsonify({"status": "success"})


@app.route('/api/autocomplete/<category>/select', methods=['POST'])
def record_selection(category):
    """Record when a user selects a suggestion."""
    data = request.json
    text = data.get('text')

    if not text:
        return jsonify({"error": "Text is required"}), 400

    autocomplete.record_selection(category, text)
    return jsonify({"status": "success"})


# Initialize with sample data
def init_sample_data():
    products = [
        ("iPhone 15 Pro Max", 100, {"id": "1", "category": "phones", "price": 1199}),
        ("iPhone 15 Pro", 95, {"id": "2", "category": "phones", "price": 999}),
        ("iPhone 15", 90, {"id": "3", "category": "phones", "price": 799}),
        ("iPad Pro", 85, {"id": "4", "category": "tablets", "price": 1099}),
        ("iPad Air", 80, {"id": "5", "category": "tablets", "price": 599}),
        ("MacBook Pro", 92, {"id": "6", "category": "laptops", "price": 1999}),
        ("MacBook Air", 88, {"id": "7", "category": "laptops", "price": 1099}),
        ("AirPods Pro", 85, {"id": "8", "category": "audio", "price": 249}),
        ("AirPods Max", 75, {"id": "9", "category": "audio", "price": 549}),
        ("Apple Watch Ultra", 82, {"id": "10", "category": "wearables", "price": 799}),
    ]

    for text, score, metadata in products:
        autocomplete.add_item("products", text, score, metadata)


if __name__ == '__main__':
    init_sample_data()
    app.run(debug=True, port=5000)
```

## Frontend Integration

Here's a simple JavaScript integration:

```html
<!DOCTYPE html>
<html>
<head>
    <title>Autocomplete Demo</title>
    <style>
        .autocomplete-container {
            position: relative;
            width: 400px;
        }
        .autocomplete-input {
            width: 100%;
            padding: 10px;
            font-size: 16px;
        }
        .suggestions-list {
            position: absolute;
            top: 100%;
            left: 0;
            right: 0;
            background: white;
            border: 1px solid #ddd;
            border-top: none;
            max-height: 300px;
            overflow-y: auto;
        }
        .suggestion-item {
            padding: 10px;
            cursor: pointer;
        }
        .suggestion-item:hover {
            background: #f0f0f0;
        }
        .suggestion-text {
            font-weight: bold;
        }
        .suggestion-meta {
            font-size: 12px;
            color: #666;
        }
    </style>
</head>
<body>
    <div class="autocomplete-container">
        <input type="text" id="search" class="autocomplete-input" placeholder="Search products...">
        <div id="suggestions" class="suggestions-list" style="display: none;"></div>
    </div>

    <script>
        const input = document.getElementById('search');
        const suggestionsDiv = document.getElementById('suggestions');
        let debounceTimer;

        input.addEventListener('input', function() {
            clearTimeout(debounceTimer);
            const query = this.value;

            if (query.length < 1) {
                suggestionsDiv.style.display = 'none';
                return;
            }

            // Debounce to avoid too many requests
            debounceTimer = setTimeout(async () => {
                try {
                    const response = await fetch(
                        `/api/autocomplete/products?q=${encodeURIComponent(query)}&limit=10`
                    );
                    const data = await response.json();

                    if (data.suggestions.length > 0) {
                        renderSuggestions(data.suggestions);
                    } else {
                        suggestionsDiv.style.display = 'none';
                    }
                } catch (error) {
                    console.error('Error fetching suggestions:', error);
                }
            }, 150);
        });

        function renderSuggestions(suggestions) {
            suggestionsDiv.innerHTML = suggestions.map(s => `
                <div class="suggestion-item" data-text="${s.text}">
                    <div class="suggestion-text">${highlightMatch(s.text, input.value)}</div>
                    <div class="suggestion-meta">
                        ${s.metadata.category} - $${s.metadata.price}
                    </div>
                </div>
            `).join('');
            suggestionsDiv.style.display = 'block';
        }

        function highlightMatch(text, query) {
            const regex = new RegExp(`(${query})`, 'gi');
            return text.replace(regex, '<strong>$1</strong>');
        }

        suggestionsDiv.addEventListener('click', async function(e) {
            const item = e.target.closest('.suggestion-item');
            if (item) {
                const text = item.dataset.text;
                input.value = text;
                suggestionsDiv.style.display = 'none';

                // Record selection to boost future rankings
                await fetch('/api/autocomplete/products/select', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ text })
                });
            }
        });

        // Hide suggestions when clicking outside
        document.addEventListener('click', function(e) {
            if (!e.target.closest('.autocomplete-container')) {
                suggestionsDiv.style.display = 'none';
            }
        });
    </script>
</body>
</html>
```

## Performance Optimization

### 1. Use Pipelining for Bulk Operations

```python
def add_suggestions_pipeline(self, category: str, suggestions: list):
    """Add multiple suggestions using pipelining."""
    pipe = self.redis.pipeline()

    for text, score, metadata in suggestions:
        normalized = text.lower()
        key = f"autocomplete:{category}"
        data_key = f"autocomplete:data:{category}"

        pipe.zadd(key, {normalized: score})
        pipe.hset(data_key, normalized, json.dumps({
            "original": text,
            "metadata": metadata
        }))

    pipe.execute()
```

### 2. Cache Popular Prefixes

```python
class CachedAutocomplete:
    def __init__(self, redis_client, cache_ttl=60):
        self.redis = redis_client
        self.cache_ttl = cache_ttl

    def get_suggestions(self, category: str, prefix: str, limit: int = 10):
        # Check cache first
        cache_key = f"autocomplete:cache:{category}:{prefix}:{limit}"
        cached = self.redis.get(cache_key)

        if cached:
            return json.loads(cached)

        # Compute suggestions
        suggestions = self._compute_suggestions(category, prefix, limit)

        # Cache for popular prefixes (short ones get more traffic)
        if len(prefix) <= 3:
            self.redis.setex(cache_key, self.cache_ttl, json.dumps(suggestions))

        return suggestions
```

### 3. Limit Index Size with TTL

```python
def add_with_ttl(self, category: str, text: str, score: float, ttl_days: int = 30):
    """Add suggestion with automatic expiration tracking."""
    normalized = text.lower()
    key = f"autocomplete:{category}"

    # Add to main index
    self.redis.zadd(key, {normalized: score})

    # Track expiration time
    expiry = int(time.time()) + (ttl_days * 86400)
    self.redis.zadd(f"autocomplete:expiry:{category}", {normalized: expiry})


def cleanup_expired(self, category: str):
    """Remove expired suggestions."""
    now = int(time.time())
    expiry_key = f"autocomplete:expiry:{category}"

    # Get expired items
    expired = self.redis.zrangebyscore(expiry_key, 0, now)

    if expired:
        pipe = self.redis.pipeline()
        key = f"autocomplete:{category}"
        data_key = f"autocomplete:data:{category}"

        for item in expired:
            pipe.zrem(key, item)
            pipe.hdel(data_key, item)
            pipe.zrem(expiry_key, item)

        pipe.execute()
```

## Conclusion

Redis provides multiple powerful approaches for implementing autocomplete:

1. **Sorted Sets**: Simple and effective for basic autocomplete
2. **RediSearch Suggestions**: Feature-rich with built-in fuzzy matching
3. **Trie-based**: Best for complex prefix matching requirements

Key takeaways:

- Use appropriate data structures for your use case
- Implement score-based ranking for relevance
- Add fuzzy matching for better user experience
- Cache popular prefixes for performance
- Track user selections to improve suggestions over time

With Redis, you can build autocomplete systems that respond in milliseconds, handling thousands of requests per second while providing a smooth user experience.
