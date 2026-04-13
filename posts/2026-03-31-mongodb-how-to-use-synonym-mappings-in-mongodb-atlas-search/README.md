# How to Use Synonym Mappings in MongoDB Atlas Search

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Atlas Search, Synonym, Full-Text Search, Search Index

Description: Learn how to define and use synonym mappings in MongoDB Atlas Search to match equivalent terms and improve search recall for users.

---

## Why Synonyms Matter in Search

Users search using different words for the same concept: "sneakers" vs "trainers", "couch" vs "sofa", "phone" vs "mobile". Synonym mappings tell Atlas Search to treat these terms as equivalent.

## Synonym Collection Format

Create a collection to store synonym definitions. Atlas Search supports two formats:

### Equivalent Synonyms

All listed terms are interchangeable:

```javascript
db.synonyms.insertMany([
  {
    mappingType: "equivalent",
    synonyms: ["sofa", "couch", "settee"]
  },
  {
    mappingType: "equivalent",
    synonyms: ["sneakers", "trainers", "athletic shoes"]
  },
  {
    mappingType: "equivalent",
    synonyms: ["laptop", "notebook computer", "portable computer"]
  }
])
```

### Explicit Synonyms (One-Directional)

The input term expands to the mapped terms but not vice versa:

```javascript
db.synonyms.insertMany([
  {
    mappingType: "explicit",
    input: ["iphone"],
    synonyms: ["smartphone", "mobile phone", "apple phone"]
  },
  {
    mappingType: "explicit",
    input: ["sale", "discount"],
    synonyms: ["deal", "offer", "promotion", "clearance"]
  }
])
```

## Configuring the Synonym Source in the Index

In the Atlas UI or via the API, add the synonym source to your search index definition:

```json
{
  "synonyms": [
    {
      "name": "product_synonyms",
      "analyzer": "lucene.standard",
      "source": {
        "collection": "synonyms"
      }
    }
  ],
  "mappings": {
    "dynamic": true
  }
}
```

## Using Synonyms in a Search Query

Reference the synonym mapping name in your query:

```javascript
db.products.aggregate([
  {
    $search: {
      index: "default",
      text: {
        query: "sofa",
        path: "name",
        synonyms: "product_synonyms"
      }
    }
  },
  {
    $project: {
      name: 1,
      score: { $meta: "searchScore" }
    }
  },
  { $sort: { score: -1 } }
])
```

This query will also match documents containing "couch" and "settee".

## Combining Synonyms with Fuzzy Search

You cannot use `synonyms` and `fuzzy` together in the same `text` operator. To combine both capabilities, use a `compound` query with separate clauses:

```javascript
db.products.aggregate([
  {
    $search: {
      compound: {
        should: [
          {
            text: {
              query: "sneaker",
              path: "description",
              synonyms: "product_synonyms"
            }
          },
          {
            text: {
              query: "sneaker",
              path: "description",
              fuzzy: {
                maxEdits: 1,
                prefixLength: 3
              }
            }
          }
        ]
      }
    }
  }
])
```

## Updating Synonym Collections

You can update the synonyms collection at any time. Atlas Search picks up changes within a few minutes - no re-indexing required:

```javascript
// Add a new synonym group
db.synonyms.insertOne({
  mappingType: "equivalent",
  synonyms: ["tv", "television", "telly", "screen"]
})

// Update an existing group
db.synonyms.updateOne(
  { synonyms: "sneakers" },
  { $addToSet: { synonyms: "kicks" } }
)
```

## Summary

MongoDB Atlas Search synonym mappings are stored in a regular collection and referenced in the search index configuration. Equivalent mappings make all listed terms interchangeable, while explicit mappings expand specific input terms to a broader set. Updates to the synonyms collection take effect automatically without reindexing.
