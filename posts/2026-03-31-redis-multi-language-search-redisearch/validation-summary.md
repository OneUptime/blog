# Validation Summary: How to Implement Multi-Language Search with RediSearch

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Redis (with RediSearch module)
- redis-py (Python Redis client)
- RediSearch FT.CREATE and FT.SEARCH commands
- JSON indexing with RediSearch
- Snowball stemming algorithms

## Sources Consulted
- RediSearch FT.SEARCH documentation: https://redis.io/docs/latest/commands/ft.search/
- RediSearch FT.CREATE documentation: https://redis.io/docs/latest/commands/ft.create/
- RediSearch stemming documentation: https://redis.io/docs/latest/develop/interact/search-and-query/advanced-concepts/stemming/
- redis-py Query class source: https://github.com/redis/redis-py/blob/master/redis/commands/search/query.py
- redis-py field classes source: https://github.com/redis/redis-py/blob/master/redis/commands/search/field.py
- redis-py indexDefinition source: https://github.com/redis/redis-py/blob/master/redis/commands/search/indexDefinition.py
- Snowball stemmer algorithm documentation: https://snowballstem.org/

## Issues Found

### 1. `.language()` called with ISO codes instead of full language names
**What was wrong:** The `search_by_language` function passed ISO language codes (e.g., "en", "fr", "de") to the Query `.language()` method, which requires full language names (e.g., "english", "french", "german"). This would cause RediSearch to return an error at query time.
**What was changed:** Added a `LANG_MAP` dictionary that maps ISO codes to full language names, and used `LANG_MAP.get(lang, "english")` in the `.language()` call.
**Why:** RediSearch only accepts full language names for the LANGUAGE parameter, not ISO codes.

### 2. Incorrect stemming claim about irregular verb "ran"
**What was wrong:** The intro paragraph and a code comment claimed that stemming matches "running", "runs", and "ran" to the same root. RediSearch uses the Snowball stemmer, which is a suffix-based stemmer that does not handle irregular verb forms like "ran".
**What was changed:** Changed "ran" to "run" in the intro paragraph. Changed the code comment from `"running" matches "run", "runs", "ran"` to `"running" matches "run" and "runs"`.
**Why:** The Snowball stemmer strips regular suffixes (e.g., -ing, -s) but cannot map irregular past tenses to their base form.

### 3. Broken deduplication in cross-language search
**What was wrong:** `search_by_language` returned `json.loads(doc.json)` which produces plain dicts containing only the JSON document fields. The `cross_language_search` function then called `doc.get("id")` on these dicts, but no "id" field exists in the document data. This meant every document would have `None` as its ID, causing only the first result to be added (all subsequent docs would be treated as duplicates).
**What was changed:** Modified the return statement in `search_by_language` to include the document ID: `{"id": doc.id, **json.loads(doc.json)}`.
**Why:** The RediSearch document ID (the Redis key) is available as `doc.id` on the Document object but is not part of the JSON payload. It must be explicitly included for deduplication to work.

## Review Notes
- The language detection heuristic in `detect_and_search` is acknowledged as simple but has notable false-positive risk: words like "de" appear in many languages (e.g., Spanish). The code labels this as a heuristic, so this is not treated as an error, but a production system should use a proper language detection library like `langdetect` or `fasttext`.
- The post stores translations as separate per-language fields (e.g., `title_en`, `title_fr`). An alternative approach is to use RediSearch's `LANGUAGE_FIELD` parameter in `FT.CREATE` to store language per-document. The chosen approach is valid for the use case described.
- The `search_with_stemming` function correctly uses full language names (e.g., "english") as its default, but this convention differs from `search_by_language` which uses ISO codes. The mapping added in the fix resolves this inconsistency at the API boundary.
