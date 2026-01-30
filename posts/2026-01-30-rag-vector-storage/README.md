# How to Build Vector Storage

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: RAG, Vector Database, Storage, Embeddings

Description: Learn to build vector storage for efficiently storing and retrieving embedding vectors.

---

Retrieval-Augmented Generation (RAG) systems live or die by how fast they can find relevant context. The core challenge is storing millions of high-dimensional vectors and retrieving the nearest neighbors in milliseconds. This guide walks through building vector storage from scratch, comparing storage backends, indexing strategies, and scaling patterns that work in production.

## What Is Vector Storage?

Vector storage is a specialized data layer optimized for similarity search. Unlike traditional databases that match exact keys or filter ranges, vector databases find items whose embedding vectors are mathematically close to a query vector. The "closeness" is measured using distance metrics like cosine similarity, Euclidean distance, or dot product.

```mermaid
flowchart LR
    A[Query Text] --> B[Embedding Model]
    B --> C[Query Vector]
    C --> D[Vector Storage]
    D --> E[Top-K Similar Vectors]
    E --> F[Retrieved Documents]
    F --> G[LLM Context]
```

## Core Components of Vector Storage

Every vector storage system needs four building blocks:

1. **Vector representation:** Dense floating-point arrays (typically 384 to 1536 dimensions)
2. **Distance computation:** Functions to measure similarity between vectors
3. **Indexing structure:** Data structures that enable sub-linear search time
4. **Persistence layer:** Storage backend for durability and recovery

## Building a Basic Vector Store in Python

Let us start with a minimal implementation to understand the fundamentals. This example stores vectors in memory and performs brute-force search.

```python
import numpy as np
from typing import List, Tuple, Optional
from dataclasses import dataclass
import json

@dataclass
class VectorRecord:
    """
    Represents a single vector with its associated metadata.

    Attributes:
        id: Unique identifier for the vector
        vector: The embedding as a numpy array
        metadata: Optional dictionary for storing document info
    """
    id: str
    vector: np.ndarray
    metadata: Optional[dict] = None


class SimpleVectorStore:
    """
    A basic in-memory vector store with brute-force similarity search.

    This implementation prioritizes clarity over performance.
    Use it to understand the concepts before moving to optimized solutions.
    """

    def __init__(self, dimension: int):
        """
        Initialize the vector store.

        Args:
            dimension: The dimensionality of vectors (e.g., 384, 768, 1536)
        """
        self.dimension = dimension
        self.records: List[VectorRecord] = []
        # Pre-allocate matrix for batch operations
        self._vectors_matrix: Optional[np.ndarray] = None
        self._matrix_dirty = True

    def add(self, id: str, vector: np.ndarray, metadata: dict = None) -> None:
        """
        Add a single vector to the store.

        Args:
            id: Unique identifier
            vector: Embedding vector (must match store dimension)
            metadata: Optional metadata dictionary

        Raises:
            ValueError: If vector dimension does not match store dimension
        """
        # Validate vector dimension
        if vector.shape[0] != self.dimension:
            raise ValueError(
                f"Vector dimension {vector.shape[0]} does not match "
                f"store dimension {self.dimension}"
            )

        # Normalize vector for cosine similarity
        normalized = vector / np.linalg.norm(vector)

        record = VectorRecord(id=id, vector=normalized, metadata=metadata)
        self.records.append(record)
        self._matrix_dirty = True

    def add_batch(self, ids: List[str], vectors: np.ndarray,
                  metadata_list: List[dict] = None) -> None:
        """
        Add multiple vectors in a single operation.

        Args:
            ids: List of unique identifiers
            vectors: 2D array of shape (n_vectors, dimension)
            metadata_list: Optional list of metadata dictionaries
        """
        if metadata_list is None:
            metadata_list = [None] * len(ids)

        for i, (id_, vec) in enumerate(zip(ids, vectors)):
            self.add(id_, vec, metadata_list[i])

    def _rebuild_matrix(self) -> None:
        """
        Rebuild the internal matrix for efficient batch similarity computation.
        Called lazily when needed for search operations.
        """
        if not self.records:
            self._vectors_matrix = None
            return

        # Stack all vectors into a single matrix
        self._vectors_matrix = np.vstack([r.vector for r in self.records])
        self._matrix_dirty = False

    def search(self, query_vector: np.ndarray, top_k: int = 10) -> List[Tuple[str, float, dict]]:
        """
        Find the top-k most similar vectors to the query.

        Uses cosine similarity (dot product of normalized vectors).

        Args:
            query_vector: The query embedding
            top_k: Number of results to return

        Returns:
            List of tuples: (id, similarity_score, metadata)
        """
        if not self.records:
            return []

        # Rebuild matrix if needed
        if self._matrix_dirty:
            self._rebuild_matrix()

        # Normalize query vector
        query_normalized = query_vector / np.linalg.norm(query_vector)

        # Compute cosine similarity via dot product
        # Shape: (n_vectors,)
        similarities = self._vectors_matrix @ query_normalized

        # Get indices of top-k highest similarities
        top_indices = np.argsort(similarities)[-top_k:][::-1]

        # Build result list
        results = []
        for idx in top_indices:
            record = self.records[idx]
            score = float(similarities[idx])
            results.append((record.id, score, record.metadata))

        return results

    def save(self, path: str) -> None:
        """
        Persist the vector store to disk.

        Args:
            path: File path (without extension)
        """
        # Save vectors as numpy array
        if self.records:
            if self._matrix_dirty:
                self._rebuild_matrix()
            np.save(f"{path}_vectors.npy", self._vectors_matrix)

        # Save metadata as JSON
        metadata = {
            "dimension": self.dimension,
            "records": [
                {"id": r.id, "metadata": r.metadata}
                for r in self.records
            ]
        }
        with open(f"{path}_metadata.json", "w") as f:
            json.dump(metadata, f)

    @classmethod
    def load(cls, path: str) -> "SimpleVectorStore":
        """
        Load a vector store from disk.

        Args:
            path: File path (without extension)

        Returns:
            Loaded SimpleVectorStore instance
        """
        # Load metadata
        with open(f"{path}_metadata.json", "r") as f:
            metadata = json.load(f)

        store = cls(dimension=metadata["dimension"])

        # Load vectors
        vectors = np.load(f"{path}_vectors.npy")

        # Reconstruct records
        for i, record_meta in enumerate(metadata["records"]):
            store.records.append(VectorRecord(
                id=record_meta["id"],
                vector=vectors[i],
                metadata=record_meta["metadata"]
            ))

        store._vectors_matrix = vectors
        store._matrix_dirty = False

        return store


# Example usage
if __name__ == "__main__":
    # Create a store for 384-dimensional vectors
    store = SimpleVectorStore(dimension=384)

    # Simulate adding document embeddings
    for i in range(1000):
        # In practice, these come from an embedding model
        fake_embedding = np.random.randn(384)
        store.add(
            id=f"doc_{i}",
            vector=fake_embedding,
            metadata={"title": f"Document {i}", "source": "example"}
        )

    # Search with a query vector
    query = np.random.randn(384)
    results = store.search(query, top_k=5)

    for doc_id, score, meta in results:
        print(f"{doc_id}: {score:.4f} - {meta['title']}")
```

