# How to Implement Vector Search in Elasticsearch

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Elasticsearch, Vector Search, Semantic Search, Embeddings, Machine Learning, kNN, Dense Vectors

Description: A comprehensive guide to implementing vector search in Elasticsearch using dense vectors and kNN search for semantic search, similarity matching, and AI-powered search applications.

---

Vector search enables semantic search capabilities by finding documents based on meaning rather than exact keyword matches. This guide covers implementing vector search in Elasticsearch using dense vectors and k-nearest neighbor (kNN) algorithms.

## Understanding Vector Search

Vector search works by:
1. Converting text/images into numerical vectors (embeddings)
2. Storing these vectors in Elasticsearch
3. Finding similar vectors using kNN algorithms

## Index Configuration for Vectors

### Dense Vector Mapping

```bash
curl -u elastic:password -X PUT "localhost:9200/vector-search" -H 'Content-Type: application/json' -d'
{
  "settings": {
    "number_of_shards": 2,
    "number_of_replicas": 1
  },
  "mappings": {
    "properties": {
      "title": {
        "type": "text",
        "fields": {
          "keyword": {"type": "keyword"}
        }
      },
      "content": {"type": "text"},
      "content_vector": {
        "type": "dense_vector",
        "dims": 384,
        "index": true,
        "similarity": "cosine"
      },
      "category": {"type": "keyword"},
      "tags": {"type": "keyword"},
      "created_at": {"type": "date"}
    }
  }
}'
```

### Vector Configuration Options

```bash
curl -u elastic:password -X PUT "localhost:9200/vector-search-advanced" -H 'Content-Type: application/json' -d'
{
  "mappings": {
    "properties": {
      "content_vector": {
        "type": "dense_vector",
        "dims": 768,
        "index": true,
        "similarity": "cosine",
        "index_options": {
          "type": "hnsw",
          "m": 16,
          "ef_construction": 100
        }
      },
      "image_vector": {
        "type": "dense_vector",
        "dims": 512,
        "index": true,
        "similarity": "l2_norm"
      }
    }
  }
}'
```

### Similarity Metrics

| Metric | Use Case | Description |
|--------|----------|-------------|
| cosine | Text embeddings | Measures angle between vectors |
| dot_product | Normalized vectors | Fast, requires unit vectors |
| l2_norm | Image embeddings | Euclidean distance |

## Generating Embeddings

### Python with sentence-transformers

```python
from sentence_transformers import SentenceTransformer
from elasticsearch import Elasticsearch
import numpy as np

# Load embedding model
model = SentenceTransformer("all-MiniLM-L6-v2")  # 384 dimensions

# Connect to Elasticsearch
es = Elasticsearch(
    ["http://localhost:9200"],
    basic_auth=("elastic", "password")
)

def generate_embedding(text: str) -> list:
    embedding = model.encode(text)
    return embedding.tolist()

def index_document(doc_id: str, title: str, content: str, category: str):
    # Generate embedding for content
    content_vector = generate_embedding(f"{title} {content}")

    doc = {
        "title": title,
        "content": content,
        "content_vector": content_vector,
        "category": category,
        "created_at": "2024-01-21T10:00:00Z"
    }

    es.index(index="vector-search", id=doc_id, document=doc)

# Index sample documents
documents = [
    {
        "id": "1",
        "title": "Introduction to Machine Learning",
        "content": "Machine learning is a subset of artificial intelligence that enables systems to learn from data.",
        "category": "ml"
    },
    {
        "id": "2",
        "title": "Deep Learning Fundamentals",
        "content": "Deep learning uses neural networks with multiple layers to model complex patterns in data.",
        "category": "ml"
    },
    {
        "id": "3",
        "title": "Natural Language Processing",
        "content": "NLP enables computers to understand, interpret, and generate human language.",
        "category": "nlp"
    }
]

for doc in documents:
    index_document(doc["id"], doc["title"], doc["content"], doc["category"])
```

### Using Elasticsearch Inference API

```bash
# Create inference endpoint (requires ML node)
curl -u elastic:password -X PUT "localhost:9200/_inference/text_embedding/my-embeddings" -H 'Content-Type: application/json' -d'
{
  "service": "elser",
  "service_settings": {
    "num_allocations": 1,
    "num_threads": 1
  }
}'

# Create ingest pipeline with inference
curl -u elastic:password -X PUT "localhost:9200/_ingest/pipeline/vector-embedding-pipeline" -H 'Content-Type: application/json' -d'
{
  "processors": [
    {
      "inference": {
        "model_id": "my-embeddings",
        "input_output": {
          "input_field": "content",
          "output_field": "content_vector"
        }
      }
    }
  ]
}'
```

