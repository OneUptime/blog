# How to Create Hybrid Search

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Search, RAG, Vector Database, AI

Description: A practical guide to building hybrid search systems that combine keyword matching with semantic understanding for more accurate and relevant results.

---

Your users type "cheap flights to Paris" and your search returns nothing because your database has "affordable airfare to Paris, France." Traditional keyword search failed. Semantic search alone might return flights to London because the embeddings are similar. What you needed was both working together.

That's hybrid search: the best of keyword precision and semantic understanding, combined.

This guide walks through what hybrid search is, when you need it, and how to implement it with practical code examples using Python, PostgreSQL with pgvector, and popular frameworks.

---

## Table of Contents

1. What is Hybrid Search?
2. Why Not Just Use One Approach?
3. Architecture Overview
4. Setting Up the Foundation
5. Implementing Keyword Search (BM25)
6. Implementing Vector Search
7. Combining Results with Reciprocal Rank Fusion
8. Building a Complete Hybrid Search System
9. Tuning and Optimization
10. Production Considerations
11. Common Pitfalls

---

## 1. What is Hybrid Search?

Hybrid search combines two fundamentally different retrieval methods:

| Method | How It Works | Strengths | Weaknesses |
|--------|--------------|-----------|------------|
| Keyword Search | Exact and fuzzy token matching (BM25, TF-IDF) | Precise matches, fast, predictable | Misses synonyms, no semantic understanding |
| Vector Search | Embedding similarity in high-dimensional space | Understands meaning, finds related concepts | Can miss exact matches, computationally heavier |

Hybrid search runs both methods in parallel and merges results intelligently.

```mermaid
flowchart LR
    Q[User Query] --> K[Keyword Search]
    Q --> V[Vector Search]
    K --> R[Result Fusion]
    V --> R
    R --> F[Final Ranked Results]
```

The core insight: keyword search excels at precision (finding exactly what was asked), while vector search excels at recall (finding relevant content even when words differ).

---

## 2. Why Not Just Use One Approach?

Here's a concrete example showing why you need both.

**Query:** "python memory leak debugging"

**Keyword search returns:**
1. "Debugging Python Memory Leaks with tracemalloc" (exact match)
2. "Python Memory Leak Detection Tools" (exact match)
3. "Memory Profiling in Python" (partial match)

**Vector search returns:**
1. "Finding Resource Exhaustion Issues in Python Applications" (semantic match)
2. "How to Track Down RAM Problems in Your Python Code" (semantic match)
3. "Python Memory Leak Detection Tools" (also semantic match)

Notice how keyword search found the exact terminology matches, while vector search found semantically relevant documents that used different words. The hybrid approach gives you both.

**When keyword search alone fails:**
- Synonyms: "car" vs "automobile"
- Paraphrasing: "how to fix" vs "troubleshooting"
- Domain jargon: technical terms vs plain English

**When vector search alone fails:**
- Exact product codes: "SKU-12345"
- Proper nouns: specific company or person names
- Precise technical terms: "HTTP 502 error"

---

## 3. Architecture Overview

A production hybrid search system looks like this:

```mermaid
flowchart TB
    subgraph Indexing
        D[Documents] --> P[Preprocessing]
        P --> T[Tokenization]
        P --> E[Embedding Generation]
        T --> KI[Keyword Index]
        E --> VI[Vector Index]
    end

    subgraph Query Time
        Q[Query] --> QT[Query Tokenization]
        Q --> QE[Query Embedding]
        QT --> KS[Keyword Search]
        QE --> VS[Vector Search]
        KS --> RF[Reciprocal Rank Fusion]
        VS --> RF
        RF --> RR[Reranking Optional]
        RR --> R[Results]
    end

    KI --> KS
    VI --> VS
```

Key components:
- **Document preprocessing:** Clean, chunk, and prepare text
- **Dual indexing:** Maintain both keyword and vector indexes
- **Query processing:** Convert query to both tokens and embeddings
- **Result fusion:** Combine rankings from both methods
- **Optional reranking:** Use a cross-encoder for final precision

