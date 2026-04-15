# How to Use multiMatchAny() and multiMatchAllIndices() in ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, String Function, Regex, Search, Performance

Description: Learn how multiMatchAny() and multiMatchAllIndices() use Hyperscan for vectorized multi-pattern matching in ClickHouse, with examples for search and classification.

---

ClickHouse provides a family of `multiMatch` functions that test a string against multiple regular expression patterns simultaneously. Rather than evaluating each pattern independently, ClickHouse delegates to Intel's Hyperscan library, which compiles all patterns into a single automaton and scans the input once. This makes multi-pattern matching significantly faster than chaining many `match()` calls with `OR`.

## Function Overview

```text
multiMatchAny(haystack, [pattern1, pattern2, ...])
multiMatchAllIndices(haystack, [pattern1, pattern2, ...])
multiMatchAnyIndex(haystack, [pattern1, pattern2, ...])
```

`multiMatchAny` returns `1` if at least one pattern in the array matches anywhere in `haystack`, `0` otherwise. It short-circuits: once any pattern matches, scanning stops.

`multiMatchAllIndices` returns an `Array(UInt64)` containing the 1-based indices of every pattern that matched. If no pattern matches, it returns an empty array.

`multiMatchAnyIndex` returns the index (1-based) of the first matching pattern, or `0` if none match.

All three functions use Hyperscan, which supports a subset of PCRE syntax. The pattern list is typically a constant array literal for best performance with Hyperscan optimization.

## multiMatchAny() - At Least One Match

The most common use case is filtering rows where any one of several keywords or patterns appears:

```sql
-- Keep only log lines that mention at least one error indicator
SELECT timestamp, message
FROM application_logs
WHERE multiMatchAny(message, ['exception', 'error', 'fatal', 'panic', 'oom'])
ORDER BY timestamp DESC
LIMIT 50;
```

This is functionally equivalent to chaining `LIKE` or `match()` with `OR`, but Hyperscan evaluates all five patterns in a single pass over the string.

```sql
-- Filter HTTP requests that match any suspicious path pattern
SELECT remote_addr, url_path, status_code
FROM access_logs
WHERE multiMatchAny(url_path, [
    '\\.php$',
    '/admin',
    '/wp-login',
    '/etc/passwd',
    '\\.env$'
])
ORDER BY timestamp DESC
LIMIT 100;
```

## multiMatchAllIndices() - Which Patterns Matched

When you need to know which specific patterns matched, use `multiMatchAllIndices`. The returned array contains the 1-based positions of every matching pattern.

```sql
-- Return the indices of matched content categories for each article
SELECT
    article_id,
    title,
    multiMatchAllIndices(lower(body), [
        'machine learning',
        'deep learning',
        'neural network',
        'transformer',
        'llm'
    ]) AS matched_category_indices
FROM articles
WHERE length(multiMatchAllIndices(lower(body), [
    'machine learning',
    'deep learning',
    'neural network',
    'transformer',
    'llm'
])) > 0
LIMIT 10;
```

Map the returned indices to human-readable labels using `arrayMap()` and a lookup array:

```sql
SELECT
    article_id,
    arrayMap(
        i -> ['ML', 'DL', 'NeuralNet', 'Transformer', 'LLM'][i],
        multiMatchAllIndices(lower(body), [
            'machine learning',
            'deep learning',
            'neural network',
            'transformer',
            'llm'
        ])
    ) AS categories
FROM articles
LIMIT 10;
```

## Content Classification

`multiMatchAllIndices` is a practical building block for a lightweight content classification pipeline. The following example tags support tickets by the product area they mention:

```sql
SELECT
    ticket_id,
    created_at,
    arrayMap(
        i -> ['Billing', 'Auth', 'API', 'Dashboard', 'Mobile'][i],
        multiMatchAllIndices(lower(subject || ' ' || body), [
            'billing|invoice|payment|charge',
            'login|password|sso|oauth|2fa',
            'api|endpoint|rate.limit|webhook',
            'dashboard|chart|report|widget',
            'ios|android|mobile app'
        ])
    ) AS tags
FROM support_tickets
WHERE length(multiMatchAllIndices(lower(subject || ' ' || body), [
    'billing|invoice|payment|charge',
    'login|password|sso|oauth|2fa',
    'api|endpoint|rate.limit|webhook',
    'dashboard|chart|report|widget',
    'ios|android|mobile app'
])) > 0
ORDER BY created_at DESC
LIMIT 20;
```

## Multi-Keyword Search

A search feature that should match documents containing any of several user-supplied terms benefits directly from `multiMatchAny`:

```sql
-- Count documents that mention any of the search terms
SELECT COUNT(*) AS doc_count
FROM knowledge_base
WHERE multiMatchAny(lower(content), [
    'kubernetes',
    'k8s',
    'container orchestration',
    'pod scheduling'
]);
```

To score documents by how many search terms they contain, use `length(multiMatchAllIndices(...))`:

```sql
SELECT
    doc_id,
    title,
    length(multiMatchAllIndices(lower(content), [
        'kubernetes',
        'k8s',
        'container orchestration',
        'pod scheduling',
        'helm chart'
    ])) AS relevance_score
FROM knowledge_base
ORDER BY relevance_score DESC
LIMIT 20;
```

## Combining with Other Predicates

`multiMatchAny` is just a UInt8-returning function, so it composes freely with other WHERE conditions:

```sql
SELECT
    user_id,
    COUNT(*) AS flagged_events
FROM user_events
WHERE event_date >= today() - 30
  AND multiMatchAny(lower(event_data), [
      'credit.card',
      'ssn',
      'social.security',
      'passport',
      'date.of.birth'
  ])
GROUP BY user_id
HAVING flagged_events >= 3
ORDER BY flagged_events DESC;
```

## Hyperscan Requirements and Limitations

Hyperscan (via the Vectorscan fork) is available in official ClickHouse builds for both x86-64 and ARM (aarch64) platforms. Builds compiled without Vectorscan do not fall back to another regex engine — the `multiMatch` functions are simply not available and will return a `NOT_IMPLEMENTED` error.

For best performance, supply the pattern array as a constant expression at query planning time. This allows Hyperscan to compile all patterns into a single database once rather than per-row.

Hyperscan supports a subset of PCRE syntax, but some features like backreferences and lookaheads are not available. Stick to character classes, quantifiers, alternation (`|`), and anchors (`^`, `$`) for reliable behavior.

## Performance Comparison

The following two queries are logically equivalent, but the `multiMatchAny` version is faster because Hyperscan scans the string once:

```sql
-- Slower: each match() call scans the string independently
SELECT COUNT(*)
FROM logs
WHERE match(message, 'error') OR match(message, 'exception') OR match(message, 'fatal');

-- Faster: Hyperscan scans the string once for all three patterns
SELECT COUNT(*)
FROM logs
WHERE multiMatchAny(message, ['error', 'exception', 'fatal']);
```

The performance advantage grows with the number of patterns and the volume of data scanned.

## Summary

`multiMatchAny(haystack, patterns)` returns 1 if any pattern in the constant array matches, making it the fastest way to test a string against multiple alternatives. `multiMatchAllIndices(haystack, patterns)` returns an array of matched pattern indices, enabling content classification and relevance scoring. Both functions are backed by Hyperscan on x86-64, which compiles all patterns into a single automaton for a single-pass scan. Use them in place of chained `OR match()` expressions whenever the pattern list is known at query time.