## Distance Metrics Explained

Choosing the right distance metric affects both accuracy and performance. Here are the three most common options:

```python
import numpy as np

def cosine_similarity(a: np.ndarray, b: np.ndarray) -> float:
    """
    Cosine similarity measures the angle between vectors.

    Range: -1 to 1 (1 means identical direction)
    Best for: Text embeddings, semantic similarity

    Note: If vectors are pre-normalized, this reduces to a dot product.
    """
    dot_product = np.dot(a, b)
    norm_a = np.linalg.norm(a)
    norm_b = np.linalg.norm(b)
    return dot_product / (norm_a * norm_b)


def euclidean_distance(a: np.ndarray, b: np.ndarray) -> float:
    """
    Euclidean (L2) distance measures straight-line distance.

    Range: 0 to infinity (0 means identical)
    Best for: Image embeddings, when magnitude matters

    Tip: Square the result to avoid expensive sqrt in comparisons.
    """
    return np.linalg.norm(a - b)


def dot_product(a: np.ndarray, b: np.ndarray) -> float:
    """
    Dot product (inner product) of two vectors.

    Range: -infinity to infinity
    Best for: Normalized vectors, maximum inner product search (MIPS)

    Warning: Only use when vectors are normalized, otherwise
    longer vectors will have artificially higher scores.
    """
    return np.dot(a, b)


# Performance comparison
def benchmark_distances(n_vectors: int = 10000, dimension: int = 768):
    """
    Compare computation time for different distance metrics.
    """
    import time

    # Generate random vectors
    vectors = np.random.randn(n_vectors, dimension).astype(np.float32)
    query = np.random.randn(dimension).astype(np.float32)

    # Normalize for fair comparison
    vectors_norm = vectors / np.linalg.norm(vectors, axis=1, keepdims=True)
    query_norm = query / np.linalg.norm(query)

    # Benchmark dot product (fastest)
    start = time.perf_counter()
    scores = vectors_norm @ query_norm
    dot_time = time.perf_counter() - start

    # Benchmark Euclidean distance
    start = time.perf_counter()
    dists = np.linalg.norm(vectors - query, axis=1)
    euclidean_time = time.perf_counter() - start

    print(f"Dot product: {dot_time*1000:.2f}ms")
    print(f"Euclidean:   {euclidean_time*1000:.2f}ms")
```

## Indexing Strategies for Scale

Brute-force search has O(n) complexity. With millions of vectors, you need approximate nearest neighbor (ANN) algorithms that trade a small accuracy loss for massive speed gains.

### Comparison of Indexing Methods

