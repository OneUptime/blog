# How to Use LlamaIndex for Data Indexing

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: LlamaIndex, Data Indexing, AI, LLM, RAG, Vector Database, Python, Machine Learning

Description: A comprehensive guide to using LlamaIndex for efficient data indexing, covering document loaders, node parsers, index types, storage contexts, and best practices for building retrieval-augmented generation (RAG) applications.

---

> The power of large language models lies not just in their training data, but in how effectively you can connect them to your own knowledge base through intelligent indexing.

LlamaIndex (formerly GPT Index) is a data framework designed to connect large language models (LLMs) with external data sources. It provides the tools to ingest, structure, and query your data efficiently, making it an essential component for building retrieval-augmented generation (RAG) applications.

This guide walks you through the core concepts of LlamaIndex, from loading documents to creating different index types, persisting data, and keeping your indexes up to date.

---

## Table of Contents

1. Getting Started
2. Document Loaders
3. Node Parsers
4. Index Types
5. Storage Contexts
6. Persisting Indexes
7. Updating Indexes
8. Best Practices

---

## 1. Getting Started

First, install LlamaIndex and its dependencies:

```bash
pip install llama-index llama-index-embeddings-openai llama-index-llms-openai
```

Set up your environment with the necessary API keys:

```python
# Set up environment variables for API access
import os
os.environ["OPENAI_API_KEY"] = "your-api-key-here"
```

Basic imports you will need throughout this guide:

```python
# Core LlamaIndex imports for document processing and indexing
from llama_index.core import (
    Document,
    VectorStoreIndex,
    ListIndex,
    TreeIndex,
    KeywordTableIndex,
    SimpleDirectoryReader,
    StorageContext,
    load_index_from_storage,
    Settings,
)
from llama_index.core.node_parser import (
    SentenceSplitter,
    SemanticSplitterNodeParser,
    HierarchicalNodeParser,
)
from llama_index.embeddings.openai import OpenAIEmbedding
from llama_index.llms.openai import OpenAI
```

---

## 2. Document Loaders

Document loaders are responsible for ingesting data from various sources and converting them into Document objects that LlamaIndex can process.

### SimpleDirectoryReader

The most common loader for reading files from a directory:

```python
# Load all supported files from a directory
# Supports PDF, DOCX, TXT, MD, and many other formats
reader = SimpleDirectoryReader(
    input_dir="./data",           # Directory containing your documents
    recursive=True,                # Include subdirectories
    exclude_hidden=True,           # Skip hidden files
    required_exts=[".pdf", ".md", ".txt"],  # Only load specific file types
)

# Load documents into memory
documents = reader.load_data()

# Each document has text content and metadata
for doc in documents:
    print(f"File: {doc.metadata.get('file_name')}")
    print(f"Content length: {len(doc.text)} characters")
```

### Loading from Specific File Types

```python
# Load a single PDF file
from llama_index.readers.file import PDFReader

pdf_reader = PDFReader()
pdf_documents = pdf_reader.load_data(file_path="./report.pdf")

# Load from a web page
from llama_index.readers.web import SimpleWebPageReader

web_reader = SimpleWebPageReader(html_to_text=True)
web_documents = web_reader.load_data(urls=["https://example.com/docs"])
```

### Creating Documents Manually

```python
# Create documents programmatically from your own data sources
documents = [
    Document(
        text="LlamaIndex is a data framework for LLM applications.",
        metadata={
            "source": "manual",
            "category": "introduction",
            "created_at": "2026-01-27",
        },
    ),
    Document(
        text="Vector indexes enable semantic search over your documents.",
        metadata={
            "source": "manual",
            "category": "indexing",
            "created_at": "2026-01-27",
        },
    ),
]
```

### Database Loaders

```python
# Load from a SQL database
from llama_index.readers.database import DatabaseReader

db_reader = DatabaseReader(
    uri="postgresql://user:password@localhost:5432/mydb"
)

# Execute a query and convert results to documents
documents = db_reader.load_data(
    query="SELECT title, content FROM articles WHERE published = true"
)
```

