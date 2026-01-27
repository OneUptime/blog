# How to Use LangChain with Vector Databases

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: LangChain, Vector Databases, Pinecone, Weaviate, Chroma, FAISS, Embeddings, RAG, AI, Python

Description: Learn how to integrate LangChain with popular vector databases like Pinecone, Weaviate, Chroma, and FAISS for building powerful retrieval-augmented generation (RAG) applications.

---

> Vector databases are the backbone of modern AI applications. When combined with LangChain, they enable semantic search, retrieval-augmented generation, and intelligent document retrieval that transforms how users interact with your data.

The rise of large language models has made vector databases essential infrastructure for AI applications. LangChain provides a unified interface to work with multiple vector stores, making it easy to build, test, and scale your RAG pipelines. This guide covers everything from basic setup to advanced patterns like hybrid search and filtering.

---

## Understanding Vector Databases and Embeddings

Before diving into implementations, it helps to understand how vector databases work with LangChain. Text is converted into numerical vectors (embeddings) that capture semantic meaning. Similar texts produce similar vectors, enabling semantic search rather than keyword matching.

```python
# embeddings_intro.py
# Demonstrates how text becomes vectors for semantic search

from langchain_openai import OpenAIEmbeddings
import numpy as np

# Initialize the embedding model - this converts text to vectors
embeddings = OpenAIEmbeddings(
    model="text-embedding-3-small",  # OpenAI's latest embedding model
    openai_api_key="your-api-key"    # Replace with your actual key
)

# Example texts to embed
texts = [
    "The cat sat on the mat",
    "A feline rested on the rug",
    "Python is a programming language"
]

# Generate embeddings - each text becomes a 1536-dimensional vector
vectors = embeddings.embed_documents(texts)

# Calculate cosine similarity between vectors
def cosine_similarity(v1, v2):
    """Compute cosine similarity between two vectors"""
    return np.dot(v1, v2) / (np.linalg.norm(v1) * np.linalg.norm(v2))

# Similar meanings produce similar vectors
print(f"Cat/Feline similarity: {cosine_similarity(vectors[0], vectors[1]):.3f}")  # ~0.85
print(f"Cat/Python similarity: {cosine_similarity(vectors[0], vectors[2]):.3f}")  # ~0.65
```

---

## Setting Up Embeddings

LangChain supports multiple embedding providers. Choose based on your requirements for cost, quality, and privacy.

```python
# embeddings_setup.py
# Configure different embedding providers based on your needs

# OpenAI Embeddings - Best quality, requires API key
from langchain_openai import OpenAIEmbeddings

openai_embeddings = OpenAIEmbeddings(
    model="text-embedding-3-small",  # Cost-effective, 1536 dimensions
    # model="text-embedding-3-large",  # Higher quality, 3072 dimensions
    openai_api_key="your-api-key"
)

# Hugging Face Embeddings - Free, runs locally
from langchain_huggingface import HuggingFaceEmbeddings

hf_embeddings = HuggingFaceEmbeddings(
    model_name="sentence-transformers/all-MiniLM-L6-v2",  # Fast, 384 dimensions
    model_kwargs={"device": "cpu"},  # Use "cuda" for GPU acceleration
    encode_kwargs={"normalize_embeddings": True}  # Normalize for cosine similarity
)

# Cohere Embeddings - Good alternative to OpenAI
from langchain_cohere import CohereEmbeddings

cohere_embeddings = CohereEmbeddings(
    model="embed-english-v3.0",  # Latest Cohere model
    cohere_api_key="your-cohere-key"
)

# Azure OpenAI Embeddings - Enterprise option
from langchain_openai import AzureOpenAIEmbeddings

azure_embeddings = AzureOpenAIEmbeddings(
    azure_deployment="your-deployment-name",
    azure_endpoint="https://your-resource.openai.azure.com",
    api_key="your-azure-key",
    api_version="2024-02-01"
)
```

---

## Vector Store Integration: Pinecone

Pinecone is a fully managed vector database optimized for production workloads. It handles scaling, replication, and infrastructure management automatically.

