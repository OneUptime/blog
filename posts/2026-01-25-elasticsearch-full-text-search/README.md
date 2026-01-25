# How to Implement Full-Text Search in Elasticsearch

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Elasticsearch, Full-Text Search, Search, Text Analysis, Relevance, Scoring

Description: Learn how to build powerful full-text search functionality in Elasticsearch, covering text analysis, relevance tuning, fuzzy matching, highlighting, and best practices for search quality.

---

> Full-text search is what makes Elasticsearch shine. Unlike simple keyword matching, full-text search understands language - it handles synonyms, typos, stemming, and relevance ranking. This guide shows you how to build search experiences that feel intelligent.

Whether you're building a product search, document repository, or knowledge base, these techniques will help you deliver results users actually want.

---

## Prerequisites

Before we start, ensure you have:
- Elasticsearch 8.x running
- Basic understanding of mappings and analyzers
- curl or Kibana Dev Tools

---

## Understanding Text Analysis

When you index text in Elasticsearch, it goes through an analysis pipeline that breaks text into searchable tokens.

```mermaid
graph LR
    A[Input Text] --> B[Character Filters]
    B --> C[Tokenizer]
    C --> D[Token Filters]
    D --> E[Indexed Tokens]

    subgraph "Analysis Pipeline"
        B
        C
        D
    end
```

Let's see this in action:

```bash
# Analyze text to see how it's tokenized
curl -X POST "localhost:9200/_analyze?pretty" -H 'Content-Type: application/json' -d'
{
  "analyzer": "standard",
  "text": "The Quick Brown Fox jumps over the lazy DOG!"
}'

# Output shows tokens: [the, quick, brown, fox, jumps, over, the, lazy, dog]
```

---

## Setting Up an Index for Full-Text Search

Create an index with proper mappings and custom analyzers for search:

```bash
# Create an index optimized for full-text search
curl -X PUT "localhost:9200/articles" -H 'Content-Type: application/json' -d'
{
  "settings": {
    "number_of_shards": 3,
    "number_of_replicas": 1,
    "analysis": {
      "analyzer": {
        "content_analyzer": {
          "type": "custom",
          "tokenizer": "standard",
          "filter": [
            "lowercase",
            "english_stop",
            "english_stemmer",
            "asciifolding"
          ]
        },
        "search_analyzer": {
          "type": "custom",
          "tokenizer": "standard",
          "filter": [
            "lowercase",
            "english_stop",
            "english_stemmer"
          ]
        }
      },
      "filter": {
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
      "title": {
        "type": "text",
        "analyzer": "content_analyzer",
        "search_analyzer": "search_analyzer",
        "fields": {
          "keyword": {
            "type": "keyword"
          },
          "autocomplete": {
            "type": "text",
            "analyzer": "autocomplete_analyzer"
          }
        }
      },
      "content": {
        "type": "text",
        "analyzer": "content_analyzer",
        "search_analyzer": "search_analyzer"
      },
      "author": {
        "type": "keyword"
      },
      "tags": {
        "type": "keyword"
      },
      "published_at": {
        "type": "date"
      }
    }
  }
}'
```

---

## Indexing Documents

Add some sample documents to search:

