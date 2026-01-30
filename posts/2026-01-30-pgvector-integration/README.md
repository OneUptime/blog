# How to Build pgvector Integration

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: PostgreSQL, Vector Database, AI, RAG, Embeddings, Semantic Search

Description: A practical guide to integrating pgvector with PostgreSQL for building AI-powered applications with semantic search, similarity matching, and retrieval-augmented generation.

---

Vector databases have become essential infrastructure for AI applications. But spinning up a separate vector database adds operational complexity, another service to monitor, and another potential failure point. If you already run PostgreSQL, pgvector lets you store and query vectors right alongside your relational data.

This guide walks through building a pgvector integration from scratch, covering everything from installation to production-ready patterns for RAG (Retrieval-Augmented Generation) applications.

---

## What pgvector Actually Does

pgvector is a PostgreSQL extension that adds vector similarity search capabilities. It lets you:

1. **Store vectors** as a native column type
2. **Index vectors** for fast approximate nearest neighbor (ANN) search
3. **Query by similarity** using distance operators

```mermaid
flowchart LR
    subgraph "Your Application"
        App[Application]
        Embed[Embedding Model]
    end

    subgraph "PostgreSQL + pgvector"
        PG[(PostgreSQL)]
        Vec[Vector Index]
    end

    App -->|"Text"| Embed
    Embed -->|"Vector [1536]"| PG
    PG --> Vec
    Vec -->|"Similar Items"| App
```

The key advantage: you get vector search without leaving the PostgreSQL ecosystem. Same backups, same replication, same monitoring, same connection pooling.

---

## Installation

### Docker Setup

This Docker Compose file sets up PostgreSQL with pgvector pre-installed.

```yaml
# docker-compose.yml
version: '3.8'
services:
  postgres:
    image: pgvector/pgvector:pg16
    environment:
      POSTGRES_USER: app
      POSTGRES_PASSWORD: secure_password
      POSTGRES_DB: vectordb
    ports:
      - "5432:5432"
    volumes:
      - pgdata:/var/lib/postgresql/data
      # Initialize pgvector on first run
      - ./init.sql:/docker-entrypoint-initdb.d/init.sql

volumes:
  pgdata:
```

This initialization script enables the pgvector extension.

```sql
-- init.sql
CREATE EXTENSION IF NOT EXISTS vector;
```

### Manual Installation

For existing PostgreSQL installations, install the extension package and enable it.

```bash
# Ubuntu/Debian
sudo apt install postgresql-16-pgvector

# macOS with Homebrew
brew install pgvector

# Then enable in your database
psql -d yourdb -c "CREATE EXTENSION vector;"
```

### Verify Installation

This query confirms pgvector is installed and shows the version.

```sql
-- Check pgvector is installed
SELECT * FROM pg_extension WHERE extname = 'vector';

-- Check available operators
SELECT opfname FROM pg_opfamily WHERE opfname LIKE '%vector%';
```

---

## Schema Design

### Basic Vector Table

This schema stores documents with their vector embeddings and metadata.

```sql
-- Create a table for storing documents with embeddings
CREATE TABLE documents (
    id BIGSERIAL PRIMARY KEY,
    content TEXT NOT NULL,
    -- 1536 dimensions for OpenAI ada-002, 384 for MiniLM
    embedding vector(1536),
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for fast similarity search
CREATE INDEX ON documents USING ivfflat (embedding vector_cosine_ops)
    WITH (lists = 100);

-- Index for metadata filtering
CREATE INDEX ON documents USING gin (metadata);

-- Composite index for common query patterns
CREATE INDEX ON documents (created_at DESC);
```

### Choosing Vector Dimensions

| Embedding Model | Dimensions | Use Case |
|----------------|------------|----------|
| OpenAI text-embedding-3-small | 1536 | General purpose, high quality |
| OpenAI text-embedding-3-large | 3072 | Maximum quality |
| Cohere embed-english-v3 | 1024 | Multilingual support |
| sentence-transformers/all-MiniLM-L6-v2 | 384 | Fast, self-hosted |
| BAAI/bge-small-en | 384 | Compact, good accuracy |