---

## 3. Node Parsers

Node parsers break documents into smaller chunks (nodes) that are more suitable for indexing and retrieval. Choosing the right parser significantly impacts retrieval quality.

### SentenceSplitter (Default)

```python
# Split documents by sentence boundaries with overlap
# Good for general-purpose text processing
sentence_parser = SentenceSplitter(
    chunk_size=1024,      # Maximum characters per chunk
    chunk_overlap=200,    # Overlap between chunks for context continuity
    separator=" ",        # Primary separator
    paragraph_separator="\n\n\n",  # Paragraph boundary marker
)

# Parse documents into nodes
nodes = sentence_parser.get_nodes_from_documents(documents)

print(f"Created {len(nodes)} nodes from {len(documents)} documents")
```

### SemanticSplitterNodeParser

```python
# Split based on semantic similarity rather than fixed sizes
# Creates more coherent chunks by grouping related sentences
from llama_index.core.node_parser import SemanticSplitterNodeParser
from llama_index.embeddings.openai import OpenAIEmbedding

# Initialize embedding model for semantic comparison
embed_model = OpenAIEmbedding()

semantic_parser = SemanticSplitterNodeParser(
    buffer_size=1,              # Sentences to group before checking similarity
    breakpoint_percentile_threshold=95,  # Similarity threshold for splits
    embed_model=embed_model,
)

# Nodes will have more natural boundaries based on topic shifts
semantic_nodes = semantic_parser.get_nodes_from_documents(documents)
```

### HierarchicalNodeParser

```python
# Create a hierarchy of nodes at different granularities
# Useful for multi-level retrieval strategies
hierarchical_parser = HierarchicalNodeParser.from_defaults(
    chunk_sizes=[2048, 512, 128],  # Large, medium, and small chunks
)

# Returns nodes at multiple levels with parent-child relationships
hierarchical_nodes = hierarchical_parser.get_nodes_from_documents(documents)

# Each node knows its parent and children
for node in hierarchical_nodes[:5]:
    print(f"Node level: {node.metadata.get('level', 'unknown')}")
    print(f"Has parent: {node.parent_node is not None}")
```

### Custom Node Parser

```python
# Create a custom parser for specific document structures
from llama_index.core.node_parser import NodeParser
from llama_index.core.schema import TextNode

class MarkdownSectionParser(NodeParser):
    """Split markdown documents by headers."""

    def _parse_nodes(self, nodes, show_progress=False):
        all_nodes = []

        for node in nodes:
            # Split by markdown headers
            sections = node.text.split("\n## ")

            for i, section in enumerate(sections):
                if section.strip():
                    # Create a new node for each section
                    text_node = TextNode(
                        text=section if i == 0 else f"## {section}",
                        metadata={
                            **node.metadata,
                            "section_index": i,
                        },
                    )
                    all_nodes.append(text_node)

        return all_nodes
```

---

## 4. Index Types

LlamaIndex provides several index types, each optimized for different use cases.

### VectorStoreIndex

The most commonly used index type. It creates embeddings for each node and enables semantic similarity search.

```python
# Create a vector index from documents
# Embeddings are generated automatically using the configured model
vector_index = VectorStoreIndex.from_documents(
    documents,
    show_progress=True,  # Display progress bar during indexing
)

# Query the index with natural language
query_engine = vector_index.as_query_engine(
    similarity_top_k=5,  # Return top 5 most similar chunks
)

response = query_engine.query("What is LlamaIndex used for?")
print(response)

# You can also retrieve nodes without generating a response
retriever = vector_index.as_retriever(similarity_top_k=3)
retrieved_nodes = retriever.retrieve("data indexing")

for node in retrieved_nodes:
    print(f"Score: {node.score:.4f}")
    print(f"Text: {node.text[:200]}...")
```

### ListIndex

Stores nodes in a simple list. Best for scenarios where you want to process all nodes or use an LLM to filter.