```python
# pinecone_integration.py
# Complete Pinecone setup with LangChain

from langchain_pinecone import PineconeVectorStore
from langchain_openai import OpenAIEmbeddings
from langchain.schema import Document
from pinecone import Pinecone, ServerlessSpec
import os

# Initialize Pinecone client
pc = Pinecone(api_key=os.getenv("PINECONE_API_KEY"))

# Create index if it does not exist
index_name = "langchain-docs"
if index_name not in pc.list_indexes().names():
    pc.create_index(
        name=index_name,
        dimension=1536,  # Must match embedding model dimensions
        metric="cosine",  # Options: cosine, euclidean, dotproduct
        spec=ServerlessSpec(
            cloud="aws",
            region="us-east-1"
        )
    )

# Initialize embeddings
embeddings = OpenAIEmbeddings(model="text-embedding-3-small")

# Create vector store instance
vector_store = PineconeVectorStore(
    index=pc.Index(index_name),
    embedding=embeddings,
    text_key="text",  # Field name for document text
    namespace="production"  # Optional: isolate data by namespace
)

# Prepare documents with metadata for filtering
documents = [
    Document(
        page_content="LangChain is a framework for building LLM applications",
        metadata={"source": "docs", "category": "framework", "version": "0.1"}
    ),
    Document(
        page_content="Vector databases store embeddings for semantic search",
        metadata={"source": "blog", "category": "database", "version": "0.1"}
    ),
    Document(
        page_content="RAG combines retrieval with generation for accurate responses",
        metadata={"source": "tutorial", "category": "pattern", "version": "0.2"}
    )
]

# Add documents to the vector store
ids = vector_store.add_documents(documents)
print(f"Added {len(ids)} documents: {ids}")

# Perform similarity search
results = vector_store.similarity_search(
    query="How do I build AI applications?",
    k=2  # Return top 2 most similar documents
)

for doc in results:
    print(f"Content: {doc.page_content}")
    print(f"Metadata: {doc.metadata}")
    print("---")
```

---

## Vector Store Integration: Weaviate

Weaviate is an open-source vector database with built-in machine learning capabilities and GraphQL support.

```python
# weaviate_integration.py
# Complete Weaviate setup with LangChain

from langchain_weaviate import WeaviateVectorStore
from langchain_openai import OpenAIEmbeddings
from langchain.schema import Document
import weaviate
from weaviate.classes.init import Auth
import os

# Connect to Weaviate Cloud
client = weaviate.connect_to_weaviate_cloud(
    cluster_url=os.getenv("WEAVIATE_URL"),
    auth_credentials=Auth.api_key(os.getenv("WEAVIATE_API_KEY")),
    headers={
        "X-OpenAI-Api-Key": os.getenv("OPENAI_API_KEY")  # For vectorization
    }
)

# Alternative: Connect to local Weaviate instance
# client = weaviate.connect_to_local(
#     host="localhost",
#     port=8080
# )

# Initialize embeddings
embeddings = OpenAIEmbeddings(model="text-embedding-3-small")

# Create vector store with specific collection
vector_store = WeaviateVectorStore(
    client=client,
    embedding=embeddings,
    index_name="LangChainDocs",  # Collection name in Weaviate
    text_key="content"  # Property name for document text
)

# Add documents
documents = [
    Document(
        page_content="Weaviate supports hybrid search combining BM25 and vector search",
        metadata={"topic": "search", "difficulty": "intermediate"}
    ),
    Document(
        page_content="Multi-tenancy in Weaviate isolates data between customers",
        metadata={"topic": "architecture", "difficulty": "advanced"}
    )
]

vector_store.add_documents(documents)

# Similarity search with score
results_with_scores = vector_store.similarity_search_with_score(
    query="How does hybrid search work?",
    k=3
)

for doc, score in results_with_scores:
    print(f"Score: {score:.4f}")
    print(f"Content: {doc.page_content}")
    print(f"Metadata: {doc.metadata}")
    print("---")

# Clean up connection
client.close()
```

---

## Vector Store Integration: Chroma

Chroma is a lightweight, open-source vector database that runs embedded or as a server. It is excellent for development and smaller production workloads.