| Index Type | Search Time | Memory | Build Time | Accuracy | Best For |
| --- | --- | --- | --- | --- | --- |
| Flat (brute force) | O(n) | Low | O(n) | 100% | Under 100K vectors |
| IVF (Inverted File) | O(n/k) | Low | O(n) | 95-99% | 100K to 10M vectors |
| HNSW (Graph-based) | O(log n) | High | O(n log n) | 98-99% | High recall requirements |
| LSH (Locality Sensitive Hashing) | O(1) | Medium | O(n) | 80-95% | Extremely large scale |
| PQ (Product Quantization) | O(n/k) | Very Low | O(n) | 90-98% | Memory constrained |

### Implementing IVF Index

Inverted File Index partitions vectors into clusters and only searches relevant clusters at query time.

```python
import numpy as np
from sklearn.cluster import MiniBatchKMeans
from typing import List, Tuple
from collections import defaultdict

class IVFIndex:
    """
    Inverted File Index for approximate nearest neighbor search.

    How it works:
    1. Partition vectors into clusters using k-means
    2. At query time, find nearest cluster centroids
    3. Only search vectors within those clusters

    Trade-off: More clusters = faster search but lower recall
    """

    def __init__(self, dimension: int, n_clusters: int = 100, n_probe: int = 10):
        """
        Initialize IVF index.

        Args:
            dimension: Vector dimensionality
            n_clusters: Number of clusters (more = faster search, lower recall)
            n_probe: Number of clusters to search at query time
        """
        self.dimension = dimension
        self.n_clusters = n_clusters
        self.n_probe = n_probe

        # Will be fitted during build()
        self.kmeans = None
        self.centroids = None

        # Inverted lists: cluster_id -> list of (vector_id, vector)
        self.inverted_lists = defaultdict(list)

        # For building
        self._pending_vectors = []
        self._pending_ids = []
        self._is_trained = False

    def add(self, id: str, vector: np.ndarray) -> None:
        """
        Add a vector to the pending list.

        Note: Call build() after adding all vectors to construct the index.
        """
        normalized = vector / np.linalg.norm(vector)
        self._pending_vectors.append(normalized)
        self._pending_ids.append(id)

    def build(self) -> None:
        """
        Build the index by clustering all pending vectors.

        This is an expensive operation. Call once after adding all vectors.
        """
        if not self._pending_vectors:
            raise ValueError("No vectors to index")

        vectors_matrix = np.vstack(self._pending_vectors)

        # Train k-means on the vectors
        print(f"Training k-means with {self.n_clusters} clusters...")
        self.kmeans = MiniBatchKMeans(
            n_clusters=self.n_clusters,
            batch_size=1024,
            max_iter=100,
            random_state=42
        )
        cluster_assignments = self.kmeans.fit_predict(vectors_matrix)
        self.centroids = self.kmeans.cluster_centers_

        # Build inverted lists
        print("Building inverted lists...")
        for i, (vec_id, vec, cluster) in enumerate(zip(
            self._pending_ids, self._pending_vectors, cluster_assignments
        )):
            self.inverted_lists[cluster].append((vec_id, vec))

        # Clear pending data
        self._pending_vectors = []
        self._pending_ids = []
        self._is_trained = True

        # Print statistics
        sizes = [len(lst) for lst in self.inverted_lists.values()]
        print(f"Index built: {len(sizes)} clusters, "
              f"avg size: {np.mean(sizes):.1f}, "
              f"max size: {max(sizes)}")

    def search(self, query_vector: np.ndarray, top_k: int = 10) -> List[Tuple[str, float]]:
        """
        Search for nearest neighbors.

        Args:
            query_vector: Query embedding
            top_k: Number of results

        Returns:
            List of (id, similarity_score) tuples
        """
        if not self._is_trained:
            raise ValueError("Index not built. Call build() first.")

        # Normalize query
        query_norm = query_vector / np.linalg.norm(query_vector)

        # Find nearest cluster centroids
        centroid_similarities = self.centroids @ query_norm
        nearest_clusters = np.argsort(centroid_similarities)[-self.n_probe:][::-1]

        # Search within selected clusters
        candidates = []
        for cluster_id in nearest_clusters:
            for vec_id, vec in self.inverted_lists[cluster_id]:
                similarity = float(np.dot(vec, query_norm))
                candidates.append((vec_id, similarity))

        # Sort and return top-k
        candidates.sort(key=lambda x: x[1], reverse=True)
        return candidates[:top_k]

    def tune_n_probe(self, test_queries: np.ndarray,
                     ground_truth: List[List[str]],
                     target_recall: float = 0.95) -> int:
        """
        Automatically tune n_probe to achieve target recall.

        Args:
            test_queries: Sample query vectors
            ground_truth: Correct results from brute-force search
            target_recall: Desired recall (0 to 1)

        Returns:
            Optimal n_probe value
        """
        for probe in range(1, self.n_clusters + 1):
            self.n_probe = probe

            # Measure recall
            recalls = []
            for query, truth in zip(test_queries, ground_truth):
                results = self.search(query, top_k=len(truth))
                result_ids = {r[0] for r in results}
                recall = len(result_ids & set(truth)) / len(truth)
                recalls.append(recall)

            avg_recall = np.mean(recalls)
            if avg_recall >= target_recall:
                print(f"n_probe={probe} achieves {avg_recall:.2%} recall")
                return probe

        print(f"Warning: Could not achieve {target_recall:.0%} recall")
        return self.n_clusters


# Example usage
if __name__ == "__main__":
    # Create and populate index
    index = IVFIndex(dimension=384, n_clusters=50, n_probe=5)

    # Add vectors
    for i in range(50000):
        vec = np.random.randn(384).astype(np.float32)
        index.add(f"doc_{i}", vec)

    # Build index
    index.build()

    # Search
    query = np.random.randn(384).astype(np.float32)
    results = index.search(query, top_k=10)

    for doc_id, score in results:
        print(f"{doc_id}: {score:.4f}")
```