```python
# Create a list index - no embeddings, stores all nodes
list_index = ListIndex.from_documents(documents)

# Query engine iterates through all nodes
# Good for summarization or when you need comprehensive coverage
query_engine = list_index.as_query_engine(
    response_mode="tree_summarize",  # Hierarchically summarize all nodes
)

response = query_engine.query("Summarize all the key points.")
print(response)

# List index supports different response modes
query_engine_compact = list_index.as_query_engine(
    response_mode="compact",  # Combine nodes until context limit
)
```

### TreeIndex

Builds a hierarchical tree structure from your documents. Useful for summarization and hierarchical queries.

```python
# Create a tree index with automatic summarization
# Each parent node summarizes its children
tree_index = TreeIndex.from_documents(
    documents,
    num_children=10,  # Maximum children per parent node
    show_progress=True,
)

# Query traverses the tree from root to leaves
query_engine = tree_index.as_query_engine(
    child_branch_factor=2,  # Number of branches to explore at each level
)

response = query_engine.query("What are the main topics covered?")
print(response)

# Tree index is efficient for hierarchical document structures
# Like books with chapters, sections, and subsections
```

### KeywordTableIndex

Creates a keyword-based index for exact term matching. Useful when semantic search is not needed.

```python
# Create a keyword table index
# Extracts keywords from each node for fast lookup
keyword_index = KeywordTableIndex.from_documents(
    documents,
    max_keywords_per_chunk=10,  # Limit keywords extracted per chunk
)

# Query uses keyword extraction and matching
query_engine = keyword_index.as_query_engine()

response = query_engine.query("Tell me about vector databases")
print(response)

# Keyword index is faster but less flexible than vector search
# Good for technical documentation with specific terminology
```

### Combining Multiple Index Types

```python
# Use multiple indexes together with a router
from llama_index.core.query_engine import RouterQueryEngine
from llama_index.core.selectors import LLMSingleSelector
from llama_index.core.tools import QueryEngineTool

# Create tools from different indexes
vector_tool = QueryEngineTool.from_defaults(
    query_engine=vector_index.as_query_engine(),
    description="Useful for semantic search and finding related content",
)

keyword_tool = QueryEngineTool.from_defaults(
    query_engine=keyword_index.as_query_engine(),
    description="Useful for exact term matching and specific lookups",
)

# Router automatically selects the best index for each query
router_engine = RouterQueryEngine(
    selector=LLMSingleSelector.from_defaults(),
    query_engine_tools=[vector_tool, keyword_tool],
)

response = router_engine.query("What is the exact definition of RAG?")
```

---

## 5. Storage Contexts

Storage contexts manage where and how your index data is stored. They provide a unified interface for persisting nodes, indexes, and vectors.

```python
# Create a storage context with default in-memory storage
storage_context = StorageContext.from_defaults()

# Build an index using the storage context
index = VectorStoreIndex.from_documents(
    documents,
    storage_context=storage_context,
)

# The storage context contains:
# - docstore: stores Document and Node objects
# - index_store: stores index metadata
# - vector_store: stores embedding vectors
```

### Custom Vector Store

```python
# Use a dedicated vector database for production workloads
from llama_index.vector_stores.chroma import ChromaVectorStore
import chromadb

# Initialize ChromaDB client
chroma_client = chromadb.PersistentClient(path="./chroma_db")
chroma_collection = chroma_client.get_or_create_collection("my_collection")

# Create vector store wrapper
vector_store = ChromaVectorStore(chroma_collection=chroma_collection)

# Create storage context with custom vector store
storage_context = StorageContext.from_defaults(
    vector_store=vector_store,
)

# Index will store vectors in ChromaDB instead of memory
index = VectorStoreIndex.from_documents(
    documents,
    storage_context=storage_context,
)
```

### Using Multiple Storage Backends

