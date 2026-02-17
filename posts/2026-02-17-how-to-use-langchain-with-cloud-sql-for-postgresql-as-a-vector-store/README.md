# How to Use LangChain with Cloud SQL for PostgreSQL as a Vector Store

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, LangChain, Cloud SQL, PostgreSQL, Vector Store

Description: Learn how to use Google Cloud SQL for PostgreSQL as a vector store with LangChain for building semantic search and RAG applications on GCP.

---

If you are building AI applications on GCP and already use Cloud SQL for PostgreSQL, you might not need a separate vector database at all. Cloud SQL for PostgreSQL supports the pgvector extension, which turns your existing database into a capable vector store. LangChain has a dedicated integration for this, making it easy to store embeddings, run similarity searches, and build RAG pipelines without adding another managed service to your stack.

This guide covers setting up Cloud SQL for PostgreSQL as a vector store with LangChain, from provisioning the database to running production queries.

## Why Cloud SQL as a Vector Store

Using Cloud SQL for vectors has some practical advantages. You keep your vectors alongside your relational data, which means you can join vector search results with your existing tables. You get the same backups, high availability, and IAM integration you already rely on. And you avoid the operational overhead of managing a separate vector database.

The tradeoff is that pgvector on Cloud SQL will not match the throughput of purpose-built vector databases for extremely large collections (hundreds of millions of vectors). But for most applications with up to tens of millions of vectors, it works well.

## Prerequisites

- Google Cloud project with Cloud SQL Admin API enabled
- A Cloud SQL for PostgreSQL instance (PostgreSQL 15 or later recommended)
- Python 3.9+
- The Cloud SQL Auth Proxy or direct connectivity

```bash
# Install required packages
pip install langchain langchain-google-cloud-sql-pg langchain-google-vertexai google-cloud-aiplatform
```

## Setting Up the Cloud SQL Instance

If you do not have a Cloud SQL instance yet, create one with pgvector support.

```bash
# Create a Cloud SQL PostgreSQL instance
gcloud sql instances create my-vector-db \
    --database-version=POSTGRES_15 \
    --tier=db-custom-2-8192 \
    --region=us-central1 \
    --project=your-project-id

# Create a database
gcloud sql databases create vectordb \
    --instance=my-vector-db \
    --project=your-project-id

# Set a password for the postgres user
gcloud sql users set-password postgres \
    --instance=my-vector-db \
    --password=your-secure-password \
    --project=your-project-id
```

## Connecting to Cloud SQL

LangChain's Cloud SQL integration uses the `CloudSQLVectorStore` class. First, you need to establish a connection.

```python
from langchain_google_cloud_sql_pg import PostgresEngine, CloudSQLVectorStore
from langchain_google_vertexai import VertexAIEmbeddings

# Create a connection engine to Cloud SQL
# This handles authentication and connection pooling automatically
engine = PostgresEngine.from_instance(
    project_id="your-project-id",
    region="us-central1",
    instance="my-vector-db",
    database="vectordb",
    user="postgres",
    password="your-secure-password",
)
```

## Initializing the Vector Store

Before storing vectors, you need to create the table structure. The LangChain integration provides a helper method for this.

```python
import asyncio

# Initialize the embedding model - this generates vectors from text
embeddings = VertexAIEmbeddings(
    model_name="text-embedding-004",
    project="your-project-id",
)

# Create the vector store table in Cloud SQL
# This creates the table with the right schema for storing embeddings
asyncio.run(
    engine.ainit_vectorstore_table(
        table_name="document_embeddings",
        vector_size=768,  # Must match the embedding model's output dimension
    )
)

# Initialize the vector store
vector_store = CloudSQLVectorStore(
    engine=engine,
    table_name="document_embeddings",
    embedding_service=embeddings,
)
```

## Adding Documents

Now you can add documents to the vector store. Each document gets embedded and stored alongside its content and metadata.

