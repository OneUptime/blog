# How to Build a Knowledge Base Search with RediSearch

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, RediSearch, Search, Knowledge Base

Description: Build a fast, full-text knowledge base search engine using RediSearch with support for fuzzy matching, highlighting, and category filtering.

---

A knowledge base search engine needs to be fast, accurate, and easy to maintain. RediSearch provides full-text indexing directly inside Redis, eliminating the need for a separate search service for most use cases.

## Creating the Knowledge Base Index

Define the schema to index articles by title, body, category, and tags:

```bash
FT.CREATE kb_idx ON HASH PREFIX 1 article:
  SCHEMA
    title TEXT WEIGHT 10.0
    body TEXT WEIGHT 1.0
    category TAG
    tags TAG SEPARATOR ","
    author TEXT
    created_at NUMERIC SORTABLE
```

## Ingesting Articles

Store each article as a Redis hash:

```python
import redis
import time

r = redis.Redis(host='localhost', port=6379, decode_responses=True)

def add_article(article_id: str, title: str, body: str,
                category: str, tags: list, author: str):
    r.hset(f"article:{article_id}", mapping={
        "title": title,
        "body": body,
        "category": category,
        "tags": ",".join(tags),
        "author": author,
        "created_at": int(time.time())
    })

add_article(
    "001",
    "How to Reset Your Password",
    "To reset your password, navigate to the login page and click Forgot Password...",
    "account",
    ["password", "security", "login"],
    "support-team"
)
```

## Basic Search

Search across title and body fields:

```python
def search_kb(query: str, limit: int = 10):
    result = r.execute_command(
        'FT.SEARCH', 'kb_idx', query,
        'HIGHLIGHT', 'FIELDS', '2', 'title', 'body',
        'TAGS', '<b>', '</b>',
        'LIMIT', 0, limit
    )
    count = result[0]
    docs = []
    for i in range(1, len(result), 2):
        doc_id = result[i]
        fields = dict(zip(result[i+1][0::2], result[i+1][1::2]))
        docs.append({"id": doc_id, **fields})
    return {"count": count, "results": docs}

results = search_kb("reset password")
```

## Category Filtering

Filter results to a specific category using tag filters:

```python
def search_by_category(query: str, category: str, limit: int = 10):
    filter_query = f"(@category:{{{category}}}) {query}"
    return r.execute_command(
        'FT.SEARCH', 'kb_idx', filter_query,
        'LIMIT', 0, limit
    )

# Search only within the "billing" category
results = search_by_category("invoice", "billing")
```

## Fuzzy Matching for Typos

Enable fuzzy matching to handle typos in user queries:

```python
def fuzzy_search(query: str, fuzziness: int = 1):
    # Wrap each word with % for fuzzy matching (1-3 %'s for Levenshtein distance)
    pct = "%" * fuzziness
    fuzzy_query = " ".join(f"{pct}{word}{pct}" for word in query.split())
    return r.execute_command(
        'FT.SEARCH', 'kb_idx', fuzzy_query,
        'LIMIT', 0, 10
    )

# "pasword" will still match "password"
results = fuzzy_search("pasword reset")
```

## Autocomplete with FT.SUGADD

Build an autocomplete dictionary from article titles:

```bash
FT.SUGADD kb_suggest "How to Reset Your Password" 1.0
FT.SUGADD kb_suggest "How to Cancel Your Subscription" 1.0
```

```python
def autocomplete(prefix: str, max: int = 5):
    return r.execute_command('FT.SUGGET', 'kb_suggest', prefix,
                             'FUZZY', 'MAX', max)

suggestions = autocomplete("reset p")
```

## Sorting by Recency

Return the most recently updated articles first:

```python
def search_recent(query: str):
    return r.execute_command(
        'FT.SEARCH', 'kb_idx', query,
        'SORTBY', 'created_at', 'DESC',
        'LIMIT', 0, 10
    )
```

## Summary

RediSearch makes it easy to build a knowledge base search engine with full-text search, tag filtering, fuzzy matching, and autocomplete - all within Redis. By storing articles as hashes and defining a schema with FT.CREATE, you get millisecond-latency search without deploying an additional service. Combine category filters with highlighting to deliver a polished search experience.
