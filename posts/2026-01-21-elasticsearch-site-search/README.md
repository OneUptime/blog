# How to Implement Site Search with Elasticsearch

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Elasticsearch, Site Search, Website Search, Content Search, Full-Text Search, Implementation

Description: A comprehensive guide to implementing site search with Elasticsearch for websites and content management systems, covering content indexing, search features, relevance, and user experience optimization.

---

Site search enables users to find content across your website quickly. This guide covers building a comprehensive site search solution with Elasticsearch that handles various content types and delivers relevant results.

## Index Design for Site Content

### Content Mapping

```bash
curl -u elastic:password -X PUT "localhost:9200/site-content" -H 'Content-Type: application/json' -d'
{
  "settings": {
    "number_of_shards": 2,
    "number_of_replicas": 1,
    "analysis": {
      "analyzer": {
        "content_analyzer": {
          "type": "custom",
          "tokenizer": "standard",
          "filter": ["lowercase", "asciifolding", "english_possessive_stemmer", "english_stop", "english_stemmer"]
        },
        "path_analyzer": {
          "type": "custom",
          "tokenizer": "path_hierarchy"
        },
        "search_analyzer": {
          "type": "custom",
          "tokenizer": "standard",
          "filter": ["lowercase", "asciifolding", "english_stemmer"]
        }
      },
      "filter": {
        "english_possessive_stemmer": {
          "type": "stemmer",
          "language": "possessive_english"
        },
        "english_stop": {
          "type": "stop",
          "stopwords": "_english_"
        },
        "english_stemmer": {
          "type": "stemmer",
          "language": "english"
        }
      }
    }
  },
  "mappings": {
    "properties": {
      "url": {"type": "keyword"},
      "path": {
        "type": "text",
        "analyzer": "path_analyzer",
        "fields": {
          "keyword": {"type": "keyword"}
        }
      },
      "title": {
        "type": "text",
        "analyzer": "content_analyzer",
        "search_analyzer": "search_analyzer",
        "fields": {
          "keyword": {"type": "keyword"},
          "suggest": {
            "type": "completion"
          }
        }
      },
      "content": {
        "type": "text",
        "analyzer": "content_analyzer",
        "search_analyzer": "search_analyzer"
      },
      "excerpt": {
        "type": "text",
        "analyzer": "content_analyzer"
      },
      "meta_description": {
        "type": "text",
        "analyzer": "content_analyzer"
      },
      "content_type": {"type": "keyword"},
      "section": {"type": "keyword"},
      "tags": {"type": "keyword"},
      "author": {
        "type": "text",
        "fields": {
          "keyword": {"type": "keyword"}
        }
      },
      "published_at": {"type": "date"},
      "updated_at": {"type": "date"},
      "language": {"type": "keyword"},
      "word_count": {"type": "integer"},
      "read_time": {"type": "integer"},
      "image_url": {"type": "keyword"},
      "popularity": {"type": "float"},
      "boost": {"type": "float"}
    }
  }
}'
```

### Sample Content Documents

```bash
# Blog post
curl -u elastic:password -X POST "localhost:9200/site-content/_doc" -H 'Content-Type: application/json' -d'
{
  "url": "https://example.com/blog/getting-started-elasticsearch",
  "path": "/blog/getting-started-elasticsearch",
  "title": "Getting Started with Elasticsearch",
  "content": "Elasticsearch is a powerful distributed search engine. This guide covers installation, basic concepts, and your first queries...",
  "excerpt": "Learn how to get started with Elasticsearch, from installation to your first search query.",
  "meta_description": "A beginners guide to Elasticsearch covering installation and basic operations.",
  "content_type": "blog",
  "section": "tutorials",
  "tags": ["elasticsearch", "search", "tutorial", "beginners"],
  "author": "John Smith",
  "published_at": "2024-01-15T10:00:00Z",
  "updated_at": "2024-01-18T14:30:00Z",
  "language": "en",
  "word_count": 2500,
  "read_time": 12,
  "image_url": "https://example.com/images/elasticsearch-guide.jpg",
  "popularity": 85.5,
  "boost": 1.0
}'

# Documentation page
curl -u elastic:password -X POST "localhost:9200/site-content/_doc" -H 'Content-Type: application/json' -d'
{
  "url": "https://example.com/docs/api/search",
  "path": "/docs/api/search",
  "title": "Search API Reference",
  "content": "The Search API allows you to execute search queries and receive matching documents. Parameters include query, filters, pagination...",
  "excerpt": "Complete reference for the Search API including all parameters and examples.",
  "meta_description": "Search API documentation with parameters, examples, and best practices.",
  "content_type": "documentation",
  "section": "api-reference",
  "tags": ["api", "search", "reference"],
  "author": "Documentation Team",
  "published_at": "2024-01-10T08:00:00Z",
  "updated_at": "2024-01-20T16:00:00Z",
  "language": "en",
  "word_count": 1800,
  "read_time": 8,
  "popularity": 92.0,
  "boost": 1.2
}'
```