```python
from langchain_core.documents import Document

# Create documents to store
documents = [
    Document(
        page_content="Cloud SQL for PostgreSQL supports automatic backups, point-in-time recovery, and high availability configurations.",
        metadata={"source": "cloud-sql-docs", "category": "backup"},
    ),
    Document(
        page_content="Vertex AI provides pre-trained models for text embedding, image classification, and natural language processing tasks.",
        metadata={"source": "vertex-ai-docs", "category": "ml"},
    ),
    Document(
        page_content="Cloud Run automatically scales your containerized applications based on incoming traffic, including scaling to zero when idle.",
        metadata={"source": "cloud-run-docs", "category": "compute"},
    ),
    Document(
        page_content="BigQuery is a serverless data warehouse that supports SQL queries over petabytes of data with built-in machine learning capabilities.",
        metadata={"source": "bigquery-docs", "category": "analytics"},
    ),
]

# Add documents to the vector store
# This embeds each document and stores the vector + content + metadata
ids = vector_store.add_documents(documents)
print(f"Added {len(ids)} documents with IDs: {ids}")
```

## Running Similarity Search

The core use case for a vector store is similarity search - finding documents that are semantically close to a query.

```python
# Search for documents similar to a query
query = "How do I back up my database?"
results = vector_store.similarity_search(query, k=3)

for i, doc in enumerate(results):
    print(f"\nResult {i+1}:")
    print(f"  Content: {doc.page_content}")
    print(f"  Metadata: {doc.metadata}")
```

### Search with Scores

When you need to know how relevant each result is, use `similarity_search_with_score`.

```python
# Get results with similarity scores
results_with_scores = vector_store.similarity_search_with_score(
    query="serverless compute options",
    k=3,
)

for doc, score in results_with_scores:
    print(f"Score: {score:.4f} | {doc.page_content[:100]}...")
```

### Filtering with Metadata

You can filter results based on metadata fields, which is useful when you want to search within a specific category or source.

```python
# Search with metadata filtering
results = vector_store.similarity_search(
    query="machine learning models",
    k=3,
    filter={"category": "ml"},  # Only return documents in the 'ml' category
)

for doc in results:
    print(f"[{doc.metadata['category']}] {doc.page_content[:150]}...")
```

## Building a RAG Chain

Here is how to use the vector store as a retriever in a full RAG pipeline with Gemini.

```python
from langchain_google_vertexai import ChatVertexAI
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.runnables import RunnablePassthrough
from langchain_core.output_parsers import StrOutputParser

# Set up the retriever from the vector store
retriever = vector_store.as_retriever(
    search_type="similarity",
    search_kwargs={"k": 4},  # Return top 4 results
)

# Initialize the Gemini model for answer generation
llm = ChatVertexAI(
    model_name="gemini-1.5-pro",
    project="your-project-id",
    location="us-central1",
    temperature=0.2,
)

# Build the RAG prompt
rag_prompt = ChatPromptTemplate.from_template("""
Answer the question based on the following context. If the context does not
contain enough information to answer, say so.

Context:
{context}

Question: {question}

Answer:""")

def format_docs(docs):
    """Combine retrieved documents into a single context string."""
    return "\n\n".join(doc.page_content for doc in docs)

# Build the RAG chain
rag_chain = (
    {"context": retriever | format_docs, "question": RunnablePassthrough()}
    | rag_prompt
    | llm
    | StrOutputParser()
)

# Ask a question
answer = rag_chain.invoke("What are the scaling capabilities of Cloud Run?")
print(answer)
```

## Performance Tuning

For better query performance at scale, create an index on the vector column.

```python
# Create an IVFFlat index for faster approximate nearest neighbor search
# Run this after you have loaded a significant amount of data
asyncio.run(
    engine.ainit_vectorstore_table(
        table_name="document_embeddings",
        vector_size=768,
        overwrite_existing=False,
    )
)
```

You can also create indexes directly with SQL:

```sql
-- Create an IVFFlat index for faster similarity searches
-- The number of lists should be roughly sqrt(number_of_rows)
CREATE INDEX ON document_embeddings
USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 100);
```

## Connection Pooling

For production workloads, use connection pooling to manage database connections efficiently.

```python
# Create engine with connection pooling settings
engine = PostgresEngine.from_instance(
    project_id="your-project-id",
    region="us-central1",
    instance="my-vector-db",
    database="vectordb",
    user="postgres",
    password="your-secure-password",
)
```

## Summary

Cloud SQL for PostgreSQL with pgvector is a practical choice for vector storage when you want to keep your infrastructure simple and leverage your existing PostgreSQL expertise. The LangChain integration makes it easy to add, search, and retrieve documents with minimal code. For most applications, this setup provides good enough performance while keeping your operational complexity low. Start here, and only move to a dedicated vector database if you hit scaling limits.