```python
# chroma_integration.py
# Complete Chroma setup with LangChain

from langchain_chroma import Chroma
from langchain_openai import OpenAIEmbeddings
from langchain.schema import Document
import chromadb
from chromadb.config import Settings

# Initialize embeddings
embeddings = OpenAIEmbeddings(model="text-embedding-3-small")

# Option 1: In-memory Chroma (for development/testing)
vector_store_memory = Chroma(
    collection_name="test_collection",
    embedding_function=embeddings
)

# Option 2: Persistent Chroma (data survives restarts)
vector_store_persistent = Chroma(
    collection_name="persistent_docs",
    embedding_function=embeddings,
    persist_directory="./chroma_db"  # Directory to store data
)

# Option 3: Chroma server (for production)
chroma_client = chromadb.HttpClient(
    host="localhost",
    port=8000,
    settings=Settings(
        chroma_client_auth_provider="chromadb.auth.token_authn.TokenAuthClientProvider",
        chroma_client_auth_credentials="your-auth-token"
    )
)

vector_store_server = Chroma(
    client=chroma_client,
    collection_name="production_docs",
    embedding_function=embeddings
)

# Use the persistent store for this example
vector_store = vector_store_persistent

# Add documents with rich metadata
documents = [
    Document(
        page_content="Chroma is designed for developer productivity and ease of use",
        metadata={"author": "chroma-team", "year": 2023, "tags": ["database", "ai"]}
    ),
    Document(
        page_content="Collections in Chroma are like tables in traditional databases",
        metadata={"author": "docs", "year": 2024, "tags": ["concepts"]}
    ),
    Document(
        page_content="Chroma supports filtering by metadata during search",
        metadata={"author": "tutorial", "year": 2024, "tags": ["search", "filter"]}
    )
]

# Add documents and get their IDs
ids = vector_store.add_documents(documents, ids=["doc1", "doc2", "doc3"])
print(f"Added documents with IDs: {ids}")

# Basic similarity search
results = vector_store.similarity_search(
    query="How do I organize data in Chroma?",
    k=2
)

print("Basic search results:")
for doc in results:
    print(f"  - {doc.page_content[:60]}...")

# Search with relevance scores (normalized 0-1)
results_with_relevance = vector_store.similarity_search_with_relevance_scores(
    query="What is Chroma good for?",
    k=2
)

print("\nSearch with relevance scores:")
for doc, relevance in results_with_relevance:
    print(f"  Relevance: {relevance:.3f} - {doc.page_content[:50]}...")
```

---

## Vector Store Integration: FAISS

FAISS (Facebook AI Similarity Search) is a library for efficient similarity search. It runs entirely in-memory and is excellent for applications requiring low latency.

```python
# faiss_integration.py
# Complete FAISS setup with LangChain

from langchain_community.vectorstores import FAISS
from langchain_openai import OpenAIEmbeddings
from langchain.schema import Document
import pickle
import os

# Initialize embeddings
embeddings = OpenAIEmbeddings(model="text-embedding-3-small")

# Prepare sample documents
documents = [
    Document(
        page_content="FAISS provides efficient similarity search with billion-scale support",
        metadata={"topic": "performance", "library": "faiss"}
    ),
    Document(
        page_content="FAISS indexes can be saved to disk and loaded for fast startup",
        metadata={"topic": "persistence", "library": "faiss"}
    ),
    Document(
        page_content="GPU acceleration in FAISS dramatically improves search speed",
        metadata={"topic": "gpu", "library": "faiss"}
    ),
    Document(
        page_content="FAISS supports multiple index types optimized for different use cases",
        metadata={"topic": "indexes", "library": "faiss"}
    )
]

# Create FAISS index from documents
vector_store = FAISS.from_documents(
    documents=documents,
    embedding=embeddings
)

# Perform similarity search
results = vector_store.similarity_search(
    query="How can I make search faster?",
    k=2
)

print("Search results:")
for doc in results:
    print(f"  - {doc.page_content}")
    print(f"    Metadata: {doc.metadata}")

# Search with scores (lower is more similar for L2 distance)
results_with_scores = vector_store.similarity_search_with_score(
    query="How do I save the index?",
    k=2
)

print("\nResults with distance scores:")
for doc, score in results_with_scores:
    print(f"  Distance: {score:.4f} - {doc.page_content[:50]}...")

# Save index to disk for persistence
save_path = "./faiss_index"
vector_store.save_local(save_path)
print(f"\nIndex saved to {save_path}")

# Load index from disk
loaded_vector_store = FAISS.load_local(
    save_path,
    embeddings,
    allow_dangerous_deserialization=True  # Required for loading pickled data
)
print("Index loaded successfully")

# Merge multiple FAISS indexes
additional_docs = [
    Document(
        page_content="FAISS quantization reduces memory usage with minimal accuracy loss",
        metadata={"topic": "optimization", "library": "faiss"}
    )
]

# Create another index
additional_index = FAISS.from_documents(additional_docs, embeddings)

# Merge into main index
vector_store.merge_from(additional_index)
print(f"Merged indexes - total documents: {vector_store.index.ntotal}")
```

