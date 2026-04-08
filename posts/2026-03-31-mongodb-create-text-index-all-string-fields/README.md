# How to Create a Text Index on All String Fields in MongoDB

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Index, Text Search, Full-Text Search, Performance

Description: Learn how to create a wildcard text index in MongoDB that covers all string fields, enabling full-text search across your entire document without specifying individual fields.

---

## What Is a Wildcard Text Index?

MongoDB supports full-text search through text indexes. Normally you define a text index on one or more specific fields. However, MongoDB also lets you create a text index on all string fields in a document using the special `$**` wildcard syntax.

This is useful when your documents have many string fields or when you want to search across everything without knowing the schema in advance.

## Creating a Text Index on All String Fields

To create a text index that covers every string field in a collection, use the `$**` wildcard:

```javascript
db.articles.createIndex({ "$**": "text" });
```

This single command instructs MongoDB to index all string fields in the `articles` collection, including nested strings within subdocuments and arrays.

## Querying with the Wildcard Text Index

Once the index exists, you use `$text` and `$search` as usual:

```javascript
db.articles.find({
  $text: { $search: "mongodb performance tuning" }
});
```

MongoDB will search across all string fields automatically. You can also sort by relevance score:

```javascript
db.articles.find(
  { $text: { $search: "index optimization" } },
  { score: { $meta: "textScore" } }
).sort({ score: { $meta: "textScore" } });
```

## Limitations and Caveats

While convenient, wildcard text indexes come with important constraints:

- **Only one text index per collection.** If you already have a text index on specific fields, you must drop it before creating the wildcard version.
- **Larger index size.** Because all string fields are indexed, the index will be larger than a targeted one.
- **No compound indexes.** You cannot combine a `$**` text index with regular index fields in a compound index.

Check the index size after creation:

```javascript
db.articles.stats().indexSizes;
```

## Dropping and Replacing an Existing Text Index

If you need to swap out an existing text index for a wildcard one:

```javascript
// List existing indexes to find the text index name
db.articles.getIndexes();

// Drop the old text index by name
db.articles.dropIndex("title_text_body_text");

// Create the wildcard text index
db.articles.createIndex({ "$**": "text" });
```

## Setting Language and Weights

You can still configure text index options with the wildcard form:

```javascript
db.articles.createIndex(
  { "$**": "text" },
  {
    default_language: "english",
    textIndexVersion: 3
  }
);
```

You can also assign field-level weights with the wildcard text index to boost specific fields:

```javascript
db.articles.createIndex(
  { "$**": "text" },
  {
    weights: {
      title: 10,
      body: 5
    },
    default_language: "english",
    textIndexVersion: 3
  }
);
```

Fields not listed in `weights` receive the default weight of 1.

## When to Use a Wildcard Text Index

Use a wildcard text index when:

- You have dynamic schemas where field names vary between documents.
- You want simple full-text search across all content without tuning specific fields.
- You are building a prototype or internal search tool and do not need fine-grained relevance tuning.

For production search with relevance scoring per field, prefer an explicit text index with named fields and weights.

## Summary

Creating a text index on all string fields in MongoDB is done with `db.collection.createIndex({ "$**": "text" })`. It provides broad full-text search coverage with minimal configuration but trades off index size efficiency and field-level weight control. This is an ideal starting point for full-text search on documents with variable or wide schemas.
