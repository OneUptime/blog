# How to Use LangChain with AlloyDB as a Vector Store on Google Cloud

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, LangChain, AlloyDB, Vector Store, RAG

Description: Learn how to use LangChain with AlloyDB as a vector store on Google Cloud for building production RAG applications with PostgreSQL compatibility.

---

AlloyDB is Google Cloud's high-performance, PostgreSQL-compatible database, and it has native support for vector operations through the pgvector extension. This makes it a solid choice for RAG applications where you want a managed, scalable vector store that also handles your relational data. No need for a separate vector database when AlloyDB does both.

I switched a project from a standalone vector database to AlloyDB and the operational simplicity was a huge win - one database to manage instead of two. LangChain has a built-in AlloyDB integration that makes the setup straightforward. Let me show you how to build it.

## Why AlloyDB for Vector Search?

AlloyDB offers several advantages as a vector store. It is PostgreSQL-compatible, so your team probably already knows how to operate it. It handles relational and vector data in the same database, avoiding the data synchronization headaches of separate systems. It scales well with managed instances and read replicas. And Google's AlloyDB-specific optimizations make vector operations fast.

The pgvector extension supports multiple index types (IVFFlat, HNSW) for approximate nearest neighbor search, and exact search for smaller datasets.

## Setting Up AlloyDB

Before writing code, you need an AlloyDB instance with the pgvector extension enabled.

```python
# First, set up your AlloyDB instance via the CLI or console
# Then connect and enable pgvector

from google.cloud.alloydb.connector import Connector
import sqlalchemy

# Create a connection using the AlloyDB connector
connector = Connector()

def get_connection():
    """Create a connection to AlloyDB."""
    conn = connector.connect(
        "projects/your-project-id/locations/us-central1/"
        "clusters/your-cluster/instances/your-instance",
        "pg8000",
        user="postgres",
        password="your-password",
        db="ragdb"
    )
    return conn

# Create SQLAlchemy engine
engine = sqlalchemy.create_engine(
    "postgresql+pg8000://",
    creator=get_connection
)

# Enable pgvector extension
with engine.connect() as conn:
    conn.execute(sqlalchemy.text("CREATE EXTENSION IF NOT EXISTS vector"))
    conn.commit()

print("pgvector extension enabled")
```

## Initializing the LangChain AlloyDB Vector Store

LangChain provides a dedicated AlloyDB vector store class that handles table creation, embedding storage, and similarity search.

```python
import vertexai
from langchain_google_vertexai import VertexAIEmbeddings
from langchain_google_alloydb_pg import AlloyDBVectorStore, AlloyDBEngine

# Initialize Vertex AI for embeddings
vertexai.init(project="your-project-id", location="us-central1")

# Create the embedding model
embeddings = VertexAIEmbeddings(model_name="text-embedding-005")

# Initialize the AlloyDB engine
alloydb_engine = AlloyDBEngine.from_instance(
    project_id="your-project-id",
    region="us-central1",
    cluster="your-cluster",
    instance="your-instance",
    database="ragdb",
    user="postgres",
    password="your-password"
)

# Initialize the vector store with automatic table creation
vector_store = AlloyDBVectorStore.create_sync(
    engine=alloydb_engine,
    table_name="document_embeddings",
    embedding_service=embeddings,
    metadata_columns=["source", "title", "chunk_index"]
)

print("Vector store initialized")
```

## Adding Documents to the Vector Store

Load and store documents with their embeddings.

```python
from langchain.schema import Document
from langchain.text_splitter import RecursiveCharacterTextSplitter

# Load your documents
raw_documents = [
    Document(
        page_content=(
            "AlloyDB is a fully managed, PostgreSQL-compatible database "
            "service for demanding enterprise workloads. It offers "
            "high performance, availability, and scale while maintaining "
            "99.99% SLA including maintenance."
        ),
        metadata={
            "source": "alloydb-docs",
            "title": "AlloyDB Overview",
            "chunk_index": 0
        }
    ),
    Document(
        page_content=(
            "AlloyDB supports the pgvector extension for vector similarity "
            "search. You can store embeddings alongside your relational data "
            "and perform approximate nearest neighbor queries using IVFFlat "
            "or HNSW indexes."
        ),
        metadata={
            "source": "alloydb-docs",
            "title": "Vector Search in AlloyDB",
            "chunk_index": 0
        }
    ),
]

# Split documents into chunks
text_splitter = RecursiveCharacterTextSplitter(
    chunk_size=500,
    chunk_overlap=100
)
split_docs = text_splitter.split_documents(raw_documents)

# Add documents to the vector store
ids = vector_store.add_documents(split_docs)
print(f"Added {len(ids)} document chunks to AlloyDB")
```