## Basic Site Search

### Simple Search Query

```bash
curl -u elastic:password -X GET "localhost:9200/site-content/_search?pretty" -H 'Content-Type: application/json' -d'
{
  "query": {
    "multi_match": {
      "query": "elasticsearch tutorial",
      "fields": ["title^3", "content", "excerpt^2", "tags^2"],
      "type": "best_fields",
      "fuzziness": "AUTO"
    }
  },
  "_source": ["url", "title", "excerpt", "content_type", "published_at", "image_url"],
  "highlight": {
    "fields": {
      "content": {
        "fragment_size": 150,
        "number_of_fragments": 3
      },
      "title": {}
    },
    "pre_tags": ["<mark>"],
    "post_tags": ["</mark>"]
  }
}'
```

### Search with Content Type Filter

```bash
curl -u elastic:password -X GET "localhost:9200/site-content/_search?pretty" -H 'Content-Type: application/json' -d'
{
  "query": {
    "bool": {
      "must": [
        {
          "multi_match": {
            "query": "api reference",
            "fields": ["title^3", "content", "excerpt^2"]
          }
        }
      ],
      "filter": [
        {"term": {"content_type": "documentation"}},
        {"term": {"language": "en"}}
      ]
    }
  }
}'
```

## Advanced Search Features

### Search with Boosting

```bash
curl -u elastic:password -X GET "localhost:9200/site-content/_search?pretty" -H 'Content-Type: application/json' -d'
{
  "query": {
    "function_score": {
      "query": {
        "multi_match": {
          "query": "search implementation",
          "fields": ["title^3", "content", "excerpt^2", "tags"]
        }
      },
      "functions": [
        {
          "field_value_factor": {
            "field": "boost",
            "factor": 1,
            "missing": 1
          }
        },
        {
          "field_value_factor": {
            "field": "popularity",
            "factor": 0.01,
            "modifier": "log1p",
            "missing": 1
          }
        },
        {
          "gauss": {
            "published_at": {
              "origin": "now",
              "scale": "30d",
              "decay": 0.5
            }
          },
          "weight": 1.5
        },
        {
          "filter": {"term": {"content_type": "documentation"}},
          "weight": 1.3
        }
      ],
      "score_mode": "multiply",
      "boost_mode": "multiply"
    }
  }
}'
```

### Phrase Search with Slop

```bash
curl -u elastic:password -X GET "localhost:9200/site-content/_search?pretty" -H 'Content-Type: application/json' -d'
{
  "query": {
    "bool": {
      "should": [
        {
          "match_phrase": {
            "content": {
              "query": "search engine optimization",
              "slop": 2,
              "boost": 2
            }
          }
        },
        {
          "match": {
            "content": {
              "query": "search engine optimization",
              "operator": "and"
            }
          }
        }
      ]
    }
  }
}'
```

### Search Across Sections

```bash
curl -u elastic:password -X GET "localhost:9200/site-content/_search?pretty" -H 'Content-Type: application/json' -d'
{
  "query": {
    "bool": {
      "must": [
        {"match": {"content": "configuration"}}
      ],
      "should": [
        {"term": {"section": {"value": "documentation", "boost": 2}}},
        {"term": {"section": {"value": "tutorials", "boost": 1.5}}}
      ]
    }
  },
  "aggs": {
    "by_section": {
      "terms": {
        "field": "section",
        "size": 10
      }
    },
    "by_content_type": {
      "terms": {
        "field": "content_type",
        "size": 10
      }
    }
  }
}'
```

## Search Suggestions and Autocomplete

### Did You Mean (Suggestions)

