# How to Use Stop Words and Stemming in MongoDB Text Search

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Text Search, Stemming, Stop Word, Full-Text Search

Description: Understand how MongoDB text search handles stop words and stemming, and learn strategies to control or disable these behaviors for better search results.

---

MongoDB text search automatically applies two preprocessing steps: stop-word removal and stemming. Understanding both helps you predict which queries will match which documents and troubleshoot unexpected results.

## What Are Stop Words?

Stop words are common words that MongoDB ignores during indexing and querying. For English these include words like "the", "a", "is", "in", "of", and "and".

```javascript
// Indexing this document
db.posts.insertOne({ title: "The Art of MongoDB Indexing" })

// "the" and "of" are ignored - only "Art", "MongoDB", "Indexing" are stored
db.posts.find({ $text: { $search: "the art" } })
// Matches - "art" is found; "the" is silently dropped
```

## What Is Stemming?

Stemming reduces words to their root form. MongoDB uses the Snowball stemming library per language.

```javascript
// Document contains "running"
db.posts.insertOne({ body: "Running queries efficiently in MongoDB" })

// These all match because "run", "running", "runs" share the same stem
db.posts.find({ $text: { $search: "run" } })
db.posts.find({ $text: { $search: "runs" } })
db.posts.find({ $text: { $search: "running" } })
```

## Language Controls Stemming Rules

```javascript
db.docs.createIndex(
  { content: "text" },
  { default_language: "english" }
)
```

Switching to `"german"` applies German stop words and German Snowball stemming. Use `"none"` to disable both:

```javascript
db.logs.createIndex(
  { message: "text" },
  { default_language: "none" }
)
```

## Bypassing Stop Words with Phrase Search

Phrase searches (double-quoted terms) still strip stop words from the phrase:

```javascript
// Searching for the exact phrase "to be or not to be" - stop words removed
db.posts.find({ $text: { $search: "\"to be or not\"" } })
// Only non-stop words are matched as a phrase
```

To match stop words as literals you must use `default_language: "none"` on the index.

## Identifying Matched Stems

Use `$meta: "textScore"` to rank results and infer which terms matched:

```javascript
db.posts.find(
  { $text: { $search: "index indexes indexing" } },
  { score: { $meta: "textScore" }, title: 1 }
).sort({ score: { $meta: "textScore" } })
```

Documents containing any stem variant score higher with each additional match.

## Practical Implications

| Behavior     | Effect on Search                                    |
|--------------|-----------------------------------------------------|
| Stop words   | Common words are ignored - stop-word-only queries return nothing |
| Stemming     | Plurals and tenses match - broader recall           |
| `"none"` lang | Exact token matching - good for IDs, log patterns  |

## Debugging Unexpected Non-Matches

If a query unexpectedly returns no results:
1. Check whether the search term is a stop word in the index language.
2. Verify the index language matches the document language.
3. Run `db.collection.getIndexes()` to confirm the text index exists on the right fields.

```javascript
db.posts.getIndexes().filter(i => i.key["_fts"] === "text")
```

## Summary

MongoDB text search removes stop words and applies language-specific stemming before storing and comparing tokens. This broadens recall by matching word variants but can surprise you when common words are silently dropped. Set `default_language: "none"` to disable both behaviors when working with technical or structured text data.