## Performing Similarity Search

Search for documents similar to a query using vector similarity.

```python
# Basic similarity search
query = "How does AlloyDB handle vector search?"
results = vector_store.similarity_search(query, k=3)

print(f"Found {len(results)} results for: {query}\n")
for i, doc in enumerate(results, 1):
    print(f"Result {i}:")
    print(f"  Content: {doc.page_content[:150]}...")
    print(f"  Source: {doc.metadata.get('source')}")
    print(f"  Title: {doc.metadata.get('title')}")
    print()
```

## Similarity Search with Scores

Get relevance scores alongside the search results to understand how well each document matches.

```python
# Search with scores
results_with_scores = vector_store.similarity_search_with_score(
    query="What is the SLA for AlloyDB?",
    k=5
)

print("Search results with scores:")
for doc, score in results_with_scores:
    print(f"  Score: {score:.4f} | {doc.page_content[:80]}...")
```

## Filtering with Metadata

AlloyDB vector store supports metadata filtering, so you can narrow search results to specific sources or categories.

```python
# Search with metadata filter
filtered_results = vector_store.similarity_search(
    query="vector search capabilities",
    k=3,
    filter={"source": "alloydb-docs"}
)

print("Filtered results (alloydb-docs only):")
for doc in filtered_results:
    print(f"  {doc.page_content[:100]}...")
```

## Building a Complete RAG Pipeline

Connect the vector store to a Gemini model for a full RAG application.

```python
from langchain_google_vertexai import VertexAI
from langchain.chains import RetrievalQA
from langchain.prompts import PromptTemplate

# Initialize the LLM
llm = VertexAI(model_name="gemini-2.0-flash", temperature=0.2)

# Create a retriever from the vector store
retriever = vector_store.as_retriever(
    search_type="similarity",
    search_kwargs={"k": 5}
)

# Define the RAG prompt
prompt_template = PromptTemplate(
    template="""Use the following context to answer the question.
If you cannot find the answer in the context, say "I don't have enough information to answer this."
Always cite the source document.

Context:
{context}

Question: {question}

Answer:""",
    input_variables=["context", "question"]
)

# Create the RAG chain
rag_chain = RetrievalQA.from_chain_type(
    llm=llm,
    chain_type="stuff",
    retriever=retriever,
    return_source_documents=True,
    chain_type_kwargs={"prompt": prompt_template}
)

# Query the RAG chain
result = rag_chain.invoke({"query": "What are the advantages of using AlloyDB for vector search?"})

print(f"Answer: {result['result']}")
print(f"\nSource documents used: {len(result['source_documents'])}")
for doc in result["source_documents"]:
    print(f"  - {doc.metadata.get('title', 'untitled')}")
```

## Configuring Vector Indexes

For production workloads, configure appropriate indexes to speed up vector search.

```python
# Create an HNSW index for fast approximate nearest neighbor search
# HNSW offers better query performance than IVFFlat at the cost of slower index builds

with engine.connect() as conn:
    # Create HNSW index
    conn.execute(sqlalchemy.text("""
        CREATE INDEX IF NOT EXISTS doc_embedding_hnsw_idx
        ON document_embeddings
        USING hnsw (embedding vector_cosine_ops)
        WITH (m = 16, ef_construction = 64)
    """))
    conn.commit()

print("HNSW index created")

# For queries, set the search parameters
with engine.connect() as conn:
    # Increase ef_search for better recall (at the cost of speed)
    conn.execute(sqlalchemy.text("SET hnsw.ef_search = 100"))
```

## Batch Document Ingestion

For large document collections, use batch operations for efficient ingestion.

```python
import os

def batch_ingest_documents(directory, batch_size=50):
    """Ingest a directory of documents in batches."""
    text_splitter = RecursiveCharacterTextSplitter(
        chunk_size=500,
        chunk_overlap=100
    )

    all_chunks = []

    # Load all documents
    for filename in os.listdir(directory):
        filepath = os.path.join(directory, filename)
        if not os.path.isfile(filepath):
            continue

        with open(filepath, "r") as f:
            content = f.read()

        doc = Document(
            page_content=content,
            metadata={
                "source": filename,
                "title": filename.replace(".txt", "").replace("-", " ").title()
            }
        )

        chunks = text_splitter.split_documents([doc])
        for i, chunk in enumerate(chunks):
            chunk.metadata["chunk_index"] = i
        all_chunks.extend(chunks)

    print(f"Total chunks to ingest: {len(all_chunks)}")

    # Ingest in batches
    for i in range(0, len(all_chunks), batch_size):
        batch = all_chunks[i:i + batch_size]
        vector_store.add_documents(batch)
        print(f"Ingested batch {i // batch_size + 1} "
              f"({min(i + batch_size, len(all_chunks))}/{len(all_chunks)})")

    print("Ingestion complete")

# Ingest a directory of documents
batch_ingest_documents("docs/")
```