### Multi-tenant Schema

This schema supports multiple tenants with isolated vector spaces.

```sql
-- Multi-tenant document storage
CREATE TABLE tenant_documents (
    id BIGSERIAL PRIMARY KEY,
    tenant_id UUID NOT NULL,
    document_id UUID NOT NULL DEFAULT gen_random_uuid(),
    content TEXT NOT NULL,
    embedding vector(1536),
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),

    -- Ensure unique documents per tenant
    UNIQUE (tenant_id, document_id)
);

-- Partial indexes for tenant isolation
-- Create one per tenant or use a single index with filtering
CREATE INDEX ON tenant_documents USING ivfflat (embedding vector_cosine_ops)
    WITH (lists = 100);

CREATE INDEX ON tenant_documents (tenant_id, created_at DESC);
```

---

## Indexing Strategies

pgvector supports two index types. Choosing the right one affects query speed and accuracy.

### IVFFlat Index

IVFFlat (Inverted File Flat) divides vectors into clusters. Faster to build, good for most use cases.

```sql
-- IVFFlat index with cosine distance
-- 'lists' should be sqrt(row_count) for small tables
-- or row_count / 1000 for large tables
CREATE INDEX documents_embedding_ivfflat_idx
    ON documents
    USING ivfflat (embedding vector_cosine_ops)
    WITH (lists = 100);

-- For L2 (Euclidean) distance
CREATE INDEX documents_embedding_l2_idx
    ON documents
    USING ivfflat (embedding vector_l2_ops)
    WITH (lists = 100);

-- For inner product (dot product)
CREATE INDEX documents_embedding_ip_idx
    ON documents
    USING ivfflat (embedding vector_ip_ops)
    WITH (lists = 100);
```

### HNSW Index

HNSW (Hierarchical Navigable Small World) provides better recall at the cost of more memory and slower builds.

```sql
-- HNSW index for higher quality results
CREATE INDEX documents_embedding_hnsw_idx
    ON documents
    USING hnsw (embedding vector_cosine_ops)
    WITH (m = 16, ef_construction = 64);
```

| Parameter | Description | Recommendation |
|-----------|-------------|----------------|
| m | Max connections per node | 16 for most cases, 32 for high recall |
| ef_construction | Build-time search width | 64-200, higher = better quality, slower build |

### Index Comparison

```mermaid
flowchart TB
    subgraph "IVFFlat"
        IV1[Fast Build]
        IV2[Lower Memory]
        IV3[Good for Updates]
        IV4[95-99% Recall]
    end

    subgraph "HNSW"
        H1[Slower Build]
        H2[Higher Memory]
        H3[Slow Updates]
        H4[99%+ Recall]
    end

    Decision{Choose Based On}
    Decision -->|"Frequent updates, cost sensitive"| IVFFlat
    Decision -->|"High accuracy, read heavy"| HNSW
```

### Tuning Query Performance

This configuration adjusts search parameters for better recall during queries.

```sql
-- Increase probes for IVFFlat (default is 1)
-- Higher = better recall, slower queries
SET ivfflat.probes = 10;

-- Increase ef_search for HNSW (default is 40)
-- Higher = better recall, slower queries
SET hnsw.ef_search = 100;
```

---

## Application Integration

### Python with asyncpg

This Python module provides async vector operations using asyncpg.