---

## Metadata Filtering

Filtering allows you to narrow search results based on document metadata. This is essential for building multi-tenant applications or scoped searches.

```python
# metadata_filtering.py
# Advanced filtering techniques across different vector stores

from langchain_pinecone import PineconeVectorStore
from langchain_chroma import Chroma
from langchain_openai import OpenAIEmbeddings
from langchain.schema import Document

embeddings = OpenAIEmbeddings(model="text-embedding-3-small")

# Sample documents with rich metadata
documents = [
    Document(
        page_content="Introduction to Python programming",
        metadata={"language": "python", "level": "beginner", "year": 2024}
    ),
    Document(
        page_content="Advanced Python decorators and metaclasses",
        metadata={"language": "python", "level": "advanced", "year": 2024}
    ),
    Document(
        page_content="Getting started with JavaScript",
        metadata={"language": "javascript", "level": "beginner", "year": 2023}
    ),
    Document(
        page_content="TypeScript for Python developers",
        metadata={"language": "typescript", "level": "intermediate", "year": 2024}
    )
]

# Chroma filtering examples
chroma_store = Chroma.from_documents(documents, embeddings)

# Filter by exact match
python_docs = chroma_store.similarity_search(
    query="programming tutorials",
    k=10,
    filter={"language": "python"}  # Only Python documents
)
print(f"Python docs found: {len(python_docs)}")

# Filter with multiple conditions (AND)
advanced_2024 = chroma_store.similarity_search(
    query="programming tutorials",
    k=10,
    filter={
        "$and": [
            {"level": "advanced"},
            {"year": 2024}
        ]
    }
)
print(f"Advanced 2024 docs: {len(advanced_2024)}")

# Filter with OR condition
beginner_or_intermediate = chroma_store.similarity_search(
    query="tutorials",
    k=10,
    filter={
        "$or": [
            {"level": "beginner"},
            {"level": "intermediate"}
        ]
    }
)
print(f"Beginner or intermediate: {len(beginner_or_intermediate)}")

# Pinecone filtering (different syntax)
# Assuming pinecone_store is already configured
"""
# Pinecone uses a different filter syntax
results = pinecone_store.similarity_search(
    query="programming",
    k=5,
    filter={
        "language": {"$eq": "python"},
        "year": {"$gte": 2024}
    }
)

# Pinecone filter operators:
# $eq - equal
# $ne - not equal
# $gt, $gte - greater than (or equal)
# $lt, $lte - less than (or equal)
# $in - in array
# $nin - not in array
"""

# Weaviate filtering example
"""
from langchain_weaviate import WeaviateVectorStore

# Weaviate uses GraphQL-style filters
results = weaviate_store.similarity_search(
    query="tutorials",
    k=5,
    filters={
        "path": ["language"],
        "operator": "Equal",
        "valueText": "python"
    }
)
"""
```

---

## Hybrid Search

Hybrid search combines semantic vector search with keyword-based search (BM25) for better recall. This approach catches both semantically similar and keyword-matching documents.