## Managing the Vector Store

Handle common management tasks like updating and deleting documents.

```python
def update_document(document_id, new_content, metadata):
    """Update a document in the vector store."""
    # Delete the old version
    vector_store.delete(ids=[document_id])

    # Add the updated version
    doc = Document(page_content=new_content, metadata=metadata)
    chunks = RecursiveCharacterTextSplitter(
        chunk_size=500, chunk_overlap=100
    ).split_documents([doc])

    new_ids = vector_store.add_documents(chunks)
    return new_ids

def get_collection_stats():
    """Get statistics about the vector store."""
    with engine.connect() as conn:
        # Count total documents
        result = conn.execute(sqlalchemy.text(
            "SELECT COUNT(*) as total FROM document_embeddings"
        ))
        total = result.fetchone()[0]

        # Count by source
        result = conn.execute(sqlalchemy.text("""
            SELECT metadata->>'source' as source, COUNT(*) as count
            FROM document_embeddings
            GROUP BY metadata->>'source'
            ORDER BY count DESC
        """))
        by_source = [(row[0], row[1]) for row in result]

    print(f"Total chunks: {total}")
    print("By source:")
    for source, count in by_source:
        print(f"  {source}: {count}")
```

## Conversational RAG

Add conversation history for multi-turn RAG interactions.

```python
from langchain.memory import ConversationBufferMemory
from langchain.chains import ConversationalRetrievalChain

# Set up conversation memory
memory = ConversationBufferMemory(
    memory_key="chat_history",
    return_messages=True,
    output_key="answer"
)

# Create a conversational RAG chain
conv_chain = ConversationalRetrievalChain.from_llm(
    llm=llm,
    retriever=retriever,
    memory=memory,
    return_source_documents=True,
    combine_docs_chain_kwargs={"prompt": prompt_template}
)

# Multi-turn conversation
questions = [
    "What is AlloyDB?",
    "Does it support vector search?",
    "How does it compare to standalone vector databases?"
]

for question in questions:
    result = conv_chain.invoke({"question": question})
    print(f"Q: {question}")
    print(f"A: {result['answer']}")
    print()
```

## Performance Tuning

Optimize your AlloyDB vector store for production workloads.

```python
# Tune AlloyDB for vector workloads
with engine.connect() as conn:
    # Increase work memory for large vector operations
    conn.execute(sqlalchemy.text("SET work_mem = '256MB'"))

    # Tune HNSW search parameters
    # Higher ef_search = better recall but slower
    conn.execute(sqlalchemy.text("SET hnsw.ef_search = 200"))

    # For IVFFlat, tune the probes parameter
    # Higher probes = better recall but slower
    conn.execute(sqlalchemy.text("SET ivfflat.probes = 10"))
    conn.commit()

# Monitor query performance
def benchmark_search(query, k=5, runs=10):
    """Benchmark vector search performance."""
    import time

    latencies = []
    for _ in range(runs):
        start = time.time()
        vector_store.similarity_search(query, k=k)
        latencies.append((time.time() - start) * 1000)

    avg = sum(latencies) / len(latencies)
    p99 = sorted(latencies)[int(len(latencies) * 0.99)]

    print(f"Search benchmark ({runs} runs, k={k}):")
    print(f"  Avg latency: {avg:.1f}ms")
    print(f"  P99 latency: {p99:.1f}ms")

benchmark_search("How does vector search work?")
```

## Wrapping Up

AlloyDB with LangChain gives you a production-ready vector store that integrates naturally with your existing PostgreSQL-compatible infrastructure. You get the simplicity of a single database for both relational and vector data, the performance of Google's managed database service, and the flexibility of the LangChain ecosystem. Start with basic similarity search, add metadata filtering, build a full RAG pipeline, and tune performance as your dataset grows. Monitor your RAG pipeline's search latency and answer quality with tools like OneUptime to maintain a reliable AI application.
