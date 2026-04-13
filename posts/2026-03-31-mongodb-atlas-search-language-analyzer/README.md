# How to Use the Language Analyzer in MongoDB Atlas Search

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Atlas Search, Analyzer, Language, Stemming

Description: Learn how to use language-specific analyzers in MongoDB Atlas Search to enable stemming, stop word removal, and locale-aware tokenization for better search recall.

---

## What Are Language Analyzers?

Language analyzers in MongoDB Atlas Search are pre-built analyzers tuned for specific languages. Each language analyzer typically applies:

1. **Standard tokenization** - splits on whitespace and punctuation
2. **Lowercasing** - normalizes case
3. **Stop word removal** - removes high-frequency words (the, is, a, etc.)
4. **Stemming** - reduces words to their root form for better recall

Stemming is the key advantage over the standard analyzer. It enables a search for "running" to also match documents containing "run", "runs", and "studied" to match "study".

## Supported Language Analyzers

MongoDB Atlas Search supports the following language analyzers:

```text
lucene.arabic       lucene.armenian     lucene.basque
lucene.brazilian    lucene.bulgarian    lucene.catalan
lucene.cjk          lucene.czech
lucene.danish       lucene.dutch        lucene.english
lucene.finnish      lucene.french       lucene.galician
lucene.german       lucene.greek        lucene.hindi
lucene.hungarian    lucene.indonesian   lucene.irish
lucene.italian      lucene.japanese     lucene.korean
lucene.latvian      lucene.norwegian    lucene.persian
lucene.portuguese   lucene.romanian     lucene.russian
lucene.smartcn      lucene.sorani       lucene.spanish
lucene.swedish      lucene.turkish
```

## Configuring English Language Analyzer

```javascript
{
  "mappings": {
    "dynamic": false,
    "fields": {
      "title": {
        "type": "string",
        "analyzer": "lucene.english"
      },
      "body": {
        "type": "string",
        "analyzer": "lucene.english"
      }
    }
  }
}
```

## Stemming in Action

The English language analyzer uses the Snowball stemmer:

```text
Input document: "The researchers are studying distributed computing systems"

Tokens after lucene.english analysis:
["research", "studi", "distribut", "comput", "system"]
(stop words "the" and "are" removed; words stemmed to roots)
```

Now a search for "study" also matches documents containing "studied", "studies", and "studying":

```javascript
db.papers.aggregate([
  {
    $search: {
      index: "papers_search",
      text: {
        query: "studying distributed systems",
        path: ["title", "body"]
      }
    }
  },
  { $project: { title: 1, score: { $meta: "searchScore" } } },
  { $sort: { score: -1 } },
  { $limit: 10 }
])
```

## Multi-Language Content

For collections with mixed-language content, define separate fields per language or use the `dynamic` mapping with a fallback:

```javascript
{
  "mappings": {
    "dynamic": false,
    "fields": {
      "title_en": {
        "type": "string",
        "analyzer": "lucene.english"
      },
      "title_de": {
        "type": "string",
        "analyzer": "lucene.german"
      },
      "title_fr": {
        "type": "string",
        "analyzer": "lucene.french"
      }
    }
  }
}
```

Query the appropriate field based on the user's locale:

```javascript
async function searchByLocale(query, locale) {
  const fieldMap = { en: "title_en", de: "title_de", fr: "title_fr" };
  const path = fieldMap[locale] ?? "title_en";

  return db.collection("articles").aggregate([
    {
      $search: {
        index: "articles_search",
        text: { query, path }
      }
    },
    { $limit: 10 }
  ]).toArray();
}
```

## Language Analyzer vs. Standard Analyzer: When to Choose

```text
Use language analyzer when:
- Content is predominantly in one language
- Stemming improves recall for your users (e.g., "run" finds "running")
- Stop word removal reduces noise in results
- Search quality matters more than index size

Use standard analyzer when:
- Content is multilingual and mixed
- You need to match exact word forms
- The language is not in the supported list
- Technical terms or proper nouns must not be stemmed
```

## Combining Language and Keyword Analyzers

Index the same field with both analyzers for stemmed search and exact-match queries:

```javascript
{
  "mappings": {
    "fields": {
      "title": {
        "type": "string",
        "analyzer": "lucene.english",
        "multi": {
          "exact": {
            "type": "string",
            "analyzer": "lucene.keyword"
          }
        }
      }
    }
  }
}
```

## Summary

Language analyzers in MongoDB Atlas Search add stemming and stop word removal on top of the standard analyzer pipeline, tailored for specific languages. The English analyzer (`lucene.english`) is the most commonly used and significantly improves search recall by matching word variants. For multilingual collections, create separate language-specific fields and route queries to the appropriate field based on user locale. Use language analyzers when search quality and recall are more important than exact word matching.
