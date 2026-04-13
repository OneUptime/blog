# How to Handle Diacritics in MongoDB Text Search

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Text Search, Internationalization, Full-Text Search, Unicode

Description: Learn how MongoDB text search handles accented characters by default and how to enable diacritic-sensitive search when your application requires exact accent matching.

---

By default MongoDB text search is diacritic-insensitive, meaning "cafe" matches "café", "cafè" (with accent marks), and similar variants. This is convenient for general search but incorrect when your data requires accent-accurate matching.

## Default Behavior - Diacritic Insensitive

```javascript
db.restaurants.createIndex({ name: "text" })

db.restaurants.insertMany([
  { name: "Café du Monde" },
  { name: "Cafè Etienne" },
  { name: "Cafe Reggio" }
])

// All three match because accents are folded
db.restaurants.find({ $text: { $search: "cafe" } })
```

The index normalizes accented characters to their base form during indexing, so queries without accents still find documents with accented text.

## Enabling Diacritic-Sensitive Search

Pass `$diacriticSensitive: true` in the query to require exact accent matching:

```javascript
db.restaurants.find({
  $text: {
    $search: "cafe",
    $diacriticSensitive: true
  }
})
```

Now only documents where the name contains the unaccented word "cafe" will match. Documents with "café" are excluded.

## Combining with Case Sensitivity

Both options can be used together:

```javascript
db.words.find({
  $text: {
    $search: "résumé",
    $caseSensitive: true,
    $diacriticSensitive: true
  }
})
```

This finds only the exact token "résumé" - case-exact and with accents.

## Practical Example - Multi-Language Names

```javascript
db.people.createIndex({ fullName: "text" })

db.people.insertMany([
  { fullName: "Jose Garcia" },
  { fullName: "José García" }   // with accent on "e"
])

// Diacritic-sensitive: only matches the accented version
db.people.find({
  $text: {
    $search: "José",
    $diacriticSensitive: true
  }
})
```

## Performance Impact

Diacritic-sensitive and case-sensitive queries bypass some text-index optimizations, which can increase query execution time. For performance-critical workloads, test with `explain("executionStats")`:

```javascript
db.restaurants.find(
  { $text: { $search: "café", $diacriticSensitive: true } }
).explain("executionStats")
```

## Using Atlas Search for Advanced Needs

If your application requires full Unicode collation support, MongoDB Atlas Search provides analyzers that handle language-specific accent normalization more granularly than the built-in text index.

## Summary

MongoDB text search is diacritic-insensitive by default, folding accented characters to their base forms. Enable `$diacriticSensitive: true` in a `$text` query when your application must differentiate accented from unaccented characters. Combine with `$caseSensitive` for the strictest exact-token matching.
