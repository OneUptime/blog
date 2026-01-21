# How to Implement Live Search with Redis

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Search, Autocomplete, Type-Ahead, Real-Time, Performance, User Experience

Description: A comprehensive guide to implementing live search and type-ahead functionality with Redis, covering prefix matching, fuzzy search, weighted suggestions, and instant search results.

---

Live search (also known as type-ahead or autocomplete) provides instant search results as users type, dramatically improving user experience. Redis's in-memory performance and specialized data structures make it ideal for building responsive live search features. This guide covers various approaches from simple prefix matching to sophisticated fuzzy search.

## Live Search Architecture

A live search system typically includes:

1. **Search Index**: Redis data structures containing searchable content
2. **Query Processing**: Handle user input with debouncing
3. **Ranking**: Order results by relevance
4. **Response Optimization**: Return results quickly with minimal data transfer

## Basic Prefix Search with Sorted Sets

### Building the Index

```python
import redis
import json
from typing import List, Dict

class PrefixSearch:
    """Simple prefix-based autocomplete"""

    def __init__(self, redis_client, index_name: str = 'search'):
        self.redis = redis_client
        self.index_name = index_name

    def index_term(self, term: str, data: dict = None, score: float = 0):
        """Index a term for prefix search"""
        term_lower = term.lower()

        # Add all prefixes to sorted set
        for i in range(1, len(term_lower) + 1):
            prefix = term_lower[:i]
            self.redis.zadd(
                f"{self.index_name}:prefix:{prefix}",
                {term_lower: score}
            )

        # Store original term and data
        self.redis.hset(
            f"{self.index_name}:data",
            term_lower,
            json.dumps({'term': term, 'data': data or {}})
        )

    def search(self, query: str, limit: int = 10) -> List[Dict]:
        """Search by prefix"""
        query_lower = query.lower()
        key = f"{self.index_name}:prefix:{query_lower}"

        # Get matching terms sorted by score (descending)
        matches = self.redis.zrevrange(key, 0, limit - 1)

        results = []
        for match in matches:
            data_json = self.redis.hget(f"{self.index_name}:data", match)
            if data_json:
                data = json.loads(data_json)
                results.append(data)

        return results

    def remove_term(self, term: str):
        """Remove a term from the index"""
        term_lower = term.lower()

        # Remove from all prefix sets
        for i in range(1, len(term_lower) + 1):
            prefix = term_lower[:i]
            self.redis.zrem(f"{self.index_name}:prefix:{prefix}", term_lower)

        # Remove data
        self.redis.hdel(f"{self.index_name}:data", term_lower)

    def update_score(self, term: str, score_increment: float = 1):
        """Update popularity score (e.g., when term is selected)"""
        term_lower = term.lower()

        # Update score in all prefix sets
        for i in range(1, len(term_lower) + 1):
            prefix = term_lower[:i]
            self.redis.zincrby(
                f"{self.index_name}:prefix:{prefix}",
                score_increment,
                term_lower
            )


# Usage
r = redis.Redis(decode_responses=True)
search = PrefixSearch(r, 'products')

# Index products
products = [
    {'name': 'iPhone 15 Pro', 'id': '1', 'category': 'phones'},
    {'name': 'iPhone 15', 'id': '2', 'category': 'phones'},
    {'name': 'iPad Pro', 'id': '3', 'category': 'tablets'},
    {'name': 'iMac 27"', 'id': '4', 'category': 'computers'},
]

for product in products:
    search.index_term(product['name'], product, score=0)

# Search
results = search.search('ipho', limit=5)
print(f"Results: {results}")
```

## Autocomplete with Weighted Suggestions