---

## 4. Setting Up the Foundation

We'll use PostgreSQL with pgvector for a self-contained example. This approach works well for moderate scale (millions of documents).

First, set up the database with the required extensions.

```sql
-- Enable the required extensions
CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Create a table for documents with both keyword and vector search support
CREATE TABLE documents (
    id SERIAL PRIMARY KEY,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    -- Vector embedding for semantic search (1536 dimensions for OpenAI ada-002)
    embedding vector(1536),
    -- Precomputed text search vector for keyword search
    content_tsv tsvector GENERATED ALWAYS AS (
        setweight(to_tsvector('english', coalesce(title, '')), 'A') ||
        setweight(to_tsvector('english', coalesce(content, '')), 'B')
    ) STORED,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for both search types
-- GIN index for fast full-text keyword search
CREATE INDEX idx_documents_tsv ON documents USING GIN(content_tsv);

-- HNSW index for fast approximate nearest neighbor vector search
CREATE INDEX idx_documents_embedding ON documents
USING hnsw(embedding vector_cosine_ops)
WITH (m = 16, ef_construction = 64);
```

The schema stores both the raw text (for keyword search) and embeddings (for vector search) in one table. The `content_tsv` column is auto-generated for efficient full-text search.

---

## 5. Implementing Keyword Search (BM25)

PostgreSQL's full-text search uses a ranking algorithm similar to BM25. Here's how to implement it.

```python
import psycopg2
from psycopg2.extras import RealDictCursor
from typing import List, Dict, Any

class KeywordSearch:
    """
    Keyword-based search using PostgreSQL full-text search.
    Uses ts_rank_cd which implements a cover density ranking
    similar to BM25 in behavior.
    """

    def __init__(self, connection_string: str):
        self.conn = psycopg2.connect(connection_string)

    def search(
        self,
        query: str,
        limit: int = 20
    ) -> List[Dict[str, Any]]:
        """
        Perform keyword search and return ranked results.

        Args:
            query: The search query string
            limit: Maximum number of results to return

        Returns:
            List of documents with their keyword search scores
        """
        # Convert the query to a tsquery, handling phrases and operators
        # plainto_tsquery handles natural language input
        sql = """
            SELECT
                id,
                title,
                content,
                -- ts_rank_cd considers cover density (proximity of terms)
                ts_rank_cd(content_tsv, plainto_tsquery('english', %s)) as score
            FROM documents
            WHERE content_tsv @@ plainto_tsquery('english', %s)
            ORDER BY score DESC
            LIMIT %s
        """

        with self.conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(sql, (query, query, limit))
            results = cur.fetchall()

        return [dict(row) for row in results]

    def search_with_phrase_boost(
        self,
        query: str,
        limit: int = 20
    ) -> List[Dict[str, Any]]:
        """
        Search with boosted scoring for exact phrase matches.
        Useful when word order matters.
        """
        sql = """
            SELECT
                id,
                title,
                content,
                -- Combine regular ranking with phrase proximity boost
                ts_rank_cd(content_tsv, plainto_tsquery('english', %s)) +
                CASE
                    WHEN content ILIKE %s THEN 0.5
                    ELSE 0
                END as score
            FROM documents
            WHERE content_tsv @@ plainto_tsquery('english', %s)
            ORDER BY score DESC
            LIMIT %s
        """

        phrase_pattern = f"%{query}%"

        with self.conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(sql, (query, phrase_pattern, query, limit))
            results = cur.fetchall()

        return [dict(row) for row in results]
```

The key insight here is that PostgreSQL's `ts_rank_cd` function ranks results by how well they match and how close the matching terms are to each other. This gives behavior similar to BM25, which is the gold standard for keyword search.

---

## 6. Implementing Vector Search