```python
# Configure different backends for different storage needs
from llama_index.storage.docstore.redis import RedisDocumentStore
from llama_index.storage.index_store.redis import RedisIndexStore

# Use Redis for document and index storage
docstore = RedisDocumentStore.from_host_and_port(
    host="localhost",
    port=6379,
    namespace="llama_docs",
)

index_store = RedisIndexStore.from_host_and_port(
    host="localhost",
    port=6379,
    namespace="llama_index",
)

# Combine with a vector store
storage_context = StorageContext.from_defaults(
    docstore=docstore,
    index_store=index_store,
    vector_store=vector_store,
)
```

---

## 6. Persisting Indexes

Persisting indexes allows you to save your work and reload it without re-processing documents.

### Local Filesystem Persistence

```python
# Create and persist an index to disk
index = VectorStoreIndex.from_documents(documents)

# Save to a directory - creates multiple files for different components
persist_dir = "./storage"
index.storage_context.persist(persist_dir=persist_dir)

print(f"Index persisted to {persist_dir}")
# Creates: docstore.json, index_store.json, vector_store.json
```

### Loading a Persisted Index

```python
# Load a previously saved index from disk
from llama_index.core import load_index_from_storage

# Rebuild storage context from persisted files
storage_context = StorageContext.from_defaults(
    persist_dir="./storage",
)

# Load the index - much faster than re-indexing
index = load_index_from_storage(storage_context)

# Ready to query immediately
query_engine = index.as_query_engine()
response = query_engine.query("Your question here")
```

### Persisting with Custom Settings

```python
# Persist with specific serialization options
storage_context.persist(
    persist_dir="./storage",
    docstore_fname="documents.json",      # Custom filename for docstore
    index_store_fname="indexes.json",     # Custom filename for index store
    vector_store_fname="vectors.json",    # Custom filename for vectors
)

# For large indexes, consider using a database backend instead
# of filesystem persistence for better performance
```

### Cloud Storage Persistence

```python
# Persist to S3 or other cloud storage
import boto3
import json

def persist_to_s3(index, bucket_name, prefix):
    """Save index components to S3."""
    s3 = boto3.client('s3')

    # Get the storage context data
    storage_context = index.storage_context

    # Persist locally first, then upload
    local_dir = "/tmp/index_storage"
    storage_context.persist(persist_dir=local_dir)

    # Upload each file to S3
    for filename in ["docstore.json", "index_store.json", "vector_store.json"]:
        s3.upload_file(
            f"{local_dir}/{filename}",
            bucket_name,
            f"{prefix}/{filename}",
        )

def load_from_s3(bucket_name, prefix):
    """Load index components from S3."""
    s3 = boto3.client('s3')
    local_dir = "/tmp/index_storage"

    # Download files from S3
    for filename in ["docstore.json", "index_store.json", "vector_store.json"]:
        s3.download_file(
            bucket_name,
            f"{prefix}/{filename}",
            f"{local_dir}/{filename}",
        )

    # Load from local files
    storage_context = StorageContext.from_defaults(persist_dir=local_dir)
    return load_index_from_storage(storage_context)
```

---

## 7. Updating Indexes

Indexes often need to be updated as new documents arrive or existing ones change.

### Inserting New Documents

```python
# Load existing index
storage_context = StorageContext.from_defaults(persist_dir="./storage")
index = load_index_from_storage(storage_context)

# Add new documents to the index
new_documents = [
    Document(
        text="New information about LlamaIndex features.",
        metadata={"source": "update", "date": "2026-01-27"},
    ),
]

# Insert documents - they will be parsed and embedded automatically
for doc in new_documents:
    index.insert(doc)

# Persist the updated index
index.storage_context.persist(persist_dir="./storage")

print(f"Added {len(new_documents)} new documents to the index")
```

### Updating Existing Documents

