# How to Build Semantic Search

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: RAG, Semantic Search, Vector Search, NLP

Description: Learn to build semantic search for finding contextually similar content beyond keyword matching.

---

> Traditional keyword search fails when users phrase questions differently than documents describe answers. Semantic search bridges this gap by understanding meaning, not just matching words.

Semantic search is the backbone of modern Retrieval Augmented Generation (RAG) systems. Instead of relying on exact keyword matches, semantic search uses vector embeddings to find documents that are conceptually similar to a query. This guide walks through building a production-ready semantic search system from scratch.

---

## Table of Contents

1. Why Semantic Search Matters for RAG
2. Understanding Embeddings
3. Architecture Overview
4. Setting Up the Vector Database
5. Generating Embeddings
6. Indexing Documents
7. Query Processing and Retrieval
8. Query Expansion Techniques
9. Relevance Tuning and Reranking
10. Hybrid Search (Combining Keyword and Semantic)
11. Performance Optimization
12. Evaluation and Metrics
13. Production Considerations
14. Complete Working Example

---

## 1. Why Semantic Search Matters for RAG

Traditional search engines use inverted indexes and TF-IDF scoring. They excel at finding exact matches but fail when:

| Scenario | Keyword Search Result | Semantic Search Result |
|----------|----------------------|------------------------|
| Query: "car won't start" vs Doc: "vehicle ignition problems" | No match | High similarity |
| Query: "Python memory issues" vs Doc: "RAM optimization in Python applications" | Partial match | Strong match |
| Query: "how to scale horizontally" vs Doc: "adding more servers to handle load" | Weak match | Excellent match |

RAG systems need semantic search because users rarely phrase questions exactly as documentation is written. A semantic layer understands that "scaling horizontally" and "adding more servers" express the same concept.

---

## 2. Understanding Embeddings

Embeddings are dense vector representations of text that capture semantic meaning. Similar concepts cluster together in vector space.

```mermaid
graph LR
    subgraph "Vector Space"
        A["'car won't start'<br/>[0.23, 0.45, ...]"]
        B["'vehicle ignition problem'<br/>[0.24, 0.44, ...]"]
        C["'Python memory leak'<br/>[0.78, 0.12, ...]"]
        D["'RAM issues in Python'<br/>[0.77, 0.13, ...]"]
    end

    A -.->|"High Similarity"| B
    C -.->|"High Similarity"| D
    A -.->|"Low Similarity"| C
```

### How Embeddings Work

1. A neural network (transformer) processes input text
2. The model outputs a fixed-size vector (e.g., 384, 768, or 1536 dimensions)
3. Similar meanings produce vectors that are close in the embedding space
4. Distance metrics (cosine similarity, dot product) measure closeness

Popular embedding models:

| Model | Dimensions | Use Case |
|-------|-----------|----------|
| OpenAI text-embedding-3-small | 1536 | General purpose, high quality |
| OpenAI text-embedding-3-large | 3072 | Maximum quality |
| sentence-transformers/all-MiniLM-L6-v2 | 384 | Fast, open source |
| BAAI/bge-large-en-v1.5 | 1024 | High quality, open source |
| Cohere embed-english-v3.0 | 1024 | Commercial, multilingual |

---

## 3. Architecture Overview

A semantic search system for RAG has three main stages: indexing, querying, and retrieval.

```mermaid
flowchart TB
    subgraph Indexing["Indexing Pipeline"]
        D1[Documents] --> C1[Chunker]
        C1 --> E1[Embedding Model]
        E1 --> V1[Vector Database]
    end

    subgraph Query["Query Pipeline"]
        Q[User Query] --> QE[Query Expansion]
        QE --> E2[Embedding Model]
        E2 --> VS[Vector Search]
        VS --> RR[Reranker]
        RR --> R[Results]
    end

    V1 --> VS
```

Key components:

- **Chunker**: Splits documents into searchable segments
- **Embedding Model**: Converts text to vectors
- **Vector Database**: Stores and indexes vectors for fast retrieval
- **Query Expansion**: Improves recall by enriching queries
- **Reranker**: Improves precision by reordering results

---

## 4. Setting Up the Vector Database

We will use PostgreSQL with pgvector for this guide. It is production-ready and integrates with existing infrastructure.

### Install pgvector

```bash
# For Docker
docker run -d \
  --name pgvector-db \
  -e POSTGRES_PASSWORD=mysecretpassword \
  -p 5432:5432 \
  pgvector/pgvector:pg16
```

### Create the Schema

```sql
-- Enable the pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Create a table for document chunks with embeddings
CREATE TABLE document_chunks (
    id SERIAL PRIMARY KEY,

    -- Document metadata
    document_id VARCHAR(255) NOT NULL,
    chunk_index INTEGER NOT NULL,

    -- The actual text content of this chunk
    content TEXT NOT NULL,

    -- Vector embedding (1536 dimensions for OpenAI embeddings)
    embedding vector(1536),

    -- Additional metadata for filtering
    metadata JSONB DEFAULT '{}',

    -- Timestamps for cache invalidation
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    -- Ensure unique chunks per document
    UNIQUE(document_id, chunk_index)
);

-- Create an index for fast vector similarity search
-- Using IVFFlat for good balance of speed and recall
CREATE INDEX ON document_chunks
USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 100);

-- Create index for metadata filtering
CREATE INDEX idx_metadata ON document_chunks USING GIN (metadata);

-- Create index for document lookups
CREATE INDEX idx_document_id ON document_chunks (document_id);
```

### Alternative: Using Pinecone

For serverless deployments, Pinecone offers managed vector search:

```python
# pinecone_setup.py
import pinecone
from pinecone import Pinecone, ServerlessSpec

# Initialize Pinecone client
pc = Pinecone(api_key="your-api-key")

# Create an index for semantic search
# Dimension must match your embedding model output
pc.create_index(
    name="rag-documents",
    dimension=1536,  # OpenAI embedding dimension
    metric="cosine",  # Use cosine similarity for normalized embeddings
    spec=ServerlessSpec(
        cloud="aws",
        region="us-east-1"
    )
)

# Connect to the index
index = pc.Index("rag-documents")
```

---

## 5. Generating Embeddings

### Using OpenAI Embeddings

```python
# embeddings.py
import openai
from typing import List
import numpy as np

class EmbeddingGenerator:
    """
    Generates embeddings using OpenAI's embedding API.
    Handles batching and rate limiting for production use.
    """

    def __init__(self, model: str = "text-embedding-3-small"):
        # Initialize the OpenAI client
        # API key is read from OPENAI_API_KEY environment variable
        self.client = openai.OpenAI()
        self.model = model

        # Batch size limit for OpenAI API
        # Larger batches are more efficient but may hit rate limits
        self.batch_size = 100

    def generate_single(self, text: str) -> List[float]:
        """
        Generate embedding for a single text string.

        Args:
            text: The input text to embed

        Returns:
            A list of floats representing the embedding vector
        """
        # OpenAI API expects a list of inputs
        response = self.client.embeddings.create(
            model=self.model,
            input=[text]
        )

        # Extract the embedding from the response
        return response.data[0].embedding

    def generate_batch(self, texts: List[str]) -> List[List[float]]:
        """
        Generate embeddings for multiple texts efficiently.
        Automatically handles batching for large inputs.

        Args:
            texts: List of text strings to embed

        Returns:
            List of embedding vectors in the same order as input
        """
        all_embeddings = []

        # Process in batches to respect API limits
        for i in range(0, len(texts), self.batch_size):
            batch = texts[i:i + self.batch_size]

            # Make API call for this batch
            response = self.client.embeddings.create(
                model=self.model,
                input=batch
            )

            # Extract embeddings maintaining order
            batch_embeddings = [item.embedding for item in response.data]
            all_embeddings.extend(batch_embeddings)

        return all_embeddings

    def cosine_similarity(
        self,
        vec1: List[float],
        vec2: List[float]
    ) -> float:
        """
        Calculate cosine similarity between two vectors.

        Args:
            vec1: First embedding vector
            vec2: Second embedding vector

        Returns:
            Similarity score between -1 and 1
        """
        # Convert to numpy arrays for efficient computation
        a = np.array(vec1)
        b = np.array(vec2)

        # Cosine similarity formula: dot(a,b) / (norm(a) * norm(b))
        return np.dot(a, b) / (np.linalg.norm(a) * np.linalg.norm(b))
```