```bash
curl -u elastic:password -X GET "localhost:9200/site-content/_search?pretty" -H 'Content-Type: application/json' -d'
{
  "query": {
    "match": {
      "content": "elasticsearh"
    }
  },
  "suggest": {
    "text": "elasticsearh tutoral",
    "simple_phrase": {
      "phrase": {
        "field": "content",
        "size": 3,
        "gram_size": 2,
        "direct_generator": [{
          "field": "content",
          "suggest_mode": "popular"
        }]
      }
    }
  }
}'
```

### Title Completion Suggester

```bash
curl -u elastic:password -X GET "localhost:9200/site-content/_search?pretty" -H 'Content-Type: application/json' -d'
{
  "suggest": {
    "title_suggestions": {
      "prefix": "getting star",
      "completion": {
        "field": "title.suggest",
        "size": 10,
        "skip_duplicates": true,
        "fuzzy": {
          "fuzziness": "AUTO"
        }
      }
    }
  }
}'
```

### Popular Searches

Track and display popular searches:

```bash
# Create popular searches index
curl -u elastic:password -X PUT "localhost:9200/popular-searches" -H 'Content-Type: application/json' -d'
{
  "mappings": {
    "properties": {
      "query": {"type": "keyword"},
      "count": {"type": "integer"},
      "last_searched": {"type": "date"}
    }
  }
}'

# Update search count
curl -u elastic:password -X POST "localhost:9200/popular-searches/_update/elasticsearch-tutorial" -H 'Content-Type: application/json' -d'
{
  "script": {
    "source": "ctx._source.count += 1; ctx._source.last_searched = params.now",
    "params": {"now": "2024-01-21T10:00:00Z"}
  },
  "upsert": {
    "query": "elasticsearch tutorial",
    "count": 1,
    "last_searched": "2024-01-21T10:00:00Z"
  }
}'
```

## Faceted Navigation

### Content Facets

```bash
curl -u elastic:password -X GET "localhost:9200/site-content/_search?pretty" -H 'Content-Type: application/json' -d'
{
  "size": 20,
  "query": {
    "multi_match": {
      "query": "kubernetes deployment",
      "fields": ["title^3", "content", "tags"]
    }
  },
  "aggs": {
    "content_types": {
      "terms": {
        "field": "content_type",
        "size": 10
      }
    },
    "sections": {
      "terms": {
        "field": "section",
        "size": 10
      }
    },
    "tags": {
      "terms": {
        "field": "tags",
        "size": 20
      }
    },
    "authors": {
      "terms": {
        "field": "author.keyword",
        "size": 10
      }
    },
    "date_histogram": {
      "date_histogram": {
        "field": "published_at",
        "calendar_interval": "month",
        "format": "yyyy-MM",
        "min_doc_count": 1
      }
    }
  },
  "_source": ["url", "title", "excerpt", "content_type", "published_at"]
}'
```

## Search Results Highlighting

### Advanced Highlighting

```bash
curl -u elastic:password -X GET "localhost:9200/site-content/_search?pretty" -H 'Content-Type: application/json' -d'
{
  "query": {
    "multi_match": {
      "query": "elasticsearch performance tuning",
      "fields": ["title^3", "content", "excerpt"]
    }
  },
  "highlight": {
    "type": "unified",
    "fields": {
      "title": {
        "number_of_fragments": 0
      },
      "content": {
        "fragment_size": 200,
        "number_of_fragments": 3,
        "fragmenter": "span"
      },
      "excerpt": {
        "number_of_fragments": 0
      }
    },
    "pre_tags": ["<strong class=\"highlight\">"],
    "post_tags": ["</strong>"],
    "encoder": "html"
  },
  "_source": ["url", "title", "content_type", "published_at", "image_url"]
}'
```

## Path-Based Search

### Search Within Section

```bash
curl -u elastic:password -X GET "localhost:9200/site-content/_search?pretty" -H 'Content-Type: application/json' -d'
{
  "query": {
    "bool": {
      "must": [
        {"match": {"content": "authentication"}}
      ],
      "filter": [
        {"prefix": {"path.keyword": "/docs/security"}}
      ]
    }
  }
}'
```

### Path Aggregation

```bash
curl -u elastic:password -X GET "localhost:9200/site-content/_search?pretty" -H 'Content-Type: application/json' -d'
{
  "size": 0,
  "aggs": {
    "paths": {
      "terms": {
        "field": "path",
        "size": 20,
        "include": "/[^/]+/[^/]+"
      }
    }
  }
}'
```