Vector search finds documents whose embeddings are similar to the query embedding.

```python
import openai
import numpy as np
from typing import List, Dict, Any

class VectorSearch:
    """
    Semantic search using vector embeddings.
    Uses OpenAI's embedding model and pgvector for similarity search.
    """

    def __init__(self, connection_string: str, openai_api_key: str):
        self.conn = psycopg2.connect(connection_string)
        openai.api_key = openai_api_key
        self.embedding_model = "text-embedding-ada-002"

    def get_embedding(self, text: str) -> List[float]:
        """
        Generate an embedding vector for the given text.

        The embedding captures the semantic meaning of the text
        in a 1536-dimensional vector space.
        """
        response = openai.embeddings.create(
            model=self.embedding_model,
            input=text
        )
        return response.data[0].embedding

    def search(
        self,
        query: str,
        limit: int = 20
    ) -> List[Dict[str, Any]]:
        """
        Perform vector similarity search.

        Args:
            query: The search query string
            limit: Maximum number of results to return

        Returns:
            List of documents with their similarity scores
        """
        # Generate embedding for the query
        query_embedding = self.get_embedding(query)

        # Use cosine similarity (1 - cosine distance)
        # pgvector's <=> operator computes cosine distance
        sql = """
            SELECT
                id,
                title,
                content,
                -- Convert cosine distance to similarity score (0 to 1)
                1 - (embedding <=> %s::vector) as score
            FROM documents
            WHERE embedding IS NOT NULL
            ORDER BY embedding <=> %s::vector
            LIMIT %s
        """

        # Convert embedding to string format for pgvector
        embedding_str = f"[{','.join(map(str, query_embedding))}]"

        with self.conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(sql, (embedding_str, embedding_str, limit))
            results = cur.fetchall()

        return [dict(row) for row in results]

    def search_with_threshold(
        self,
        query: str,
        threshold: float = 0.7,
        limit: int = 20
    ) -> List[Dict[str, Any]]:
        """
        Search with a minimum similarity threshold.
        Filters out results that are too dissimilar.
        """
        query_embedding = self.get_embedding(query)

        sql = """
            SELECT
                id,
                title,
                content,
                1 - (embedding <=> %s::vector) as score
            FROM documents
            WHERE embedding IS NOT NULL
              AND 1 - (embedding <=> %s::vector) >= %s
            ORDER BY embedding <=> %s::vector
            LIMIT %s
        """

        embedding_str = f"[{','.join(map(str, query_embedding))}]"

        with self.conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(
                sql,
                (embedding_str, embedding_str, threshold, embedding_str, limit)
            )
            results = cur.fetchall()

        return [dict(row) for row in results]
```

The embedding model converts text into a dense vector where semantically similar texts end up close together in the vector space. The cosine similarity measures how aligned two vectors are, regardless of their magnitude.

---

## 7. Combining Results with Reciprocal Rank Fusion

This is where the magic happens. Reciprocal Rank Fusion (RRF) is a simple but effective algorithm for combining ranked lists.

