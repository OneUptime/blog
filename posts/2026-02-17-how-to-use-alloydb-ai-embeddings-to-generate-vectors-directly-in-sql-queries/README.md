# How to Use AlloyDB AI Embeddings to Generate Vectors Directly in SQL Queries

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, AlloyDB, AI Embeddings, Vector Search, PostgreSQL

Description: Learn how to use AlloyDB AI to generate text embeddings directly in SQL queries, enabling vector similarity search without external ML infrastructure.

---

Vector embeddings are everywhere in modern applications - powering semantic search, recommendation systems, and RAG (Retrieval Augmented Generation) pipelines. Typically, generating these embeddings requires calling an external API from your application, storing the results, and then using a vector database for similarity search. AlloyDB AI simplifies this by letting you generate embeddings directly inside SQL queries using Vertex AI models. No external API calls, no separate vector database, no extra infrastructure.

I found this particularly useful when building a search feature that needed semantic understanding. Instead of setting up a whole embedding pipeline, I could generate and query vectors in a few SQL statements. Here is how it works.

## How AlloyDB AI Embeddings Work

AlloyDB AI integrates with Vertex AI's embedding models through a built-in function called `embedding()`. When you call this function in a SQL query, AlloyDB sends the text to a Vertex AI model and returns a vector (an array of floating-point numbers) that represents the semantic meaning of the text. These vectors can then be stored in a column and searched using pgvector's similarity operators.

The connection between AlloyDB and Vertex AI is handled through a service account, so there are no API keys to manage in your application code.

## Prerequisites

You need an AlloyDB cluster with the google_ml_integration extension enabled and a Vertex AI endpoint configured.

```bash
# Enable the required APIs
gcloud services enable alloydb.googleapis.com
gcloud services enable aiplatform.googleapis.com

# Create an AlloyDB cluster if you do not have one
gcloud alloydb clusters create ml-cluster \
  --region=us-central1 \
  --password=your-secure-password \
  --network=default

# Create a primary instance with the ML integration extension
gcloud alloydb instances create ml-primary \
  --cluster=ml-cluster \
  --region=us-central1 \
  --instance-type=PRIMARY \
  --cpu-count=8 \
  --database-flags="google_ml_integration.enable_model_support=on"
```

Grant the AlloyDB service account access to Vertex AI:

```bash
# Get the AlloyDB service account
gcloud alloydb clusters describe ml-cluster \
  --region=us-central1 \
  --format="value(serviceAccountEmailAddress)"

# Grant it the Vertex AI User role
gcloud projects add-iam-policy-binding my-project \
  --member="serviceAccount:service-PROJECT_NUMBER@gcp-sa-alloydb.iam.gserviceaccount.com" \
  --role="roles/aiplatform.user"
```

## Setting Up the ML Integration

Connect to your AlloyDB instance and configure the embedding model:

```sql
-- Enable the required extensions
CREATE EXTENSION IF NOT EXISTS google_ml_integration;
CREATE EXTENSION IF NOT EXISTS vector;

-- Register the Vertex AI text embedding model
-- This tells AlloyDB where to find the embedding service
CALL google_ml.create_model(
  model_id => 'text-embedding-model',
  model_provider => 'google',
  model_qualified_name => 'textembedding-gecko@003',
  model_type => 'cloud_ai'
);
```

## Generating Embeddings in SQL

Now you can generate embeddings directly in SQL queries:

```sql
-- Generate an embedding for a single piece of text
-- The result is a 768-dimensional vector
SELECT google_ml.embedding(
  model_id => 'text-embedding-model',
  content => 'How do I monitor my Kubernetes cluster health?'
)::vector AS embedding;
```

## Building a Semantic Search Table

Let's build a practical example - a knowledge base with semantic search capabilities:

```sql
-- Create a table for knowledge base articles
-- The embedding column stores the vector representation
CREATE TABLE knowledge_base (
  id SERIAL PRIMARY KEY,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  category TEXT,
  embedding vector(768),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create an index for fast vector similarity search
-- HNSW index provides good recall with fast query times
CREATE INDEX ON knowledge_base
USING hnsw (embedding vector_cosine_ops)
WITH (m = 16, ef_construction = 64);
```

## Inserting Data with Auto-Generated Embeddings

Insert articles and generate their embeddings in the same statement:

```sql
-- Insert an article and generate its embedding in one query
-- The embedding function processes the concatenated title and content
INSERT INTO knowledge_base (title, content, category, embedding)
VALUES (
  'Setting Up Prometheus Monitoring',
  'Prometheus is an open-source monitoring toolkit that collects metrics from configured targets at given intervals. It stores all scraped samples locally and runs rules over this data to either aggregate and record new time series or generate alerts.',
  'monitoring',
  google_ml.embedding(
    model_id => 'text-embedding-model',
    content => 'Setting Up Prometheus Monitoring: Prometheus is an open-source monitoring toolkit that collects metrics from configured targets at given intervals.'
  )::vector
);

-- Batch insert multiple articles with embeddings
INSERT INTO knowledge_base (title, content, category, embedding)
SELECT
  title,
  content,
  category,
  google_ml.embedding(
    model_id => 'text-embedding-model',
    content => title || ': ' || LEFT(content, 500)
  )::vector
FROM staging_articles;
```

