# How to Use AlloyDB with pgvector for Vector Similarity Search

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, AlloyDB, pgvector, Vector Search, AI

Description: A hands-on guide to setting up pgvector on AlloyDB for PostgreSQL to store embeddings and perform vector similarity search for AI-powered applications.

---

Vector similarity search has become a core building block for AI applications - from semantic search and recommendation engines to retrieval-augmented generation (RAG) pipelines. If you are already running AlloyDB for your transactional data, you can add vector search capabilities directly alongside your existing tables using the pgvector extension. No separate vector database needed.

In this post, I will walk through setting up pgvector on AlloyDB, storing embeddings, building indexes for fast retrieval, and querying vectors efficiently.

## Why AlloyDB for Vector Search

You might wonder why you would use AlloyDB instead of a dedicated vector database. There are a few solid reasons:

1. **Unified data layer**: Your application data and embeddings live in the same database. No need to synchronize between two systems.
2. **AlloyDB's ScaNN index**: AlloyDB includes a built-in ScaNN (Scalable Nearest Neighbors) index that Google developed. It significantly outperforms the default pgvector indexes for large-scale vector workloads.
3. **ACID transactions**: Your vector operations participate in the same transactions as your regular SQL operations.
4. **Familiar tooling**: You use standard PostgreSQL clients, ORMs, and connection poolers.

## Setting Up pgvector on AlloyDB

AlloyDB comes with pgvector pre-installed. You just need to enable the extension in your database:

```sql
-- Enable the pgvector extension in your AlloyDB database
CREATE EXTENSION IF NOT EXISTS vector;

-- Verify it is installed and check the version
SELECT extversion FROM pg_extension WHERE extname = 'vector';
```

AlloyDB also supports the `alloydb_scann` extension for the ScaNN index, which you will want for production workloads:

```sql
-- Enable the ScaNN index extension for better performance
CREATE EXTENSION IF NOT EXISTS alloydb_scann;
```

## Creating a Table with Vector Columns

Let us build a practical example - a product catalog with embeddings for semantic search. Each product has a description that we have converted into a 768-dimensional embedding using a model like Vertex AI's text-embedding API.

```sql
-- Create a products table with a vector column for embeddings
-- The 768 dimension matches Vertex AI text-embedding models
CREATE TABLE products (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT NOT NULL,
    category TEXT,
    price DECIMAL(10,2),
    embedding VECTOR(768),  -- 768-dimensional vector for text embeddings
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

## Generating and Storing Embeddings

Here is a Python script that generates embeddings using Vertex AI and stores them in AlloyDB:

```python
# Generate embeddings with Vertex AI and store them in AlloyDB
import psycopg2
from google.cloud import aiplatform

# Initialize the Vertex AI client
aiplatform.init(project="my-project", location="us-central1")

def get_embedding(text):
    """Generate a text embedding using Vertex AI."""
    from vertexai.language_models import TextEmbeddingModel
    model = TextEmbeddingModel.from_pretrained("text-embedding-004")
    embeddings = model.get_embeddings([text])
    return embeddings[0].values

# Connect to AlloyDB
conn = psycopg2.connect(
    host="10.0.0.5",
    dbname="mydb",
    user="postgres",
    password="my-password"
)
cur = conn.cursor()

# Example: insert a product with its embedding
product_description = "Wireless noise-canceling headphones with 30-hour battery life"
embedding = get_embedding(product_description)

cur.execute("""
    INSERT INTO products (name, description, category, price, embedding)
    VALUES (%s, %s, %s, %s, %s::vector)
""", (
    "ProSound WX-500",
    product_description,
    "Electronics",
    149.99,
    str(embedding)  # Convert list to string format pgvector expects
))

conn.commit()
cur.close()
conn.close()
```

## Performing Similarity Searches

pgvector supports three distance operators:

- `<->`: L2 (Euclidean) distance
- `<=>`: Cosine distance
- `<#>`: Inner product (negative, so smaller is more similar)

For text embeddings, cosine distance is typically the best choice since it measures the angle between vectors regardless of magnitude.

```sql
-- Find the 10 most similar products to a given query embedding
-- Using cosine distance (<=>) for text embedding comparison
SELECT
    id,
    name,
    description,
    1 - (embedding <=> $1::vector) AS similarity_score
FROM products
WHERE category = 'Electronics'
ORDER BY embedding <=> $1::vector
LIMIT 10;
```