```python
from typing import List, Dict, Any, Tuple
from collections import defaultdict

def reciprocal_rank_fusion(
    ranked_lists: List[List[Dict[str, Any]]],
    k: int = 60,
    id_field: str = "id"
) -> List[Dict[str, Any]]:
    """
    Combine multiple ranked lists using Reciprocal Rank Fusion (RRF).

    RRF score = sum(1 / (k + rank_i)) for each list i where the doc appears

    The k parameter controls how much weight is given to lower-ranked items.
    Higher k = more equal weighting across ranks.
    Lower k = stronger preference for top-ranked items.

    Args:
        ranked_lists: List of ranked result lists to combine
        k: Ranking constant (typically 60)
        id_field: Field name to use as document identifier

    Returns:
        Combined and re-ranked list of documents
    """
    # Accumulate RRF scores for each document
    rrf_scores: Dict[Any, float] = defaultdict(float)

    # Store document data for retrieval
    doc_data: Dict[Any, Dict[str, Any]] = {}

    for ranked_list in ranked_lists:
        for rank, doc in enumerate(ranked_list, start=1):
            doc_id = doc[id_field]

            # RRF formula: 1 / (k + rank)
            rrf_scores[doc_id] += 1.0 / (k + rank)

            # Store the document data (first occurrence wins)
            if doc_id not in doc_data:
                doc_data[doc_id] = doc

    # Sort by RRF score descending
    sorted_ids = sorted(rrf_scores.keys(), key=lambda x: rrf_scores[x], reverse=True)

    # Build final result list with RRF scores
    results = []
    for doc_id in sorted_ids:
        doc = doc_data[doc_id].copy()
        doc["rrf_score"] = rrf_scores[doc_id]
        results.append(doc)

    return results


def weighted_rrf(
    ranked_lists: List[Tuple[List[Dict[str, Any]], float]],
    k: int = 60,
    id_field: str = "id"
) -> List[Dict[str, Any]]:
    """
    Weighted RRF allows different weights for different search methods.

    Useful when you want to bias toward keyword or vector results.
    For example, for a product search you might weight keyword higher
    to prioritize exact SKU matches.

    Args:
        ranked_lists: List of (results, weight) tuples
        k: Ranking constant
        id_field: Field name for document ID

    Returns:
        Combined weighted results
    """
    rrf_scores: Dict[Any, float] = defaultdict(float)
    doc_data: Dict[Any, Dict[str, Any]] = {}

    for ranked_list, weight in ranked_lists:
        for rank, doc in enumerate(ranked_list, start=1):
            doc_id = doc[id_field]

            # Apply weight to the RRF contribution
            rrf_scores[doc_id] += weight * (1.0 / (k + rank))

            if doc_id not in doc_data:
                doc_data[doc_id] = doc

    sorted_ids = sorted(rrf_scores.keys(), key=lambda x: rrf_scores[x], reverse=True)

    results = []
    for doc_id in sorted_ids:
        doc = doc_data[doc_id].copy()
        doc["rrf_score"] = rrf_scores[doc_id]
        results.append(doc)

    return results
```

Why RRF works well:
- It's robust to score scale differences between search methods
- It doesn't require score normalization
- Documents appearing in multiple lists get boosted
- It naturally balances precision and recall

---

## 8. Building a Complete Hybrid Search System

Now let's put it all together into a production-ready class.