## kNN Search Queries

### Basic kNN Search

```bash
curl -u elastic:password -X GET "localhost:9200/vector-search/_search?pretty" -H 'Content-Type: application/json' -d'
{
  "knn": {
    "field": "content_vector",
    "query_vector": [0.1, 0.2, 0.3, ...],
    "k": 10,
    "num_candidates": 100
  },
  "_source": ["title", "content", "category"]
}'
```

### Python kNN Search

```python
def semantic_search(query: str, k: int = 10, num_candidates: int = 100):
    # Generate query embedding
    query_vector = generate_embedding(query)

    # Perform kNN search
    response = es.search(
        index="vector-search",
        knn={
            "field": "content_vector",
            "query_vector": query_vector,
            "k": k,
            "num_candidates": num_candidates
        },
        source=["title", "content", "category"]
    )

    return response["hits"]["hits"]

# Search for semantically similar documents
results = semantic_search("AI and neural networks")
for hit in results:
    print(f"{hit['_score']:.4f} - {hit['_source']['title']}")
```

### kNN with Filters

```bash
curl -u elastic:password -X GET "localhost:9200/vector-search/_search?pretty" -H 'Content-Type: application/json' -d'
{
  "knn": {
    "field": "content_vector",
    "query_vector": [0.1, 0.2, 0.3, ...],
    "k": 10,
    "num_candidates": 100,
    "filter": {
      "term": {"category": "ml"}
    }
  }
}'
```

### kNN with Multiple Filters

```bash
curl -u elastic:password -X GET "localhost:9200/vector-search/_search?pretty" -H 'Content-Type: application/json' -d'
{
  "knn": {
    "field": "content_vector",
    "query_vector": [0.1, 0.2, 0.3, ...],
    "k": 10,
    "num_candidates": 100,
    "filter": {
      "bool": {
        "must": [
          {"term": {"category": "ml"}},
          {"range": {"created_at": {"gte": "2024-01-01"}}}
        ],
        "must_not": [
          {"term": {"tags": "deprecated"}}
        ]
      }
    }
  }
}'
```

## Hybrid Search

### Combining kNN with Full-Text Search

```bash
curl -u elastic:password -X GET "localhost:9200/vector-search/_search?pretty" -H 'Content-Type: application/json' -d'
{
  "query": {
    "bool": {
      "should": [
        {
          "match": {
            "content": {
              "query": "machine learning neural networks",
              "boost": 0.3
            }
          }
        }
      ]
    }
  },
  "knn": {
    "field": "content_vector",
    "query_vector": [0.1, 0.2, 0.3, ...],
    "k": 10,
    "num_candidates": 100,
    "boost": 0.7
  },
  "size": 10
}'
```

### Python Hybrid Search

```python
def hybrid_search(query: str, k: int = 10, text_boost: float = 0.3, vector_boost: float = 0.7):
    query_vector = generate_embedding(query)

    response = es.search(
        index="vector-search",
        query={
            "bool": {
                "should": [
                    {
                        "match": {
                            "content": {
                                "query": query,
                                "boost": text_boost
                            }
                        }
                    },
                    {
                        "match": {
                            "title": {
                                "query": query,
                                "boost": text_boost * 2
                            }
                        }
                    }
                ]
            }
        },
        knn={
            "field": "content_vector",
            "query_vector": query_vector,
            "k": k,
            "num_candidates": k * 10,
            "boost": vector_boost
        },
        size=k
    )

    return response["hits"]["hits"]
```

### Reciprocal Rank Fusion (RRF)

```bash
curl -u elastic:password -X GET "localhost:9200/vector-search/_search?pretty" -H 'Content-Type: application/json' -d'
{
  "retriever": {
    "rrf": {
      "retrievers": [
        {
          "standard": {
            "query": {
              "match": {
                "content": "machine learning"
              }
            }
          }
        },
        {
          "knn": {
            "field": "content_vector",
            "query_vector": [0.1, 0.2, 0.3, ...],
            "k": 10,
            "num_candidates": 100
          }
        }
      ],
      "rank_window_size": 50,
      "rank_constant": 60
    }
  }
}'
```

## Semantic Similarity Applications

### Similar Documents