## Storage Backend Options

### Comparison Matrix

| Backend | Persistence | Scalability | Query Speed | Setup Complexity | Cost |
| --- | --- | --- | --- | --- | --- |
| In-memory (NumPy) | None | Single node | Fastest | Trivial | Free |
| SQLite + BLOB | Durable | Single node | Slow | Low | Free |
| PostgreSQL + pgvector | Durable | Vertical | Medium | Medium | Free |
| Redis + RedisVL | Optional | Horizontal | Fast | Medium | Free/Paid |
| Pinecone | Managed | Horizontal | Fast | Low | Paid |
| Weaviate | Durable | Horizontal | Fast | Medium | Free |
| Milvus | Durable | Horizontal | Fastest | High | Free |
| Qdrant | Durable | Horizontal | Fast | Low | Free |

### PostgreSQL with pgvector

pgvector is a PostgreSQL extension that adds vector similarity search. It is perfect when you already use PostgreSQL and want to keep vectors alongside relational data.

```python
import psycopg2
from psycopg2.extras import execute_values
import numpy as np
from typing import List, Tuple, Optional

class PgVectorStore:
    """
    Vector store using PostgreSQL with pgvector extension.

    Prerequisites:
        1. Install pgvector: CREATE EXTENSION vector;
        2. pip install psycopg2-binary

    Benefits:
        - ACID transactions
        - Combine with relational filters
        - Familiar SQL interface
        - Built-in replication
    """

    def __init__(self, connection_string: str, dimension: int, table_name: str = "vectors"):
        """
        Initialize the pgvector store.

        Args:
            connection_string: PostgreSQL connection string
            dimension: Vector dimensionality
            table_name: Name of the table to use
        """
        self.connection_string = connection_string
        self.dimension = dimension
        self.table_name = table_name
        self.conn = None

    def connect(self) -> None:
        """Establish database connection."""
        self.conn = psycopg2.connect(self.connection_string)
        self.conn.autocommit = True

    def create_table(self, index_type: str = "ivfflat") -> None:
        """
        Create the vectors table and index.

        Args:
            index_type: 'ivfflat' for IVF or 'hnsw' for graph-based index
        """
        with self.conn.cursor() as cur:
            # Enable pgvector extension
            cur.execute("CREATE EXTENSION IF NOT EXISTS vector")

            # Create table
            cur.execute(f"""
                CREATE TABLE IF NOT EXISTS {self.table_name} (
                    id TEXT PRIMARY KEY,
                    embedding vector({self.dimension}),
                    metadata JSONB,
                    created_at TIMESTAMP DEFAULT NOW()
                )
            """)

            # Create vector index
            # IVFFlat: Good balance of speed and recall
            # HNSW: Better recall, more memory
            if index_type == "ivfflat":
                # lists = sqrt(n_vectors) is a good starting point
                cur.execute(f"""
                    CREATE INDEX IF NOT EXISTS {self.table_name}_embedding_idx
                    ON {self.table_name}
                    USING ivfflat (embedding vector_cosine_ops)
                    WITH (lists = 100)
                """)
            elif index_type == "hnsw":
                cur.execute(f"""
                    CREATE INDEX IF NOT EXISTS {self.table_name}_embedding_idx
                    ON {self.table_name}
                    USING hnsw (embedding vector_cosine_ops)
                    WITH (m = 16, ef_construction = 64)
                """)

    def insert(self, id: str, embedding: np.ndarray, metadata: dict = None) -> None:
        """
        Insert a single vector.

        Args:
            id: Unique identifier
            embedding: Vector as numpy array
            metadata: Optional JSON metadata
        """
        import json

        with self.conn.cursor() as cur:
            cur.execute(f"""
                INSERT INTO {self.table_name} (id, embedding, metadata)
                VALUES (%s, %s, %s)
                ON CONFLICT (id) DO UPDATE
                SET embedding = EXCLUDED.embedding,
                    metadata = EXCLUDED.metadata
            """, (id, embedding.tolist(), json.dumps(metadata or {})))

    def insert_batch(self, ids: List[str], embeddings: np.ndarray,
                     metadata_list: List[dict] = None) -> None:
        """
        Insert multiple vectors efficiently.

        Args:
            ids: List of unique identifiers
            embeddings: 2D array of vectors
            metadata_list: Optional list of metadata dicts
        """
        import json

        if metadata_list is None:
            metadata_list = [{}] * len(ids)

        data = [
            (id_, emb.tolist(), json.dumps(meta))
            for id_, emb, meta in zip(ids, embeddings, metadata_list)
        ]

        with self.conn.cursor() as cur:
            execute_values(cur, f"""
                INSERT INTO {self.table_name} (id, embedding, metadata)
                VALUES %s
                ON CONFLICT (id) DO UPDATE
                SET embedding = EXCLUDED.embedding,
                    metadata = EXCLUDED.metadata
            """, data)

    def search(self, query_embedding: np.ndarray, top_k: int = 10,
               filter_metadata: dict = None) -> List[Tuple[str, float, dict]]:
        """
        Search for similar vectors with optional metadata filtering.

        Args:
            query_embedding: Query vector
            top_k: Number of results
            filter_metadata: Optional JSONB filter conditions

        Returns:
            List of (id, similarity, metadata) tuples
        """
        with self.conn.cursor() as cur:
            # Build query with optional filter
            filter_clause = ""
            params = [query_embedding.tolist(), top_k]

            if filter_metadata:
                # Example: {"source": "wiki"} becomes metadata @> '{"source": "wiki"}'
                import json
                filter_clause = "WHERE metadata @> %s"
                params.insert(1, json.dumps(filter_metadata))

            cur.execute(f"""
                SELECT id, 1 - (embedding <=> %s) as similarity, metadata
                FROM {self.table_name}
                {filter_clause}
                ORDER BY embedding <=> %s
                LIMIT %s
            """, params[:1] + params)

            results = []
            for row in cur.fetchall():
                results.append((row[0], float(row[1]), row[2]))

            return results

    def delete(self, id: str) -> bool:
        """Delete a vector by ID."""
        with self.conn.cursor() as cur:
            cur.execute(f"DELETE FROM {self.table_name} WHERE id = %s", (id,))
            return cur.rowcount > 0

    def close(self) -> None:
        """Close database connection."""
        if self.conn:
            self.conn.close()


# Example usage
if __name__ == "__main__":
    # Initialize store
    store = PgVectorStore(
        connection_string="postgresql://user:pass@localhost/vectors",
        dimension=384
    )

    store.connect()
    store.create_table(index_type="hnsw")

    # Insert vectors
    for i in range(1000):
        embedding = np.random.randn(384).astype(np.float32)
        store.insert(
            id=f"doc_{i}",
            embedding=embedding,
            metadata={"source": "wiki" if i % 2 == 0 else "news"}
        )

    # Search with filter
    query = np.random.randn(384).astype(np.float32)
    results = store.search(
        query_embedding=query,
        top_k=5,
        filter_metadata={"source": "wiki"}
    )

    for doc_id, score, meta in results:
        print(f"{doc_id}: {score:.4f} - {meta}")

    store.close()
```

