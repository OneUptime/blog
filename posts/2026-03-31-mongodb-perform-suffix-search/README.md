# How to Perform a Suffix Search in MongoDB

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Query, Regex, Index, Text Search

Description: Learn how to perform suffix searches in MongoDB using regex, the performance implications of unanchored patterns, and index-friendly alternatives.

---

A suffix search finds documents where a string field ends with a given sequence of characters - useful for file extension lookups, domain matching, or identifier suffix filtering. Unlike prefix searches, suffix queries cannot efficiently use standard B-tree indexes, making them an important performance consideration.

## Basic Suffix Search with Regex

Use a regex anchored at the end of the string with `$`:

```javascript
// Find files ending with ".pdf"
db.files.find({ filename: /\.pdf$/ })

// Case-insensitive suffix search
db.files.find({ filename: /\.pdf$/i })

// Using $regex operator
db.files.find({
  filename: { $regex: "\\.pdf$", $options: "i" }
})
```

## The Performance Problem

A suffix pattern (anchored at the end but not the start) cannot use a standard forward index because B-tree indexes store strings in forward order. MongoDB must scan every document and test the regex:

```javascript
db.files.find({ filename: /\.pdf$/ }).explain("executionStats")
// You will see COLLSCAN (collection scan)
```

This is acceptable for small collections but becomes a bottleneck at scale.

## Strategy 1: Store a Reversed Field

If suffix searches are frequent, store a reversed version of the field and use a prefix query on it:

```javascript
// On insert, store reversed filename
db.files.insertOne({
  filename: "report-q4.pdf",
  filenameReversed: "fdp.4q-troper"
})

db.files.createIndex({ filenameReversed: 1 })

// Suffix search becomes a prefix search on the reversed field
function reversedPrefix(suffix) {
  return suffix.split("").reverse().join("");
}

db.files.find({
  filenameReversed: {
    $regex: `^${reversedPrefix(".pdf")}`
  }
})
// Efficient IXSCAN on filenameReversed
```

## Strategy 2: Extract and Index the Suffix

Store the extension or suffix as a separate field:

```javascript
// Store file extension explicitly
db.files.insertOne({
  filename: "report-q4.pdf",
  extension: "pdf"
})

db.files.createIndex({ extension: 1 })

// Exact match on the indexed extension field
db.files.find({ extension: "pdf" })
```

This is the most practical approach when the suffix is a known, bounded set of values.

## Strategy 3: Text Index (Limited Use)

A text index supports full-text search on string content, but it performs whole-word tokenized matching, not substring or suffix matching. It will not help with true suffix searches:

```javascript
db.documents.createIndex({ content: "text" })

// Matches documents containing the word "report" as a whole token, not a suffix
db.documents.find({ $text: { $search: "report" } })
```

This approach is only useful if your suffix happens to be a complete word. For true suffix matching, use Strategy 1 or Strategy 2 instead.

## Suffix Search with Atlas Search (Regex Operator)

On MongoDB Atlas, Atlas Search supports regex queries on indexed fields with better performance than collection scans:

```javascript
db.files.aggregate([
  {
    $search: {
      regex: {
        query: ".*\\.pdf",
        path: "filename",
        allowAnalyzedField: true
      }
    }
  }
])
```

## Practical Example: Domain Suffix Filtering

```javascript
// Find all email addresses from example.com
db.contacts.find({
  email: /\@example\.com$/i
})

// More performant alternative: store domain separately
db.contacts.createIndex({ emailDomain: 1 })
db.contacts.find({ emailDomain: "example.com" })
```

## Summary

Suffix regex searches (anchored with `$`) require a collection scan because standard B-tree indexes cannot support them. For high-performance suffix matching, store a reversed field and use a prefix query on it, or extract the suffix as a dedicated indexed field. For ad-hoc or low-frequency suffix queries on small collections, a direct regex is acceptable but always monitor query performance with `explain()`.
