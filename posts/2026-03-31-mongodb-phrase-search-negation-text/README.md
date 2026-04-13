# How to Use Phrase Search and Negation with $text in MongoDB

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Text Search, Full-Text Search, Query, Indexing

Description: Learn how to use double-quoted phrase search and the minus sign for term negation in MongoDB $text queries to get precise full-text search results.

---

MongoDB's `$text` operator supports two powerful modifiers beyond simple keyword search: phrase matching with double quotes and term exclusion with a leading minus sign. Combining them lets you write precise full-text queries without a dedicated search engine.

## Prerequisites

Create a text index before running any `$text` query:

```javascript
db.articles.createIndex({ title: "text", body: "text" })
```

## Phrase Search

Wrap terms in escaped double quotes to require them as an adjacent phrase:

```javascript
db.articles.find({
  $text: { $search: "\"replica set failover\"" }
})
```

This matches documents that contain the words "replica set failover" as a consecutive phrase, not just as individual scattered words.

## Negation

Prefix a term with `-` to exclude documents containing that word:

```javascript
db.articles.find({
  $text: { $search: "index -compound" }
})
```

Returns documents about indexes that do not mention "compound". The minus must be directly attached to the word with no space.

## Combining Keywords, Phrases, and Negation

You can mix all three in a single `$search` string:

```javascript
db.articles.find({
  $text: {
    $search: "\"sharded cluster\" performance -atlas"
  }
})
```

Translates to: documents that contain the phrase "sharded cluster" and do not contain the word "atlas". The keyword "performance" is not required but boosts the relevance score of matching documents.

## Ranking Results with textScore

```javascript
db.articles.find(
  { $text: { $search: "\"write concern\" durability -journaling" } },
  { score: { $meta: "textScore" }, title: 1 }
).sort({ score: { $meta: "textScore" } })
```

The `textScore` is computed only from the positive terms and phrase matches.

## Important Limitations

- A `$text` query consisting **only of negated terms** is not allowed and will throw an error:

```javascript
// This will error
db.articles.find({ $text: { $search: "-atlas" } })
```

You must include at least one positive term or phrase.

- Stop words inside a phrase are still removed. `"\"in the cluster\""` becomes a phrase match for "cluster" only.

- MongoDB supports only one `$text` expression per query.

## Case and Diacritic Sensitivity

By default, `$text` is case-insensitive and diacritic-insensitive. Use `$caseSensitive` and `$diacriticSensitive` to override:

```javascript
db.articles.find({
  $text: {
    $search: "\"Replica Set\"",
    $caseSensitive: true
  }
})
```

## Summary

MongoDB phrase search uses double-quoted strings inside `$search`, while negation uses a minus prefix. You can combine keywords, phrases, and negations in a single query string. Always include at least one positive term - negation-only queries are rejected. Sort by `$meta: "textScore"` to rank results by relevance.