## HNSW: The Gold Standard for High Recall

Hierarchical Navigable Small World (HNSW) graphs offer the best recall-to-speed ratio for most use cases. Here is how to use it with the FAISS library.

```python
import numpy as np
import faiss
from typing import List, Tuple, Optional
import pickle

class HNSWVectorStore:
    """
    High-performance vector store using FAISS HNSW index.

    HNSW creates a multi-layer graph where:
    - Upper layers have fewer nodes for fast traversal
    - Lower layers have more nodes for precision
    - Search starts at top and descends to find nearest neighbors

    Key parameters:
    - M: Number of connections per node (higher = better recall, more memory)
    - efConstruction: Search depth during build (higher = better index quality)
    - efSearch: Search depth during query (higher = better recall, slower)
    """

    def __init__(self, dimension: int, M: int = 32, ef_construction: int = 200):
        """
        Initialize HNSW index.

        Args:
            dimension: Vector dimensionality
            M: Max connections per node (16-64 typical)
            ef_construction: Build-time search depth (100-500 typical)
        """
        self.dimension = dimension
        self.M = M
        self.ef_construction = ef_construction

        # Create HNSW index with inner product (cosine on normalized vectors)
        self.index = faiss.IndexHNSWFlat(dimension, M)
        self.index.hnsw.efConstruction = ef_construction

        # ID mapping (FAISS uses sequential integers internally)
        self.id_to_idx: dict = {}
        self.idx_to_id: List[str] = []
        self.metadata: List[dict] = []

    def set_ef_search(self, ef_search: int) -> None:
        """
        Set search-time parameter.

        Higher ef_search = better recall but slower queries.
        Start with ef_search = 50 and tune based on recall requirements.
        """
        self.index.hnsw.efSearch = ef_search

    def add(self, id: str, vector: np.ndarray, metadata: dict = None) -> None:
        """Add a single vector."""
        # Normalize for cosine similarity
        normalized = vector / np.linalg.norm(vector)
        normalized = normalized.astype(np.float32).reshape(1, -1)

        # Add to FAISS index
        self.index.add(normalized)

        # Track ID mapping
        idx = len(self.idx_to_id)
        self.id_to_idx[id] = idx
        self.idx_to_id.append(id)
        self.metadata.append(metadata or {})

    def add_batch(self, ids: List[str], vectors: np.ndarray,
                  metadata_list: List[dict] = None) -> None:
        """
        Add multiple vectors efficiently.

        Batch insertion is significantly faster than individual adds.
        """
        if metadata_list is None:
            metadata_list = [{}] * len(ids)

        # Normalize all vectors
        norms = np.linalg.norm(vectors, axis=1, keepdims=True)
        normalized = (vectors / norms).astype(np.float32)

        # Add to FAISS
        start_idx = len(self.idx_to_id)
        self.index.add(normalized)

        # Track ID mappings
        for i, (id_, meta) in enumerate(zip(ids, metadata_list)):
            self.id_to_idx[id_] = start_idx + i
            self.idx_to_id.append(id_)
            self.metadata.append(meta)

    def search(self, query_vector: np.ndarray, top_k: int = 10) -> List[Tuple[str, float, dict]]:
        """
        Search for nearest neighbors.

        Returns:
            List of (id, similarity, metadata) tuples
        """
        # Normalize query
        normalized = query_vector / np.linalg.norm(query_vector)
        normalized = normalized.astype(np.float32).reshape(1, -1)

        # Search FAISS index
        distances, indices = self.index.search(normalized, top_k)

        # Convert to results
        results = []
        for dist, idx in zip(distances[0], indices[0]):
            if idx == -1:  # FAISS returns -1 for missing results
                continue
            id_ = self.idx_to_id[idx]
            # FAISS returns L2 distance; convert to similarity
            # For normalized vectors: similarity = 1 - distance/2
            similarity = 1 - dist / 2
            results.append((id_, float(similarity), self.metadata[idx]))

        return results

    def save(self, path: str) -> None:
        """
        Save index to disk.

        Creates two files:
        - {path}.faiss: The FAISS index
        - {path}.meta: ID mappings and metadata
        """
        faiss.write_index(self.index, f"{path}.faiss")

        with open(f"{path}.meta", "wb") as f:
            pickle.dump({
                "dimension": self.dimension,
                "M": self.M,
                "ef_construction": self.ef_construction,
                "id_to_idx": self.id_to_idx,
                "idx_to_id": self.idx_to_id,
                "metadata": self.metadata
            }, f)

    @classmethod
    def load(cls, path: str) -> "HNSWVectorStore":
        """Load index from disk."""
        # Load metadata first to get parameters
        with open(f"{path}.meta", "rb") as f:
            meta = pickle.load(f)

        store = cls(
            dimension=meta["dimension"],
            M=meta["M"],
            ef_construction=meta["ef_construction"]
        )

        # Load FAISS index
        store.index = faiss.read_index(f"{path}.faiss")

        # Restore mappings
        store.id_to_idx = meta["id_to_idx"]
        store.idx_to_id = meta["idx_to_id"]
        store.metadata = meta["metadata"]

        return store


# Benchmark example
def benchmark_hnsw():
    """Compare HNSW vs brute force performance."""
    import time

    n_vectors = 100000
    dimension = 768
    n_queries = 100

    # Generate data
    print(f"Generating {n_vectors} vectors of dimension {dimension}...")
    vectors = np.random.randn(n_vectors, dimension).astype(np.float32)
    queries = np.random.randn(n_queries, dimension).astype(np.float32)
    ids = [f"doc_{i}" for i in range(n_vectors)]

    # Build HNSW index
    print("Building HNSW index...")
    start = time.perf_counter()
    hnsw = HNSWVectorStore(dimension=dimension, M=32, ef_construction=200)
    hnsw.add_batch(ids, vectors)
    build_time = time.perf_counter() - start
    print(f"Build time: {build_time:.2f}s")

    # Benchmark search
    hnsw.set_ef_search(50)
    start = time.perf_counter()
    for query in queries:
        results = hnsw.search(query, top_k=10)
    search_time = time.perf_counter() - start
    print(f"HNSW search: {search_time*1000/n_queries:.2f}ms per query")

    # Compare with brute force
    vectors_norm = vectors / np.linalg.norm(vectors, axis=1, keepdims=True)
    start = time.perf_counter()
    for query in queries:
        query_norm = query / np.linalg.norm(query)
        similarities = vectors_norm @ query_norm
        top_indices = np.argsort(similarities)[-10:][::-1]
    brute_time = time.perf_counter() - start
    print(f"Brute force: {brute_time*1000/n_queries:.2f}ms per query")
    print(f"Speedup: {brute_time/search_time:.1f}x")


if __name__ == "__main__":
    benchmark_hnsw()
```