### Using Open Source Embeddings (Sentence Transformers)

```python
# local_embeddings.py
from sentence_transformers import SentenceTransformer
from typing import List
import numpy as np

class LocalEmbeddingGenerator:
    """
    Generates embeddings locally using Sentence Transformers.
    No API costs, works offline, suitable for sensitive data.
    """

    def __init__(self, model_name: str = "BAAI/bge-large-en-v1.5"):
        # Load the model (downloads on first use)
        # Models are cached in ~/.cache/huggingface/
        self.model = SentenceTransformer(model_name)

        # Get the embedding dimension from the model
        self.dimension = self.model.get_sentence_embedding_dimension()

    def generate_single(self, text: str) -> List[float]:
        """
        Generate embedding for a single text string.
        """
        # encode() returns a numpy array
        embedding = self.model.encode(text, convert_to_numpy=True)
        return embedding.tolist()

    def generate_batch(
        self,
        texts: List[str],
        batch_size: int = 32,
        show_progress: bool = True
    ) -> List[List[float]]:
        """
        Generate embeddings for multiple texts.
        Uses GPU if available for faster processing.

        Args:
            texts: List of text strings to embed
            batch_size: Number of texts to process at once
            show_progress: Whether to display a progress bar

        Returns:
            List of embedding vectors
        """
        # encode() handles batching internally
        embeddings = self.model.encode(
            texts,
            batch_size=batch_size,
            show_progress_bar=show_progress,
            convert_to_numpy=True
        )

        return embeddings.tolist()
```

---

## 6. Indexing Documents

### Document Chunking Strategy

Chunking is critical for retrieval quality. Chunks that are too large dilute relevance; chunks that are too small lose context.

```mermaid
flowchart LR
    subgraph "Chunking Strategies"
        direction TB
        A["Fixed Size<br/>500 tokens each"]
        B["Sentence-Based<br/>3-5 sentences"]
        C["Semantic<br/>Topic boundaries"]
        D["Recursive<br/>Hierarchical splits"]
    end

    A --> R1["Simple but may<br/>break mid-sentence"]
    B --> R2["Preserves meaning<br/>variable sizes"]
    C --> R3["Best quality<br/>most complex"]
    D --> R4["Good balance<br/>recommended"]
```

```python
# chunker.py
from typing import List, Dict, Any
import tiktoken
import re

class DocumentChunker:
    """
    Splits documents into chunks suitable for embedding and retrieval.
    Uses recursive splitting to maintain semantic coherence.
    """

    def __init__(
        self,
        chunk_size: int = 500,       # Target tokens per chunk
        chunk_overlap: int = 50,      # Overlap between chunks
        model: str = "gpt-4"          # Model for token counting
    ):
        self.chunk_size = chunk_size
        self.chunk_overlap = chunk_overlap

        # Initialize tokenizer for accurate token counting
        self.tokenizer = tiktoken.encoding_for_model(model)

        # Separators in order of preference (most to least granular)
        self.separators = [
            "\n\n",     # Paragraph breaks (strongest boundary)
            "\n",       # Line breaks
            ". ",       # Sentence endings
            "? ",       # Question endings
            "! ",       # Exclamation endings
            "; ",       # Semicolons
            ", ",       # Commas
            " ",        # Words (last resort)
        ]

    def count_tokens(self, text: str) -> int:
        """Count the number of tokens in a text string."""
        return len(self.tokenizer.encode(text))

    def chunk_document(
        self,
        text: str,
        metadata: Dict[str, Any] = None
    ) -> List[Dict[str, Any]]:
        """
        Split a document into chunks with metadata.

        Args:
            text: The full document text
            metadata: Additional metadata to attach to each chunk

        Returns:
            List of chunk dictionaries with content and metadata
        """
        if metadata is None:
            metadata = {}

        # Recursively split the text
        chunks = self._recursive_split(text, self.separators)

        # Build chunk objects with metadata
        result = []
        for i, chunk_text in enumerate(chunks):
            chunk = {
                "content": chunk_text.strip(),
                "chunk_index": i,
                "token_count": self.count_tokens(chunk_text),
                "metadata": {
                    **metadata,
                    "chunk_index": i,
                    "total_chunks": len(chunks)
                }
            }
            result.append(chunk)

        return result

    def _recursive_split(
        self,
        text: str,
        separators: List[str]
    ) -> List[str]:
        """
        Recursively split text using separators in order of preference.
        """
        # Base case: text is small enough
        if self.count_tokens(text) <= self.chunk_size:
            return [text] if text.strip() else []

        # No separators left: force split by characters
        if not separators:
            return self._force_split(text)

        # Try the first separator
        separator = separators[0]
        remaining_separators = separators[1:]

        # Split on this separator
        parts = text.split(separator)

        # If no split occurred, try next separator
        if len(parts) == 1:
            return self._recursive_split(text, remaining_separators)

        # Merge parts into chunks of appropriate size
        chunks = []
        current_chunk = ""

        for part in parts:
            # Add separator back (except for first part)
            test_chunk = current_chunk + separator + part if current_chunk else part

            if self.count_tokens(test_chunk) <= self.chunk_size:
                # Part fits in current chunk
                current_chunk = test_chunk
            else:
                # Save current chunk and start new one
                if current_chunk:
                    # Recursively split if still too large
                    chunks.extend(
                        self._recursive_split(current_chunk, remaining_separators)
                    )
                current_chunk = part

        # Handle the last chunk
        if current_chunk:
            chunks.extend(
                self._recursive_split(current_chunk, remaining_separators)
            )

        # Add overlap between chunks
        return self._add_overlap(chunks)

    def _add_overlap(self, chunks: List[str]) -> List[str]:
        """
        Add overlap between adjacent chunks for context continuity.
        """
        if len(chunks) <= 1:
            return chunks

        overlapped = []
        for i, chunk in enumerate(chunks):
            if i > 0:
                # Get end of previous chunk as overlap
                prev_tokens = self.tokenizer.encode(chunks[i-1])
                overlap_tokens = prev_tokens[-self.chunk_overlap:]
                overlap_text = self.tokenizer.decode(overlap_tokens)
                chunk = overlap_text + " " + chunk

            overlapped.append(chunk)

        return overlapped

    def _force_split(self, text: str) -> List[str]:
        """
        Force split text when no separators work.
        Splits by token count.
        """
        tokens = self.tokenizer.encode(text)
        chunks = []

        for i in range(0, len(tokens), self.chunk_size - self.chunk_overlap):
            chunk_tokens = tokens[i:i + self.chunk_size]
            chunk_text = self.tokenizer.decode(chunk_tokens)
            chunks.append(chunk_text)

        return chunks
```

### Indexing Pipeline

