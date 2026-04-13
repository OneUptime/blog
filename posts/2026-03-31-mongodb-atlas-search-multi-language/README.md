# How to Create Multi-Language Search with Atlas Search in MongoDB

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Atlas Search, Internationalization

Description: Configure MongoDB Atlas Search to handle multi-language content by mapping language-specific analyzers to fields and enabling cross-language query support.

---

When your application stores documents in multiple languages, a single analyzer produces poor results because stemming, stop-word lists, and tokenization rules differ per language. Atlas Search lets you assign different analyzers to different fields - or use a dynamic language approach - so each language is processed correctly.

## Approach 1: Separate Fields Per Language

Store each language variant in its own field and map each to the appropriate analyzer:

```json
{
  "mappings": {
    "dynamic": false,
    "fields": {
      "title_en": {
        "type": "string",
        "analyzer": "lucene.english"
      },
      "title_fr": {
        "type": "string",
        "analyzer": "lucene.french"
      },
      "title_de": {
        "type": "string",
        "analyzer": "lucene.german"
      },
      "title_ja": {
        "type": "string",
        "analyzer": "lucene.cjk"
      }
    }
  }
}
```

At query time, route the query to the field matching the user's language:

```javascript
const langField = userLocale ? `title_${userLocale}` : "title_en";

db.articles.aggregate([
  {
    $search: {
      index: "multilang_index",
      text: {
        query: userQuery,
        path: langField
      }
    }
  },
  { $limit: 10 }
])
```

## Approach 2: Multi-Analyzer on a Single Field

Use a `multi` mapping to index the same field content under multiple analyzers simultaneously:

```json
{
  "mappings": {
    "fields": {
      "title": {
        "type": "string",
        "analyzer": "lucene.standard",
        "multi": {
          "en": { "type": "string", "analyzer": "lucene.english" },
          "fr": { "type": "string", "analyzer": "lucene.french" },
          "de": { "type": "string", "analyzer": "lucene.german" }
        }
      }
    }
  }
}
```

Query the language-specific sub-field:

```javascript
db.articles.aggregate([
  {
    $search: {
      index: "multilang_index",
      text: {
        query: "artificial intelligence",
        path: "title.en"
      }
    }
  }
])
```

## Approach 3: Compound Query Across Languages

When you do not know the user's language, run a `compound` query across all language fields and take the highest-scoring result:

```javascript
db.articles.aggregate([
  {
    $search: {
      index: "multilang_index",
      compound: {
        should: [
          { text: { query: searchTerm, path: "title_en" } },
          { text: { query: searchTerm, path: "title_fr" } },
          { text: { query: searchTerm, path: "title_de" } }
        ]
      }
    }
  },
  { $limit: 10 }
])
```

## Available Language Analyzers

Atlas Search exposes standard Lucene language analyzers:

```text
lucene.arabic       lucene.armenian     lucene.basque
lucene.catalan      lucene.cjk          lucene.czech
lucene.danish        lucene.dutch        lucene.english
lucene.finnish       lucene.french       lucene.galician
lucene.german        lucene.greek        lucene.hindi
lucene.hungarian     lucene.indonesian   lucene.irish
lucene.italian       lucene.latvian      lucene.norwegian
lucene.persian       lucene.portuguese   lucene.romanian
lucene.russian       lucene.smartcn      lucene.sorani
lucene.spanish       lucene.swedish      lucene.turkish
```

## Handling CJK Languages

Chinese, Japanese, and Korean require special treatment because they do not use whitespace as token boundaries. Use `lucene.cjk` for mixed CJK content or `lucene.smartcn` for Chinese-specific processing:

```json
{
  "title_zh": {
    "type": "string",
    "analyzer": "lucene.smartcn"
  },
  "title_ja": {
    "type": "string",
    "analyzer": "lucene.cjk"
  }
}
```

## Summary

Multi-language Atlas Search works best with separate fields per language, each mapped to the appropriate Lucene language analyzer. Use a `multi` mapping when document content is always in one language but you want to support cross-language queries. Route queries to the correct language field based on user locale or use a `compound` query when the language is unknown.