```python
# hybrid_search.py
# Combine vector search with keyword search for better results

from langchain_weaviate import WeaviateVectorStore
from langchain_openai import OpenAIEmbeddings
from langchain.schema import Document
from langchain.retrievers import BM25Retriever, EnsembleRetriever
import weaviate

# Method 1: Native hybrid search in Weaviate
client = weaviate.connect_to_local()
embeddings = OpenAIEmbeddings(model="text-embedding-3-small")

weaviate_store = WeaviateVectorStore(
    client=client,
    embedding=embeddings,
    index_name="HybridDocs",
    text_key="content"
)

# Weaviate's built-in hybrid search
# Alpha controls the balance: 0 = pure BM25, 1 = pure vector search
results = weaviate_store.similarity_search(
    query="machine learning frameworks",
    k=5,
    alpha=0.5  # Equal weight to BM25 and vector search
)

# Method 2: Ensemble retriever combining multiple retrievers
documents = [
    Document(page_content="TensorFlow is an open-source machine learning framework by Google"),
    Document(page_content="PyTorch provides dynamic computational graphs for deep learning"),
    Document(page_content="Scikit-learn offers simple ML algorithms for Python"),
    Document(page_content="Keras is a high-level neural networks API"),
    Document(page_content="XGBoost excels at gradient boosting for tabular data")
]

# Create BM25 retriever for keyword search
bm25_retriever = BM25Retriever.from_documents(documents)
bm25_retriever.k = 3  # Return top 3 from BM25

# Create vector retriever for semantic search
from langchain_community.vectorstores import FAISS
vector_store = FAISS.from_documents(documents, embeddings)
vector_retriever = vector_store.as_retriever(search_kwargs={"k": 3})

# Combine retrievers with weights
ensemble_retriever = EnsembleRetriever(
    retrievers=[bm25_retriever, vector_retriever],
    weights=[0.4, 0.6]  # 40% BM25, 60% vector search
)

# Retrieve using ensemble
results = ensemble_retriever.invoke("deep learning neural networks")

print("Hybrid search results:")
for doc in results:
    print(f"  - {doc.page_content}")

# Method 3: Manual hybrid search with score fusion
def hybrid_search_manual(query: str, documents: list, embeddings, k: int = 5):
    """
    Custom hybrid search implementation with reciprocal rank fusion
    """
    from rank_bm25 import BM25Okapi
    import numpy as np

    # Tokenize documents for BM25
    tokenized_docs = [doc.page_content.lower().split() for doc in documents]
    bm25 = BM25Okapi(tokenized_docs)

    # Get BM25 scores
    tokenized_query = query.lower().split()
    bm25_scores = bm25.get_scores(tokenized_query)

    # Get vector similarity scores
    query_embedding = embeddings.embed_query(query)
    doc_embeddings = embeddings.embed_documents([d.page_content for d in documents])

    vector_scores = [
        np.dot(query_embedding, doc_emb) /
        (np.linalg.norm(query_embedding) * np.linalg.norm(doc_emb))
        for doc_emb in doc_embeddings
    ]

    # Reciprocal Rank Fusion
    k_rrf = 60  # RRF constant

    # Get rankings
    bm25_ranks = np.argsort(bm25_scores)[::-1]
    vector_ranks = np.argsort(vector_scores)[::-1]

    # Calculate RRF scores
    rrf_scores = {}
    for rank, idx in enumerate(bm25_ranks):
        rrf_scores[idx] = rrf_scores.get(idx, 0) + 1 / (k_rrf + rank + 1)
    for rank, idx in enumerate(vector_ranks):
        rrf_scores[idx] = rrf_scores.get(idx, 0) + 1 / (k_rrf + rank + 1)

    # Sort by RRF score and return top k
    sorted_indices = sorted(rrf_scores.keys(), key=lambda x: rrf_scores[x], reverse=True)
    return [documents[i] for i in sorted_indices[:k]]

# Use manual hybrid search
results = hybrid_search_manual("neural network frameworks", documents, embeddings, k=3)
print("\nManual hybrid search results:")
for doc in results:
    print(f"  - {doc.page_content}")
```

---

## Building Retriever Chains

Retriever chains connect vector stores to LLMs for question-answering and conversational AI applications.