## Architecture for Production RAG

Here is a complete architecture diagram showing how vector storage fits into a production RAG system:

```mermaid
flowchart TB
    subgraph Ingestion Pipeline
        A[Documents] --> B[Chunker]
        B --> C[Embedding Model]
        C --> D[Vector Storage]
        A --> E[Metadata Extractor]
        E --> D
    end

    subgraph Query Pipeline
        F[User Query] --> G[Query Embedding]
        G --> H[Vector Search]
        H --> I[Re-ranker]
        I --> J[Context Assembly]
        J --> K[LLM]
        K --> L[Response]
    end

    subgraph Vector Storage Layer
        D --> M[(Primary Index)]
        M --> N[(Replica 1)]
        M --> O[(Replica 2)]
        H --> M
    end

    subgraph Observability
        P[Latency Metrics]
        Q[Recall Monitoring]
        R[Index Health]
        M --> P
        H --> Q
        M --> R
    end
```

## Scaling Considerations

### Horizontal Scaling with Sharding

When a single node cannot hold all vectors, partition by hash or range:

```python
import hashlib
from typing import List, Dict

class ShardedVectorStore:
    """
    Distribute vectors across multiple shards for horizontal scaling.

    Sharding strategies:
    - Hash-based: Even distribution, no range queries
    - Range-based: Supports range queries, requires rebalancing
    - Tenant-based: Isolate customers, simpler operations
    """

    def __init__(self, shard_stores: List, sharding_key: str = "hash"):
        """
        Initialize sharded store.

        Args:
            shard_stores: List of vector store instances (one per shard)
            sharding_key: 'hash' for even distribution
        """
        self.shards = shard_stores
        self.n_shards = len(shard_stores)
        self.sharding_key = sharding_key

    def _get_shard(self, id: str) -> int:
        """Determine which shard owns a given ID."""
        if self.sharding_key == "hash":
            # Consistent hashing for even distribution
            hash_val = int(hashlib.md5(id.encode()).hexdigest(), 16)
            return hash_val % self.n_shards
        raise ValueError(f"Unknown sharding key: {self.sharding_key}")

    def add(self, id: str, vector, metadata: dict = None) -> None:
        """Route insert to correct shard."""
        shard_idx = self._get_shard(id)
        self.shards[shard_idx].add(id, vector, metadata)

    def search(self, query_vector, top_k: int = 10) -> List:
        """
        Search all shards and merge results.

        Note: This is a scatter-gather pattern. For better performance,
        use async queries to all shards in parallel.
        """
        all_results = []

        # Query all shards (parallelize in production)
        for shard in self.shards:
            results = shard.search(query_vector, top_k=top_k)
            all_results.extend(results)

        # Merge and sort by score
        all_results.sort(key=lambda x: x[1], reverse=True)
        return all_results[:top_k]
```

