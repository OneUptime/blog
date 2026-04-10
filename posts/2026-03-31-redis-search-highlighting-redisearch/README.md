# How to Implement Search Highlighting with RediSearch

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, RediSearch, Search Highlighting, Snippet, UX

Description: Implement search result highlighting and snippet extraction with RediSearch to show users exactly why their results matched.

---

Search highlighting shows users the matching terms in context - bolding "headphones" in "Wireless **headphones** with noise cancellation". RediSearch provides built-in HIGHLIGHT and SUMMARIZE options so you never have to parse result text manually.

## Index Setup

```python
import redis
from redis.commands.search.field import TextField, NumericField, TagField
from redis.commands.search.indexDefinition import IndexDefinition, IndexType

r = redis.Redis(host='localhost', port=6379, decode_responses=True)

def create_highlight_index():
    schema = (
        TextField("$.title", as_name="title", weight=5.0),
        TextField("$.body", as_name="body", weight=1.0),
        TextField("$.author", as_name="author"),
        TagField("$.category", as_name="category"),
        NumericField("$.created_at", as_name="created_at"),
    )
    r.ft("idx:highlight").create_index(
        schema,
        definition=IndexDefinition(prefix=["article:"], index_type=IndexType.JSON),
    )
```

## Basic Highlighting

```python
from redis.commands.search.query import Query

def search_with_highlights(query_text: str, limit: int = 10) -> list:
    query = (
        Query(query_text)
        .highlight(fields=["title", "body"], tags=["<mark>", "</mark>"])
        .paging(0, limit)
    )
    results = r.ft("idx:highlight").search(query)
    return [
        {
            "id": doc.id,
            "title": getattr(doc, "title", ""),
            "body": getattr(doc, "body", ""),
        }
        for doc in results.docs
    ]
```

## Summarize for Snippets

SUMMARIZE extracts the most relevant sentence fragments containing matched terms:

```python
def search_with_snippets(query_text: str, snippet_len: int = 80,
                          num_frags: int = 2, limit: int = 10) -> list:
    query = (
        Query(query_text)
        .summarize(
            fields=["body"],
            num_frags=num_frags,
            context_len=snippet_len,
            sep=" ... ",
        )
        .highlight(fields=["title", "body"], tags=["<b>", "</b>"])
        .with_scores()
        .paging(0, limit)
    )
    results = r.ft("idx:highlight").search(query)
    return [
        {
            "id": doc.id,
            "title": getattr(doc, "title", ""),
            "snippet": getattr(doc, "body", ""),
            "score": doc.score,
        }
        for doc in results.docs
    ]
```

## Custom HTML Tags for Highlighting

```python
def search_highlight_html(query_text: str) -> list:
    query = (
        Query(query_text)
        .highlight(
            fields=["title", "body"],
            tags=['<span class="highlight">', "</span>"]
        )
        .summarize(fields=["body"], num_frags=1, context_len=150)
        .paging(0, 10)
    )
    results = r.ft("idx:highlight").search(query)
    return [
        {"id": doc.id, "title": doc.title, "snippet": doc.body}
        for doc in results.docs
    ]
```

## Plain Text Highlighting (No HTML)

For API responses where the client handles rendering:

```python
def search_highlight_markers(query_text: str) -> list:
    query = (
        Query(query_text)
        .highlight(fields=["title", "body"], tags=["[[", "]]"])
        .summarize(fields=["body"], num_frags=2, context_len=80)
        .paging(0, 10)
    )
    results = r.ft("idx:highlight").search(query)
    return [
        {
            "id": doc.id,
            "title": getattr(doc, "title", ""),
            "snippet": getattr(doc, "body", ""),
        }
        for doc in results.docs
    ]
```

## Testing with Sample Data

```python
import time

r.json().set("article:001", "$", {
    "title": "Building Real-Time Search with Redis",
    "body": "RediSearch enables full-text search within Redis. "
            "You can build product search, document search, and autocomplete "
            "all using Redis as your only data store.",
    "author": "Jane Doe",
    "category": "tutorial",
    "created_at": time.time(),
})

results = search_with_snippets("full-text search Redis")
for r_item in results:
    print(f"Title: {r_item['title']}")
    print(f"Snippet: {r_item['snippet']}")
```

```bash
redis-cli FT.SEARCH idx:highlight "search" HIGHLIGHT FIELDS 2 title body TAGS "<b>" "</b>" SUMMARIZE FIELDS 1 body FRAGS 2 LEN 80
```

## Monitoring

Use [OneUptime](https://oneuptime.com) to monitor your search API - HIGHLIGHT and SUMMARIZE options add CPU overhead; track p99 latency to catch degradation.

## Summary

RediSearch HIGHLIGHT wraps matched terms in custom open/close tags without any client-side text processing. SUMMARIZE extracts the N most relevant text fragments around matched terms, eliminating the need to truncate or parse full document bodies. Use short non-HTML markers (like `[[` and `]]`) in API responses to keep the rendering layer in control of the frontend.
