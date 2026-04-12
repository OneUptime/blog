# How to Configure Language-Specific Text Indexes in MongoDB

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Text Index, Internationalization, Full-Text Search, Indexing

Description: Learn how to set the default or per-document language for MongoDB text indexes to get accurate stemming and stop-word removal for non-English content.

---

MongoDB text indexes use language-specific stemming and stop-word lists when analyzing text. By default the language is `english`, but you can override it at the index or document level to improve search quality for other languages.

## Supported Languages

MongoDB ships with built-in support for 15 languages including `french`, `german`, `spanish`, `portuguese`, `italian`, `dutch`, `russian`, `danish`, `finnish`, `hungarian`, `norwegian`, `romanian`, `swedish`, and `turkish`. Use `"none"` to disable language processing entirely.

## Setting a Default Language at Index Creation

```javascript
db.products.createIndex(
  { name: "text", description: "text" },
  { default_language: "french" }
)
```

All documents indexed here will have their text processed with French stemming and stop-word removal.

## Per-Document Language Override

Store a `language` field in each document and point the index to it:

```javascript
db.articles.createIndex(
  { title: "text", body: "text" },
  {
    default_language: "english",
    language_override: "lang"   // reads from the "lang" field in each document
  }
)
```

Insert documents with different languages:

```javascript
db.articles.insertMany([
  { title: "Bonjour MongoDB", body: "...", lang: "french" },
  { title: "Hola MongoDB",   body: "...", lang: "spanish" },
  { title: "Hello MongoDB",  body: "...", lang: "english" }
])
```

Each document is stemmed with its own language's rules.

## Querying Across Languages

`$text` queries stem the search string using the index's default language. Documents indexed via `language_override` are each stemmed at index time with their own language, but the query itself is stemmed with a single language:

```javascript
db.articles.find({ $text: { $search: "running" } })
```

If the index default is `english`, the query term "running" is stemmed to "run" and matches an English document containing "runs" (also stemmed to "run"). A French document with "courent" (stemmed to its French root at index time) will not match because the stems differ.

## Specifying Query Language

Override stemming for a specific search:

```javascript
db.articles.find({
  $text: {
    $search: "courir",
    $language: "french"
  }
})
```

## Disabling Language Processing

Use `"none"` to store and match raw tokens without stemming or stop-word filtering:

```javascript
db.logs.createIndex(
  { message: "text" },
  { default_language: "none" }
)
```

Useful for technical content such as log messages where stemming is unhelpful.

## Checking the Index Language

```javascript
db.products.getIndexes()
```

Look for `default_language` in the index spec to verify the configuration.

## Summary

MongoDB text indexes support language-specific stemming by setting `default_language` at index creation or using `language_override` to read per-document language fields. Choose the right language to ensure accurate token matching, and use `"none"` for technical or multi-language content where stemming would cause incorrect matches.
