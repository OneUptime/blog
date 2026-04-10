# How to Implement Multi-Language Search with RediSearch

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, RediSearch, Multi-Language, Internationalization, Search

Description: Build multi-language search with RediSearch by configuring per-language stemming, storing translated fields, and routing queries by locale.

---

Supporting search in multiple languages requires language-aware stemming so "running", "runs", and "run" all match the same root. RediSearch supports per-document language settings and a range of built-in stemmers.

## Language-Aware Index Setup

```python
import redis
from redis.commands.search.field import TextField, TagField
from redis.commands.search.indexDefinition import IndexDefinition, IndexType

r = redis.Redis(host='localhost', port=6379, decode_responses=True)

def create_multilang_index():
    # Store translations as separate fields per language
    schema = (
        TextField("$.title_en", as_name="title_en", weight=5.0),
        TextField("$.title_fr", as_name="title_fr", weight=5.0),
        TextField("$.title_de", as_name="title_de", weight=5.0),
        TextField("$.title_es", as_name="title_es", weight=5.0),
        TextField("$.body_en", as_name="body_en"),
        TextField("$.body_fr", as_name="body_fr"),
        TextField("$.body_de", as_name="body_de"),
        TagField("$.category", as_name="category"),
    )
    r.ft("idx:multilang").create_index(
        schema,
        definition=IndexDefinition(prefix=["article:"], index_type=IndexType.JSON),
    )
```

## Indexing Multilingual Documents

```python
import json

def index_article(article_id: str, translations: dict, category: str):
    doc = {"category": category}
    for lang, content in translations.items():
        doc[f"title_{lang}"] = content.get("title", "")
        doc[f"body_{lang}"] = content.get("body", "")
    r.json().set(f"article:{article_id}", "$", doc)

# Example
index_article("art_001", {
    "en": {"title": "Running shoes guide", "body": "How to choose running shoes"},
    "fr": {"title": "Guide des chaussures de course", "body": "Comment choisir"},
    "de": {"title": "Laufschuhe Ratgeber", "body": "Wie Sie Laufschuhe wählen"},
}, category="sports")
```

## Language-Routed Search

```python
from redis.commands.search.query import Query

LANG_MAP = {
    "en": "english", "fr": "french", "de": "german",
    "es": "spanish", "pt": "portuguese", "it": "italian",
    "nl": "dutch", "da": "danish", "sv": "swedish",
    "no": "norwegian", "fi": "finnish",
}

def search_by_language(query_text: str, lang: str = "en",
                        limit: int = 10) -> list:
    # Target the appropriate language fields
    query = Query(f"@title_{lang}:{query_text} | @body_{lang}:{query_text}")
    # .language() requires full language names, not ISO codes
    query = query.paging(0, limit).language(LANG_MAP.get(lang, "english"))
    results = r.ft("idx:multilang").search(query)
    return [{"id": doc.id, **json.loads(doc.json)} for doc in results.docs]
```

## Per-Language Stemming

```python
def search_with_stemming(term: str, lang: str = "english") -> list:
    # Language stemming: "running" matches "run" and "runs"
    query = Query(term).language(lang)
    results = r.ft("idx:multilang").search(query)
    return [json.loads(doc.json) for doc in results.docs]

# Supported languages include:
# english, french, german, spanish, portuguese,
# italian, dutch, danish, swedish, norwegian, finnish
```

## Cross-Language Search

Return results from all languages and deduplicate:

```python
def cross_language_search(translations: dict, limit: int = 10) -> list:
    """translations = {"en": "running", "fr": "course"}"""
    seen_ids = set()
    all_results = []

    for lang, term in translations.items():
        results = search_by_language(term, lang, limit)
        for doc in results:
            if doc.get("id") not in seen_ids:
                seen_ids.add(doc.get("id"))
                doc["matched_language"] = lang
                all_results.append(doc)

    return all_results[:limit]
```

## Language Detection Helper

```python
def detect_and_search(query_text: str) -> list:
    # Simple heuristic: try to detect by common stop words
    if any(w in query_text.lower() for w in ["le", "la", "les", "de", "du"]):
        return search_by_language(query_text, "fr")
    if any(w in query_text.lower() for w in ["der", "die", "das", "und"]):
        return search_by_language(query_text, "de")
    return search_by_language(query_text, "en")
```

## Monitoring

Use [OneUptime](https://oneuptime.com) to monitor search API latency per language route, as some language stemmers may be slower than others under heavy load.

```bash
redis-cli FT.SEARCH idx:multilang "@title_fr:chaussures" LIMIT 0 5 LANGUAGE french
```

## Summary

RediSearch multi-language search uses separate per-language text fields with corresponding language stemmers. The LANGUAGE parameter on queries activates the correct stemmer for relevance-aware matching. Cross-language search deduplicates results when the same document matches queries in multiple languages, providing a unified result set.