```python
# indexer.py
import psycopg2
from psycopg2.extras import execute_values
from typing import List, Dict, Any
import json
import hashlib

class SemanticIndexer:
    """
    Indexes documents into PostgreSQL with pgvector for semantic search.
    Handles chunking, embedding generation, and database operations.
    """

    def __init__(
        self,
        db_connection_string: str,
        embedding_generator,  # EmbeddingGenerator instance
        chunker               # DocumentChunker instance
    ):
        self.conn = psycopg2.connect(db_connection_string)
        self.embedder = embedding_generator
        self.chunker = chunker

    def index_document(
        self,
        document_id: str,
        content: str,
        metadata: Dict[str, Any] = None
    ) -> int:
        """
        Index a single document by chunking and embedding it.

        Args:
            document_id: Unique identifier for the document
            content: The full document text
            metadata: Additional metadata for filtering

        Returns:
            Number of chunks indexed
        """
        # Step 1: Chunk the document
        chunks = self.chunker.chunk_document(content, metadata)

        if not chunks:
            return 0

        # Step 2: Generate embeddings for all chunks
        chunk_texts = [c["content"] for c in chunks]
        embeddings = self.embedder.generate_batch(chunk_texts)

        # Step 3: Prepare data for insertion
        records = []
        for chunk, embedding in zip(chunks, embeddings):
            records.append((
                document_id,
                chunk["chunk_index"],
                chunk["content"],
                embedding,  # pgvector accepts list of floats
                json.dumps(chunk["metadata"])
            ))

        # Step 4: Insert into database
        with self.conn.cursor() as cur:
            # Delete existing chunks for this document (for re-indexing)
            cur.execute(
                "DELETE FROM document_chunks WHERE document_id = %s",
                (document_id,)
            )

            # Insert new chunks
            execute_values(
                cur,
                """
                INSERT INTO document_chunks
                    (document_id, chunk_index, content, embedding, metadata)
                VALUES %s
                """,
                records,
                template="(%s, %s, %s, %s::vector, %s::jsonb)"
            )

        self.conn.commit()
        return len(records)

    def index_batch(
        self,
        documents: List[Dict[str, Any]],
        batch_size: int = 10
    ) -> Dict[str, int]:
        """
        Index multiple documents efficiently.

        Args:
            documents: List of dicts with 'id', 'content', and optional 'metadata'
            batch_size: Number of documents to process at once

        Returns:
            Dictionary mapping document_id to number of chunks indexed
        """
        results = {}

        for doc in documents:
            doc_id = doc["id"]
            content = doc["content"]
            metadata = doc.get("metadata", {})

            chunk_count = self.index_document(doc_id, content, metadata)
            results[doc_id] = chunk_count

        return results

    def delete_document(self, document_id: str) -> int:
        """
        Remove a document and all its chunks from the index.

        Returns:
            Number of chunks deleted
        """
        with self.conn.cursor() as cur:
            cur.execute(
                "DELETE FROM document_chunks WHERE document_id = %s RETURNING id",
                (document_id,)
            )
            deleted = cur.rowcount

        self.conn.commit()
        return deleted
```

---

## 7. Query Processing and Retrieval

```mermaid
flowchart LR
    Q[User Query] --> E[Generate Embedding]
    E --> VS[Vector Similarity Search]
    VS --> F[Filter by Metadata]
    F --> R[Return Top K Results]

    subgraph "Vector Search"
        VS --> |"Cosine Distance"| D1["doc_chunk_1: 0.89"]
        VS --> |"Cosine Distance"| D2["doc_chunk_2: 0.85"]
        VS --> |"Cosine Distance"| D3["doc_chunk_3: 0.72"]
    end
```

```python
# retriever.py
from typing import List, Dict, Any, Optional
import psycopg2
import json

class SemanticRetriever:
    """
    Retrieves relevant document chunks using semantic similarity.
    Supports filtering, pagination, and relevance scoring.
    """

    def __init__(
        self,
        db_connection_string: str,
        embedding_generator
    ):
        self.conn = psycopg2.connect(db_connection_string)
        self.embedder = embedding_generator

    def search(
        self,
        query: str,
        top_k: int = 5,
        min_similarity: float = 0.5,
        metadata_filter: Dict[str, Any] = None
    ) -> List[Dict[str, Any]]:
        """
        Search for chunks semantically similar to the query.

        Args:
            query: The search query text
            top_k: Maximum number of results to return
            min_similarity: Minimum cosine similarity threshold (0 to 1)
            metadata_filter: JSONB filter conditions

        Returns:
            List of matching chunks with similarity scores
        """
        # Generate embedding for the query
        query_embedding = self.embedder.generate_single(query)

        # Build the SQL query
        # Using cosine distance: 1 - cosine_similarity
        # So we want results where distance < (1 - min_similarity)
        max_distance = 1 - min_similarity

        sql = """
            SELECT
                id,
                document_id,
                chunk_index,
                content,
                metadata,
                1 - (embedding <=> %s::vector) as similarity
            FROM document_chunks
            WHERE 1 - (embedding <=> %s::vector) >= %s
        """
        params = [query_embedding, query_embedding, min_similarity]

        # Add metadata filter if provided
        if metadata_filter:
            sql += " AND metadata @> %s::jsonb"
            params.append(json.dumps(metadata_filter))

        # Order by similarity (descending) and limit
        sql += """
            ORDER BY embedding <=> %s::vector
            LIMIT %s
        """
        params.extend([query_embedding, top_k])

        # Execute query
        with self.conn.cursor() as cur:
            cur.execute(sql, params)
            rows = cur.fetchall()

        # Format results
        results = []
        for row in rows:
            results.append({
                "id": row[0],
                "document_id": row[1],
                "chunk_index": row[2],
                "content": row[3],
                "metadata": row[4],
                "similarity": float(row[5])
            })

        return results

    def search_with_context(
        self,
        query: str,
        top_k: int = 5,
        context_chunks: int = 1
    ) -> List[Dict[str, Any]]:
        """
        Search and include surrounding chunks for additional context.

        This helps when the most relevant chunk needs context from
        adjacent chunks to be fully understood.

        Args:
            query: The search query text
            top_k: Number of primary results
            context_chunks: Number of chunks before/after to include

        Returns:
            Results with expanded context
        """
        # First, get the primary results
        primary_results = self.search(query, top_k=top_k)

        # Collect chunk ranges to fetch
        context_ranges = []
        for result in primary_results:
            doc_id = result["document_id"]
            chunk_idx = result["chunk_index"]

            # Calculate range with context
            start_idx = max(0, chunk_idx - context_chunks)
            end_idx = chunk_idx + context_chunks

            context_ranges.append({
                "document_id": doc_id,
                "start": start_idx,
                "end": end_idx,
                "primary_index": chunk_idx,
                "primary_similarity": result["similarity"]
            })

        # Fetch context chunks
        enriched_results = []
        for range_info in context_ranges:
            with self.conn.cursor() as cur:
                cur.execute("""
                    SELECT chunk_index, content
                    FROM document_chunks
                    WHERE document_id = %s
                      AND chunk_index BETWEEN %s AND %s
                    ORDER BY chunk_index
                """, (
                    range_info["document_id"],
                    range_info["start"],
                    range_info["end"]
                ))

                chunks = cur.fetchall()

            # Combine chunks into expanded content
            combined_content = "\n\n".join([c[1] for c in chunks])

            enriched_results.append({
                "document_id": range_info["document_id"],
                "primary_chunk_index": range_info["primary_index"],
                "similarity": range_info["primary_similarity"],
                "content": combined_content,
                "chunk_range": f"{range_info['start']}-{range_info['end']}"
            })

        return enriched_results
```

---

## 8. Query Expansion Techniques

Query expansion improves recall by adding related terms to the original query.