```python
# vector_store.py
import asyncpg
import numpy as np
from typing import List, Optional
import json

class VectorStore:
    """Async PostgreSQL vector store using pgvector."""

    def __init__(self, pool: asyncpg.Pool):
        self.pool = pool

    async def insert_document(
        self,
        content: str,
        embedding: List[float],
        metadata: Optional[dict] = None
    ) -> int:
        """Insert a document with its embedding."""
        # Convert list to pgvector format
        embedding_str = f"[{','.join(map(str, embedding))}]"

        query = """
            INSERT INTO documents (content, embedding, metadata)
            VALUES ($1, $2::vector, $3)
            RETURNING id
        """
        async with self.pool.acquire() as conn:
            row = await conn.fetchrow(
                query,
                content,
                embedding_str,
                json.dumps(metadata or {})
            )
            return row['id']

    async def search_similar(
        self,
        query_embedding: List[float],
        limit: int = 10,
        threshold: float = 0.8,
        metadata_filter: Optional[dict] = None
    ) -> List[dict]:
        """Find similar documents using cosine similarity."""
        embedding_str = f"[{','.join(map(str, query_embedding))}]"

        # Base query with cosine distance
        # 1 - cosine_distance = cosine_similarity
        query = """
            SELECT
                id,
                content,
                metadata,
                1 - (embedding <=> $1::vector) AS similarity
            FROM documents
            WHERE 1 - (embedding <=> $1::vector) >= $2
        """
        params = [embedding_str, threshold]

        # Add metadata filtering if provided
        if metadata_filter:
            query += " AND metadata @> $3"
            params.append(json.dumps(metadata_filter))

        query += """
            ORDER BY embedding <=> $1::vector
            LIMIT ${}
        """.format(len(params) + 1)
        params.append(limit)

        async with self.pool.acquire() as conn:
            rows = await conn.fetch(query, *params)
            return [
                {
                    'id': row['id'],
                    'content': row['content'],
                    'metadata': json.loads(row['metadata']),
                    'similarity': float(row['similarity'])
                }
                for row in rows
            ]

    async def batch_insert(
        self,
        documents: List[dict]
    ) -> List[int]:
        """Batch insert documents with embeddings."""
        query = """
            INSERT INTO documents (content, embedding, metadata)
            SELECT
                d.content,
                d.embedding::vector,
                d.metadata::jsonb
            FROM unnest($1::text[], $2::text[], $3::text[])
                AS d(content, embedding, metadata)
            RETURNING id
        """

        contents = [d['content'] for d in documents]
        embeddings = [
            f"[{','.join(map(str, d['embedding']))}]"
            for d in documents
        ]
        metadata = [json.dumps(d.get('metadata', {})) for d in documents]

        async with self.pool.acquire() as conn:
            rows = await conn.fetch(query, contents, embeddings, metadata)
            return [row['id'] for row in rows]
```

### Node.js with pg

This TypeScript module provides vector operations using the pg library.

```typescript
// vectorStore.ts
import { Pool, QueryResult } from 'pg';

interface Document {
  id: number;
  content: string;
  metadata: Record<string, unknown>;
  similarity?: number;
}

interface InsertDocument {
  content: string;
  embedding: number[];
  metadata?: Record<string, unknown>;
}

export class VectorStore {
  private pool: Pool;

  constructor(pool: Pool) {
    this.pool = pool;
  }

  // Convert embedding array to pgvector format
  private formatEmbedding(embedding: number[]): string {
    return `[${embedding.join(',')}]`;
  }

  async insertDocument(doc: InsertDocument): Promise<number> {
    const query = `
      INSERT INTO documents (content, embedding, metadata)
      VALUES ($1, $2::vector, $3)
      RETURNING id
    `;

    const result = await this.pool.query(query, [
      doc.content,
      this.formatEmbedding(doc.embedding),
      JSON.stringify(doc.metadata || {}),
    ]);

    return result.rows[0].id;
  }

  async searchSimilar(
    queryEmbedding: number[],
    options: {
      limit?: number;
      threshold?: number;
      metadataFilter?: Record<string, unknown>;
    } = {}
  ): Promise<Document[]> {
    const { limit = 10, threshold = 0.8, metadataFilter } = options;

    let query = `
      SELECT
        id,
        content,
        metadata,
        1 - (embedding <=> $1::vector) AS similarity
      FROM documents
      WHERE 1 - (embedding <=> $1::vector) >= $2
    `;

    const params: unknown[] = [
      this.formatEmbedding(queryEmbedding),
      threshold,
    ];

    if (metadataFilter) {
      query += ` AND metadata @> $3`;
      params.push(JSON.stringify(metadataFilter));
    }

    query += `
      ORDER BY embedding <=> $1::vector
      LIMIT $${params.length + 1}
    `;
    params.push(limit);

    const result = await this.pool.query(query, params);

    return result.rows.map((row) => ({
      id: row.id,
      content: row.content,
      metadata: row.metadata,
      similarity: parseFloat(row.similarity),
    }));
  }

  async batchInsert(documents: InsertDocument[]): Promise<number[]> {
    // Use a transaction for batch inserts
    const client = await this.pool.connect();

    try {
      await client.query('BEGIN');

      const ids: number[] = [];
      for (const doc of documents) {
        const result = await client.query(
          `INSERT INTO documents (content, embedding, metadata)
           VALUES ($1, $2::vector, $3)
           RETURNING id`,
          [
            doc.content,
            this.formatEmbedding(doc.embedding),
            JSON.stringify(doc.metadata || {}),
          ]
        );
        ids.push(result.rows[0].id);
      }

      await client.query('COMMIT');
      return ids;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }
}
```