```python
def find_similar_documents(doc_id: str, k: int = 5):
    # Get the source document
    doc = es.get(index="vector-search", id=doc_id)
    doc_vector = doc["_source"]["content_vector"]

    # Find similar documents
    response = es.search(
        index="vector-search",
        knn={
            "field": "content_vector",
            "query_vector": doc_vector,
            "k": k + 1,
            "num_candidates": 100
        },
        source=["title", "content", "category"]
    )

    # Filter out the source document
    similar = [hit for hit in response["hits"]["hits"] if hit["_id"] != doc_id]
    return similar[:k]
```

### Question Answering

```python
def question_answering(question: str, k: int = 3):
    # Search for relevant context
    results = semantic_search(question, k=k)

    # Combine context from top results
    context = "\n\n".join([
        f"Title: {hit['_source']['title']}\nContent: {hit['_source']['content']}"
        for hit in results
    ])

    return {
        "question": question,
        "context": context,
        "sources": [hit["_source"]["title"] for hit in results]
    }
```

### Image Search (CLIP Embeddings)

```python
from PIL import Image
import clip
import torch

# Load CLIP model
device = "cuda" if torch.cuda.is_available() else "cpu"
clip_model, preprocess = clip.load("ViT-B/32", device=device)

def generate_image_embedding(image_path: str) -> list:
    image = preprocess(Image.open(image_path)).unsqueeze(0).to(device)
    with torch.no_grad():
        embedding = clip_model.encode_image(image)
    return embedding.cpu().numpy().flatten().tolist()

def generate_text_embedding_clip(text: str) -> list:
    text_tokens = clip.tokenize([text]).to(device)
    with torch.no_grad():
        embedding = clip_model.encode_text(text_tokens)
    return embedding.cpu().numpy().flatten().tolist()

def search_images_by_text(query: str, k: int = 10):
    query_vector = generate_text_embedding_clip(query)

    response = es.search(
        index="image-search",
        knn={
            "field": "image_vector",
            "query_vector": query_vector,
            "k": k,
            "num_candidates": 100
        },
        source=["image_url", "description", "tags"]
    )

    return response["hits"]["hits"]
```

## Performance Optimization

### Index Settings for Large Datasets

```bash
curl -u elastic:password -X PUT "localhost:9200/vector-search-optimized" -H 'Content-Type: application/json' -d'
{
  "settings": {
    "number_of_shards": 4,
    "number_of_replicas": 1,
    "index.codec": "best_compression"
  },
  "mappings": {
    "properties": {
      "content_vector": {
        "type": "dense_vector",
        "dims": 384,
        "index": true,
        "similarity": "cosine",
        "index_options": {
          "type": "hnsw",
          "m": 32,
          "ef_construction": 200
        }
      }
    }
  }
}'
```

### HNSW Parameters

| Parameter | Description | Trade-off |
|-----------|-------------|-----------|
| m | Connections per node | Higher = better recall, more memory |
| ef_construction | Build-time quality | Higher = better index, slower indexing |

### Query Optimization

```bash
# Increase num_candidates for better recall
curl -u elastic:password -X GET "localhost:9200/vector-search/_search?pretty" -H 'Content-Type: application/json' -d'
{
  "knn": {
    "field": "content_vector",
    "query_vector": [0.1, 0.2, 0.3, ...],
    "k": 10,
    "num_candidates": 500
  },
  "size": 10,
  "_source": false,
  "fields": ["title"]
}'
```

### Quantization for Memory Efficiency

```bash
curl -u elastic:password -X PUT "localhost:9200/vector-search-quantized" -H 'Content-Type: application/json' -d'
{
  "mappings": {
    "properties": {
      "content_vector": {
        "type": "dense_vector",
        "dims": 384,
        "index": true,
        "similarity": "cosine",
        "index_options": {
          "type": "int8_hnsw",
          "m": 16,
          "ef_construction": 100,
          "confidence_interval": 0.99
        }
      }
    }
  }
}'
```

## Production Implementation

### Complete Vector Search Service