```python
# Update a document by its ID
# First, you need to track document IDs when inserting
from llama_index.core.schema import Document

# Create document with explicit ID
doc = Document(
    text="Original content",
    doc_id="doc_001",  # Explicit document ID
    metadata={"version": 1},
)

# Insert into index
index.insert(doc)

# Later, update the document
updated_doc = Document(
    text="Updated content with new information",
    doc_id="doc_001",  # Same ID to replace
    metadata={"version": 2},
)

# Update replaces the existing document with matching ID
index.update_ref_doc(updated_doc)

# Persist changes
index.storage_context.persist(persist_dir="./storage")
```

### Deleting Documents

```python
# Delete a document by its ID
index.delete_ref_doc("doc_001", delete_from_docstore=True)

# Delete multiple documents
doc_ids_to_delete = ["doc_002", "doc_003", "doc_004"]
for doc_id in doc_ids_to_delete:
    index.delete_ref_doc(doc_id, delete_from_docstore=True)

# Persist after deletions
index.storage_context.persist(persist_dir="./storage")
```

### Refresh Index with Changed Documents

```python
# Refresh handles inserts, updates, and deletes automatically
# Useful when syncing with an external data source

def refresh_index_from_source(index, data_source):
    """
    Refresh index by comparing with source documents.
    Handles new, updated, and deleted documents.
    """
    # Get current documents from source
    current_docs = data_source.get_all_documents()

    # Create a mapping of doc_id to document
    current_doc_map = {doc.doc_id: doc for doc in current_docs}

    # Get existing doc IDs in index
    existing_doc_ids = set(index.ref_doc_info.keys())
    current_doc_ids = set(current_doc_map.keys())

    # Find documents to add, update, or delete
    to_add = current_doc_ids - existing_doc_ids
    to_delete = existing_doc_ids - current_doc_ids
    to_check_update = current_doc_ids & existing_doc_ids

    # Delete removed documents
    for doc_id in to_delete:
        index.delete_ref_doc(doc_id, delete_from_docstore=True)
        print(f"Deleted: {doc_id}")

    # Add new documents
    for doc_id in to_add:
        index.insert(current_doc_map[doc_id])
        print(f"Added: {doc_id}")

    # Update modified documents (check hash or timestamp)
    for doc_id in to_check_update:
        current_doc = current_doc_map[doc_id]
        if has_document_changed(index, doc_id, current_doc):
            index.update_ref_doc(current_doc)
            print(f"Updated: {doc_id}")

    # Persist all changes
    index.storage_context.persist(persist_dir="./storage")

    return {
        "added": len(to_add),
        "deleted": len(to_delete),
        "checked": len(to_check_update),
    }

def has_document_changed(index, doc_id, new_doc):
    """Check if document content has changed using hash comparison."""
    import hashlib

    # Get stored document info
    doc_info = index.ref_doc_info.get(doc_id)
    if not doc_info:
        return True

    # Compare content hashes
    new_hash = hashlib.md5(new_doc.text.encode()).hexdigest()
    stored_hash = doc_info.metadata.get("content_hash", "")

    return new_hash != stored_hash
```

### Incremental Indexing for Large Datasets

```python
# For large datasets, process documents in batches
def incremental_index_builder(document_source, batch_size=100):
    """
    Build index incrementally to manage memory usage.
    """
    # Initialize empty index with storage context
    storage_context = StorageContext.from_defaults()
    index = None

    batch = []
    total_processed = 0

    for doc in document_source.stream_documents():
        batch.append(doc)

        if len(batch) >= batch_size:
            if index is None:
                # Create index with first batch
                index = VectorStoreIndex.from_documents(
                    batch,
                    storage_context=storage_context,
                    show_progress=True,
                )
            else:
                # Insert subsequent batches
                for doc in batch:
                    index.insert(doc)

            total_processed += len(batch)
            print(f"Processed {total_processed} documents")

            # Persist periodically to avoid data loss
            if total_processed % 1000 == 0:
                storage_context.persist(persist_dir="./storage")

            batch = []

    # Process remaining documents
    if batch:
        if index is None:
            index = VectorStoreIndex.from_documents(batch, storage_context=storage_context)
        else:
            for doc in batch:
                index.insert(doc)
        total_processed += len(batch)

    # Final persist
    storage_context.persist(persist_dir="./storage")
    print(f"Indexing complete. Total documents: {total_processed}")

    return index
```