## Zero Results Handling

### Fallback Search Strategy

```bash
# Primary search with relaxed fallback
curl -u elastic:password -X GET "localhost:9200/site-content/_search?pretty" -H 'Content-Type: application/json' -d'
{
  "query": {
    "bool": {
      "should": [
        {
          "multi_match": {
            "query": "kubernetes helm charts",
            "fields": ["title^3", "content", "tags"],
            "type": "phrase",
            "boost": 3
          }
        },
        {
          "multi_match": {
            "query": "kubernetes helm charts",
            "fields": ["title^3", "content", "tags"],
            "operator": "and",
            "boost": 2
          }
        },
        {
          "multi_match": {
            "query": "kubernetes helm charts",
            "fields": ["title^3", "content", "tags"],
            "operator": "or",
            "minimum_should_match": "2<75%"
          }
        }
      ]
    }
  }
}'
```

## Performance Optimization

### Search Template

```bash
# Create search template
curl -u elastic:password -X PUT "localhost:9200/_scripts/site-search" -H 'Content-Type: application/json' -d'
{
  "script": {
    "lang": "mustache",
    "source": {
      "query": {
        "function_score": {
          "query": {
            "bool": {
              "must": [
                {
                  "multi_match": {
                    "query": "{{query}}",
                    "fields": ["title^3", "content", "excerpt^2", "tags"],
                    "fuzziness": "AUTO"
                  }
                }
              ],
              "filter": [
                {{#content_type}}
                {"term": {"content_type": "{{content_type}}"}}
                {{/content_type}}
              ]
            }
          },
          "functions": [
            {
              "field_value_factor": {
                "field": "popularity",
                "factor": 0.01,
                "modifier": "log1p",
                "missing": 1
              }
            }
          ]
        }
      },
      "from": "{{from}}{{^from}}0{{/from}}",
      "size": "{{size}}{{^size}}20{{/size}}",
      "_source": ["url", "title", "excerpt", "content_type", "published_at"],
      "highlight": {
        "fields": {
          "content": {"fragment_size": 150, "number_of_fragments": 2}
        }
      }
    }
  }
}'

# Use search template
curl -u elastic:password -X GET "localhost:9200/site-content/_search/template?pretty" -H 'Content-Type: application/json' -d'
{
  "id": "site-search",
  "params": {
    "query": "elasticsearch tutorial",
    "content_type": "blog",
    "from": 0,
    "size": 10
  }
}'
```

### Caching Configuration

```bash
curl -u elastic:password -X PUT "localhost:9200/site-content/_settings" -H 'Content-Type: application/json' -d'
{
  "index.requests.cache.enable": true
}'
```

## Python Implementation

