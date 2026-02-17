# How to Build Vector Search Indexes in BigQuery for Semantic Similarity Queries

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, BigQuery, Vector Search, Embeddings, Machine Learning

Description: Learn how to create and use vector search indexes in BigQuery to perform fast semantic similarity queries on embedding vectors at warehouse scale.

---

Vector search has become essential for modern applications - recommendation systems, semantic search, image similarity, anomaly detection. Instead of matching on exact keywords, you compare numerical representations (embeddings) of content and find the most similar items. BigQuery now supports native vector search, which means you can store embeddings alongside your structured data and run similarity queries without moving data to a separate vector database.

## What Are Embeddings and Vector Search

An embedding is a numerical representation of data - a list of floating point numbers (a vector) that captures the meaning or characteristics of an item. Similar items have similar embeddings, meaning their vectors are close together in the embedding space.

Vector search finds the nearest neighbors to a query vector. If you embed the query "comfortable running shoes" and search against product embeddings, the results are products whose descriptions are semantically similar, even if they do not contain those exact words.

## Storing Embeddings in BigQuery

BigQuery stores embeddings as ARRAY<FLOAT64> columns. You can generate embeddings using Vertex AI, BigQuery ML, or external models and load them into a table:

```sql
-- Create a table to store product data with embeddings
CREATE TABLE `my_project.catalog.products_with_embeddings` (
  product_id STRING,
  product_name STRING,
  description STRING,
  category STRING,
  price FLOAT64,
  -- Embedding vector - 768 dimensions from a text embedding model
  embedding ARRAY<FLOAT64>
);
```

You can generate embeddings directly in BigQuery using the ML.GENERATE_EMBEDDING function with a connected Vertex AI model:

```sql
-- Generate embeddings for product descriptions using a Vertex AI model
-- This requires a BigQuery ML connection to Vertex AI
INSERT INTO `my_project.catalog.products_with_embeddings`
SELECT
  product_id,
  product_name,
  description,
  category,
  price,
  ml_generate_embedding_result.predictions[0].embeddings.values AS embedding
FROM
  ML.GENERATE_EMBEDDING(
    MODEL `my_project.models.text_embedding`,
    (SELECT product_id, product_name, description, category, price,
            description AS content  -- Column to embed
     FROM `my_project.catalog.products`),
    STRUCT(TRUE AS flatten_json_output)
  );
```

## Creating a Vector Search Index

Without an index, vector search requires a brute-force comparison against every row, which is slow at scale. BigQuery vector indexes use approximate nearest neighbor (ANN) algorithms to make searches fast:

```sql
-- Create a vector search index on the embedding column
-- This enables fast approximate nearest neighbor searches
CREATE VECTOR INDEX my_product_index
ON `my_project.catalog.products_with_embeddings`(embedding)
OPTIONS (
  index_type = 'IVF',          -- Inverted file index type
  distance_type = 'COSINE',     -- Cosine similarity (common for text embeddings)
  ivf_options = '{"num_lists": 100}'  -- Number of clusters for the IVF index
);
```

The IVF (Inverted File) index partitions vectors into clusters. At search time, it only compares the query against vectors in nearby clusters rather than every vector in the table. The `num_lists` parameter controls how many clusters to create - more clusters mean faster searches but potentially less accurate results.

You can also use the TREE_AH index type:

```sql
-- TREE_AH index for potentially better performance on large datasets
CREATE VECTOR INDEX my_product_tree_index
ON `my_project.catalog.products_with_embeddings`(embedding)
OPTIONS (
  index_type = 'TREE_AH',
  distance_type = 'COSINE',
  tree_ah_options = '{"leaf_node_embedding_count": 1000, "num_leaves": 100}'
);
```

## Performing Vector Search

Once the index is built, use the VECTOR_SEARCH function to find similar items:

```sql
-- Find the 10 most similar products to a query embedding
-- First, generate the query embedding, then search
SELECT
  query.query_text,
  base.product_id,
  base.product_name,
  base.description,
  base.price,
  distance
FROM
  VECTOR_SEARCH(
    -- Base table to search
    TABLE `my_project.catalog.products_with_embeddings`,
    'embedding',  -- Column containing vectors
    -- Query: embed the search text
    (SELECT
      ml_generate_embedding_result.predictions[0].embeddings.values AS embedding,
      content AS query_text
     FROM ML.GENERATE_EMBEDDING(
       MODEL `my_project.models.text_embedding`,
       (SELECT 'lightweight trail running shoes' AS content)
     )),
    top_k => 10  -- Return top 10 results
  )
ORDER BY distance;
```