Here is how you would run this from Python:

```python
# Search for products similar to a query using vector similarity
import psycopg2

def search_products(query_text, limit=10):
    """Search for products semantically similar to the query."""
    query_embedding = get_embedding(query_text)

    conn = psycopg2.connect(host="10.0.0.5", dbname="mydb", user="postgres", password="my-password")
    cur = conn.cursor()

    # Use cosine distance for similarity ranking
    cur.execute("""
        SELECT id, name, description,
               1 - (embedding <=> %s::vector) AS similarity
        FROM products
        ORDER BY embedding <=> %s::vector
        LIMIT %s
    """, (str(query_embedding), str(query_embedding), limit))

    results = cur.fetchall()
    cur.close()
    conn.close()
    return results

# Search for headphones without using the exact word
results = search_products("comfortable earphones for long flights")
for r in results:
    print(f"{r[1]} - Similarity: {r[3]:.4f}")
```

## Building Indexes for Performance

Without an index, pgvector performs an exact nearest-neighbor search by scanning every row. This works fine for small tables but becomes slow with millions of vectors. You have two index options on AlloyDB.

### IVFFlat Index

IVFFlat divides vectors into lists (clusters) and only searches the most relevant ones:

```sql
-- Create an IVFFlat index for approximate nearest neighbor search
-- The lists parameter should be roughly sqrt(row_count)
-- For 1 million rows, use about 1000 lists
CREATE INDEX idx_products_embedding_ivf ON products
USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 1000);
```

### ScaNN Index (AlloyDB-specific)

The ScaNN index is AlloyDB's secret weapon. It uses Google's ScaNN algorithm and generally provides better recall at the same speed, or faster searches at the same recall level:

```sql
-- Create a ScaNN index for high-performance vector search
-- This is AlloyDB-specific and outperforms IVFFlat for most workloads
CREATE INDEX idx_products_embedding_scann ON products
USING scann (embedding vector_cosine_ops)
WITH (num_leaves = 1000, max_num_levels = 2);
```

The ScaNN index parameters:
- `num_leaves`: Similar to IVFFlat's lists. A good starting point is sqrt(row_count).
- `max_num_levels`: Controls the tree depth. Use 2 for most workloads.

## Tuning Search Quality

You can adjust the trade-off between speed and accuracy by setting the number of probes (lists to search) at query time:

```sql
-- For IVFFlat: increase probes for better accuracy (default is 1)
SET ivfflat.probes = 20;

-- For ScaNN: increase leaves to search for better recall
SET scann.num_leaves_to_search = 50;

-- Now run your similarity query - it will search more clusters
SELECT id, name, 1 - (embedding <=> $1::vector) AS similarity
FROM products
ORDER BY embedding <=> $1::vector
LIMIT 10;
```

Higher probe counts give better recall but slower queries. Start with the default and increase until you get acceptable recall for your use case.

## Combining Vector Search with SQL Filters

One of the biggest advantages of using AlloyDB over a standalone vector database is the ability to combine vector similarity with traditional SQL filtering:

```sql
-- Find similar products within a price range and specific category
-- This combines vector search with standard SQL WHERE clauses
SELECT
    id, name, price,
    1 - (embedding <=> $1::vector) AS similarity
FROM products
WHERE category = 'Electronics'
  AND price BETWEEN 50 AND 200
  AND created_at > '2026-01-01'
ORDER BY embedding <=> $1::vector
LIMIT 10;
```

## Batch Embedding Updates

When you need to update embeddings for many rows, batch processing is more efficient:

```sql
-- Update embeddings in batches using a temporary staging table
CREATE TEMPORARY TABLE embedding_updates (
    product_id INT,
    new_embedding VECTOR(768)
);

-- Bulk load embeddings into the staging table, then update
UPDATE products p
SET embedding = eu.new_embedding
FROM embedding_updates eu
WHERE p.id = eu.product_id;
```

## Wrapping Up

AlloyDB with pgvector gives you a production-ready vector search solution that lives right next to your application data. The ScaNN index in particular makes AlloyDB competitive with dedicated vector databases for most workloads. Start by enabling the extensions, add vector columns to your tables, and build indexes once your data grows beyond a few thousand rows. The combination of familiar SQL, ACID transactions, and high-performance vector search makes AlloyDB a compelling choice for AI-powered applications that also need traditional database capabilities.