```python
class WeightedAutocomplete:
    """Autocomplete with multiple ranking factors"""

    def __init__(self, redis_client, index_name: str = 'autocomplete'):
        self.redis = redis_client
        self.index_name = index_name

    def index_item(self, item_id: str, text: str, metadata: dict = None):
        """Index item with multiple ranking factors"""
        text_lower = text.lower()
        words = text_lower.split()

        # Calculate base score from metadata
        base_score = self._calculate_score(metadata or {})

        # Index by full text prefixes
        for i in range(1, len(text_lower) + 1):
            prefix = text_lower[:i]
            self.redis.zadd(
                f"{self.index_name}:full:{prefix}",
                {item_id: base_score}
            )

        # Index by word prefixes (for multi-word search)
        for word in words:
            for i in range(1, len(word) + 1):
                prefix = word[:i]
                self.redis.zadd(
                    f"{self.index_name}:word:{prefix}",
                    {item_id: base_score}
                )

        # Store item data
        self.redis.hset(
            f"{self.index_name}:items",
            item_id,
            json.dumps({
                'id': item_id,
                'text': text,
                'metadata': metadata or {}
            })
        )

    def _calculate_score(self, metadata: dict) -> float:
        """Calculate ranking score from metadata"""
        score = 0

        # Popularity boost
        score += metadata.get('popularity', 0) * 10

        # Recency boost (assuming unix timestamp)
        if 'updated_at' in metadata:
            # Normalize to 0-100 range for recent items
            import time
            age_days = (time.time() - metadata['updated_at']) / 86400
            recency_score = max(0, 100 - age_days)
            score += recency_score

        # Category boost
        if metadata.get('featured'):
            score += 50

        return score

    def search(self, query: str, limit: int = 10) -> List[Dict]:
        """Search with combined full-text and word matching"""
        query_lower = query.lower()
        words = query_lower.split()

        # Get matches from full text
        full_key = f"{self.index_name}:full:{query_lower}"
        full_matches = set(self.redis.zrevrange(full_key, 0, limit * 2))

        # Get matches from word prefixes
        word_matches = set()
        for word in words:
            word_key = f"{self.index_name}:word:{word}"
            word_matches.update(self.redis.zrevrange(word_key, 0, limit * 2))

        # Combine and score
        all_matches = full_matches | word_matches
        scored_results = []

        for item_id in all_matches:
            item_json = self.redis.hget(f"{self.index_name}:items", item_id)
            if item_json:
                item = json.loads(item_json)

                # Calculate match score
                match_score = self._match_score(query_lower, item['text'].lower())

                # Get stored score
                stored_score = self.redis.zscore(full_key, item_id) or 0

                # Combined score
                final_score = match_score * 0.7 + stored_score * 0.3

                scored_results.append((final_score, item))

        # Sort by score and return top results
        scored_results.sort(key=lambda x: x[0], reverse=True)
        return [item for score, item in scored_results[:limit]]

    def _match_score(self, query: str, text: str) -> float:
        """Score how well query matches text"""
        score = 0

        # Exact prefix match (highest)
        if text.startswith(query):
            score += 100

        # Word prefix match
        words = text.split()
        query_words = query.split()

        for qw in query_words:
            for w in words:
                if w.startswith(qw):
                    score += 50
                elif qw in w:
                    score += 20

        # Length similarity (prefer shorter matches for short queries)
        if len(query) < len(text):
            score += 10 * (len(query) / len(text))

        return score

    def record_selection(self, item_id: str, query: str):
        """Record when user selects an item to improve future ranking"""
        # Increment selection count
        self.redis.hincrby(f"{self.index_name}:selections", item_id, 1)

        # Update scores in prefix sets
        text_lower = self.redis.hget(f"{self.index_name}:items", item_id)
        if text_lower:
            item = json.loads(text_lower)
            text = item['text'].lower()

            for i in range(1, len(text) + 1):
                prefix = text[:i]
                self.redis.zincrby(
                    f"{self.index_name}:full:{prefix}",
                    0.1,  # Small increment
                    item_id
                )


# Usage
r = redis.Redis(decode_responses=True)
autocomplete = WeightedAutocomplete(r, 'products')

# Index with metadata
products = [
    {
        'id': 'p1',
        'name': 'MacBook Pro 16"',
        'metadata': {'popularity': 95, 'featured': True, 'updated_at': time.time()}
    },
    {
        'id': 'p2',
        'name': 'MacBook Air M2',
        'metadata': {'popularity': 90, 'featured': False, 'updated_at': time.time() - 86400}
    }
]

for p in products:
    autocomplete.index_item(p['id'], p['name'], p['metadata'])

results = autocomplete.search('mac', limit=5)
```

## Fuzzy Search with Levenshtein Distance