### Memory Optimization with Quantization

Reduce memory by 4-8x using scalar or product quantization:

```python
import numpy as np
import faiss

def create_quantized_index(dimension: int, n_vectors: int) -> faiss.Index:
    """
    Create a memory-efficient index using Product Quantization.

    PQ compresses vectors by:
    1. Splitting vector into M sub-vectors
    2. Quantizing each sub-vector to one of 256 centroids
    3. Storing only the centroid IDs (1 byte each)

    Memory reduction: 4 bytes/dim -> M bytes total
    Example: 768-dim vector, M=96 -> 768*4=3072 bytes -> 96 bytes (32x reduction)
    """
    # Number of sub-quantizers (must divide dimension evenly)
    M = 96  # Each sub-vector covers dimension/M dimensions

    # Bits per sub-quantizer (8 = 256 centroids)
    n_bits = 8

    # Create IVF index with PQ compression
    # IVF for coarse search, PQ for compressed storage
    n_lists = int(np.sqrt(n_vectors))  # Number of IVF clusters

    quantizer = faiss.IndexFlatL2(dimension)  # Coarse quantizer
    index = faiss.IndexIVFPQ(quantizer, dimension, n_lists, M, n_bits)

    return index


def train_quantized_index(index: faiss.Index, training_vectors: np.ndarray) -> None:
    """
    Train the quantized index on sample vectors.

    Training learns:
    1. IVF cluster centroids
    2. PQ sub-vector codebooks

    Use 10-50x more training vectors than clusters for best results.
    """
    print(f"Training on {len(training_vectors)} vectors...")
    index.train(training_vectors.astype(np.float32))
    print("Training complete")


# Example: 10M vectors in ~1GB RAM
if __name__ == "__main__":
    dimension = 768
    n_vectors = 10_000_000

    # Create index
    index = create_quantized_index(dimension, n_vectors)

    # Train on sample
    training_data = np.random.randn(100_000, dimension).astype(np.float32)
    train_quantized_index(index, training_data)

    # Add vectors (would take ~1GB instead of ~30GB uncompressed)
    # In production, add in batches
    batch_size = 100_000
    for i in range(0, n_vectors, batch_size):
        batch = np.random.randn(batch_size, dimension).astype(np.float32)
        index.add(batch)
        print(f"Added {i + batch_size} vectors")

    print(f"Index size: {index.ntotal} vectors")
```

## Monitoring and Observability

