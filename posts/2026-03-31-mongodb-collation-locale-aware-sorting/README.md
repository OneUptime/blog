# How to Use Collation for Locale-Aware Sorting in MongoDB

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Collation, Sorting, Internationalization, Query

Description: Learn how to use MongoDB collation to sort strings according to locale-specific rules, handling language-specific ordering for non-English alphabets correctly.

---

## What Is Collation?

Collation in MongoDB defines rules for comparing and sorting strings based on language and locale conventions. Without collation, MongoDB sorts strings using byte-order comparison, which produces incorrect results for many languages - for example, `"a"` before `"A"` in binary order, but many locales expect them to be grouped together.

Collation is specified as a document with at minimum a `locale` field:

```javascript
{ locale: "en" }
```

## Why Binary Sort Is Not Enough

Consider a list of names in French:

```javascript
["éclair", "apple", "Banana", "avocado"]
```

Binary sort produces:

```text
Banana, apple, avocado, éclair
```

With French locale collation (strength 1 for case and accent insensitivity):

```text
apple, avocado, Banana, éclair
```

The accented `é` is placed with `e` words rather than at the end, matching user expectations.

## Adding Collation to a Query

Attach collation to `find` with `sort`:

```javascript
db.products.find({}).sort({ name: 1 }).collation({ locale: "fr" })
```

Or using the full command form:

```javascript
db.runCommand({
  find: "products",
  sort: { name: 1 },
  collation: { locale: "fr" }
})
```

## Common Locale Codes

```text
Locale   Language
-------- -----------
en       English
fr       French
de       German
es       Spanish
sv       Swedish
tr       Turkish
zh       Chinese
ja       Japanese
ar       Arabic
ru       Russian
```

Pass the locale code as the `locale` field in the collation document.

## Swedish Sorting Example

Swedish sorts `å`, `ä`, `ö` after `z`. Binary sort gets this wrong:

```javascript
db.words.insertMany([
  { word: "zoo" },
  { word: "äpple" },
  { word: "alfa" }
]);

// Binary sort (wrong for Swedish)
db.words.find().sort({ word: 1 });
// Result: alfa, zoo, äpple

// English collation (ä sorts near a)
db.words.find().sort({ word: 1 }).collation({ locale: "en" });
// Result: alfa, äpple, zoo

// Swedish collation (correct for Swedish - ä sorts after z)
db.words.find().sort({ word: 1 }).collation({ locale: "sv" });
// Result: alfa, zoo, äpple
```

## German Phone Book vs. Dictionary Order

German has two standards. Phone book order sorts `ae` and `a` together, while dictionary order does not. Use the `@collation=phonebook` extension:

```javascript
db.contacts.find({}).sort({ lastName: 1 }).collation({
  locale: "de@collation=phonebook"
})
```

## Collation in aggregation $sort

Apply collation at the pipeline level:

```javascript
db.customers.aggregate(
  [{ $sort: { lastName: 1, firstName: 1 } }],
  { collation: { locale: "de", strength: 2 } }
)
```

The collation option is passed as the second argument to `aggregate()`, not inside the pipeline stage.

## Turkish Case Folding

Turkish has a dotted `I` vs. dotless `i` distinction. Without locale-aware collation, case folding fails. With Turkish collation:

```javascript
db.names.find({ name: "istanbul" }).collation({ locale: "tr", strength: 2 })
```

This matches `"Istanbul"`, `"ISTANBUL"`, and `"istanbul"` correctly, while English case folding would not.

## Performance Note

Collation sorting that does not use a collation-aware index performs an in-memory sort. For large collections, create an index with the same collation (see the related post on collation indexes) to allow the sort to use the index efficiently.

## Summary

MongoDB collation enables locale-aware string sorting that respects language-specific ordering rules. Attach a collation document with the appropriate `locale` to `find`, `aggregate`, or `sort` operations to get correct alphabetical ordering for your users' languages. For repeated queries, pair collation with a matching index to avoid in-memory sorts.