```mermaid
flowchart TB
    Q["Original Query:<br/>'Python memory problems'"]

    Q --> T1["Synonym Expansion"]
    Q --> T2["LLM Expansion"]
    Q --> T3["Pseudo-Relevance Feedback"]

    T1 --> E1["Python RAM issues,<br/>Python heap problems"]
    T2 --> E2["Python garbage collection,<br/>memory leak debugging"]
    T3 --> E3["Terms from top 3<br/>initial results"]

    E1 --> C[Combined Expanded Query]
    E2 --> C
    E3 --> C
```

```python
# query_expansion.py
from typing import List, Dict, Any
import openai

class QueryExpander:
    """
    Expands queries to improve retrieval recall.
    Uses multiple strategies for comprehensive expansion.
    """

    def __init__(self, retriever=None):
        self.client = openai.OpenAI()
        self.retriever = retriever  # For pseudo-relevance feedback

    def expand_with_llm(
        self,
        query: str,
        num_expansions: int = 3
    ) -> List[str]:
        """
        Use an LLM to generate semantically related queries.

        Args:
            query: The original search query
            num_expansions: Number of alternative queries to generate

        Returns:
            List of expanded query variations
        """
        # Prompt the LLM to generate related search queries
        prompt = f"""Generate {num_expansions} alternative search queries for the following query.
Each alternative should capture the same intent but use different words or phrasings.
Return only the queries, one per line.

Original query: {query}

Alternative queries:"""

        response = self.client.chat.completions.create(
            model="gpt-4o-mini",  # Use a fast, cheap model for expansion
            messages=[{"role": "user", "content": prompt}],
            temperature=0.7,  # Some creativity for diversity
            max_tokens=200
        )

        # Parse the response into individual queries
        expansions = response.choices[0].message.content.strip().split("\n")

        # Clean up and filter empty lines
        expansions = [e.strip().lstrip("0123456789.-) ") for e in expansions]
        expansions = [e for e in expansions if e]

        return expansions[:num_expansions]

    def expand_with_synonyms(
        self,
        query: str,
        synonym_map: Dict[str, List[str]] = None
    ) -> List[str]:
        """
        Expand query using a predefined synonym dictionary.
        Useful for domain-specific terminology.

        Args:
            query: The original query
            synonym_map: Dictionary mapping terms to their synonyms

        Returns:
            List of expanded queries
        """
        if synonym_map is None:
            # Default technical synonyms
            synonym_map = {
                "error": ["exception", "failure", "bug", "issue"],
                "fast": ["quick", "performant", "efficient", "optimized"],
                "slow": ["latency", "delay", "performance issue", "bottleneck"],
                "memory": ["RAM", "heap", "allocation"],
                "crash": ["failure", "exception", "segfault"],
            }

        expansions = [query]  # Include original
        query_lower = query.lower()

        # Check each synonym and create expanded versions
        for term, synonyms in synonym_map.items():
            if term in query_lower:
                for synonym in synonyms:
                    expanded = query_lower.replace(term, synonym)
                    expansions.append(expanded)

        return list(set(expansions))  # Remove duplicates

    def expand_with_pseudo_relevance(
        self,
        query: str,
        top_k_docs: int = 3,
        top_k_terms: int = 5
    ) -> str:
        """
        Pseudo-relevance feedback: expand query using terms from top results.

        This assumes the top results for the initial query are relevant,
        then extracts important terms from them to enrich the query.

        Args:
            query: The original query
            top_k_docs: Number of top documents to analyze
            top_k_terms: Number of terms to extract

        Returns:
            Expanded query string
        """
        if not self.retriever:
            return query

        # Get initial results
        results = self.retriever.search(query, top_k=top_k_docs)

        if not results:
            return query

        # Combine content from top results
        combined_text = " ".join([r["content"] for r in results])

        # Use LLM to extract key terms
        prompt = f"""Extract the {top_k_terms} most important technical terms from this text that are relevant to the query "{query}".
Return only the terms, comma-separated.

Text: {combined_text[:2000]}

Key terms:"""

        response = self.client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[{"role": "user", "content": prompt}],
            temperature=0,
            max_tokens=100
        )

        key_terms = response.choices[0].message.content.strip()

        # Combine original query with extracted terms
        expanded_query = f"{query} {key_terms}"

        return expanded_query


class MultiQueryRetriever:
    """
    Retrieves documents using multiple query variations.
    Combines results from all queries and deduplicates.
    """

    def __init__(self, retriever, expander: QueryExpander):
        self.retriever = retriever
        self.expander = expander

    def search(
        self,
        query: str,
        top_k: int = 5,
        expansion_strategy: str = "llm"
    ) -> List[Dict[str, Any]]:
        """
        Search using expanded queries and merge results.

        Args:
            query: Original search query
            top_k: Final number of results to return
            expansion_strategy: 'llm', 'synonyms', or 'prf'

        Returns:
            Deduplicated and ranked results
        """
        # Generate query variations
        if expansion_strategy == "llm":
            queries = [query] + self.expander.expand_with_llm(query)
        elif expansion_strategy == "synonyms":
            queries = self.expander.expand_with_synonyms(query)
        elif expansion_strategy == "prf":
            expanded = self.expander.expand_with_pseudo_relevance(query)
            queries = [query, expanded]
        else:
            queries = [query]

        # Search with each query variation
        all_results = {}
        for q in queries:
            results = self.retriever.search(q, top_k=top_k * 2)

            for result in results:
                chunk_id = result["id"]

                # Keep the best similarity score for each chunk
                if chunk_id not in all_results:
                    all_results[chunk_id] = result
                elif result["similarity"] > all_results[chunk_id]["similarity"]:
                    all_results[chunk_id] = result

        # Sort by similarity and return top_k
        sorted_results = sorted(
            all_results.values(),
            key=lambda x: x["similarity"],
            reverse=True
        )

        return sorted_results[:top_k]
```

---

## 9. Relevance Tuning and Reranking

Initial vector search provides good recall but can miss nuances. Reranking improves precision.

```mermaid
flowchart LR
    subgraph "Stage 1: Retrieval"
        Q[Query] --> VS[Vector Search]
        VS --> C1["Candidate 1: 0.89"]
        VS --> C2["Candidate 2: 0.85"]
        VS --> C3["Candidate 3: 0.82"]
        VS --> C4["Candidate 4: 0.78"]
        VS --> C5["Candidate 5: 0.75"]
    end

    subgraph "Stage 2: Reranking"
        C1 --> RR[Cross-Encoder Reranker]
        C2 --> RR
        C3 --> RR
        C4 --> RR
        C5 --> RR

        RR --> R1["Candidate 3: 0.94"]
        RR --> R2["Candidate 1: 0.91"]
        RR --> R3["Candidate 5: 0.88"]
    end
```