---

## Building a RAG Pipeline

Retrieval-Augmented Generation combines vector search with LLM generation.

```mermaid
flowchart TB
    subgraph "Ingestion Pipeline"
        Doc[Document]
        Chunk[Chunking]
        Embed1[Embedding Model]
        Store[(pgvector)]
    end

    subgraph "Query Pipeline"
        Query[User Query]
        Embed2[Embedding Model]
        Search[Vector Search]
        Context[Retrieved Context]
        LLM[LLM Generation]
        Response[Response]
    end

    Doc --> Chunk
    Chunk --> Embed1
    Embed1 --> Store

    Query --> Embed2
    Embed2 --> Search
    Store --> Search
    Search --> Context
    Context --> LLM
    Query --> LLM
    LLM --> Response
```

### Document Chunking

This module splits documents into chunks suitable for embedding.

```python
# chunker.py
from typing import List, Generator
import re

def chunk_text(
    text: str,
    chunk_size: int = 1000,
    overlap: int = 200
) -> Generator[dict, None, None]:
    """Split text into overlapping chunks."""
    # Clean whitespace
    text = re.sub(r'\s+', ' ', text).strip()

    if len(text) <= chunk_size:
        yield {'text': text, 'start': 0, 'end': len(text)}
        return

    start = 0
    while start < len(text):
        end = start + chunk_size

        # Try to break at sentence boundary
        if end < len(text):
            # Look for sentence end near chunk boundary
            sentence_end = text.rfind('. ', start, end)
            if sentence_end > start + chunk_size // 2:
                end = sentence_end + 1

        yield {
            'text': text[start:end].strip(),
            'start': start,
            'end': end
        }

        start = end - overlap


def chunk_by_paragraphs(
    text: str,
    max_chunk_size: int = 1500
) -> Generator[dict, None, None]:
    """Chunk by paragraphs, merging small ones."""
    paragraphs = text.split('\n\n')
    current_chunk = []
    current_size = 0
    start = 0

    for para in paragraphs:
        para = para.strip()
        if not para:
            continue

        para_size = len(para)

        if current_size + para_size > max_chunk_size and current_chunk:
            yield {
                'text': '\n\n'.join(current_chunk),
                'start': start,
                'paragraph_count': len(current_chunk)
            }
            current_chunk = []
            current_size = 0
            start += current_size

        current_chunk.append(para)
        current_size += para_size

    if current_chunk:
        yield {
            'text': '\n\n'.join(current_chunk),
            'start': start,
            'paragraph_count': len(current_chunk)
        }
```

### Embedding Generation

This module handles embedding generation with batching and caching.