```bash
# Index sample articles
curl -X POST "localhost:9200/articles/_bulk" -H 'Content-Type: application/json' -d'
{"index": {"_id": "1"}}
{"title": "Introduction to Machine Learning", "content": "Machine learning is a subset of artificial intelligence that enables computers to learn from data without being explicitly programmed. This article covers supervised and unsupervised learning techniques.", "author": "John Smith", "tags": ["AI", "ML", "tutorial"], "published_at": "2024-06-15"}
{"index": {"_id": "2"}}
{"title": "Deep Learning with Neural Networks", "content": "Neural networks form the foundation of deep learning. This guide explores convolutional neural networks (CNNs) for image recognition and recurrent neural networks (RNNs) for sequence data.", "author": "Jane Doe", "tags": ["AI", "deep-learning", "neural-networks"], "published_at": "2024-07-20"}
{"index": {"_id": "3"}}
{"title": "Natural Language Processing Basics", "content": "Natural language processing (NLP) allows computers to understand human language. Learn about tokenization, named entity recognition, and sentiment analysis in this comprehensive guide.", "author": "Bob Wilson", "tags": ["NLP", "AI", "text-processing"], "published_at": "2024-08-10"}
{"index": {"_id": "4"}}
{"title": "Building Search Engines with Elasticsearch", "content": "Elasticsearch provides powerful full-text search capabilities. This tutorial covers indexing documents, writing queries, and tuning relevance for optimal search results.", "author": "Alice Brown", "tags": ["elasticsearch", "search", "tutorial"], "published_at": "2024-09-01"}
{"index": {"_id": "5"}}
{"title": "Data Science with Python", "content": "Python has become the go-to language for data science. Explore pandas for data manipulation, matplotlib for visualization, and scikit-learn for machine learning algorithms.", "author": "John Smith", "tags": ["python", "data-science", "tutorial"], "published_at": "2024-09-15"}
'
```

---

## Basic Full-Text Search

Start with simple match queries:

```bash
# Simple full-text search
curl -X GET "localhost:9200/articles/_search?pretty" -H 'Content-Type: application/json' -d'
{
  "query": {
    "match": {
      "content": "machine learning"
    }
  }
}'

# Search across multiple fields
curl -X GET "localhost:9200/articles/_search?pretty" -H 'Content-Type: application/json' -d'
{
  "query": {
    "multi_match": {
      "query": "neural networks deep learning",
      "fields": ["title^2", "content"],
      "type": "best_fields"
    }
  }
}'
```

---

## Phrase Matching

When word order matters, use phrase queries:

```bash
# Exact phrase match
curl -X GET "localhost:9200/articles/_search?pretty" -H 'Content-Type: application/json' -d'
{
  "query": {
    "match_phrase": {
      "content": "machine learning"
    }
  }
}'

# Phrase with slop - allows words between terms
curl -X GET "localhost:9200/articles/_search?pretty" -H 'Content-Type: application/json' -d'
{
  "query": {
    "match_phrase": {
      "content": {
        "query": "neural networks image",
        "slop": 3
      }
    }
  }
}'
```

---

## Fuzzy Matching for Typo Tolerance

Handle user typos with fuzzy matching:

```bash
# Fuzzy match - handles typos like "machin lerning"
curl -X GET "localhost:9200/articles/_search?pretty" -H 'Content-Type: application/json' -d'
{
  "query": {
    "match": {
      "content": {
        "query": "machin lerning",
        "fuzziness": "AUTO"
      }
    }
  }
}'

# Fuzzy with prefix length - first N characters must match exactly
curl -X GET "localhost:9200/articles/_search?pretty" -H 'Content-Type: application/json' -d'
{
  "query": {
    "match": {
      "title": {
        "query": "elasticsearc",
        "fuzziness": 2,
        "prefix_length": 3
      }
    }
  }
}'

# Fuzzy term query
curl -X GET "localhost:9200/articles/_search?pretty" -H 'Content-Type: application/json' -d'
{
  "query": {
    "fuzzy": {
      "title": {
        "value": "netural",
        "fuzziness": 2
      }
    }
  }
}'
```

---

## Highlighting Search Results

Show users why a result matched by highlighting matching terms:

```bash
# Basic highlighting
curl -X GET "localhost:9200/articles/_search?pretty" -H 'Content-Type: application/json' -d'
{
  "query": {
    "match": {
      "content": "machine learning data"
    }
  },
  "highlight": {
    "fields": {
      "content": {}
    }
  }
}'

# Custom highlight tags
curl -X GET "localhost:9200/articles/_search?pretty" -H 'Content-Type: application/json' -d'
{
  "query": {
    "multi_match": {
      "query": "neural networks",
      "fields": ["title", "content"]
    }
  },
  "highlight": {
    "pre_tags": ["<mark>"],
    "post_tags": ["</mark>"],
    "fields": {
      "title": {},
      "content": {
        "fragment_size": 150,
        "number_of_fragments": 3
      }
    }
  }
}'

# Highlight with matched_fields for cross-field matching
curl -X GET "localhost:9200/articles/_search?pretty" -H 'Content-Type: application/json' -d'
{
  "query": {
    "multi_match": {
      "query": "python data science",
      "fields": ["title", "content"],
      "type": "cross_fields"
    }
  },
  "highlight": {
    "fields": {
      "content": {
        "type": "unified",
        "fragment_size": 200
      }
    }
  }
}'
```

