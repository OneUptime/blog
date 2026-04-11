# How to Build a Document Search System with RediSearch

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, RediSearch, Document Search, Full-Text, Indexing

Description: Build a full-text document search system with RediSearch that indexes documents, ranks by relevance, and supports complex query operators.

---

RediSearch enables full-text search over any text stored in Redis with sub-10ms query latency for millions of documents. This guide builds a complete document search system with field-weighted relevance, date filtering, and author search.

## Creating the Document Index

```python
import redis
from redis.commands.search.field import TextField, NumericField, TagField
from redis.commands.search.indexDefinition import IndexDefinition, IndexType

r = redis.Redis(host='localhost', port=6379, decode_responses=True)

def create_document_index():
    schema = (
        TextField("$.title", as_name="title", weight=10.0),
        TextField("$.body", as_name="body", weight=1.0),
        TextField("$.author", as_name="author", weight=3.0),
        TagField("$.tags", as_name="tags", separator=","),
        TagField("$.status", as_name="status"),
        NumericField("$.created_at", as_name="created_at"),
        NumericField("$.word_count", as_name="word_count"),
    )
    r.ft("idx:docs").create_index(
        schema,
        definition=IndexDefinition(prefix=["doc:"], index_type=IndexType.JSON),
    )
```

## Indexing Documents

```python
import json
import time

def index_document(doc_id: str, title: str, body: str,
                   author: str, tags: list, status: str = "published"):
    doc = {
        "title": title,
        "body": body,
        "author": author,
        "tags": ",".join(tags),
        "status": status,
        "created_at": time.time(),
        "word_count": len(body.split()),
    }
    r.json().set(f"doc:{doc_id}", "$", doc)
```

## Full-Text Search

```python
from redis.commands.search.query import Query

def search_documents(query_text: str, limit: int = 10,
                     offset: int = 0) -> dict:
    query = (
        Query(query_text)
        .with_scores()
        .paging(offset, limit)
        .highlight(fields=["title", "body"], tags=["<b>", "</b>"])
        .summarize(fields=["body"], num_frags=2, context_len=50)
    )
    results = r.ft("idx:docs").search(query)
    return {
        "total": results.total,
        "results": [
            {
                "id": doc.id,
                "score": doc.score,
                "title": getattr(doc, "title", ""),
                "body_summary": getattr(doc, "body", ""),
            }
            for doc in results.docs
        ],
    }
```

## Author and Tag Filters

```python
def search_by_author(author_name: str, limit: int = 20) -> list:
    results = r.ft("idx:docs").search(
        Query(f"@author:{author_name}").paging(0, limit)
    )
    return [json.loads(doc.json) for doc in results.docs]

def search_by_tag(tag: str, text_query: str = "") -> list:
    query_str = f"@tags:{{{tag}}}"
    if text_query:
        query_str = f"{text_query} {query_str}"
    results = r.ft("idx:docs").search(Query(query_str).paging(0, 20))
    return [json.loads(doc.json) for doc in results.docs]
```

## Date Range Search

```python
def search_in_date_range(query_text: str, start_ts: float,
                          end_ts: float) -> list:
    query_str = f"({query_text}) @created_at:[{start_ts} {end_ts}]"
    results = r.ft("idx:docs").search(
        Query(query_str).sort_by("created_at", asc=False).paging(0, 20)
    )
    return [json.loads(doc.json) for doc in results.docs]
```

## Advanced Query Operators

```python
def advanced_query_examples():
    # AND: both terms required (implicit with space-separated terms)
    r.ft("idx:docs").search(Query("redis search"))

    # OR: either term
    r.ft("idx:docs").search(Query("redis|search"))

    # NOT: exclude term
    r.ft("idx:docs").search(Query("redis -nosql"))

    # Phrase: exact phrase
    r.ft("idx:docs").search(Query('"real time analytics"'))

    # Prefix: starts with
    r.ft("idx:docs").search(Query("search*"))
```

## Monitoring

Use [OneUptime](https://oneuptime.com) to monitor your document search service and alert when indexing falls behind, causing stale search results.

```bash
redis-cli FT.INFO idx:docs | grep -E "num_docs|num_terms"
```

## Summary

RediSearch document indexing requires a one-time index definition with field types and weights. Higher title weights ensure title matches rank above body matches. The HIGHLIGHT and SUMMARIZE query options return snippets with matched terms highlighted, avoiding the need to fetch and process full document bodies in your application code.