```python
from typing import List, Dict, Any, Optional
from dataclasses import dataclass
from enum import Enum

class SearchMode(Enum):
    """Search modes for different use cases."""
    HYBRID = "hybrid"          # Default: combine both methods
    KEYWORD_ONLY = "keyword"   # Exact matching priority
    VECTOR_ONLY = "vector"     # Semantic matching only


@dataclass
class SearchConfig:
    """Configuration for hybrid search behavior."""
    keyword_weight: float = 1.0    # Weight for keyword results in RRF
    vector_weight: float = 1.0     # Weight for vector results in RRF
    rrf_k: int = 60                # RRF constant
    keyword_limit: int = 50        # Max results from keyword search
    vector_limit: int = 50         # Max results from vector search
    final_limit: int = 20          # Max results to return
    min_score_threshold: float = 0.0  # Minimum RRF score to include


class HybridSearch:
    """
    Complete hybrid search implementation combining keyword and vector search.

    This class orchestrates both search methods and fuses their results
    using Reciprocal Rank Fusion with configurable weights.
    """

    def __init__(
        self,
        connection_string: str,
        openai_api_key: str,
        config: Optional[SearchConfig] = None
    ):
        self.keyword_search = KeywordSearch(connection_string)
        self.vector_search = VectorSearch(connection_string, openai_api_key)
        self.config = config or SearchConfig()

    def search(
        self,
        query: str,
        mode: SearchMode = SearchMode.HYBRID,
        config_override: Optional[SearchConfig] = None
    ) -> List[Dict[str, Any]]:
        """
        Perform a search using the specified mode.

        Args:
            query: The search query string
            mode: Which search method(s) to use
            config_override: Optional config to override defaults

        Returns:
            Ranked list of matching documents
        """
        config = config_override or self.config

        if mode == SearchMode.KEYWORD_ONLY:
            results = self.keyword_search.search(query, config.keyword_limit)
            return results[:config.final_limit]

        if mode == SearchMode.VECTOR_ONLY:
            results = self.vector_search.search(query, config.vector_limit)
            return results[:config.final_limit]

        # Hybrid mode: run both searches in parallel would be better
        # but for clarity we run them sequentially here
        keyword_results = self.keyword_search.search(
            query,
            config.keyword_limit
        )
        vector_results = self.vector_search.search(
            query,
            config.vector_limit
        )

        # Combine using weighted RRF
        combined = weighted_rrf(
            [
                (keyword_results, config.keyword_weight),
                (vector_results, config.vector_weight)
            ],
            k=config.rrf_k
        )

        # Apply minimum score threshold
        if config.min_score_threshold > 0:
            combined = [
                doc for doc in combined
                if doc["rrf_score"] >= config.min_score_threshold
            ]

        return combined[:config.final_limit]

    def search_with_filters(
        self,
        query: str,
        filters: Dict[str, Any],
        mode: SearchMode = SearchMode.HYBRID
    ) -> List[Dict[str, Any]]:
        """
        Search with additional metadata filters.

        Filters are applied as WHERE clauses to both search methods.
        This is more efficient than filtering after retrieval.
        """
        # This would require extending the KeywordSearch and VectorSearch
        # classes to accept filter parameters. Implementation depends on
        # your schema and filter requirements.
        raise NotImplementedError("Extend for your specific filter needs")


# Usage example
def main():
    """Demonstrate hybrid search usage."""
    connection_string = "postgresql://user:pass@localhost/searchdb"
    openai_key = "your-api-key"

    # Initialize with custom configuration
    config = SearchConfig(
        keyword_weight=1.0,
        vector_weight=1.2,  # Slightly favor semantic matches
        final_limit=10
    )

    search = HybridSearch(connection_string, openai_key, config)

    # Perform hybrid search
    results = search.search("python memory leak debugging")

    for rank, doc in enumerate(results, start=1):
        print(f"{rank}. {doc['title']} (RRF: {doc['rrf_score']:.4f})")


if __name__ == "__main__":
    main()
```

---

## 9. Tuning and Optimization

Getting hybrid search right requires tuning. Here's how to approach it.

### Weight Tuning

The optimal keyword vs vector weight depends on your use case.

| Use Case | Keyword Weight | Vector Weight | Why |
|----------|---------------|---------------|-----|
| E-commerce product search | 1.2 | 1.0 | Exact SKU/name matches matter |
| Documentation search | 1.0 | 1.2 | Concepts matter more than exact words |
| Customer support tickets | 1.0 | 1.5 | Similar issues use different words |
| Code search | 1.5 | 0.8 | Syntax and identifiers need precision |

### A/B Testing Framework