```python
class FuzzySearch:
    """Search with typo tolerance using phonetic matching and edit distance"""

    def __init__(self, redis_client, index_name: str = 'fuzzy'):
        self.redis = redis_client
        self.index_name = index_name

    def index_item(self, item_id: str, text: str, data: dict = None):
        """Index item with fuzzy search support"""
        text_lower = text.lower()
        words = text_lower.split()

        # Store original
        self.redis.hset(
            f"{self.index_name}:items",
            item_id,
            json.dumps({'id': item_id, 'text': text, 'data': data or {}})
        )

        # Index exact terms
        self.redis.sadd(f"{self.index_name}:exact:{text_lower}", item_id)

        # Index individual words
        for word in words:
            self.redis.sadd(f"{self.index_name}:word:{word}", item_id)

            # Index n-grams for fuzzy matching
            for ngram in self._ngrams(word, 2):
                self.redis.sadd(f"{self.index_name}:ngram:{ngram}", item_id)

            # Index phonetic code (Soundex-like)
            phonetic = self._phonetic_code(word)
            self.redis.sadd(f"{self.index_name}:phonetic:{phonetic}", item_id)

    def _ngrams(self, word: str, n: int = 2) -> List[str]:
        """Generate n-grams from word"""
        return [word[i:i+n] for i in range(len(word) - n + 1)]

    def _phonetic_code(self, word: str) -> str:
        """Simple phonetic encoding (Soundex-inspired)"""
        if not word:
            return ''

        # Simplified Soundex
        code = word[0].upper()
        mapping = {
            'BFPV': '1', 'CGJKQSXZ': '2', 'DT': '3',
            'L': '4', 'MN': '5', 'R': '6'
        }

        for char in word[1:].upper():
            for letters, digit in mapping.items():
                if char in letters:
                    if code[-1] != digit:
                        code += digit
                    break

        return (code + '000')[:4]

    def _levenshtein_distance(self, s1: str, s2: str) -> int:
        """Calculate edit distance between two strings"""
        if len(s1) < len(s2):
            return self._levenshtein_distance(s2, s1)

        if len(s2) == 0:
            return len(s1)

        previous_row = range(len(s2) + 1)
        for i, c1 in enumerate(s1):
            current_row = [i + 1]
            for j, c2 in enumerate(s2):
                insertions = previous_row[j + 1] + 1
                deletions = current_row[j] + 1
                substitutions = previous_row[j] + (c1 != c2)
                current_row.append(min(insertions, deletions, substitutions))
            previous_row = current_row

        return previous_row[-1]

    def search(self, query: str, limit: int = 10, max_distance: int = 2) -> List[Dict]:
        """Fuzzy search with typo tolerance"""
        query_lower = query.lower()
        words = query_lower.split()

        candidates = set()

        # Exact matches (highest priority)
        exact = self.redis.smembers(f"{self.index_name}:exact:{query_lower}")
        candidates.update(exact)

        # Word matches
        for word in words:
            word_matches = self.redis.smembers(f"{self.index_name}:word:{word}")
            candidates.update(word_matches)

            # N-gram matches for fuzzy
            for ngram in self._ngrams(word, 2):
                ngram_matches = self.redis.smembers(f"{self.index_name}:ngram:{ngram}")
                candidates.update(ngram_matches)

            # Phonetic matches
            phonetic = self._phonetic_code(word)
            phonetic_matches = self.redis.smembers(f"{self.index_name}:phonetic:{phonetic}")
            candidates.update(phonetic_matches)

        # Score candidates
        scored_results = []
        for item_id in candidates:
            item_json = self.redis.hget(f"{self.index_name}:items", item_id)
            if item_json:
                item = json.loads(item_json)
                item_text = item['text'].lower()

                # Calculate fuzzy score
                distance = self._levenshtein_distance(query_lower, item_text)

                # Skip if too different
                if distance > max_distance * len(words):
                    continue

                # Score (lower distance = better)
                score = 100 - (distance * 10)

                # Boost exact prefix matches
                if item_text.startswith(query_lower):
                    score += 50

                scored_results.append((score, distance, item))

        # Sort by score (descending), then distance (ascending)
        scored_results.sort(key=lambda x: (-x[0], x[1]))
        return [item for score, dist, item in scored_results[:limit]]


# Usage
r = redis.Redis(decode_responses=True)
fuzzy = FuzzySearch(r, 'products')

# Index items
items = [
    ('1', 'iPhone', {'category': 'phones'}),
    ('2', 'iPad', {'category': 'tablets'}),
    ('3', 'MacBook', {'category': 'laptops'}),
]

for item_id, name, data in items:
    fuzzy.index_item(item_id, name, data)

# Search with typo
results = fuzzy.search('iphon', limit=5)  # Should find "iPhone"
print(f"Results: {results}")
```