```python
# reranker.py
from typing import List, Dict, Any, Tuple
from sentence_transformers import CrossEncoder
import openai

class Reranker:
    """
    Reranks search results for improved precision.
    Uses cross-encoder models that jointly encode query and document.
    """

    def __init__(self, model_name: str = "cross-encoder/ms-marco-MiniLM-L-12-v2"):
        # Cross-encoders are more accurate than bi-encoders for ranking
        # but slower since they cannot pre-compute document embeddings
        self.model = CrossEncoder(model_name)

    def rerank(
        self,
        query: str,
        results: List[Dict[str, Any]],
        top_k: int = None
    ) -> List[Dict[str, Any]]:
        """
        Rerank search results using a cross-encoder model.

        Args:
            query: The search query
            results: Initial search results with 'content' field
            top_k: Number of results to return (None = all)

        Returns:
            Reranked results with updated scores
        """
        if not results:
            return []

        # Prepare query-document pairs for the cross-encoder
        pairs = [(query, r["content"]) for r in results]

        # Get relevance scores from cross-encoder
        scores = self.model.predict(pairs)

        # Add rerank scores to results
        for result, score in zip(results, scores):
            result["rerank_score"] = float(score)
            result["original_score"] = result.get("similarity", 0)

        # Sort by rerank score (descending)
        reranked = sorted(results, key=lambda x: x["rerank_score"], reverse=True)

        if top_k:
            reranked = reranked[:top_k]

        return reranked


class LLMReranker:
    """
    Uses an LLM to rerank results based on relevance.
    More expensive but can handle complex relevance judgments.
    """

    def __init__(self):
        self.client = openai.OpenAI()

    def rerank(
        self,
        query: str,
        results: List[Dict[str, Any]],
        top_k: int = 3
    ) -> List[Dict[str, Any]]:
        """
        Rerank results using an LLM for relevance scoring.

        Args:
            query: The search query
            results: Search results to rerank
            top_k: Number of results to return

        Returns:
            Top K most relevant results according to LLM
        """
        if not results:
            return []

        # Format results for the LLM
        formatted_docs = []
        for i, r in enumerate(results):
            # Truncate content to avoid token limits
            content = r["content"][:500]
            formatted_docs.append(f"[{i}] {content}")

        docs_text = "\n\n".join(formatted_docs)

        # Ask LLM to rank by relevance
        prompt = f"""Given the search query and documents below, rank the documents by relevance to the query.
Return the document numbers in order from most to least relevant, comma-separated.
Only include documents that are actually relevant to the query.

Query: {query}

Documents:
{docs_text}

Ranking (comma-separated document numbers, most relevant first):"""

        response = self.client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[{"role": "user", "content": prompt}],
            temperature=0,
            max_tokens=50
        )

        # Parse the ranking
        ranking_text = response.choices[0].message.content.strip()

        try:
            # Extract document indices from response
            indices = []
            for part in ranking_text.split(","):
                part = part.strip().strip("[]")
                if part.isdigit():
                    idx = int(part)
                    if 0 <= idx < len(results):
                        indices.append(idx)

            # Build reranked results
            reranked = []
            for rank, idx in enumerate(indices[:top_k]):
                result = results[idx].copy()
                result["rerank_score"] = 1.0 - (rank * 0.1)  # Decreasing scores
                result["llm_rank"] = rank + 1
                reranked.append(result)

            return reranked

        except Exception as e:
            # Fall back to original order if parsing fails
            return results[:top_k]


class ReciprocalsRankFusion:
    """
    Combines results from multiple retrieval methods using
    Reciprocal Rank Fusion (RRF).
    """

    def __init__(self, k: int = 60):
        # k is a constant that affects score distribution
        # Higher k gives more weight to lower-ranked items
        self.k = k

    def fuse(
        self,
        result_lists: List[List[Dict[str, Any]]],
        top_k: int = 10
    ) -> List[Dict[str, Any]]:
        """
        Fuse multiple ranked lists using RRF.

        RRF score = sum(1 / (k + rank)) for each list where item appears

        Args:
            result_lists: List of ranked result lists
            top_k: Number of final results

        Returns:
            Fused and reranked results
        """
        # Calculate RRF scores
        rrf_scores = {}
        result_map = {}

        for results in result_lists:
            for rank, result in enumerate(results):
                doc_id = result["id"]

                # RRF formula
                score = 1.0 / (self.k + rank + 1)

                if doc_id in rrf_scores:
                    rrf_scores[doc_id] += score
                else:
                    rrf_scores[doc_id] = score
                    result_map[doc_id] = result

        # Sort by RRF score
        sorted_ids = sorted(
            rrf_scores.keys(),
            key=lambda x: rrf_scores[x],
            reverse=True
        )

        # Build final results
        fused_results = []
        for doc_id in sorted_ids[:top_k]:
            result = result_map[doc_id].copy()
            result["rrf_score"] = rrf_scores[doc_id]
            fused_results.append(result)

        return fused_results
```

---

## 10. Hybrid Search (Combining Keyword and Semantic)

Hybrid search combines the precision of keyword matching with the recall of semantic search.

```mermaid
flowchart TB
    Q[Query] --> KS[Keyword Search<br/>BM25/Full-text]
    Q --> SS[Semantic Search<br/>Vector Similarity]

    KS --> |"'Python memory'<br/>exact matches"| R1[Results A]
    SS --> |"Related concepts<br/>like 'heap allocation'"| R2[Results B]

    R1 --> RRF[Reciprocal Rank Fusion]
    R2 --> RRF

    RRF --> F[Final Ranked Results]
```