```python
# retriever_chains.py
# Build RAG pipelines with LangChain retrievers

from langchain_openai import ChatOpenAI, OpenAIEmbeddings
from langchain_chroma import Chroma
from langchain.schema import Document
from langchain.chains import RetrievalQA
from langchain.chains.combine_documents import create_stuff_documents_chain
from langchain.chains.retrieval import create_retrieval_chain
from langchain_core.prompts import ChatPromptTemplate

# Initialize components
embeddings = OpenAIEmbeddings(model="text-embedding-3-small")
llm = ChatOpenAI(model="gpt-4o-mini", temperature=0)

# Create vector store with sample documents
documents = [
    Document(
        page_content="OneUptime is an open-source observability platform that provides monitoring, incident management, and status pages.",
        metadata={"source": "docs", "topic": "overview"}
    ),
    Document(
        page_content="OneUptime supports OpenTelemetry for collecting traces, metrics, and logs from your applications.",
        metadata={"source": "docs", "topic": "telemetry"}
    ),
    Document(
        page_content="Status pages in OneUptime can be customized with your branding and show real-time service health.",
        metadata={"source": "docs", "topic": "status-pages"}
    ),
    Document(
        page_content="Incident management in OneUptime includes on-call scheduling, escalation policies, and post-mortems.",
        metadata={"source": "docs", "topic": "incidents"}
    )
]

vector_store = Chroma.from_documents(documents, embeddings)

# Method 1: Simple RetrievalQA chain
retriever = vector_store.as_retriever(
    search_type="similarity",
    search_kwargs={"k": 3}
)

qa_chain = RetrievalQA.from_chain_type(
    llm=llm,
    chain_type="stuff",  # Combines all docs into one prompt
    retriever=retriever,
    return_source_documents=True
)

# Ask a question
result = qa_chain.invoke({"query": "What monitoring features does OneUptime provide?"})
print("Answer:", result["result"])
print("Sources:", [doc.metadata for doc in result["source_documents"]])

# Method 2: Custom retrieval chain with prompt template
system_prompt = """You are a helpful assistant for OneUptime documentation.
Use the following context to answer the question. If you don't know the answer,
say that you don't know. Keep answers concise and technical.

Context: {context}
"""

prompt = ChatPromptTemplate.from_messages([
    ("system", system_prompt),
    ("human", "{input}")
])

# Create the chain
question_answer_chain = create_stuff_documents_chain(llm, prompt)
rag_chain = create_retrieval_chain(retriever, question_answer_chain)

# Use the chain
response = rag_chain.invoke({"input": "How does OneUptime handle incidents?"})
print("\nRAG Response:", response["answer"])

# Method 3: Retriever with filtering
filtered_retriever = vector_store.as_retriever(
    search_type="similarity",
    search_kwargs={
        "k": 2,
        "filter": {"topic": "telemetry"}  # Only search telemetry docs
    }
)

# Method 4: Maximum Marginal Relevance (MMR) for diverse results
mmr_retriever = vector_store.as_retriever(
    search_type="mmr",  # Maximum Marginal Relevance
    search_kwargs={
        "k": 3,
        "fetch_k": 10,  # Fetch more, then diversify
        "lambda_mult": 0.7  # 0 = max diversity, 1 = max relevance
    }
)

# Method 5: Retriever with score threshold
threshold_retriever = vector_store.as_retriever(
    search_type="similarity_score_threshold",
    search_kwargs={
        "score_threshold": 0.7,  # Only return docs with score > 0.7
        "k": 5
    }
)
```

---

## Conversational Retrieval

Build chatbots that maintain context across multiple turns while retrieving relevant information.

```python
# conversational_retrieval.py
# Build a chatbot with memory and retrieval

from langchain_openai import ChatOpenAI, OpenAIEmbeddings
from langchain_chroma import Chroma
from langchain.schema import Document
from langchain.chains import create_history_aware_retriever
from langchain.chains.combine_documents import create_stuff_documents_chain
from langchain.chains.retrieval import create_retrieval_chain
from langchain_core.prompts import ChatPromptTemplate, MessagesPlaceholder
from langchain_core.messages import HumanMessage, AIMessage

# Initialize components
embeddings = OpenAIEmbeddings(model="text-embedding-3-small")
llm = ChatOpenAI(model="gpt-4o-mini", temperature=0)

# Create vector store
documents = [
    Document(page_content="LangChain supports Python and JavaScript implementations."),
    Document(page_content="LangChain Expression Language (LCEL) is the recommended way to build chains."),
    Document(page_content="LangSmith provides tracing and debugging for LangChain applications."),
    Document(page_content="LangServe deploys LangChain chains as REST APIs.")
]

vector_store = Chroma.from_documents(documents, embeddings)
retriever = vector_store.as_retriever(search_kwargs={"k": 2})

# Create history-aware retriever
# This reformulates the question based on chat history
contextualize_prompt = ChatPromptTemplate.from_messages([
    MessagesPlaceholder("chat_history"),
    ("human", "{input}"),
    ("human", "Given the above conversation, generate a search query to look up relevant information.")
])

history_aware_retriever = create_history_aware_retriever(
    llm, retriever, contextualize_prompt
)

# Create the QA chain
qa_system_prompt = """You are a helpful assistant for LangChain documentation.
Answer questions based on the provided context. Be concise and accurate.

Context: {context}
"""

qa_prompt = ChatPromptTemplate.from_messages([
    ("system", qa_system_prompt),
    MessagesPlaceholder("chat_history"),
    ("human", "{input}")
])

question_answer_chain = create_stuff_documents_chain(llm, qa_prompt)
rag_chain = create_retrieval_chain(history_aware_retriever, question_answer_chain)

# Simulate a conversation
chat_history = []

# First question
response1 = rag_chain.invoke({
    "input": "What programming languages does LangChain support?",
    "chat_history": chat_history
})
print("Q1: What programming languages does LangChain support?")
print(f"A1: {response1['answer']}\n")

# Update history
chat_history.extend([
    HumanMessage(content="What programming languages does LangChain support?"),
    AIMessage(content=response1["answer"])
])

# Follow-up question (requires context from previous exchange)
response2 = rag_chain.invoke({
    "input": "What tools help debug it?",  # "it" refers to LangChain
    "chat_history": chat_history
})
print("Q2: What tools help debug it?")
print(f"A2: {response2['answer']}\n")

# Update history
chat_history.extend([
    HumanMessage(content="What tools help debug it?"),
    AIMessage(content=response2["answer"])
])

# Another follow-up
response3 = rag_chain.invoke({
    "input": "How do I deploy my chains?",
    "chat_history": chat_history
})
print("Q3: How do I deploy my chains?")
print(f"A3: {response3['answer']}")
```