```python
# embeddings.py
import openai
import asyncio
from typing import List
import hashlib
import json

class EmbeddingService:
    """Generate embeddings with batching and caching."""

    def __init__(
        self,
        api_key: str,
        model: str = "text-embedding-3-small",
        cache: dict = None  # Simple in-memory cache, use Redis in production
    ):
        self.client = openai.AsyncOpenAI(api_key=api_key)
        self.model = model
        self.cache = cache or {}

    def _cache_key(self, text: str) -> str:
        """Generate cache key for text."""
        return hashlib.sha256(
            f"{self.model}:{text}".encode()
        ).hexdigest()

    async def embed_text(self, text: str) -> List[float]:
        """Generate embedding for a single text."""
        cache_key = self._cache_key(text)

        if cache_key in self.cache:
            return self.cache[cache_key]

        response = await self.client.embeddings.create(
            model=self.model,
            input=text
        )

        embedding = response.data[0].embedding
        self.cache[cache_key] = embedding
        return embedding

    async def embed_batch(
        self,
        texts: List[str],
        batch_size: int = 100
    ) -> List[List[float]]:
        """Generate embeddings for multiple texts with batching."""
        embeddings = []

        for i in range(0, len(texts), batch_size):
            batch = texts[i:i + batch_size]

            # Check cache first
            uncached_texts = []
            uncached_indices = []

            for j, text in enumerate(batch):
                cache_key = self._cache_key(text)
                if cache_key in self.cache:
                    embeddings.append(self.cache[cache_key])
                else:
                    uncached_texts.append(text)
                    uncached_indices.append(i + j)

            # Fetch uncached embeddings
            if uncached_texts:
                response = await self.client.embeddings.create(
                    model=self.model,
                    input=uncached_texts
                )

                for idx, data in zip(uncached_indices, response.data):
                    cache_key = self._cache_key(texts[idx])
                    self.cache[cache_key] = data.embedding
                    embeddings.insert(idx, data.embedding)

        return embeddings
```

### Complete RAG Service

This service combines chunking, embedding, and search into a complete RAG pipeline.

```python
# rag_service.py
import asyncpg
from typing import List, Optional
import openai

class RAGService:
    """Complete RAG service with pgvector."""

    def __init__(
        self,
        pool: asyncpg.Pool,
        openai_api_key: str,
        embedding_model: str = "text-embedding-3-small",
        completion_model: str = "gpt-4o"
    ):
        self.vector_store = VectorStore(pool)
        self.embedding_service = EmbeddingService(
            openai_api_key,
            embedding_model
        )
        self.completion_client = openai.AsyncOpenAI(api_key=openai_api_key)
        self.completion_model = completion_model

    async def ingest_document(
        self,
        content: str,
        metadata: Optional[dict] = None,
        chunk_size: int = 1000
    ) -> List[int]:
        """Chunk, embed, and store a document."""
        chunks = list(chunk_text(content, chunk_size=chunk_size))

        # Generate embeddings for all chunks
        texts = [c['text'] for c in chunks]
        embeddings = await self.embedding_service.embed_batch(texts)

        # Prepare documents for batch insert
        documents = [
            {
                'content': chunk['text'],
                'embedding': embedding,
                'metadata': {
                    **(metadata or {}),
                    'chunk_start': chunk['start'],
                    'chunk_end': chunk['end']
                }
            }
            for chunk, embedding in zip(chunks, embeddings)
        ]

        return await self.vector_store.batch_insert(documents)

    async def query(
        self,
        question: str,
        top_k: int = 5,
        similarity_threshold: float = 0.7,
        system_prompt: Optional[str] = None
    ) -> dict:
        """Answer a question using RAG."""
        # Generate embedding for the question
        query_embedding = await self.embedding_service.embed_text(question)

        # Search for relevant documents
        results = await self.vector_store.search_similar(
            query_embedding,
            limit=top_k,
            threshold=similarity_threshold
        )

        if not results:
            return {
                'answer': "I couldn't find relevant information to answer your question.",
                'sources': [],
                'context_used': False
            }

        # Build context from retrieved documents
        context = "\n\n---\n\n".join([
            f"[Source {i+1}] {r['content']}"
            for i, r in enumerate(results)
        ])

        # Generate answer
        messages = [
            {
                "role": "system",
                "content": system_prompt or (
                    "You are a helpful assistant. Answer the user's question "
                    "based on the provided context. If the context doesn't contain "
                    "enough information, say so. Cite sources by number."
                )
            },
            {
                "role": "user",
                "content": f"Context:\n{context}\n\nQuestion: {question}"
            }
        ]

        response = await self.completion_client.chat.completions.create(
            model=self.completion_model,
            messages=messages,
            temperature=0.7
        )

        return {
            'answer': response.choices[0].message.content,
            'sources': [
                {
                    'content': r['content'][:200] + '...',
                    'similarity': r['similarity'],
                    'metadata': r['metadata']
                }
                for r in results
            ],
            'context_used': True
        }
```