```python
import random
from dataclasses import dataclass
from typing import List, Dict, Any, Callable
import json
from datetime import datetime

@dataclass
class SearchExperiment:
    """Track search experiments for A/B testing."""
    experiment_id: str
    control_config: SearchConfig
    treatment_config: SearchConfig
    traffic_percentage: float  # Percentage getting treatment


class ExperimentalHybridSearch(HybridSearch):
    """
    Hybrid search with built-in A/B testing support.

    Logs search events with experiment assignments for analysis.
    """

    def __init__(
        self,
        connection_string: str,
        openai_api_key: str,
        experiment: Optional[SearchExperiment] = None,
        log_callback: Optional[Callable] = None
    ):
        super().__init__(connection_string, openai_api_key)
        self.experiment = experiment
        self.log_callback = log_callback or self._default_log

    def _default_log(self, event: Dict[str, Any]):
        """Default logging just prints. Replace with your logging system."""
        print(json.dumps(event))

    def search(
        self,
        query: str,
        user_id: Optional[str] = None,
        mode: SearchMode = SearchMode.HYBRID
    ) -> List[Dict[str, Any]]:
        """
        Search with experiment tracking.

        Assignment is deterministic based on user_id for consistency.
        """
        config = self.config
        variant = "control"

        if self.experiment and user_id:
            # Deterministic assignment based on user_id
            hash_value = hash(f"{self.experiment.experiment_id}:{user_id}")
            in_treatment = (hash_value % 100) < (self.experiment.traffic_percentage * 100)

            if in_treatment:
                config = self.experiment.treatment_config
                variant = "treatment"
            else:
                config = self.experiment.control_config

        # Run the search
        start_time = datetime.now()
        results = super().search(query, mode, config)
        latency_ms = (datetime.now() - start_time).total_seconds() * 1000

        # Log the search event for analysis
        self.log_callback({
            "event": "search",
            "query": query,
            "user_id": user_id,
            "experiment_id": self.experiment.experiment_id if self.experiment else None,
            "variant": variant,
            "result_count": len(results),
            "latency_ms": latency_ms,
            "config": {
                "keyword_weight": config.keyword_weight,
                "vector_weight": config.vector_weight
            }
        })

        return results
```

### Measuring Search Quality

Track these metrics to evaluate your hybrid search:

```python
from typing import List, Set

def precision_at_k(
    retrieved: List[str],
    relevant: Set[str],
    k: int
) -> float:
    """
    Precision@K: What fraction of top-K results are relevant?

    Higher is better. Measures result quality at the top.
    """
    retrieved_at_k = retrieved[:k]
    relevant_retrieved = len(set(retrieved_at_k) & relevant)
    return relevant_retrieved / k if k > 0 else 0.0


def recall_at_k(
    retrieved: List[str],
    relevant: Set[str],
    k: int
) -> float:
    """
    Recall@K: What fraction of relevant docs are in top-K?

    Higher is better. Measures coverage of relevant results.
    """
    retrieved_at_k = set(retrieved[:k])
    relevant_retrieved = len(retrieved_at_k & relevant)
    return relevant_retrieved / len(relevant) if relevant else 0.0


def mean_reciprocal_rank(
    retrieved: List[str],
    relevant: Set[str]
) -> float:
    """
    MRR: How high is the first relevant result ranked?

    1.0 = first result is relevant
    0.5 = second result is relevant
    Higher is better for navigational queries.
    """
    for rank, doc_id in enumerate(retrieved, start=1):
        if doc_id in relevant:
            return 1.0 / rank
    return 0.0


def ndcg_at_k(
    retrieved: List[str],
    relevance_scores: Dict[str, float],
    k: int
) -> float:
    """
    NDCG@K: Normalized Discounted Cumulative Gain.

    Accounts for graded relevance (not just binary relevant/not).
    Score of 1.0 means perfect ranking.
    """
    import math

    def dcg(scores: List[float]) -> float:
        return sum(
            score / math.log2(rank + 1)
            for rank, score in enumerate(scores, start=1)
        )

    # Actual DCG
    actual_scores = [
        relevance_scores.get(doc_id, 0.0)
        for doc_id in retrieved[:k]
    ]
    actual_dcg = dcg(actual_scores)

    # Ideal DCG (best possible ranking)
    ideal_scores = sorted(relevance_scores.values(), reverse=True)[:k]
    ideal_dcg = dcg(ideal_scores)

    return actual_dcg / ideal_dcg if ideal_dcg > 0 else 0.0
```

---

## 10. Production Considerations

### Scaling the Vector Index

When you have millions of documents, vector search becomes the bottleneck.