## Performing Semantic Search

Search for articles by meaning rather than keywords:

```sql
-- Semantic search: find articles similar to a natural language query
-- The <=> operator computes cosine distance (lower is more similar)
SELECT
  title,
  category,
  LEFT(content, 200) AS preview,
  1 - (embedding <=> google_ml.embedding(
    model_id => 'text-embedding-model',
    content => 'how to set up alerts for server downtime'
  )::vector) AS similarity_score
FROM knowledge_base
ORDER BY embedding <=> google_ml.embedding(
  model_id => 'text-embedding-model',
  content => 'how to set up alerts for server downtime'
)::vector
LIMIT 5;
```

This query finds the 5 most semantically similar articles to "how to set up alerts for server downtime", even if the articles do not contain those exact words.

## Combining Semantic and Traditional Search

For the best results, combine vector similarity with traditional filters:

```sql
-- Hybrid search: semantic similarity filtered by category
-- and boosted by recency
SELECT
  title,
  category,
  created_at,
  1 - (embedding <=> google_ml.embedding(
    model_id => 'text-embedding-model',
    content => 'database performance tuning'
  )::vector) AS semantic_score,
  -- Boost recent articles slightly
  CASE
    WHEN created_at > CURRENT_TIMESTAMP - INTERVAL '30 days' THEN 0.1
    ELSE 0
  END AS recency_boost
FROM knowledge_base
WHERE category IN ('databases', 'performance')
ORDER BY (
  1 - (embedding <=> google_ml.embedding(
    model_id => 'text-embedding-model',
    content => 'database performance tuning'
  )::vector)
  + CASE
      WHEN created_at > CURRENT_TIMESTAMP - INTERVAL '30 days' THEN 0.1
      ELSE 0
    END
) DESC
LIMIT 10;
```

## Keeping Embeddings Up to Date

Create a trigger to automatically regenerate embeddings when content changes:

```sql
-- Create a function that updates the embedding when content changes
CREATE OR REPLACE FUNCTION update_embedding()
RETURNS TRIGGER AS $$
BEGIN
  NEW.embedding := google_ml.embedding(
    model_id => 'text-embedding-model',
    content => NEW.title || ': ' || LEFT(NEW.content, 500)
  )::vector;
  NEW.updated_at := CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Attach the trigger to the table
CREATE TRIGGER auto_update_embedding
BEFORE INSERT OR UPDATE OF title, content
ON knowledge_base
FOR EACH ROW
EXECUTE FUNCTION update_embedding();
```

Now every insert or update to the title or content columns automatically regenerates the embedding.

## Building a RAG Pipeline

Use AlloyDB AI embeddings as the retrieval component of a RAG pipeline:

```sql
-- Retrieve relevant context for an LLM prompt
-- This provides the "R" in RAG
CREATE OR REPLACE FUNCTION get_relevant_context(
  query_text TEXT,
  max_results INT DEFAULT 3
)
RETURNS TABLE (title TEXT, content TEXT, score FLOAT8) AS $$
BEGIN
  RETURN QUERY
  SELECT
    kb.title,
    kb.content,
    1 - (kb.embedding <=> google_ml.embedding(
      model_id => 'text-embedding-model',
      content => query_text
    )::vector) AS score
  FROM knowledge_base kb
  ORDER BY kb.embedding <=> google_ml.embedding(
    model_id => 'text-embedding-model',
    content => query_text
  )::vector
  LIMIT max_results;
END;
$$ LANGUAGE plpgsql;

-- Use the function to get context for a user question
SELECT * FROM get_relevant_context(
  'What are the best practices for monitoring microservices?'
);
```

## Monitoring Embedding Performance

Track the performance of embedding generation:

```sql
-- Check how long embedding generation takes
EXPLAIN ANALYZE
SELECT google_ml.embedding(
  model_id => 'text-embedding-model',
  content => 'test embedding generation latency'
)::vector;

-- Monitor the ML integration status
SELECT * FROM google_ml.model_info_view;
```

## Summary

AlloyDB AI embeddings eliminate the need for separate embedding infrastructure by letting you generate vectors directly in SQL. Set up the google_ml_integration extension, register a Vertex AI embedding model, and use the `embedding()` function wherever you need vectors. Combined with pgvector for similarity search and HNSW indexes for performance, you can build full semantic search and RAG applications without leaving your database. The trigger-based approach keeps embeddings automatically in sync with your data, and the hybrid search pattern combining vectors with traditional SQL filters gives you the best of both worlds.