```python
# hybrid_search.py
from typing import List, Dict, Any
import psycopg2
import json

class HybridSearcher:
    """
    Combines keyword (BM25) and semantic (vector) search.
    Uses PostgreSQL's full-text search alongside pgvector.
    """

    def __init__(
        self,
        db_connection_string: str,
        embedding_generator,
        keyword_weight: float = 0.3,
        semantic_weight: float = 0.7
    ):
        self.conn = psycopg2.connect(db_connection_string)
        self.embedder = embedding_generator
        self.keyword_weight = keyword_weight
        self.semantic_weight = semantic_weight

        # Ensure full-text search is set up
        self._setup_fts()

    def _setup_fts(self):
        """Set up full-text search index if not exists."""
        with self.conn.cursor() as cur:
            # Add tsvector column for full-text search
            cur.execute("""
                DO $$
                BEGIN
                    IF NOT EXISTS (
                        SELECT 1 FROM information_schema.columns
                        WHERE table_name = 'document_chunks'
                        AND column_name = 'content_tsv'
                    ) THEN
                        ALTER TABLE document_chunks
                        ADD COLUMN content_tsv tsvector
                        GENERATED ALWAYS AS (to_tsvector('english', content)) STORED;

                        CREATE INDEX IF NOT EXISTS idx_content_fts
                        ON document_chunks USING GIN (content_tsv);
                    END IF;
                END $$;
            """)
        self.conn.commit()

    def search(
        self,
        query: str,
        top_k: int = 10,
        metadata_filter: Dict[str, Any] = None
    ) -> List[Dict[str, Any]]:
        """
        Perform hybrid search combining keyword and semantic results.

        Args:
            query: Search query
            top_k: Number of results to return
            metadata_filter: Optional metadata filter

        Returns:
            Combined and ranked results
        """
        # Get results from both methods
        keyword_results = self._keyword_search(query, top_k * 2, metadata_filter)
        semantic_results = self._semantic_search(query, top_k * 2, metadata_filter)

        # Combine using weighted scores
        combined = self._combine_results(
            keyword_results,
            semantic_results,
            top_k
        )

        return combined

    def _keyword_search(
        self,
        query: str,
        top_k: int,
        metadata_filter: Dict[str, Any] = None
    ) -> List[Dict[str, Any]]:
        """Full-text search using PostgreSQL ts_rank."""

        sql = """
            SELECT
                id,
                document_id,
                chunk_index,
                content,
                metadata,
                ts_rank(content_tsv, plainto_tsquery('english', %s)) as score
            FROM document_chunks
            WHERE content_tsv @@ plainto_tsquery('english', %s)
        """
        params = [query, query]

        if metadata_filter:
            sql += " AND metadata @> %s::jsonb"
            params.append(json.dumps(metadata_filter))

        sql += """
            ORDER BY score DESC
            LIMIT %s
        """
        params.append(top_k)

        with self.conn.cursor() as cur:
            cur.execute(sql, params)
            rows = cur.fetchall()

        results = []
        for row in rows:
            results.append({
                "id": row[0],
                "document_id": row[1],
                "chunk_index": row[2],
                "content": row[3],
                "metadata": row[4],
                "keyword_score": float(row[5])
            })

        return results

    def _semantic_search(
        self,
        query: str,
        top_k: int,
        metadata_filter: Dict[str, Any] = None
    ) -> List[Dict[str, Any]]:
        """Vector similarity search."""

        query_embedding = self.embedder.generate_single(query)

        sql = """
            SELECT
                id,
                document_id,
                chunk_index,
                content,
                metadata,
                1 - (embedding <=> %s::vector) as score
            FROM document_chunks
            WHERE 1 = 1
        """
        params = [query_embedding]

        if metadata_filter:
            sql += " AND metadata @> %s::jsonb"
            params.append(json.dumps(metadata_filter))

        sql += """
            ORDER BY embedding <=> %s::vector
            LIMIT %s
        """
        params.extend([query_embedding, top_k])

        with self.conn.cursor() as cur:
            cur.execute(sql, params)
            rows = cur.fetchall()

        results = []
        for row in rows:
            results.append({
                "id": row[0],
                "document_id": row[1],
                "chunk_index": row[2],
                "content": row[3],
                "metadata": row[4],
                "semantic_score": float(row[5])
            })

        return results

    def _combine_results(
        self,
        keyword_results: List[Dict[str, Any]],
        semantic_results: List[Dict[str, Any]],
        top_k: int
    ) -> List[Dict[str, Any]]:
        """Combine results using weighted scoring."""

        # Normalize scores to [0, 1] range
        if keyword_results:
            max_kw = max(r["keyword_score"] for r in keyword_results)
            for r in keyword_results:
                r["keyword_score_norm"] = r["keyword_score"] / max_kw if max_kw > 0 else 0

        if semantic_results:
            max_sem = max(r["semantic_score"] for r in semantic_results)
            for r in semantic_results:
                r["semantic_score_norm"] = r["semantic_score"] / max_sem if max_sem > 0 else 0

        # Merge results
        combined = {}

        for r in keyword_results:
            combined[r["id"]] = {
                **r,
                "keyword_score_norm": r.get("keyword_score_norm", 0),
                "semantic_score_norm": 0
            }

        for r in semantic_results:
            if r["id"] in combined:
                combined[r["id"]]["semantic_score_norm"] = r.get("semantic_score_norm", 0)
                combined[r["id"]]["semantic_score"] = r["semantic_score"]
            else:
                combined[r["id"]] = {
                    **r,
                    "keyword_score_norm": 0,
                    "semantic_score_norm": r.get("semantic_score_norm", 0)
                }

        # Calculate weighted score
        for doc_id, result in combined.items():
            result["hybrid_score"] = (
                self.keyword_weight * result.get("keyword_score_norm", 0) +
                self.semantic_weight * result.get("semantic_score_norm", 0)
            )

        # Sort by hybrid score
        sorted_results = sorted(
            combined.values(),
            key=lambda x: x["hybrid_score"],
            reverse=True
        )

        return sorted_results[:top_k]
```

---

## 11. Performance Optimization

### Indexing Performance

```python
# performance.py
from typing import List, Dict, Any
import numpy as np

class OptimizedIndexer:
    """
    Performance optimizations for large-scale indexing.
    """

    def __init__(self, db_connection_string: str, embedding_generator):
        self.db_conn_str = db_connection_string
        self.embedder = embedding_generator

    def batch_index_parallel(
        self,
        documents: List[Dict[str, Any]],
        num_workers: int = 4,
        batch_size: int = 100
    ):
        """
        Index documents in parallel for faster throughput.

        Uses multiprocessing to parallelize:
        1. Document chunking
        2. Embedding generation
        3. Database insertion
        """
        from concurrent.futures import ThreadPoolExecutor, as_completed
        import psycopg2.pool

        # Create a connection pool
        pool = psycopg2.pool.ThreadedConnectionPool(
            minconn=num_workers,
            maxconn=num_workers * 2,
            dsn=self.db_conn_str
        )

        def process_batch(batch):
            """Process a batch of documents."""
            conn = pool.getconn()
            try:
                # Chunk all documents in batch
                all_chunks = []
                for doc in batch:
                    chunks = self._chunk_document(doc)
                    all_chunks.extend(chunks)

                # Generate embeddings in batch
                texts = [c["content"] for c in all_chunks]
                embeddings = self.embedder.generate_batch(texts)

                # Insert into database
                self._batch_insert(conn, all_chunks, embeddings)

                return len(all_chunks)
            finally:
                pool.putconn(conn)

        # Split documents into batches
        batches = [
            documents[i:i + batch_size]
            for i in range(0, len(documents), batch_size)
        ]

        # Process batches in parallel
        total_chunks = 0
        with ThreadPoolExecutor(max_workers=num_workers) as executor:
            futures = [executor.submit(process_batch, batch) for batch in batches]

            for future in as_completed(futures):
                total_chunks += future.result()

        pool.closeall()
        return total_chunks


class QueryCache:
    """
    Caches query embeddings and results for faster repeated queries.
    """

    def __init__(self, max_size: int = 1000, ttl_seconds: int = 3600):
        from functools import lru_cache
        import time

        self.max_size = max_size
        self.ttl_seconds = ttl_seconds
        self._cache = {}
        self._timestamps = {}

    def get_embedding(self, query: str, embedder) -> List[float]:
        """Get cached embedding or generate new one."""
        cache_key = f"emb:{query}"

        if cache_key in self._cache:
            if self._is_valid(cache_key):
                return self._cache[cache_key]

        # Generate and cache
        embedding = embedder.generate_single(query)
        self._set(cache_key, embedding)

        return embedding

    def get_results(
        self,
        query: str,
        params_hash: str
    ) -> List[Dict[str, Any]]:
        """Get cached search results."""
        cache_key = f"res:{query}:{params_hash}"

        if cache_key in self._cache and self._is_valid(cache_key):
            return self._cache[cache_key]

        return None

    def set_results(
        self,
        query: str,
        params_hash: str,
        results: List[Dict[str, Any]]
    ):
        """Cache search results."""
        cache_key = f"res:{query}:{params_hash}"
        self._set(cache_key, results)

    def _is_valid(self, key: str) -> bool:
        """Check if cache entry is still valid."""
        import time
        if key not in self._timestamps:
            return False
        return (time.time() - self._timestamps[key]) < self.ttl_seconds

    def _set(self, key: str, value: Any):
        """Set cache entry with timestamp."""
        import time

        # Evict oldest entries if at capacity
        if len(self._cache) >= self.max_size:
            oldest = min(self._timestamps, key=self._timestamps.get)
            del self._cache[oldest]
            del self._timestamps[oldest]

        self._cache[key] = value
        self._timestamps[key] = time.time()
```

### Index Tuning for pgvector

```sql
-- Optimize pgvector index parameters based on dataset size

-- For small datasets (< 100K vectors): use exact search
-- No index needed, or use HNSW for better quality

-- For medium datasets (100K - 1M vectors): IVFFlat
-- lists = sqrt(num_vectors)
CREATE INDEX ON document_chunks
USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 1000);  -- Adjust based on dataset size

-- Set probes for query (higher = better recall, slower)
SET ivfflat.probes = 10;

-- For large datasets (> 1M vectors): HNSW
-- Better recall than IVFFlat, higher memory usage
CREATE INDEX ON document_chunks
USING hnsw (embedding vector_cosine_ops)
WITH (m = 16, ef_construction = 64);

-- Set ef for query (higher = better recall, slower)
SET hnsw.ef_search = 40;
```