---

## Relevance Tuning

Control how search results are ranked:

```bash
# Boost title matches over content
curl -X GET "localhost:9200/articles/_search?pretty" -H 'Content-Type: application/json' -d'
{
  "query": {
    "multi_match": {
      "query": "machine learning",
      "fields": ["title^3", "content"]
    }
  }
}'

# Function score for complex relevance
curl -X GET "localhost:9200/articles/_search?pretty" -H 'Content-Type: application/json' -d'
{
  "query": {
    "function_score": {
      "query": {
        "multi_match": {
          "query": "machine learning",
          "fields": ["title", "content"]
        }
      },
      "functions": [
        {
          "gauss": {
            "published_at": {
              "origin": "now",
              "scale": "30d",
              "decay": 0.5
            }
          }
        },
        {
          "field_value_factor": {
            "field": "popularity",
            "factor": 1.2,
            "modifier": "log1p",
            "missing": 1
          }
        }
      ],
      "score_mode": "sum",
      "boost_mode": "multiply"
    }
  }
}'

# Decay function for freshness boost
curl -X GET "localhost:9200/articles/_search?pretty" -H 'Content-Type: application/json' -d'
{
  "query": {
    "function_score": {
      "query": {
        "match": {
          "content": "tutorial"
        }
      },
      "functions": [
        {
          "exp": {
            "published_at": {
              "origin": "now",
              "scale": "10d",
              "offset": "5d",
              "decay": 0.5
            }
          }
        }
      ]
    }
  }
}'
```

---

## Combining Search with Filters

Mix full-text search with structured filters:

```bash
# Full-text search with filters
curl -X GET "localhost:9200/articles/_search?pretty" -H 'Content-Type: application/json' -d'
{
  "query": {
    "bool": {
      "must": [
        {
          "multi_match": {
            "query": "learning",
            "fields": ["title^2", "content"]
          }
        }
      ],
      "filter": [
        {
          "term": {
            "author": "John Smith"
          }
        },
        {
          "range": {
            "published_at": {
              "gte": "2024-01-01"
            }
          }
        }
      ],
      "should": [
        {
          "term": {
            "tags": "tutorial"
          }
        }
      ]
    }
  }
}'
```

---

## Synonym Support

Configure synonyms for better recall:

```bash
# Create index with synonyms
curl -X PUT "localhost:9200/articles_v2" -H 'Content-Type: application/json' -d'
{
  "settings": {
    "analysis": {
      "analyzer": {
        "synonym_analyzer": {
          "tokenizer": "standard",
          "filter": [
            "lowercase",
            "synonym_filter"
          ]
        }
      },
      "filter": {
        "synonym_filter": {
          "type": "synonym",
          "synonyms": [
            "machine learning, ML, artificial intelligence, AI",
            "neural network, deep learning, DL",
            "natural language processing, NLP",
            "quick, fast, speedy",
            "big, large, huge"
          ]
        }
      }
    }
  },
  "mappings": {
    "properties": {
      "content": {
        "type": "text",
        "analyzer": "synonym_analyzer"
      }
    }
  }
}'

# Now searching for "ML" will also find "machine learning"
curl -X GET "localhost:9200/articles_v2/_search?pretty" -H 'Content-Type: application/json' -d'
{
  "query": {
    "match": {
      "content": "ML tutorial"
    }
  }
}'
```

---

## Search Suggestions

Implement "did you mean" functionality:

```bash
# Term suggester for spelling corrections
curl -X GET "localhost:9200/articles/_search?pretty" -H 'Content-Type: application/json' -d'
{
  "suggest": {
    "text": "machin lerning tutrial",
    "spell_check": {
      "term": {
        "field": "content",
        "suggest_mode": "popular"
      }
    }
  }
}'

# Phrase suggester for multi-word corrections
curl -X GET "localhost:9200/articles/_search?pretty" -H 'Content-Type: application/json' -d'
{
  "suggest": {
    "text": "neural netork deep lerning",
    "phrase_suggestion": {
      "phrase": {
        "field": "content",
        "size": 3,
        "gram_size": 2,
        "direct_generator": [
          {
            "field": "content",
            "suggest_mode": "popular"
          }
        ]
      }
    }
  }
}'
```

---

## Complete Search Service in Python

Here's a production-ready search service:

```python
from elasticsearch import Elasticsearch
from typing import List, Dict, Any, Optional
from dataclasses import dataclass
from datetime import datetime

@dataclass
class SearchResult:
    id: str
    title: str
    content_snippet: str
    score: float
    highlights: Dict[str, List[str]]
    metadata: Dict[str, Any]

@dataclass
class SearchResponse:
    results: List[SearchResult]
    total: int
    took_ms: int
    suggestions: List[str]

class FullTextSearchService:
    def __init__(self, hosts: List[str], index_name: str):
        self.es = Elasticsearch(hosts)
        self.index = index_name

    def search(
        self,
        query: str,
        filters: Optional[Dict[str, Any]] = None,
        page: int = 1,
        page_size: int = 10,
        fuzzy: bool = True,
        highlight: bool = True,
        boost_recent: bool = True
    ) -> SearchResponse:
        """
        Perform full-text search with optional filters and highlighting.

        Args:
            query: The search query string
            filters: Dictionary of field:value filters
            page: Page number (1-indexed)
            page_size: Results per page
            fuzzy: Enable fuzzy matching for typos
            highlight: Return highlighted snippets
            boost_recent: Boost more recent documents
        """

        # Build the main query
        should_clauses = []

        # Title match with high boost
        title_match = {
            "match": {
                "title": {
                    "query": query,
                    "boost": 3
                }
            }
        }
        if fuzzy:
            title_match["match"]["title"]["fuzziness"] = "AUTO"
        should_clauses.append(title_match)

        # Content match
        content_match = {
            "match": {
                "content": {
                    "query": query,
                    "boost": 1
                }
            }
        }
        if fuzzy:
            content_match["match"]["content"]["fuzziness"] = "AUTO"
        should_clauses.append(content_match)

        # Phrase match for exact matches (higher boost)
        should_clauses.append({
            "match_phrase": {
                "title": {
                    "query": query,
                    "boost": 5
                }
            }
        })

        # Build bool query
        bool_query = {
            "should": should_clauses,
            "minimum_should_match": 1
        }

        # Add filters
        if filters:
            bool_query["filter"] = []
            for field, value in filters.items():
                if isinstance(value, list):
                    bool_query["filter"].append({"terms": {field: value}})
                elif isinstance(value, dict):
                    # Range filter
                    bool_query["filter"].append({"range": {field: value}})
                else:
                    bool_query["filter"].append({"term": {field: value}})

        # Wrap in function_score for recency boost
        if boost_recent:
            search_query = {
                "function_score": {
                    "query": {"bool": bool_query},
                    "functions": [
                        {
                            "gauss": {
                                "published_at": {
                                    "origin": "now",
                                    "scale": "30d",
                                    "decay": 0.5
                                }
                            }
                        }
                    ],
                    "boost_mode": "multiply"
                }
            }
        else:
            search_query = {"bool": bool_query}

        # Build search body
        body = {
            "query": search_query,
            "from": (page - 1) * page_size,
            "size": page_size,
            "_source": ["title", "author", "tags", "published_at"]
        }

        # Add highlighting
        if highlight:
            body["highlight"] = {
                "pre_tags": ["<em>"],
                "post_tags": ["</em>"],
                "fields": {
                    "title": {},
                    "content": {
                        "fragment_size": 200,
                        "number_of_fragments": 2
                    }
                }
            }

        # Add suggestions
        body["suggest"] = {
            "text": query,
            "spelling": {
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

        # Execute search
        response = self.es.search(index=self.index, body=body)

        # Parse results
        results = []
        for hit in response["hits"]["hits"]:
            highlights = hit.get("highlight", {})

            # Get content snippet from highlight or truncate source
            if "content" in highlights:
                snippet = " ... ".join(highlights["content"])
            else:
                snippet = hit["_source"].get("content", "")[:200] + "..."

            results.append(SearchResult(
                id=hit["_id"],
                title=hit["_source"]["title"],
                content_snippet=snippet,
                score=hit["_score"],
                highlights=highlights,
                metadata={
                    "author": hit["_source"].get("author"),
                    "tags": hit["_source"].get("tags", []),
                    "published_at": hit["_source"].get("published_at")
                }
            ))

        # Parse suggestions
        suggestions = []
        if "suggest" in response:
            for suggestion in response["suggest"].get("spelling", []):
                for option in suggestion.get("options", []):
                    suggestions.append(option["text"])

        return SearchResponse(
            results=results,
            total=response["hits"]["total"]["value"],
            took_ms=response["took"],
            suggestions=suggestions
        )

    def more_like_this(self, doc_id: str, limit: int = 5) -> List[SearchResult]:
        """Find similar documents based on content"""

        body = {
            "query": {
                "more_like_this": {
                    "fields": ["title", "content"],
                    "like": [
                        {
                            "_index": self.index,
                            "_id": doc_id
                        }
                    ],
                    "min_term_freq": 1,
                    "min_doc_freq": 1
                }
            },
            "size": limit,
            "_source": ["title", "author", "published_at"]
        }

        response = self.es.search(index=self.index, body=body)

        results = []
        for hit in response["hits"]["hits"]:
            results.append(SearchResult(
                id=hit["_id"],
                title=hit["_source"]["title"],
                content_snippet="",
                score=hit["_score"],
                highlights={},
                metadata={
                    "author": hit["_source"].get("author"),
                    "published_at": hit["_source"].get("published_at")
                }
            ))

        return results


# Usage example
if __name__ == "__main__":
    search = FullTextSearchService(
        hosts=["localhost:9200"],
        index_name="articles"
    )

    # Basic search
    response = search.search("machine learning tutorial")
    print(f"Found {response.total} results in {response.took_ms}ms\n")

    for result in response.results:
        print(f"[{result.score:.2f}] {result.title}")
        print(f"  {result.content_snippet}\n")

    if response.suggestions:
        print(f"Did you mean: {', '.join(response.suggestions)}")

    # Search with filters
    filtered = search.search(
        query="learning",
        filters={
            "author": "John Smith",
            "published_at": {"gte": "2024-01-01"}
        }
    )
    print(f"\nFiltered results: {filtered.total}")
```

---

## Best Practices

**Analyzer Selection:**
- Use language-specific analyzers for better stemming
- Keep index and search analyzers consistent unless you have specific needs
- Test your analyzers with the `_analyze` API

**Query Construction:**
- Boost title matches over content
- Use phrase matching for exact queries
- Enable fuzziness for user-facing search

**Performance:**
- Use filters for non-scoring conditions
- Limit highlight fragment size
- Consider caching frequent queries

**Relevance Testing:**
- Create a test set of queries with expected results
- Use the Rank Eval API to measure search quality
- A/B test relevance changes in production

---

## Conclusion

Building great full-text search requires understanding how text analysis works and how to tune relevance for your specific use case. The key takeaways are:

- Configure analyzers that match your content's language
- Use fuzzy matching to handle user typos
- Highlight results to show users why they matched
- Tune relevance with field boosting and function scores

With these techniques, you can build search experiences that feel intelligent and return the results users actually want.

---

*Want to monitor your search quality and performance? [OneUptime](https://oneuptime.com) provides observability for your entire application stack, including Elasticsearch.*