```mermaid
flowchart TB
    subgraph Options
        A[Exact Search\nO n] --> |"< 100K docs"| SMALL[Small Scale]
        B[HNSW Index\nO log n] --> |"100K - 10M docs"| MEDIUM[Medium Scale]
        C[IVF + PQ\nO sqrt n] --> |"> 10M docs"| LARGE[Large Scale]
        D[Distributed Index] --> |"> 100M docs"| XLARGE[Very Large Scale]
    end
```

For pgvector at scale:
- Use `HNSW` index for up to ~10M vectors
- Tune `m` (connections per node) and `ef_construction` (build quality)
- Higher values = better recall but more memory and slower indexing

```sql
-- High-quality HNSW index for production
CREATE INDEX idx_documents_embedding ON documents
USING hnsw(embedding vector_cosine_ops)
WITH (
    m = 24,              -- More connections = better recall
    ef_construction = 100 -- Higher = better index quality
);

-- Set search quality at query time
SET hnsw.ef_search = 100;  -- Higher = better recall, slower queries
```

### Caching Embeddings

Generating embeddings is expensive. Cache aggressively.

```python
import hashlib
from functools import lru_cache
from typing import List, Tuple

class CachedVectorSearch(VectorSearch):
    """
    Vector search with embedding caching.

    Uses LRU cache for in-memory caching.
    For production, consider Redis or similar.
    """

    @lru_cache(maxsize=10000)
    def get_embedding_cached(self, text: str) -> Tuple[float, ...]:
        """
        Cache embeddings as tuples (hashable for lru_cache).

        In production, use Redis with TTL:
        - Key: hash of text
        - Value: embedding vector
        - TTL: 24 hours or based on your update frequency
        """
        embedding = self.get_embedding(text)
        return tuple(embedding)

    def search(self, query: str, limit: int = 20) -> List[Dict[str, Any]]:
        """Search using cached embedding generation."""
        query_embedding = list(self.get_embedding_cached(query))

        # Rest of search logic using the cached embedding
        embedding_str = f"[{','.join(map(str, query_embedding))}]"

        sql = """
            SELECT
                id, title, content,
                1 - (embedding <=> %s::vector) as score
            FROM documents
            WHERE embedding IS NOT NULL
            ORDER BY embedding <=> %s::vector
            LIMIT %s
        """

        with self.conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(sql, (embedding_str, embedding_str, limit))
            results = cur.fetchall()

        return [dict(row) for row in results]
```

### Async Implementation

For high-throughput systems, run both searches concurrently.

```python
import asyncio
import asyncpg
from typing import List, Dict, Any

class AsyncHybridSearch:
    """
    Async hybrid search for high-throughput applications.

    Runs keyword and vector searches concurrently,
    significantly reducing latency.
    """

    def __init__(self, connection_string: str, openai_api_key: str):
        self.connection_string = connection_string
        self.openai_api_key = openai_api_key
        self.pool = None

    async def initialize(self):
        """Initialize the connection pool."""
        self.pool = await asyncpg.create_pool(self.connection_string)

    async def keyword_search(
        self,
        query: str,
        limit: int
    ) -> List[Dict[str, Any]]:
        """Async keyword search."""
        async with self.pool.acquire() as conn:
            rows = await conn.fetch("""
                SELECT id, title, content,
                       ts_rank_cd(content_tsv, plainto_tsquery('english', $1)) as score
                FROM documents
                WHERE content_tsv @@ plainto_tsquery('english', $1)
                ORDER BY score DESC
                LIMIT $2
            """, query, limit)
            return [dict(row) for row in rows]

    async def vector_search(
        self,
        query: str,
        limit: int
    ) -> List[Dict[str, Any]]:
        """Async vector search."""
        # Get embedding (this could also be async with httpx)
        embedding = await self._get_embedding_async(query)
        embedding_str = f"[{','.join(map(str, embedding))}]"

        async with self.pool.acquire() as conn:
            rows = await conn.fetch("""
                SELECT id, title, content,
                       1 - (embedding <=> $1::vector) as score
                FROM documents
                WHERE embedding IS NOT NULL
                ORDER BY embedding <=> $1::vector
                LIMIT $2
            """, embedding_str, limit)
            return [dict(row) for row in rows]

    async def search(
        self,
        query: str,
        limit: int = 20
    ) -> List[Dict[str, Any]]:
        """
        Run both searches concurrently and combine results.

        This cuts latency roughly in half compared to sequential execution.
        """
        # Run both searches in parallel
        keyword_task = asyncio.create_task(
            self.keyword_search(query, limit * 2)
        )
        vector_task = asyncio.create_task(
            self.vector_search(query, limit * 2)
        )

        keyword_results, vector_results = await asyncio.gather(
            keyword_task,
            vector_task
        )

        # Combine with RRF
        combined = reciprocal_rank_fusion(
            [keyword_results, vector_results]
        )

        return combined[:limit]
```

