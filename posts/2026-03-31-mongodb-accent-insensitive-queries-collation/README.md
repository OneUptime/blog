# How to Handle Accent-Insensitive Queries with Collation in MongoDB

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Collation, Query, Internationalization, Accent

Description: Learn how to run accent-insensitive MongoDB queries using collation strength 1, matching accented and unaccented characters as equivalent without custom transforms.

---

## The Accent Matching Problem

Many applications need to find documents regardless of whether the user typed accented characters. A search for `"resume"` should also find `"résumé"`. A search for `"Zurich"` should match `"Zürich"`. Without special handling, MongoDB's default comparison treats accented and unaccented characters as completely different.

## How Accents Map to Collation Levels

The Unicode Collation Algorithm (UCA) separates string differences into levels:

```text
Level 1 (Primary)    Different base letters: a vs b
Level 2 (Secondary)  Accent differences: a vs à, e vs é
Level 3 (Tertiary)   Case differences: a vs A
```

Setting `strength: 1` in a collation tells MongoDB to compare only at the primary level - ignoring both accents (level 2) and case (level 3).

## Running an Accent-Insensitive Query

```javascript
db.resumes.find(
  { title: "resume" }
).collation({ locale: "en", strength: 1 })
```

This matches documents where `title` is `"resume"`, `"Resume"`, `"RESUME"`, `"résumé"`, or `"Résumé"`.

## Strength 1 vs. Strength 2

```text
Strength   Ignores accents   Ignores case
1          YES               YES
2          NO                YES
3          NO                NO
```

Use strength 1 for maximum permissiveness (ignores both). Use strength 2 to ignore case only (keeps accent sensitivity).

## Creating an Accent-Insensitive Index

For performance, pair the query with a matching index:

```javascript
db.resumes.createIndex(
  { title: 1 },
  { collation: { locale: "en", strength: 1 } }
)
```

Now queries with `{ locale: "en", strength: 1 }` use this index as an IXSCAN instead of a COLLSCAN.

## European Name Search Example

A search page where users look up names in a directory:

```javascript
const searchName = "Muller";  // user typed without umlaut (ü)

db.directory.find(
  { lastName: searchName }
).collation({ locale: "de", strength: 1 })
// Matches: "Muller", "Müller", "MULLER", "MÜLLER"
```

With German locale and strength 1, `"u"` and `"ü"` are equivalent at the primary comparison level.

## French Accented Words

```javascript
db.articles.insertMany([
  { word: "eclair" },
  { word: "éclair" },
  { word: "Éclair" },
  { word: "ÉCLAIR" }
]);

db.articles.find({ word: "eclair" }).collation({ locale: "fr", strength: 1 });
// Returns all four documents
```

## Accent-Insensitive Unique Index

Combine accent insensitivity with uniqueness to prevent near-duplicate entries:

```javascript
db.cities.createIndex(
  { name: 1 },
  {
    unique: true,
    collation: { locale: "en", strength: 1 }
  }
)
```

Attempting to insert `"Zürich"` when `"Zurich"` already exists raises a duplicate key error.

## Using caseLevel to Restore Case Sensitivity

If you want accent-insensitive but still case-sensitive behavior, set `strength: 1` and `caseLevel: true`:

```javascript
db.articles.find({ word: "eclair" }).collation({
  locale: "fr",
  strength: 1,
  caseLevel: true
})
// Matches: "eclair", "éclair" (accent-insensitive)
// Does NOT match: "Éclair", "ÉCLAIR" (case sensitive)
```

## Comparison With Application-Side Normalization

An alternative approach is to normalize strings before storing them - strip accents and lowercase everything. This works, but it loses the original data and creates schema complexity.

Collation keeps the original data intact while allowing flexible matching at query time. The trade-off is that you need to specify (or set as default) the correct collation on both queries and indexes.

## Default Collection Collation

If your entire collection contains European text, set the default collation at creation:

```javascript
db.createCollection("contacts", {
  collation: { locale: "en", strength: 1 }
})
```

All queries on `contacts` will be accent-insensitive by default.

## Summary

Accent-insensitive queries in MongoDB require collation strength 1, which ignores both accent (secondary) and case (tertiary) differences. Create a matching index with the same collation for efficient index scans. Use `caseLevel: true` with strength 1 when you need accent insensitivity but want to preserve case sensitivity. Consider setting a default collection collation to avoid specifying it on every query.