## Real-Time Search API

```python
from fastapi import FastAPI, Query, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
import asyncio
import aioredis

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

class AsyncSearchService:
    """Async search service with Redis"""

    def __init__(self):
        self.redis = None

    async def get_redis(self):
        if not self.redis:
            self.redis = await aioredis.from_url('redis://localhost', decode_responses=True)
        return self.redis

    async def search(self, query: str, index: str = 'products', limit: int = 10) -> List[Dict]:
        """Perform async search"""
        redis = await self.get_redis()
        query_lower = query.lower()

        # Get prefix matches
        key = f"{index}:prefix:{query_lower}"
        matches = await redis.zrevrange(key, 0, limit - 1)

        results = []
        if matches:
            # Batch get item data
            items = await redis.hmget(f"{index}:data", *matches)
            for item_json in items:
                if item_json:
                    results.append(json.loads(item_json))

        return results


search_service = AsyncSearchService()

@app.get("/api/search")
async def search(
    q: str = Query(..., min_length=1),
    index: str = Query('products'),
    limit: int = Query(10, ge=1, le=50)
):
    """REST API for search"""
    results = await search_service.search(q, index, limit)
    return {
        'query': q,
        'results': results,
        'count': len(results)
    }


@app.websocket("/ws/search")
async def websocket_search(websocket: WebSocket):
    """WebSocket endpoint for real-time search"""
    await websocket.accept()

    try:
        while True:
            data = await websocket.receive_text()
            message = json.loads(data)

            if message.get('type') == 'search':
                query = message.get('query', '')
                index = message.get('index', 'products')
                limit = message.get('limit', 10)

                if len(query) >= 1:
                    results = await search_service.search(query, index, limit)
                    await websocket.send_text(json.dumps({
                        'type': 'results',
                        'query': query,
                        'results': results
                    }))
    except WebSocketDisconnect:
        pass
```

## Frontend Implementation