---

## Production Considerations

### Connection Pooling

This configuration sets up pgbouncer for connection pooling with pgvector.

```ini
# pgbouncer.ini
[databases]
vectordb = host=localhost port=5432 dbname=vectordb

[pgbouncer]
listen_addr = 0.0.0.0
listen_port = 6432
auth_type = md5
auth_file = /etc/pgbouncer/userlist.txt

# Use transaction pooling for best performance
pool_mode = transaction

# Connections per database
default_pool_size = 20
max_client_conn = 1000
```

### Index Maintenance

This query helps you determine optimal index parameters based on your data.

```sql
-- Check table size for index tuning
SELECT
    pg_size_pretty(pg_total_relation_size('documents')) as total_size,
    pg_size_pretty(pg_relation_size('documents')) as table_size,
    (SELECT count(*) FROM documents) as row_count;

-- Rebuild index after significant data changes
REINDEX INDEX documents_embedding_ivfflat_idx;

-- For HNSW, you may need to drop and recreate
DROP INDEX documents_embedding_hnsw_idx;
CREATE INDEX documents_embedding_hnsw_idx
    ON documents
    USING hnsw (embedding vector_cosine_ops)
    WITH (m = 16, ef_construction = 64);
```

### Monitoring Queries

These queries help monitor pgvector performance.

```sql
-- Find slow vector queries
SELECT
    query,
    calls,
    mean_exec_time,
    total_exec_time
FROM pg_stat_statements
WHERE query LIKE '%<=>%' OR query LIKE '%<->%'
ORDER BY total_exec_time DESC
LIMIT 10;

-- Check index usage
SELECT
    schemaname,
    tablename,
    indexname,
    idx_scan,
    idx_tup_read,
    idx_tup_fetch
FROM pg_stat_user_indexes
WHERE indexname LIKE '%embedding%';

-- Monitor index build progress (PostgreSQL 12+)
SELECT
    a.pid,
    a.query,
    p.phase,
    p.blocks_total,
    p.blocks_done,
    round(100.0 * p.blocks_done / nullif(p.blocks_total, 0), 1) as pct_done
FROM pg_stat_activity a
JOIN pg_stat_progress_create_index p ON p.pid = a.pid;
```

### Backup and Recovery

Vector data is backed up with standard PostgreSQL tools.

```bash
#!/bin/bash
# backup_vectors.sh

# Regular pg_dump includes vector data
pg_dump -h localhost -U app -d vectordb \
    --format=custom \
    --compress=9 \
    -f /backups/vectordb_$(date +%Y%m%d).dump

# For large tables, consider parallel dump
pg_dump -h localhost -U app -d vectordb \
    --format=directory \
    --jobs=4 \
    -f /backups/vectordb_$(date +%Y%m%d)
```

---

## Performance Optimization

### Prefiltering vs Postfiltering

When combining vector search with filters, order matters.