```python
from elasticsearch import Elasticsearch
from typing import Dict, List, Optional
import re

class SiteSearch:
    def __init__(self, hosts: List[str], auth: tuple):
        self.es = Elasticsearch(hosts, basic_auth=auth)
        self.index = "site-content"

    def search(
        self,
        query: str,
        content_type: Optional[str] = None,
        section: Optional[str] = None,
        tags: Optional[List[str]] = None,
        page: int = 1,
        size: int = 20
    ) -> Dict:
        must = []
        filter_clauses = []

        if query:
            must.append({
                "multi_match": {
                    "query": query,
                    "fields": ["title^3", "content", "excerpt^2", "tags^2"],
                    "type": "best_fields",
                    "fuzziness": "AUTO"
                }
            })

        if content_type:
            filter_clauses.append({"term": {"content_type": content_type}})
        if section:
            filter_clauses.append({"term": {"section": section}})
        if tags:
            filter_clauses.append({"terms": {"tags": tags}})

        search_body = {
            "query": {
                "function_score": {
                    "query": {
                        "bool": {
                            "must": must if must else [{"match_all": {}}],
                            "filter": filter_clauses
                        }
                    },
                    "functions": [
                        {
                            "field_value_factor": {
                                "field": "boost",
                                "factor": 1,
                                "missing": 1
                            }
                        },
                        {
                            "field_value_factor": {
                                "field": "popularity",
                                "factor": 0.01,
                                "modifier": "log1p",
                                "missing": 1
                            }
                        },
                        {
                            "gauss": {
                                "published_at": {
                                    "origin": "now",
                                    "scale": "60d",
                                    "decay": 0.5
                                }
                            },
                            "weight": 1.2
                        }
                    ],
                    "score_mode": "multiply"
                }
            },
            "aggs": {
                "content_types": {"terms": {"field": "content_type", "size": 10}},
                "sections": {"terms": {"field": "section", "size": 10}},
                "tags": {"terms": {"field": "tags", "size": 20}}
            },
            "highlight": {
                "fields": {
                    "title": {"number_of_fragments": 0},
                    "content": {"fragment_size": 150, "number_of_fragments": 2}
                },
                "pre_tags": ["<mark>"],
                "post_tags": ["</mark>"]
            },
            "suggest": {
                "text": query,
                "did_you_mean": {
                    "phrase": {
                        "field": "content",
                        "size": 1,
                        "gram_size": 3,
                        "direct_generator": [{
                            "field": "content",
                            "suggest_mode": "popular"
                        }]
                    }
                }
            },
            "from": (page - 1) * size,
            "size": size,
            "_source": ["url", "title", "excerpt", "content_type", "section",
                       "published_at", "author", "image_url", "read_time"]
        }

        return self.es.search(index=self.index, body=search_body)

    def autocomplete(self, prefix: str, size: int = 10) -> List[str]:
        search_body = {
            "suggest": {
                "title_suggestions": {
                    "prefix": prefix,
                    "completion": {
                        "field": "title.suggest",
                        "size": size,
                        "skip_duplicates": True,
                        "fuzzy": {"fuzziness": "AUTO"}
                    }
                }
            }
        }

        result = self.es.search(index=self.index, body=search_body)
        suggestions = result.get("suggest", {}).get("title_suggestions", [{}])[0]
        return [option["text"] for option in suggestions.get("options", [])]

    def format_results(self, response: Dict) -> Dict:
        hits = response["hits"]["hits"]
        total = response["hits"]["total"]["value"]

        results = []
        for hit in hits:
            source = hit["_source"]
            result = {
                "url": source.get("url"),
                "title": source.get("title"),
                "excerpt": source.get("excerpt"),
                "content_type": source.get("content_type"),
                "published_at": source.get("published_at"),
                "score": hit["_score"]
            }

            if "highlight" in hit:
                result["highlight"] = hit["highlight"]

            results.append(result)

        return {
            "total": total,
            "results": results,
            "facets": {
                "content_types": response["aggregations"]["content_types"]["buckets"],
                "sections": response["aggregations"]["sections"]["buckets"],
                "tags": response["aggregations"]["tags"]["buckets"]
            },
            "suggestions": response.get("suggest", {})
        }

# Usage
search = SiteSearch(["http://localhost:9200"], ("elastic", "password"))
response = search.search(
    query="kubernetes deployment",
    content_type="documentation",
    page=1
)
formatted = search.format_results(response)
print(f"Found {formatted['total']} results")
```

## Content Indexing Pipeline

### Ingest Pipeline for HTML Stripping

```bash
curl -u elastic:password -X PUT "localhost:9200/_ingest/pipeline/site-content-pipeline" -H 'Content-Type: application/json' -d'
{
  "processors": [
    {
      "html_strip": {
        "field": "content",
        "target_field": "content"
      }
    },
    {
      "set": {
        "field": "word_count",
        "value": "{{content}}",
        "override": false
      }
    },
    {
      "script": {
        "source": "ctx.word_count = ctx.content.split(\" \").length"
      }
    },
    {
      "script": {
        "source": "ctx.read_time = (int) Math.ceil(ctx.word_count / 200.0)"
      }
    },
    {
      "set": {
        "field": "indexed_at",
        "value": "{{_ingest.timestamp}}"
      }
    }
  ]
}'
```

## Summary

Implementing site search with Elasticsearch involves:

1. **Index design** - Proper mapping with analyzers for content fields
2. **Search queries** - Multi-match with boosting and relevance tuning
3. **Faceted navigation** - Aggregations for filtering content
4. **Autocomplete** - Completion suggesters and "did you mean"
5. **Highlighting** - Show relevant snippets in results
6. **Performance** - Templates, caching, and query optimization

With these techniques, you can build a fast, relevant site search that helps users find content quickly across your website.