---

## 12. Evaluation and Metrics

```python
# evaluation.py
from typing import List, Dict, Any, Set
import numpy as np

class RetrievalEvaluator:
    """
    Evaluates semantic search quality using standard IR metrics.
    """

    def precision_at_k(
        self,
        retrieved: List[str],
        relevant: Set[str],
        k: int
    ) -> float:
        """
        Precision@K: What fraction of top K results are relevant?

        Args:
            retrieved: List of retrieved document IDs (ordered by rank)
            relevant: Set of relevant document IDs (ground truth)
            k: Number of results to consider

        Returns:
            Precision score between 0 and 1
        """
        if k == 0:
            return 0.0

        top_k = retrieved[:k]
        relevant_in_top_k = sum(1 for doc_id in top_k if doc_id in relevant)

        return relevant_in_top_k / k

    def recall_at_k(
        self,
        retrieved: List[str],
        relevant: Set[str],
        k: int
    ) -> float:
        """
        Recall@K: What fraction of relevant docs are in top K?

        Args:
            retrieved: List of retrieved document IDs
            relevant: Set of relevant document IDs
            k: Number of results to consider

        Returns:
            Recall score between 0 and 1
        """
        if not relevant:
            return 0.0

        top_k = retrieved[:k]
        relevant_in_top_k = sum(1 for doc_id in top_k if doc_id in relevant)

        return relevant_in_top_k / len(relevant)

    def mrr(
        self,
        retrieved: List[str],
        relevant: Set[str]
    ) -> float:
        """
        Mean Reciprocal Rank: How high is the first relevant result?

        Returns:
            MRR score between 0 and 1
        """
        for i, doc_id in enumerate(retrieved):
            if doc_id in relevant:
                return 1.0 / (i + 1)
        return 0.0

    def ndcg_at_k(
        self,
        retrieved: List[str],
        relevance_scores: Dict[str, float],
        k: int
    ) -> float:
        """
        Normalized Discounted Cumulative Gain.
        Accounts for graded relevance (not just binary).

        Args:
            retrieved: List of retrieved document IDs
            relevance_scores: Dict mapping doc_id to relevance score
            k: Number of results to consider

        Returns:
            NDCG score between 0 and 1
        """
        def dcg(scores: List[float]) -> float:
            """Calculate DCG for a list of relevance scores."""
            return sum(
                (2 ** score - 1) / np.log2(i + 2)
                for i, score in enumerate(scores)
            )

        # Get actual relevance scores for retrieved docs
        actual_scores = [
            relevance_scores.get(doc_id, 0)
            for doc_id in retrieved[:k]
        ]

        # Get ideal ordering (sorted by relevance)
        ideal_scores = sorted(relevance_scores.values(), reverse=True)[:k]

        # Calculate DCG and IDCG
        actual_dcg = dcg(actual_scores)
        ideal_dcg = dcg(ideal_scores)

        if ideal_dcg == 0:
            return 0.0

        return actual_dcg / ideal_dcg

    def evaluate_retriever(
        self,
        retriever,
        test_queries: List[Dict[str, Any]],
        k_values: List[int] = [1, 3, 5, 10]
    ) -> Dict[str, float]:
        """
        Comprehensive evaluation across multiple queries.

        Args:
            retriever: SemanticRetriever instance
            test_queries: List of dicts with 'query' and 'relevant_docs'
            k_values: K values to evaluate

        Returns:
            Dictionary of averaged metrics
        """
        metrics = {f"precision@{k}": [] for k in k_values}
        metrics.update({f"recall@{k}": [] for k in k_values})
        metrics["mrr"] = []

        for test in test_queries:
            query = test["query"]
            relevant = set(test["relevant_docs"])

            # Run retrieval
            results = retriever.search(query, top_k=max(k_values))
            retrieved = [r["document_id"] for r in results]

            # Calculate metrics
            for k in k_values:
                metrics[f"precision@{k}"].append(
                    self.precision_at_k(retrieved, relevant, k)
                )
                metrics[f"recall@{k}"].append(
                    self.recall_at_k(retrieved, relevant, k)
                )

            metrics["mrr"].append(self.mrr(retrieved, relevant))

        # Average all metrics
        return {
            name: np.mean(scores)
            for name, scores in metrics.items()
        }
```

---

## 13. Production Considerations

### Monitoring and Observability

```python
# monitoring.py
from typing import Dict, Any
import time
import logging
from functools import wraps

# Configure structured logging
logging.basicConfig(
    format='%(asctime)s %(levelname)s %(name)s %(message)s',
    level=logging.INFO
)
logger = logging.getLogger("semantic_search")

def track_latency(operation_name: str):
    """
    Decorator to track operation latency.
    Logs timing and can export to metrics systems.
    """
    def decorator(func):
        @wraps(func)
        def wrapper(*args, **kwargs):
            start = time.perf_counter()

            try:
                result = func(*args, **kwargs)

                duration_ms = (time.perf_counter() - start) * 1000

                logger.info(
                    f"operation={operation_name} "
                    f"duration_ms={duration_ms:.2f} "
                    f"status=success"
                )

                # Export to metrics (e.g., Prometheus, OneUptime)
                # metrics.histogram(
                #     "semantic_search_latency_ms",
                #     duration_ms,
                #     tags={"operation": operation_name}
                # )

                return result

            except Exception as e:
                duration_ms = (time.perf_counter() - start) * 1000

                logger.error(
                    f"operation={operation_name} "
                    f"duration_ms={duration_ms:.2f} "
                    f"status=error "
                    f"error={str(e)}"
                )
                raise

        return wrapper
    return decorator


class SearchMetrics:
    """
    Collects and reports search quality metrics.
    """

    def __init__(self):
        self.queries_total = 0
        self.latencies = []
        self.result_counts = []
        self.empty_results = 0

    def record_search(
        self,
        query: str,
        results: list,
        latency_ms: float
    ):
        """Record metrics for a search operation."""
        self.queries_total += 1
        self.latencies.append(latency_ms)
        self.result_counts.append(len(results))

        if not results:
            self.empty_results += 1

    def get_stats(self) -> Dict[str, Any]:
        """Get aggregated statistics."""
        import numpy as np

        if not self.latencies:
            return {"queries_total": 0}

        return {
            "queries_total": self.queries_total,
            "latency_p50_ms": np.percentile(self.latencies, 50),
            "latency_p95_ms": np.percentile(self.latencies, 95),
            "latency_p99_ms": np.percentile(self.latencies, 99),
            "avg_result_count": np.mean(self.result_counts),
            "empty_result_rate": self.empty_results / self.queries_total
        }
```

### Error Handling and Fallbacks

```python
# resilience.py
from typing import List, Dict, Any, Optional
import time
import random

class ResilientRetriever:
    """
    Wrapper that adds resilience patterns to semantic search.
    """

    def __init__(
        self,
        primary_retriever,
        fallback_retriever=None,
        max_retries: int = 3,
        timeout_seconds: float = 5.0
    ):
        self.primary = primary_retriever
        self.fallback = fallback_retriever
        self.max_retries = max_retries
        self.timeout = timeout_seconds

    def search(
        self,
        query: str,
        top_k: int = 5,
        **kwargs
    ) -> List[Dict[str, Any]]:
        """
        Search with retry and fallback logic.
        """
        last_error = None

        # Try primary retriever with retries
        for attempt in range(self.max_retries):
            try:
                results = self.primary.search(
                    query,
                    top_k=top_k,
                    **kwargs
                )
                return results

            except Exception as e:
                last_error = e

                # Exponential backoff with jitter
                if attempt < self.max_retries - 1:
                    delay = (2 ** attempt) + random.uniform(0, 1)
                    time.sleep(delay)

        # Try fallback if available
        if self.fallback:
            try:
                logger.warning(
                    f"Primary retriever failed, using fallback. "
                    f"Error: {last_error}"
                )
                return self.fallback.search(query, top_k=top_k, **kwargs)
            except Exception as e:
                logger.error(f"Fallback also failed: {e}")

        # Return empty results rather than crashing
        logger.error(
            f"All retrieval attempts failed for query: {query}"
        )
        return []
```

