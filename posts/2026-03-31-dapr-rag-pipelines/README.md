# How to Use Dapr for RAG (Retrieval-Augmented Generation) Pipelines

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, RAG, Retrieval-Augmented Generation, Vector Database, LLM

Description: Learn how to build Retrieval-Augmented Generation pipelines with Dapr Agents, connecting vector databases, embeddings, and LLMs for knowledge-grounded AI responses.

---

## What Is RAG and Why Use Dapr?

Retrieval-Augmented Generation (RAG) combines LLM generation with document retrieval to ground responses in factual, up-to-date information. A RAG pipeline typically:

1. Embeds documents into vectors and stores them in a vector database
2. On each query, embeds the question and retrieves similar documents
3. Passes retrieved documents as context to the LLM
4. Returns a grounded response

Dapr provides the operational backbone: durable pipelines, state management for caching, and pub/sub for async document indexing.

## Architecture

```text
Documents (S3, DB, SharePoint)
         |
   Indexing Pipeline (async)
    - Text extraction
    - Chunking
    - Embedding generation
    - Vector store upsert
         |
   Vector Database (Pinecone, Weaviate, pgvector)
         |
   Query Pipeline (sync)
    - Query embedding
    - Similarity search
    - Context assembly
    - LLM completion
         |
   Grounded Response
```

## Building the Document Indexing Agent

```python
from dapr_agents import DurableAgent, tool, OpenAIChatClient
import json

@tool
def chunk_document(text: str, chunk_size: int = 500) -> str:
    """Splits a document into overlapping chunks for indexing.

    Args:
        text: The document text to chunk.
        chunk_size: Target size for each chunk in characters.
    """
    overlap = 50
    chunks = []
    start = 0
    while start < len(text):
        end = min(start + chunk_size, len(text))
        chunks.append({"text": text[start:end], "start": start, "end": end})
        start += chunk_size - overlap
    return json.dumps({"chunk_count": len(chunks), "chunks": chunks[:3], "total": len(chunks)})

@tool
def generate_embeddings(texts: str) -> str:
    """Generates vector embeddings for a list of text chunks.

    Args:
        texts: JSON array of text strings to embed.
    """
    from openai import OpenAI
    client = OpenAI()
    text_list = json.loads(texts)
    response = client.embeddings.create(
        model="text-embedding-3-small",
        input=text_list
    )
    embeddings = [item.embedding for item in response.data]
    return json.dumps({"count": len(embeddings), "dimensions": len(embeddings[0])})

@tool
def upsert_to_vector_store(document_id: str, chunks_with_embeddings: str) -> str:
    """Stores document chunks with their embeddings in the vector database.

    Args:
        document_id: The source document identifier.
        chunks_with_embeddings: JSON of chunks with their vector embeddings.
    """
    from pinecone import Pinecone
    pc = Pinecone()
    index = pc.Index("knowledge-base")
    data = json.loads(chunks_with_embeddings)
    vectors = [
        (f"{document_id}-{i}", chunk["embedding"], {"text": chunk["text"], "doc_id": document_id})
        for i, chunk in enumerate(data["chunks"])
    ]
    index.upsert(vectors=vectors)
    return f"Upserted {len(vectors)} vectors for document {document_id}"

indexing_agent = DurableAgent(
    name="indexing-agent",
    role="Document Indexer",
    instructions=["You manage document indexing for the RAG knowledge base."],
    tools=[chunk_document, generate_embeddings, upsert_to_vector_store],
    llm=OpenAIChatClient(model="gpt-4o-mini"),
)
```

## Building the RAG Query Agent

```python
from dapr_agents import DurableAgent, tool, OpenAIChatClient
import json

@tool
def retrieve_relevant_chunks(query: str, top_k: int = 5) -> str:
    """Retrieves the most relevant document chunks for a query.

    Args:
        query: The user's question to find relevant context for.
        top_k: Number of similar chunks to retrieve.
    """
    from openai import OpenAI
    from pinecone import Pinecone

    # Embed the query
    oai = OpenAI()
    embedding = oai.embeddings.create(
        model="text-embedding-3-small",
        input=query
    ).data[0].embedding

    # Search vector store
    pc = Pinecone()
    index = pc.Index("knowledge-base")
    results = index.query(vector=embedding, top_k=top_k, include_metadata=True)

    chunks = [
        {"text": m["metadata"]["text"], "score": m["score"], "doc_id": m["metadata"]["doc_id"]}
        for m in results["matches"]
    ]
    return json.dumps({"query": query, "chunks": chunks})

@tool
def format_context_for_llm(retrieved_chunks: str) -> str:
    """Formats retrieved chunks into a coherent context block for the LLM.

    Args:
        retrieved_chunks: JSON string of retrieved document chunks.
    """
    data = json.loads(retrieved_chunks)
    context_parts = []
    for i, chunk in enumerate(data["chunks"], 1):
        context_parts.append(f"[Source {i} - {chunk['doc_id']}]\n{chunk['text']}")
    return "\n\n---\n\n".join(context_parts)

rag_agent = DurableAgent(
    name="rag-query-agent",
    role="RAG Query Assistant",
    instructions=[
        "You answer questions using retrieved context from the knowledge base.",
        "Always cite which documents you used.",
        "If the context does not contain enough information, say so clearly.",
    ],
    tools=[retrieve_relevant_chunks, format_context_for_llm],
    llm=OpenAIChatClient(model="gpt-4o"),
)
```

## Wiring It Together

```python
from dapr_agents import AgentRunner
from fastapi import FastAPI

app = FastAPI()

@app.post("/query")
async def answer_question(request: dict):
    question = request["question"]
    runner = AgentRunner()
    response = await runner.run(
        rag_agent,
        payload={"task": f"Question: {question}\n\n"
            f"Please retrieve relevant context and answer the question. "
            f"Cite your sources."}
    )
    return {"question": question, "answer": response}
```

## Async Document Indexing via Pub/Sub

```python
from dapr.ext.fastapi import DaprApp
from dapr_agents import AgentRunner
from fastapi import Body

dapr_app = DaprApp(app)

@dapr_app.subscribe(pubsub="doc-pubsub", topic="new-documents")
async def index_new_document(event_data=Body()):
    data = event_data.get("data", {})
    runner = AgentRunner()
    await runner.run(
        indexing_agent,
        payload={"task": f"Index document from: {data['filepath']} with ID: {data['doc_id']}"}
    )
```

## Summary

Dapr RAG pipelines combine document indexing agents with query agents backed by vector databases. The indexing pipeline runs asynchronously via Dapr pub/sub, chunking documents, generating embeddings, and upserting to a vector store. The query pipeline retrieves similar chunks using cosine similarity and passes them as context to the LLM. Dapr's durable execution ensures indexing jobs survive process restarts.