```sql
-- Postfilter: search all vectors, then filter (slower)
SELECT * FROM documents
WHERE 1 - (embedding <=> $1::vector) >= 0.8
  AND metadata->>'category' = 'tech'
ORDER BY embedding <=> $1::vector
LIMIT 10;

-- Prefilter with partial index (faster for common filters)
CREATE INDEX documents_tech_embedding_idx
    ON documents
    USING ivfflat (embedding vector_cosine_ops)
    WITH (lists = 50)
    WHERE metadata->>'category' = 'tech';

-- Query uses the partial index
SELECT * FROM documents
WHERE metadata->>'category' = 'tech'
  AND 1 - (embedding <=> $1::vector) >= 0.8
ORDER BY embedding <=> $1::vector
LIMIT 10;
```

### Parallel Query Execution

Enable parallel queries for large vector scans.

```sql
-- Enable parallel queries
SET max_parallel_workers_per_gather = 4;
SET parallel_tuple_cost = 0.001;
SET parallel_setup_cost = 100;

-- Check if query is using parallel workers
EXPLAIN (ANALYZE, BUFFERS)
SELECT *
FROM documents
ORDER BY embedding <=> $1::vector
LIMIT 10;
```

### Memory Configuration

Tune PostgreSQL memory settings for vector workloads.

```sql
-- Recommended settings for vector workloads
-- In postgresql.conf or via ALTER SYSTEM

-- Increase shared buffers for index caching
ALTER SYSTEM SET shared_buffers = '4GB';

-- Increase work_mem for sorting operations
ALTER SYSTEM SET work_mem = '256MB';

-- Effective cache size helps query planner
ALTER SYSTEM SET effective_cache_size = '12GB';

-- Maintenance work mem for index builds
ALTER SYSTEM SET maintenance_work_mem = '1GB';
```

---

## Common Patterns

### Hybrid Search

Combine vector similarity with full-text search for better results.

```sql
-- Add full-text search column
ALTER TABLE documents ADD COLUMN content_tsv tsvector
    GENERATED ALWAYS AS (to_tsvector('english', content)) STORED;

CREATE INDEX ON documents USING gin(content_tsv);

-- Hybrid search function
CREATE OR REPLACE FUNCTION hybrid_search(
    query_text TEXT,
    query_embedding vector(1536),
    match_count INT DEFAULT 10,
    vector_weight FLOAT DEFAULT 0.7,
    text_weight FLOAT DEFAULT 0.3
)
RETURNS TABLE (
    id BIGINT,
    content TEXT,
    combined_score FLOAT
) AS $$
BEGIN
    RETURN QUERY
    WITH vector_results AS (
        SELECT
            d.id,
            d.content,
            1 - (d.embedding <=> query_embedding) AS vector_score
        FROM documents d
        ORDER BY d.embedding <=> query_embedding
        LIMIT match_count * 2
    ),
    text_results AS (
        SELECT
            d.id,
            d.content,
            ts_rank(d.content_tsv, plainto_tsquery('english', query_text)) AS text_score
        FROM documents d
        WHERE d.content_tsv @@ plainto_tsquery('english', query_text)
        LIMIT match_count * 2
    )
    SELECT
        COALESCE(v.id, t.id) AS id,
        COALESCE(v.content, t.content) AS content,
        (COALESCE(v.vector_score, 0) * vector_weight +
         COALESCE(t.text_score, 0) * text_weight) AS combined_score
    FROM vector_results v
    FULL OUTER JOIN text_results t ON v.id = t.id
    ORDER BY combined_score DESC
    LIMIT match_count;
END;
$$ LANGUAGE plpgsql;
```

### Deduplication

Remove near-duplicate documents using vector similarity.

```sql
-- Find near-duplicate documents
WITH duplicates AS (
    SELECT
        d1.id AS id1,
        d2.id AS id2,
        1 - (d1.embedding <=> d2.embedding) AS similarity
    FROM documents d1
    JOIN documents d2 ON d1.id < d2.id
    WHERE 1 - (d1.embedding <=> d2.embedding) > 0.95
)
SELECT * FROM duplicates ORDER BY similarity DESC;

-- Delete duplicates keeping the oldest
DELETE FROM documents
WHERE id IN (
    SELECT d2.id
    FROM documents d1
    JOIN documents d2 ON d1.id < d2.id
    WHERE 1 - (d1.embedding <=> d2.embedding) > 0.95
);
```