---

## Document Loading and Chunking

Properly loading and chunking documents is critical for effective retrieval. Poor chunking leads to poor search results.

```python
# document_processing.py
# Load and chunk documents for optimal retrieval

from langchain_community.document_loaders import (
    TextLoader,
    PyPDFLoader,
    WebBaseLoader,
    DirectoryLoader
)
from langchain.text_splitter import (
    RecursiveCharacterTextSplitter,
    CharacterTextSplitter,
    TokenTextSplitter
)
from langchain_openai import OpenAIEmbeddings
from langchain_chroma import Chroma

# Load documents from various sources
# Text files
text_loader = TextLoader("./data/document.txt")
text_docs = text_loader.load()

# PDF files
pdf_loader = PyPDFLoader("./data/manual.pdf")
pdf_docs = pdf_loader.load()  # Returns one document per page

# Web pages
web_loader = WebBaseLoader("https://docs.oneuptime.com")
web_docs = web_loader.load()

# Directory of files
dir_loader = DirectoryLoader(
    "./data/",
    glob="**/*.md",  # Load all markdown files
    show_progress=True
)
dir_docs = dir_loader.load()

# Text splitting strategies
# RecursiveCharacterTextSplitter - Best for most use cases
recursive_splitter = RecursiveCharacterTextSplitter(
    chunk_size=1000,  # Target chunk size in characters
    chunk_overlap=200,  # Overlap to maintain context
    length_function=len,
    separators=["\n\n", "\n", " ", ""]  # Try these in order
)

chunks = recursive_splitter.split_documents(pdf_docs)
print(f"Split into {len(chunks)} chunks")

# Token-based splitting - Better for LLM context windows
token_splitter = TokenTextSplitter(
    chunk_size=500,  # Target chunk size in tokens
    chunk_overlap=50,  # Overlap in tokens
    encoding_name="cl100k_base"  # OpenAI's tokenizer
)

token_chunks = token_splitter.split_documents(text_docs)

# Semantic chunking - Split at natural boundaries
from langchain_experimental.text_splitter import SemanticChunker

semantic_splitter = SemanticChunker(
    OpenAIEmbeddings(model="text-embedding-3-small"),
    breakpoint_threshold_type="percentile",
    breakpoint_threshold_amount=95
)

semantic_chunks = semantic_splitter.split_documents(text_docs)

# Add metadata during chunking
for i, chunk in enumerate(chunks):
    chunk.metadata["chunk_index"] = i
    chunk.metadata["total_chunks"] = len(chunks)

# Create vector store from processed documents
embeddings = OpenAIEmbeddings(model="text-embedding-3-small")
vector_store = Chroma.from_documents(
    documents=chunks,
    embedding=embeddings,
    collection_name="processed_docs"
)

print(f"Created vector store with {len(chunks)} documents")
```

---

## Performance Optimization

Optimize your vector database setup for production workloads.

