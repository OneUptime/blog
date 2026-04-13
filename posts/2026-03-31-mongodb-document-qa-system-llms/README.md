# How to Build a Document Q&A System with MongoDB and LLMs

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, LLM, RAG, Vector Search, Python

Description: Learn how to build a document question-and-answer system using MongoDB Atlas Vector Search for retrieval and an LLM for answer generation in a RAG pipeline.

---

## Overview

A document Q&A system lets users ask natural-language questions and get answers grounded in a specific set of documents - your knowledge base, product docs, or internal wikis. This guide builds a retrieval-augmented generation (RAG) system using MongoDB Atlas Vector Search for document retrieval and OpenAI for answer generation.

## Architecture

```text
[User Question]
      |
      v
[Embed question] -> [Atlas $vectorSearch] -> [Top-K relevant chunks]
      |
      v
[Combine chunks + question into prompt]
      |
      v
[LLM (GPT-4o)] -> [Grounded Answer with sources]
```

## Setup

```bash
pip install pymongo openai sentence-transformers
```

## Step 1 - Chunk and Embed Documents

```python
from sentence_transformers import SentenceTransformer
from pymongo import MongoClient

client = MongoClient(MONGODB_URI)
collection = client["qa_system"]["chunks"]

model = SentenceTransformer("all-MiniLM-L6-v2")

def chunk_text(text, chunk_size=300, overlap=50):
    words = text.split()
    chunks = []
    for i in range(0, len(words), chunk_size - overlap):
        chunk = " ".join(words[i:i + chunk_size])
        chunks.append(chunk)
    return chunks

def index_document(doc_id, title, text, source_url=""):
    chunks = chunk_text(text)
    docs = []
    for i, chunk in enumerate(chunks):
        embedding = model.encode(chunk).tolist()
        docs.append({
            "docId": doc_id,
            "chunkIndex": i,
            "title": title,
            "content": chunk,
            "sourceUrl": source_url,
            "embedding": embedding
        })
    collection.insert_many(docs)
    print(f"Indexed {len(docs)} chunks for '{title}'")

index_document(
    "doc-001",
    "MongoDB Atlas Vector Search Guide",
    "MongoDB Atlas Vector Search stores high-dimensional vectors alongside your document data...",
    "https://www.mongodb.com/docs/atlas/atlas-vector-search/"
)
```

## Step 2 - Create the Vector Search Index

In Atlas UI, create index `qa_index` on the `chunks` collection:

```json
{
  "fields": [
    {
      "type": "vector",
      "path": "embedding",
      "numDimensions": 384,
      "similarity": "cosine"
    }
  ]
}
```

## Step 3 - Retrieve Relevant Chunks

```python
def retrieve_relevant_chunks(question, top_k=5):
    question_embedding = model.encode(question).tolist()

    pipeline = [
        {
            "$vectorSearch": {
                "index": "qa_index",
                "path": "embedding",
                "queryVector": question_embedding,
                "numCandidates": top_k * 10,
                "limit": top_k
            }
        },
        {
            "$project": {
                "content": 1, "title": 1, "sourceUrl": 1,
                "score": {"$meta": "vectorSearchScore"},
                "_id": 0
            }
        }
    ]

    return list(collection.aggregate(pipeline))
```

## Step 4 - Generate an Answer with an LLM

```python
from openai import OpenAI

openai_client = OpenAI()

def answer_question(question):
    chunks = retrieve_relevant_chunks(question, top_k=5)

    context = "\n\n".join([
        f"[{c['title']}]\n{c['content']}"
        for c in chunks
    ])

    prompt = f"""Answer the question using only the context provided below.
If the answer is not in the context, say "I don't have enough information."

Context:
{context}

Question: {question}
Answer:"""

    response = openai_client.chat.completions.create(
        model="gpt-4o",
        messages=[{"role": "user", "content": prompt}],
        temperature=0
    )

    answer = response.choices[0].message.content
    sources = list({c["sourceUrl"] for c in chunks if c.get("sourceUrl")})

    return {"answer": answer, "sources": sources}

result = answer_question("How do I create a vector search index in Atlas?")
print(result["answer"])
print("Sources:", result["sources"])
```

## Best Practices

- Set the LLM temperature to 0 for factual Q&A to reduce hallucination.
- Filter out chunks with low vector search scores (below 0.7 cosine similarity) before sending to the LLM.
- Always include source citations in the response so users can verify answers.
- Re-index documents when content changes - stale chunks produce outdated answers.

## Summary

A MongoDB-backed document Q&A system combines chunk-level vector embeddings in Atlas Vector Search with an LLM generation step. Retrieve the top semantically similar chunks for each question, build a grounded prompt, and use the LLM to synthesize a factual answer with source attribution.
