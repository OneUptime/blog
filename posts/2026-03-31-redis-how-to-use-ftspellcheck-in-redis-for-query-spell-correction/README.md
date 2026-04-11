# How to Use FT.SPELLCHECK in Redis for Query Spell Correction

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, RediSearch, Spell Check, Full-Text Search, Query Correction

Description: Learn how to use FT.SPELLCHECK in Redis to detect misspelled query terms and get correction suggestions based on index terms and custom dictionaries.

---

## What Is FT.SPELLCHECK?

`FT.SPELLCHECK` checks a query string for misspelled terms and returns correction suggestions. It uses the terms indexed in the RediSearch index as a reference corpus, meaning it suggests corrections based on words that actually appear in your data. You can augment it with custom dictionaries to include domain-specific terminology.

## Basic Syntax

```text
FT.SPELLCHECK index query
  [DISTANCE distance]
  [TERMS INCLUDE dict [TERMS INCLUDE dict ...]]
  [TERMS EXCLUDE dict [TERMS EXCLUDE dict ...]]
  [DIALECT dialect]
```

Parameters:
- `index` - the RediSearch index to use as the reference corpus
- `query` - the query string to check for misspellings
- `DISTANCE` - maximum Levenshtein distance for suggestions (1-4, default: 1)
- `TERMS INCLUDE dict` - also check against these custom dictionaries
- `TERMS EXCLUDE dict` - exclude terms in these dictionaries from being flagged
- `DIALECT` - query dialect version

## Setting Up a Sample Index

```bash
# Create an index
FT.CREATE articles ON HASH PREFIX 1 article: SCHEMA title TEXT body TEXT

# Add documents with indexed terms
HSET article:1 title "Redis performance optimization guide" body "Learn caching strategies"
HSET article:2 title "Database indexing best practices" body "Improve query performance"
HSET article:3 title "Memory management in Redis" body "Configure memory limits"
```

## Basic Spell Check

```bash
# Check for misspellings in a query
FT.SPELLCHECK articles "performanc optmization"
```

```text
1) 1) "TERM"
   2) "performanc"
   3) 1) 1) "0.5"
         2) "performance"
2) 1) "TERM"
   2) "optmization"
   3) 1) 1) "0.5"
         2) "optimization"
```

Each misspelled term gets a list of suggestions with their scores (higher is better).

## Understanding the Response

```text
For each misspelled term:
  1) "TERM" - literal indicator
  2) the misspelled term
  3) list of [score, suggestion] pairs
     - score: 0.0 to 1.0 (higher = better suggestion)
     - suggestion: the corrected term
```

Correctly spelled terms (matching indexed words) are not included in the response.

## Adjusting Edit Distance

By default, `DISTANCE 1` means suggestions must differ by at most 1 character edit:

```bash
# More aggressive correction (catches worse misspellings)
FT.SPELLCHECK articles "perfomace" DISTANCE 2
# Suggests "performance" (2 edits away)

# Most aggressive (may produce irrelevant suggestions)
FT.SPELLCHECK articles "optimztn" DISTANCE 4
```

## Using Custom Dictionaries

```bash
# Add domain terms to a dictionary
FT.DICTADD tech_dict "redis" "nosql" "kubernetes" "elasticsearch"

# Spell check - include tech_dict so these terms are recognized
FT.SPELLCHECK articles "rediss kubernetes" TERMS INCLUDE tech_dict
# Only "rediss" is flagged (not "kubernetes" because it's in the dictionary)
```

## Excluding Terms from Flagging

```bash
FT.DICTADD internal_codes "SKU001" "PROD-X" "REF123"

FT.SPELLCHECK articles "SKU001 chekout" TERMS EXCLUDE internal_codes
# "SKU001" is excluded from check, only "chekout" is flagged
```

## Python Example

```python
import redis

r = redis.Redis(host='localhost', port=6379, decode_responses=True)

def spell_check(r, index, query, distance=1, include_dicts=None, exclude_dicts=None):
    """Check query for misspellings and return suggestions."""
    cmd = ['FT.SPELLCHECK', index, query, 'DISTANCE', str(distance)]

    if include_dicts:
        for d in include_dicts:
            cmd.extend(['TERMS', 'INCLUDE', d])

    if exclude_dicts:
        for d in exclude_dicts:
            cmd.extend(['TERMS', 'EXCLUDE', d])

    raw = r.execute_command(*cmd)
    results = {}

    for item in raw:
        term = item[1]
        suggestions = [(float(s[0]), s[1]) for s in item[2]] if item[2] else []
        results[term] = suggestions

    return results

corrections = spell_check(r, 'articles', 'rediss performanc optmization')
for term, suggestions in corrections.items():
    if suggestions:
        best = suggestions[0][1]
        print(f"'{term}' -> '{best}'")
    else:
        print(f"'{term}' -> no suggestions found")
```

## Auto-Correcting a Query

```python
import redis

r = redis.Redis(host='localhost', port=6379, decode_responses=True)

def auto_correct_query(r, index, query):
    """Automatically replace misspelled terms with top suggestions."""
    raw = r.execute_command('FT.SPELLCHECK', index, query, 'DISTANCE', '2')

    corrections = {}
    for item in raw:
        term = item[1]
        suggestions = item[2]
        if suggestions:
            best_suggestion = suggestions[0][1]
            corrections[term] = best_suggestion

    corrected = query
    for wrong, right in corrections.items():
        corrected = corrected.replace(wrong, right)

    return corrected, corrections

original = "rediss perfrmanc optmzation"
corrected, changes = auto_correct_query(r, 'articles', original)
print(f"Original: {original}")
print(f"Corrected: {corrected}")
print(f"Changes: {changes}")
```

## Summary

`FT.SPELLCHECK` provides query spell correction by comparing query terms against the actual vocabulary in your RediSearch index. It uses Levenshtein distance to find close matches and returns ranked suggestions. Custom dictionaries (via `FT.DICTADD`) let you include domain-specific terms that should be recognized as valid, preventing false positives. Use it in search applications to improve user experience when queries contain typos or misspellings.