```javascript
class LiveSearch {
    constructor(inputId, resultsId, options = {}) {
        this.input = document.getElementById(inputId);
        this.results = document.getElementById(resultsId);
        this.options = {
            debounceMs: 150,
            minChars: 1,
            maxResults: 10,
            useWebSocket: true,
            apiUrl: '/api/search',
            wsUrl: 'wss://api.example.com/ws/search',
            ...options
        };

        this.debounceTimer = null;
        this.ws = null;
        this.pendingQuery = null;

        this.init();
    }

    init() {
        this.input.addEventListener('input', (e) => this.handleInput(e));
        this.input.addEventListener('keydown', (e) => this.handleKeydown(e));
        this.input.addEventListener('focus', () => this.showResults());
        document.addEventListener('click', (e) => this.handleClickOutside(e));

        if (this.options.useWebSocket) {
            this.connectWebSocket();
        }
    }

    connectWebSocket() {
        this.ws = new WebSocket(this.options.wsUrl);

        this.ws.onopen = () => {
            console.log('Search WebSocket connected');
            if (this.pendingQuery) {
                this.sendSearchQuery(this.pendingQuery);
                this.pendingQuery = null;
            }
        };

        this.ws.onmessage = (event) => {
            const message = JSON.parse(event.data);
            if (message.type === 'results') {
                this.displayResults(message.results, message.query);
            }
        };

        this.ws.onclose = () => {
            setTimeout(() => this.connectWebSocket(), 3000);
        };
    }

    handleInput(event) {
        const query = event.target.value.trim();

        clearTimeout(this.debounceTimer);

        if (query.length < this.options.minChars) {
            this.hideResults();
            return;
        }

        this.debounceTimer = setTimeout(() => {
            this.search(query);
        }, this.options.debounceMs);
    }

    async search(query) {
        if (this.options.useWebSocket && this.ws && this.ws.readyState === WebSocket.OPEN) {
            this.sendSearchQuery(query);
        } else if (this.options.useWebSocket) {
            this.pendingQuery = query;
        } else {
            await this.searchViaRest(query);
        }
    }

    sendSearchQuery(query) {
        this.ws.send(JSON.stringify({
            type: 'search',
            query: query,
            limit: this.options.maxResults
        }));
    }

    async searchViaRest(query) {
        try {
            const response = await fetch(
                `${this.options.apiUrl}?q=${encodeURIComponent(query)}&limit=${this.options.maxResults}`
            );
            const data = await response.json();
            this.displayResults(data.results, query);
        } catch (error) {
            console.error('Search error:', error);
        }
    }

    displayResults(results, query) {
        if (results.length === 0) {
            this.results.innerHTML = '<div class="no-results">No results found</div>';
            this.showResults();
            return;
        }

        const html = results.map((item, index) => {
            const highlighted = this.highlightMatch(item.text || item.term, query);
            return `
                <div class="search-result" data-index="${index}" data-id="${item.id || ''}">
                    <div class="result-text">${highlighted}</div>
                    ${item.data?.category ? `<div class="result-category">${item.data.category}</div>` : ''}
                </div>
            `;
        }).join('');

        this.results.innerHTML = html;
        this.showResults();

        // Add click handlers
        this.results.querySelectorAll('.search-result').forEach(el => {
            el.addEventListener('click', () => this.selectResult(results[el.dataset.index]));
        });
    }

    highlightMatch(text, query) {
        const regex = new RegExp(`(${this.escapeRegex(query)})`, 'gi');
        return text.replace(regex, '<mark>$1</mark>');
    }

    escapeRegex(string) {
        return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }

    selectResult(result) {
        this.input.value = result.text || result.term;
        this.hideResults();

        // Emit selection event
        this.input.dispatchEvent(new CustomEvent('search:select', {
            detail: result
        }));
    }

    handleKeydown(event) {
        const items = this.results.querySelectorAll('.search-result');
        const activeItem = this.results.querySelector('.search-result.active');
        let activeIndex = activeItem ? parseInt(activeItem.dataset.index) : -1;

        switch (event.key) {
            case 'ArrowDown':
                event.preventDefault();
                activeIndex = Math.min(activeIndex + 1, items.length - 1);
                this.setActiveItem(items, activeIndex);
                break;
            case 'ArrowUp':
                event.preventDefault();
                activeIndex = Math.max(activeIndex - 1, 0);
                this.setActiveItem(items, activeIndex);
                break;
            case 'Enter':
                if (activeItem) {
                    event.preventDefault();
                    activeItem.click();
                }
                break;
            case 'Escape':
                this.hideResults();
                break;
        }
    }

    setActiveItem(items, index) {
        items.forEach(item => item.classList.remove('active'));
        if (items[index]) {
            items[index].classList.add('active');
            items[index].scrollIntoView({ block: 'nearest' });
        }
    }

    showResults() {
        this.results.classList.add('visible');
    }

    hideResults() {
        this.results.classList.remove('visible');
    }

    handleClickOutside(event) {
        if (!this.input.contains(event.target) && !this.results.contains(event.target)) {
            this.hideResults();
        }
    }
}

// Usage
const search = new LiveSearch('search-input', 'search-results', {
    debounceMs: 150,
    minChars: 2,
    useWebSocket: true
});

// Handle selection
document.getElementById('search-input').addEventListener('search:select', (e) => {
    console.log('Selected:', e.detail);
    // Navigate or perform action
});
```

## Performance Optimization

### Caching Popular Searches

```python
class CachedSearch:
    """Search with caching for popular queries"""

    def __init__(self, redis_client, search_service):
        self.redis = redis_client
        self.search = search_service
        self.cache_ttl = 300  # 5 minutes

    def cached_search(self, query: str, limit: int = 10) -> List[Dict]:
        """Search with result caching"""
        cache_key = f"search_cache:{query.lower()}:{limit}"

        # Check cache
        cached = self.redis.get(cache_key)
        if cached:
            return json.loads(cached)

        # Perform search
        results = self.search.search(query, limit)

        # Cache results
        self.redis.setex(cache_key, self.cache_ttl, json.dumps(results))

        # Track popular queries
        self.redis.zincrby('popular_searches', 1, query.lower())

        return results

    def get_popular_searches(self, limit: int = 10) -> List[str]:
        """Get most popular search queries"""
        return self.redis.zrevrange('popular_searches', 0, limit - 1)
```

## Conclusion

Implementing live search with Redis enables instant, responsive search experiences. Key takeaways:

- Use sorted sets for prefix matching with scoring
- Implement n-grams and phonetic indexing for fuzzy search
- Add debouncing on the frontend to reduce server load
- Use WebSocket for lowest latency updates
- Cache popular search results
- Track and learn from user selections

By combining Redis's fast data structures with proper indexing and ranking strategies, you can build search experiences that feel instantaneous to users.