```python
# performance_optimization.py
# Techniques for improving vector search performance

from langchain_openai import OpenAIEmbeddings
from langchain_community.vectorstores import FAISS
from langchain.schema import Document
import asyncio
import time

# Batch embedding for efficiency
embeddings = OpenAIEmbeddings(
    model="text-embedding-3-small",
    chunk_size=1000  # Batch size for API calls
)

# Generate many documents
documents = [
    Document(
        page_content=f"Document number {i} with some content about topic {i % 10}",
        metadata={"doc_id": i, "topic": i % 10}
    )
    for i in range(1000)
]

# Measure indexing time
start = time.time()
vector_store = FAISS.from_documents(documents, embeddings)
print(f"Indexed {len(documents)} documents in {time.time() - start:.2f}s")

# Async embedding for better throughput
async def embed_documents_async(texts: list, batch_size: int = 100):
    """Embed documents in parallel batches"""
    all_embeddings = []

    for i in range(0, len(texts), batch_size):
        batch = texts[i:i + batch_size]
        # Use asyncio.gather for parallel API calls
        batch_embeddings = await asyncio.gather(
            *[asyncio.to_thread(embeddings.embed_query, text) for text in batch]
        )
        all_embeddings.extend(batch_embeddings)

    return all_embeddings

# Caching embeddings to reduce API calls
from langchain.embeddings import CacheBackedEmbeddings
from langchain.storage import LocalFileStore

# Create a cache store
store = LocalFileStore("./embedding_cache")

# Wrap embeddings with cache
cached_embeddings = CacheBackedEmbeddings.from_bytes_store(
    embeddings,
    store,
    namespace="openai-embeddings"  # Namespace for cache keys
)

# First call computes embeddings, subsequent calls use cache
start = time.time()
_ = cached_embeddings.embed_documents(["Test document"] * 10)
print(f"First call (compute): {time.time() - start:.4f}s")

start = time.time()
_ = cached_embeddings.embed_documents(["Test document"] * 10)
print(f"Second call (cached): {time.time() - start:.4f}s")

# Index optimization for FAISS
# Use IVF index for faster search on large datasets
import faiss
import numpy as np

# Get existing vectors
vectors = np.array(vector_store.index.reconstruct_n(0, vector_store.index.ntotal))
dimension = vectors.shape[1]

# Create IVF index (faster for large datasets)
nlist = 100  # Number of clusters
quantizer = faiss.IndexFlatL2(dimension)
ivf_index = faiss.IndexIVFFlat(quantizer, dimension, nlist)

# Train and add vectors
ivf_index.train(vectors)
ivf_index.add(vectors)

# Set search parameters
ivf_index.nprobe = 10  # Number of clusters to search (trade-off: speed vs recall)

print(f"IVF index created with {nlist} clusters")

# Connection pooling for managed vector databases
"""
# Pinecone with connection pooling
from pinecone import Pinecone

pc = Pinecone(
    api_key="your-key",
    pool_threads=30  # Number of threads in connection pool
)

# Weaviate with connection pooling
import weaviate

client = weaviate.connect_to_weaviate_cloud(
    cluster_url="your-url",
    auth_credentials=Auth.api_key("your-key"),
    additional_config=AdditionalConfig(
        connection_config=ConnectionConfig(
            session_pool_connections=10,
            session_pool_maxsize=20
        )
    )
)
"""
```

---

## Best Practices Summary

1. **Choose the right vector database** - Use FAISS or Chroma for development, Pinecone or Weaviate for production
2. **Match embedding dimensions** - Ensure your index dimension matches your embedding model output
3. **Use appropriate chunking** - 500-1000 tokens per chunk works well for most use cases
4. **Include overlap** - 10-20% overlap preserves context between chunks
5. **Add rich metadata** - Enable filtering and improve retrieval relevance
6. **Use hybrid search** - Combine vector and keyword search for better recall
7. **Implement caching** - Cache embeddings to reduce costs and latency
8. **Monitor performance** - Track query latency, recall, and relevance scores
9. **Use MMR for diversity** - Avoid redundant results with Maximum Marginal Relevance
10. **Batch operations** - Batch embedding and indexing operations for efficiency

---

*Ready to add observability to your AI applications? [OneUptime](https://oneuptime.com) provides comprehensive monitoring for LLM-powered systems, including latency tracking, error rates, and cost analysis across your RAG pipelines.*