---

## 11. Common Pitfalls

| Pitfall | Symptom | Solution |
|---------|---------|----------|
| Score scale mismatch | One method dominates | Use RRF instead of score averaging |
| Stale embeddings | New content not found semantically | Rebuild embeddings on content update |
| Over-indexing | Slow writes, high storage | Index only searchable fields |
| Under-fetching | Missing good results | Fetch more from each method before fusion |
| No monitoring | Silent degradation | Track latency, recall, and click-through |
| One-size-fits-all weights | Poor results for some queries | Use query classification to adjust weights |

### Query Classification for Dynamic Weights

```python
import re
from typing import Tuple

def classify_query(query: str) -> Tuple[float, float]:
    """
    Classify query and return appropriate weights.

    Returns (keyword_weight, vector_weight) based on query characteristics.
    """
    # Exact match patterns (SKUs, codes, identifiers)
    exact_patterns = [
        r'^[A-Z]{2,}-\d+',      # SKU-123, ABC-456
        r'^\d{5,}$',             # Long numbers (order IDs)
        r'^".*"$',               # Quoted phrases
        r'error\s+\d{3}',        # HTTP error codes
    ]

    for pattern in exact_patterns:
        if re.search(pattern, query, re.IGNORECASE):
            return (1.5, 0.5)  # Strong keyword bias

    # Question patterns (semantic understanding helps)
    question_words = ['how', 'why', 'what', 'when', 'where', 'which', 'who']
    if any(query.lower().startswith(w) for w in question_words):
        return (0.8, 1.2)  # Semantic bias

    # Short queries (probably navigational)
    if len(query.split()) <= 2:
        return (1.2, 0.8)  # Slight keyword bias

    # Long queries (probably conceptual)
    if len(query.split()) > 6:
        return (0.8, 1.2)  # Semantic bias

    # Default: balanced
    return (1.0, 1.0)
```

---

## Summary

Hybrid search combines the precision of keyword matching with the understanding of semantic search. The key components are:

1. **Dual indexing:** Maintain both keyword (BM25/full-text) and vector indexes
2. **Parallel retrieval:** Fetch candidates from both methods
3. **Smart fusion:** Use Reciprocal Rank Fusion to combine rankings
4. **Tunable weights:** Adjust keyword vs vector emphasis for your use case
5. **Continuous measurement:** Track precision, recall, and user engagement

Start simple with equal weights, measure your results, and tune based on real user behavior. The hybrid approach consistently outperforms either method alone because it captures both what users say and what they mean.

---

*Building search for your application? Start with the basics, measure everything, and iterate. The best search system is the one that helps your users find what they need.*

---

### Related Reading

- [What is RAG and How Does It Work?](https://oneuptime.com/blog)
- [Vector Databases Explained](https://oneuptime.com/blog)
- [Building Production ML Systems](https://oneuptime.com/blog)