---

## 14. Complete Working Example

Here is a complete example tying all components together:

```python
# main.py
"""
Complete semantic search system for RAG.
Run: python main.py
"""

import os
from typing import List, Dict, Any

# Import all our components
from embeddings import EmbeddingGenerator
from chunker import DocumentChunker
from indexer import SemanticIndexer
from retriever import SemanticRetriever
from query_expansion import QueryExpander, MultiQueryRetriever
from reranker import Reranker
from hybrid_search import HybridSearcher

# Configuration
DB_CONNECTION = os.getenv(
    "DATABASE_URL",
    "postgresql://postgres:mysecretpassword@localhost:5432/postgres"
)

def setup_system():
    """Initialize all components."""

    # Initialize embedding generator
    embedder = EmbeddingGenerator(model="text-embedding-3-small")

    # Initialize chunker with optimal settings
    chunker = DocumentChunker(
        chunk_size=500,
        chunk_overlap=50
    )

    # Initialize indexer
    indexer = SemanticIndexer(
        db_connection_string=DB_CONNECTION,
        embedding_generator=embedder,
        chunker=chunker
    )

    # Initialize retriever
    retriever = SemanticRetriever(
        db_connection_string=DB_CONNECTION,
        embedding_generator=embedder
    )

    # Initialize reranker
    reranker = Reranker()

    # Initialize hybrid searcher
    hybrid = HybridSearcher(
        db_connection_string=DB_CONNECTION,
        embedding_generator=embedder,
        keyword_weight=0.3,
        semantic_weight=0.7
    )

    return {
        "indexer": indexer,
        "retriever": retriever,
        "reranker": reranker,
        "hybrid": hybrid,
        "embedder": embedder
    }


def index_documents(indexer, documents: List[Dict[str, Any]]):
    """Index a batch of documents."""

    print(f"Indexing {len(documents)} documents...")

    results = indexer.index_batch(documents)

    total_chunks = sum(results.values())
    print(f"Indexed {total_chunks} chunks from {len(documents)} documents")

    return results


def search_with_reranking(
    retriever,
    reranker,
    query: str,
    top_k: int = 5
) -> List[Dict[str, Any]]:
    """
    Two-stage retrieval: semantic search followed by reranking.
    """

    # Stage 1: Retrieve candidates (get more than needed)
    candidates = retriever.search(query, top_k=top_k * 3)

    if not candidates:
        return []

    # Stage 2: Rerank for precision
    reranked = reranker.rerank(query, candidates, top_k=top_k)

    return reranked


def main():
    """Demonstration of the complete system."""

    # Setup
    components = setup_system()
    indexer = components["indexer"]
    retriever = components["retriever"]
    reranker = components["reranker"]
    hybrid = components["hybrid"]

    # Sample documents to index
    sample_docs = [
        {
            "id": "doc-001",
            "content": """
            Python Memory Management Guide

            Python uses automatic memory management through garbage collection.
            The primary mechanism is reference counting, where each object
            tracks how many references point to it. When the count drops to
            zero, the memory is freed.

            For circular references, Python uses a cyclic garbage collector
            that periodically identifies and cleans up reference cycles.

            Common memory issues include:
            - Memory leaks from circular references with custom __del__ methods
            - Large object accumulation in long-running processes
            - Inefficient data structures for the use case

            To debug memory issues, use tools like tracemalloc, memory_profiler,
            or objgraph to visualize object relationships.
            """,
            "metadata": {"category": "python", "topic": "memory"}
        },
        {
            "id": "doc-002",
            "content": """
            Kubernetes Horizontal Pod Autoscaling

            HPA automatically scales the number of pod replicas based on
            observed CPU utilization or custom metrics.

            Basic configuration:
            - Target CPU utilization percentage
            - Minimum and maximum replica counts
            - Scale-up and scale-down policies

            For custom metrics, you can use the Prometheus adapter or
            external metrics from cloud providers.

            Best practices:
            - Set appropriate resource requests on pods
            - Use PodDisruptionBudgets alongside HPA
            - Consider vertical scaling for memory-bound workloads
            """,
            "metadata": {"category": "kubernetes", "topic": "scaling"}
        },
        {
            "id": "doc-003",
            "content": """
            Building RAG Systems with Vector Databases

            Retrieval Augmented Generation combines the power of large
            language models with external knowledge retrieval.

            Key components:
            1. Document ingestion and chunking
            2. Embedding generation using transformer models
            3. Vector storage and similarity search
            4. Query processing and context construction
            5. LLM prompting with retrieved context

            Vector databases like Pinecone, Weaviate, or pgvector enable
            efficient similarity search at scale.

            Quality depends heavily on:
            - Chunking strategy (size, overlap)
            - Embedding model choice
            - Retrieval and reranking methods
            """,
            "metadata": {"category": "ai", "topic": "rag"}
        }
    ]

    # Index documents
    index_documents(indexer, sample_docs)

    # Example searches
    queries = [
        "How do I fix Python memory leaks?",
        "scale Kubernetes pods automatically",
        "building search for AI applications"
    ]

    print("\n" + "=" * 60)
    print("SEARCH RESULTS")
    print("=" * 60)

    for query in queries:
        print(f"\nQuery: {query}")
        print("-" * 40)

        # Basic semantic search
        results = retriever.search(query, top_k=2)

        for i, result in enumerate(results, 1):
            print(f"\n{i}. [Score: {result['similarity']:.3f}]")
            print(f"   Document: {result['document_id']}")
            print(f"   Content: {result['content'][:150]}...")

        # With reranking
        print("\n  After Reranking:")
        reranked = search_with_reranking(retriever, reranker, query, top_k=2)

        for i, result in enumerate(reranked, 1):
            print(f"  {i}. [Rerank Score: {result.get('rerank_score', 0):.3f}]")
            print(f"     Document: {result['document_id']}")


if __name__ == "__main__":
    main()
```

---

## Summary

Building semantic search for RAG involves several interconnected components:

| Component | Purpose | Key Considerations |
|-----------|---------|-------------------|
| Embeddings | Convert text to vectors | Model quality vs. cost/speed |
| Chunking | Split docs for retrieval | Balance size with context |
| Vector DB | Store and search vectors | Index type affects recall/speed |
| Query Processing | Improve retrieval | Expansion, normalization |
| Reranking | Improve precision | Cross-encoders, LLM reranking |
| Hybrid Search | Best of both worlds | Weight tuning, fusion methods |

Start simple with basic semantic search, measure quality with evaluation metrics, then add complexity (reranking, hybrid search, query expansion) as needed. The best system is one tuned for your specific documents and queries.

---

## Related Reading

- [What is OpenTelemetry Collector and Why Use One](/blog/post/2025-09-18-what-is-opentelemetry-collector-and-why-use-one) - Monitor your RAG system with distributed tracing
- [Basics of Profiling](/blog/post/2025-09-09-basics-of-profiling) - Profile embedding generation and search performance
- [Python Health Checks for Kubernetes](/blog/post/2025-01-06-python-health-checks-kubernetes) - Production deployment patterns for Python services