## Searching with Pre-computed Query Vectors

If you already have the query vector (from an external model or cached embedding), you can search directly:

```sql
-- Search using a pre-computed query vector
-- Useful when embeddings are generated in application code
SELECT
  base.product_id,
  base.product_name,
  base.price,
  distance
FROM
  VECTOR_SEARCH(
    TABLE `my_project.catalog.products_with_embeddings`,
    'embedding',
    -- Pass the pre-computed vector as a query
    (SELECT [0.023, -0.045, 0.112, ...] AS embedding),  -- Your query vector
    top_k => 10
  )
ORDER BY distance;
```

## Filtering with Vector Search

You often want to combine vector similarity with structured filters. For example, find similar products but only in a specific category or price range:

```sql
-- Vector search with pre-filtering by category and price
-- The WHERE clause is applied before the vector search for efficiency
SELECT
  base.product_id,
  base.product_name,
  base.category,
  base.price,
  distance
FROM
  VECTOR_SEARCH(
    -- Apply filters on the base table before searching
    (SELECT * FROM `my_project.catalog.products_with_embeddings`
     WHERE category = 'Footwear' AND price < 150.0),
    'embedding',
    (SELECT embedding, query_text
     FROM query_embeddings),
    top_k => 10
  )
ORDER BY distance;
```

Pre-filtering reduces the number of vectors to search and can significantly improve performance.

## Recommendation Systems

Vector search makes building recommendation systems straightforward. Find items similar to what a user has interacted with:

```sql
-- Product recommendations based on a user's recent purchase
-- Find products with embeddings similar to the purchased product
WITH user_product AS (
  -- Get the embedding of the product the user just bought
  SELECT embedding
  FROM `my_project.catalog.products_with_embeddings`
  WHERE product_id = 'PROD-12345'
)
SELECT
  base.product_id,
  base.product_name,
  base.price,
  distance AS similarity_distance
FROM
  VECTOR_SEARCH(
    -- Exclude the product the user already bought
    (SELECT * FROM `my_project.catalog.products_with_embeddings`
     WHERE product_id != 'PROD-12345'),
    'embedding',
    (SELECT embedding FROM user_product),
    top_k => 5
  )
ORDER BY distance;
```

## Semantic Search Over Documents

For document search, embed document chunks and search by meaning:

```sql
-- Search knowledge base articles by semantic meaning
-- Returns articles whose content is semantically similar to the question
SELECT
  base.article_id,
  base.title,
  base.chunk_text,
  distance
FROM
  VECTOR_SEARCH(
    TABLE `my_project.knowledge.article_chunks`,
    'embedding',
    (SELECT
      ml_generate_embedding_result.predictions[0].embeddings.values AS embedding
     FROM ML.GENERATE_EMBEDDING(
       MODEL `my_project.models.text_embedding`,
       (SELECT 'How do I reset my password?' AS content)
     )),
    top_k => 5
  )
ORDER BY distance;
```

## Distance Types

BigQuery supports three distance types for vector search:

- **COSINE**: Measures the angle between vectors. Best for text embeddings where magnitude does not matter. Values range from 0 (identical) to 2 (opposite).
- **EUCLIDEAN**: Measures straight-line distance. Good when magnitude matters.
- **DOT_PRODUCT**: Measures the dot product. Faster to compute, useful when vectors are normalized.

Choose based on how your embeddings were trained. Most text embedding models (like those from Vertex AI or OpenAI) work best with cosine similarity.

## Monitoring Index Performance

After creating vector indexes, monitor their effectiveness:

```sql
-- Check index metadata and status
SELECT
  table_name,
  index_name,
  index_status,
  creation_time,
  last_refresh_time
FROM `my_project.catalog.INFORMATION_SCHEMA.VECTOR_INDEXES`;
```

Vector search in BigQuery brings the power of semantic similarity directly into your data warehouse. Instead of maintaining a separate vector database, you can store embeddings alongside your structured data and run similarity queries that combine semantic matching with traditional SQL filters. For teams already using BigQuery, this eliminates an entire layer of infrastructure complexity.