---

## 8. Best Practices

### Document Preparation

| Practice | Description |
|----------|-------------|
| Clean your data | Remove irrelevant content, fix encoding issues, normalize formatting |
| Add rich metadata | Include source, date, author, category for better filtering |
| Use consistent IDs | Assign meaningful document IDs for easy updates and tracking |
| Validate before indexing | Check document quality and completeness before processing |

### Chunking Strategy

| Practice | Description |
|----------|-------------|
| Match chunk size to use case | Smaller chunks (256-512) for precise retrieval, larger (1024-2048) for context |
| Use overlap | 10-20% overlap prevents losing context at boundaries |
| Consider document structure | Use semantic or hierarchical parsing for structured documents |
| Test different strategies | Experiment with chunk sizes and parsers for your specific data |

### Index Selection

| Use Case | Recommended Index |
|----------|-------------------|
| Semantic search | VectorStoreIndex |
| Summarization | ListIndex or TreeIndex |
| Technical documentation | KeywordTableIndex + VectorStoreIndex |
| Hierarchical documents | TreeIndex |
| Multi-modal queries | RouterQueryEngine with multiple indexes |

### Performance Optimization

| Practice | Description |
|----------|-------------|
| Use batch operations | Process multiple documents together when possible |
| Choose appropriate embedding models | Balance quality vs. cost and latency |
| Implement caching | Cache embeddings and query results for repeated operations |
| Use vector databases | ChromaDB, Pinecone, or Weaviate for production workloads |
| Monitor and profile | Track indexing time, query latency, and resource usage |

### Production Considerations

```python
# Production-ready index configuration
from llama_index.core import Settings

# Configure global settings for production
Settings.llm = OpenAI(
    model="gpt-4",
    temperature=0,           # Deterministic responses
    max_tokens=1024,
)

Settings.embed_model = OpenAIEmbedding(
    model="text-embedding-3-small",  # Cost-effective embedding model
    embed_batch_size=100,            # Batch embeddings for efficiency
)

Settings.chunk_size = 512
Settings.chunk_overlap = 50

# Add error handling and retries
from tenacity import retry, stop_after_attempt, wait_exponential

@retry(
    stop=stop_after_attempt(3),
    wait=wait_exponential(multiplier=1, min=4, max=10),
)
def safe_query(query_engine, question):
    """Query with automatic retry on failure."""
    return query_engine.query(question)
```

### Monitoring and Logging

```python
# Add observability to your LlamaIndex application
import logging
from llama_index.core.callbacks import CallbackManager, LlamaDebugHandler

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("llama_index")

# Add debug handler for detailed tracing
llama_debug = LlamaDebugHandler(print_trace_on_end=True)
callback_manager = CallbackManager([llama_debug])

# Configure settings with callback manager
Settings.callback_manager = callback_manager

# Now all operations will be logged with timing information
```

---

## Summary

LlamaIndex provides a comprehensive toolkit for connecting LLMs with your data:

| Component | Purpose |
|-----------|---------|
| Document Loaders | Ingest data from files, databases, and APIs |
| Node Parsers | Split documents into optimal chunks for retrieval |
| Index Types | Choose the right structure for your query patterns |
| Storage Contexts | Manage persistence across different backends |
| Update Operations | Keep indexes synchronized with source data |

Key takeaways:

1. Start with VectorStoreIndex for most use cases
2. Choose chunk sizes based on your retrieval needs
3. Use semantic parsing for better chunk boundaries
4. Persist indexes to avoid re-processing
5. Implement proper update workflows for dynamic data
6. Monitor performance and iterate on your configuration

---

*Building a production RAG application? Combine LlamaIndex with [OneUptime](https://oneuptime.com) monitoring to track query latency, error rates, and system health for reliable AI-powered applications.*