Track these metrics for healthy vector storage:

```python
import time
from dataclasses import dataclass
from typing import Callable
import numpy as np

@dataclass
class VectorStoreMetrics:
    """Metrics to track for vector store health."""

    # Latency metrics
    search_latency_p50: float = 0.0
    search_latency_p99: float = 0.0
    insert_latency_p50: float = 0.0

    # Throughput
    queries_per_second: float = 0.0
    inserts_per_second: float = 0.0

    # Quality metrics
    recall_at_10: float = 0.0

    # Resource usage
    memory_usage_bytes: int = 0
    index_size_vectors: int = 0


class InstrumentedVectorStore:
    """
    Wrapper that adds observability to any vector store.

    Emits metrics compatible with Prometheus/OpenTelemetry.
    """

    def __init__(self, store, metrics_callback: Callable = None):
        """
        Wrap a vector store with instrumentation.

        Args:
            store: The underlying vector store
            metrics_callback: Function called with metrics dict
        """
        self.store = store
        self.metrics_callback = metrics_callback or self._default_callback

        self._search_latencies = []
        self._insert_latencies = []

    def _default_callback(self, metrics: dict) -> None:
        """Default: print metrics to stdout."""
        print(f"[METRICS] {metrics}")

    def _emit(self, name: str, value: float, tags: dict = None) -> None:
        """Emit a single metric."""
        self.metrics_callback({
            "name": name,
            "value": value,
            "tags": tags or {},
            "timestamp": time.time()
        })

    def add(self, id: str, vector, metadata: dict = None) -> None:
        """Instrumented add operation."""
        start = time.perf_counter()
        self.store.add(id, vector, metadata)
        latency = time.perf_counter() - start

        self._insert_latencies.append(latency)
        self._emit("vector_store.insert.latency", latency * 1000, {"unit": "ms"})

    def search(self, query_vector, top_k: int = 10):
        """Instrumented search operation."""
        start = time.perf_counter()
        results = self.store.search(query_vector, top_k)
        latency = time.perf_counter() - start

        self._search_latencies.append(latency)
        self._emit("vector_store.search.latency", latency * 1000, {"unit": "ms"})
        self._emit("vector_store.search.results", len(results))

        return results

    def get_summary_metrics(self) -> VectorStoreMetrics:
        """Calculate summary metrics."""
        metrics = VectorStoreMetrics()

        if self._search_latencies:
            metrics.search_latency_p50 = np.percentile(self._search_latencies, 50) * 1000
            metrics.search_latency_p99 = np.percentile(self._search_latencies, 99) * 1000

        if self._insert_latencies:
            metrics.insert_latency_p50 = np.percentile(self._insert_latencies, 50) * 1000

        return metrics

    def measure_recall(self, test_queries: np.ndarray,
                       ground_truth_fn: Callable, k: int = 10) -> float:
        """
        Measure recall against brute-force ground truth.

        Args:
            test_queries: Sample query vectors
            ground_truth_fn: Function that returns true top-k for a query
            k: Number of results to compare

        Returns:
            Average recall@k
        """
        recalls = []

        for query in test_queries:
            # Get ground truth
            true_results = set(ground_truth_fn(query, k))

            # Get index results
            index_results = set(r[0] for r in self.search(query, k))

            # Calculate recall
            recall = len(true_results & index_results) / k
            recalls.append(recall)

        avg_recall = np.mean(recalls)
        self._emit("vector_store.recall", avg_recall, {"k": k})

        return avg_recall
```

## Best Practices Summary

1. **Start simple.** Use brute-force search until you have more than 100K vectors. Premature optimization wastes engineering time.

2. **Normalize vectors at insert time.** Pre-normalized vectors make cosine similarity a simple dot product, saving computation at query time.

3. **Batch your inserts.** Single-vector inserts are 10-100x slower than batch operations. Buffer writes in your ingestion pipeline.

4. **Tune index parameters empirically.** Run recall benchmarks with your actual data. The optimal settings depend on your vector distribution.

5. **Monitor recall, not just latency.** A fast search that returns wrong results is worse than a slower accurate one. Measure recall@k regularly.

6. **Plan for reindexing.** Index parameters that work at 1M vectors may not work at 100M. Build pipelines that can rebuild indexes without downtime.

7. **Separate hot and cold storage.** Keep frequently accessed vectors in memory (HNSW) and archive older ones to disk-based indexes.

8. **Use metadata filters wisely.** Pre-filtering reduces the search space but can hurt recall. Post-filtering is safer but slower. Test both approaches.

## Conclusion

Building vector storage for RAG systems requires balancing recall, latency, memory, and operational complexity. Start with a simple in-memory store, graduate to pgvector when you need persistence, and move to dedicated solutions like FAISS or Milvus when scale demands it. The key is measuring recall continuously and tuning your index parameters as your data grows.

The code examples in this guide provide working foundations you can adapt to your specific requirements. Whether you choose self-hosted or managed solutions, understanding the underlying mechanics will help you debug issues and optimize performance when it matters most.