### Clustering Similar Documents

Group documents by similarity using k-means style clustering.

```sql
-- Simple clustering by finding cluster centers
CREATE OR REPLACE FUNCTION find_clusters(
    num_clusters INT DEFAULT 10
)
RETURNS TABLE (
    cluster_id INT,
    center_id BIGINT,
    member_count BIGINT
) AS $$
BEGIN
    -- Create temporary table for cluster centers
    CREATE TEMP TABLE cluster_centers AS
    SELECT id, embedding
    FROM documents
    ORDER BY random()
    LIMIT num_clusters;

    RETURN QUERY
    SELECT
        row_number() OVER ()::INT AS cluster_id,
        cc.id AS center_id,
        COUNT(d.id) AS member_count
    FROM cluster_centers cc
    LEFT JOIN documents d ON (
        cc.id = (
            SELECT cc2.id
            FROM cluster_centers cc2
            ORDER BY d.embedding <=> cc2.embedding
            LIMIT 1
        )
    )
    GROUP BY cc.id;

    DROP TABLE cluster_centers;
END;
$$ LANGUAGE plpgsql;
```

---

## Testing Your Integration

This Python test suite validates the vector store functionality.

```python
# test_vector_store.py
import pytest
import asyncpg
import asyncio

@pytest.fixture
async def pool():
    pool = await asyncpg.create_pool(
        'postgresql://app:password@localhost/vectordb_test'
    )
    yield pool
    await pool.close()

@pytest.fixture
async def vector_store(pool):
    return VectorStore(pool)

@pytest.mark.asyncio
async def test_insert_and_search(vector_store):
    # Create a test embedding (random for testing)
    test_embedding = [0.1] * 1536

    # Insert document
    doc_id = await vector_store.insert_document(
        content="Test document about machine learning",
        embedding=test_embedding,
        metadata={"category": "tech"}
    )

    assert doc_id is not None

    # Search should find the document
    results = await vector_store.search_similar(
        query_embedding=test_embedding,
        limit=5,
        threshold=0.9
    )

    assert len(results) >= 1
    assert results[0]['similarity'] > 0.99

@pytest.mark.asyncio
async def test_metadata_filtering(vector_store):
    embedding = [0.2] * 1536

    # Insert documents with different metadata
    await vector_store.insert_document(
        content="Python programming guide",
        embedding=embedding,
        metadata={"language": "python"}
    )

    await vector_store.insert_document(
        content="JavaScript programming guide",
        embedding=embedding,
        metadata={"language": "javascript"}
    )

    # Filter by metadata
    results = await vector_store.search_similar(
        query_embedding=embedding,
        metadata_filter={"language": "python"}
    )

    assert all(r['metadata']['language'] == 'python' for r in results)
```

---

## Summary

| Component | Recommendation |
|-----------|----------------|
| **Index type** | IVFFlat for most cases, HNSW for high-recall needs |
| **Chunk size** | 500-1500 characters with 10-20% overlap |
| **Embedding model** | OpenAI text-embedding-3-small or self-hosted MiniLM |
| **Distance metric** | Cosine for normalized embeddings, L2 for raw vectors |
| **Batch size** | 100 documents per batch insert |
| **Connection pooling** | Required for production, use pgbouncer |

pgvector turns PostgreSQL into a capable vector database without the operational overhead of a separate system. For most AI applications, especially those already using PostgreSQL, it provides the right balance of functionality, performance, and simplicity.

Start with the basics: a table, an IVFFlat index, and a few hundred documents. Scale up the index parameters and move to HNSW only when you have evidence that recall is a bottleneck. Keep your vectors close to your data, and your architecture stays simple.