```python
from elasticsearch import Elasticsearch
from sentence_transformers import SentenceTransformer
from typing import List, Dict, Optional
import hashlib

class VectorSearchService:
    def __init__(self, es_hosts: List[str], auth: tuple, model_name: str = "all-MiniLM-L6-v2"):
        self.es = Elasticsearch(es_hosts, basic_auth=auth)
        self.model = SentenceTransformer(model_name)
        self.index = "vector-search"
        self.dims = self.model.get_sentence_embedding_dimension()

    def create_index(self, index_name: str = None):
        index_name = index_name or self.index
        mapping = {
            "settings": {
                "number_of_shards": 2,
                "number_of_replicas": 1
            },
            "mappings": {
                "properties": {
                    "title": {"type": "text", "fields": {"keyword": {"type": "keyword"}}},
                    "content": {"type": "text"},
                    "content_vector": {
                        "type": "dense_vector",
                        "dims": self.dims,
                        "index": True,
                        "similarity": "cosine"
                    },
                    "category": {"type": "keyword"},
                    "tags": {"type": "keyword"},
                    "metadata": {"type": "object", "enabled": False},
                    "created_at": {"type": "date"}
                }
            }
        }

        if not self.es.indices.exists(index=index_name):
            self.es.indices.create(index=index_name, body=mapping)

    def generate_embedding(self, text: str) -> List[float]:
        return self.model.encode(text).tolist()

    def index_document(
        self,
        doc_id: str,
        title: str,
        content: str,
        category: Optional[str] = None,
        tags: Optional[List[str]] = None,
        metadata: Optional[Dict] = None
    ):
        # Generate embedding
        embedding_text = f"{title} {content}"
        content_vector = self.generate_embedding(embedding_text)

        doc = {
            "title": title,
            "content": content,
            "content_vector": content_vector,
            "category": category,
            "tags": tags or [],
            "metadata": metadata or {},
            "created_at": "2024-01-21T10:00:00Z"
        }

        self.es.index(index=self.index, id=doc_id, document=doc)

    def search(
        self,
        query: str,
        k: int = 10,
        category: Optional[str] = None,
        tags: Optional[List[str]] = None,
        hybrid: bool = True,
        text_boost: float = 0.3,
        vector_boost: float = 0.7
    ) -> List[Dict]:
        query_vector = self.generate_embedding(query)

        # Build filter
        filters = []
        if category:
            filters.append({"term": {"category": category}})
        if tags:
            filters.append({"terms": {"tags": tags}})

        filter_clause = {"bool": {"must": filters}} if filters else None

        # Build search body
        search_body = {
            "knn": {
                "field": "content_vector",
                "query_vector": query_vector,
                "k": k,
                "num_candidates": k * 10,
                "boost": vector_boost
            },
            "size": k,
            "_source": ["title", "content", "category", "tags", "created_at"]
        }

        if filter_clause:
            search_body["knn"]["filter"] = filter_clause

        if hybrid:
            search_body["query"] = {
                "bool": {
                    "should": [
                        {"match": {"content": {"query": query, "boost": text_boost}}},
                        {"match": {"title": {"query": query, "boost": text_boost * 2}}}
                    ]
                }
            }
            if filter_clause:
                search_body["query"]["bool"]["filter"] = filters

        response = self.es.search(index=self.index, body=search_body)

        return [{
            "id": hit["_id"],
            "score": hit["_score"],
            **hit["_source"]
        } for hit in response["hits"]["hits"]]

    def find_similar(self, doc_id: str, k: int = 5) -> List[Dict]:
        doc = self.es.get(index=self.index, id=doc_id)
        doc_vector = doc["_source"]["content_vector"]

        response = self.es.search(
            index=self.index,
            knn={
                "field": "content_vector",
                "query_vector": doc_vector,
                "k": k + 1,
                "num_candidates": 100
            },
            source=["title", "content", "category"]
        )

        return [{
            "id": hit["_id"],
            "score": hit["_score"],
            **hit["_source"]
        } for hit in response["hits"]["hits"] if hit["_id"] != doc_id][:k]

# Usage
service = VectorSearchService(
    es_hosts=["http://localhost:9200"],
    auth=("elastic", "password")
)

# Create index
service.create_index()

# Index documents
service.index_document(
    doc_id="1",
    title="Machine Learning Basics",
    content="An introduction to machine learning concepts and algorithms.",
    category="tutorials",
    tags=["ml", "beginner"]
)

# Search
results = service.search(
    query="how do neural networks work",
    k=5,
    category="tutorials",
    hybrid=True
)
```

## Summary

Implementing vector search in Elasticsearch involves:

1. **Index configuration** - Dense vector fields with HNSW indexing
2. **Embedding generation** - Using models like sentence-transformers
3. **kNN search** - Finding similar vectors with configurable parameters
4. **Hybrid search** - Combining vector and keyword search for best results
5. **Filters** - Pre-filtering candidates for targeted search
6. **Optimization** - HNSW parameters, quantization, and query tuning

Vector search enables powerful semantic search capabilities that understand meaning beyond exact keyword matches.
