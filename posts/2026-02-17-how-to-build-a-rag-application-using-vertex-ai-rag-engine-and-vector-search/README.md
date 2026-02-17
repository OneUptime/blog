# How to Build a RAG Application Using Vertex AI RAG Engine and Vector Search

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Vertex AI, RAG, Vector Search, Generative AI

Description: Learn how to build a Retrieval-Augmented Generation application using Vertex AI RAG Engine and Vector Search for grounded AI responses.

---

Large language models are impressive, but they have a fundamental limitation: they can only answer based on what they were trained on. Ask about your company's internal documentation, recent product updates, or private data, and they will either make something up or tell you they do not know. Retrieval-Augmented Generation (RAG) fixes this by retrieving relevant documents from your own data before generating a response. The model gets context from your actual data, producing answers that are grounded in facts rather than hallucinations.

Vertex AI provides both a RAG Engine (a managed RAG pipeline) and Vector Search (a scalable vector database) to build these applications.

## How RAG Works

The RAG pattern has two phases:

1. **Indexing phase** - Your documents are split into chunks, each chunk is converted to an embedding vector, and the vectors are stored in a vector database
2. **Query phase** - When a user asks a question, the question is converted to a vector, similar document chunks are retrieved from the vector database, and those chunks are passed to the LLM as context along with the question

The LLM then generates an answer based on the retrieved context, giving you grounded, accurate responses.

## Setting Up the RAG Engine

Vertex AI RAG Engine handles much of this pipeline for you. Here is how to set it up:

```python
# setup_rag.py
# Set up a Vertex AI RAG corpus

import vertexai
from vertexai.preview import rag

vertexai.init(
    project='your-project-id',
    location='us-central1',
)

# Create a RAG corpus - this is your knowledge base
corpus = rag.create_corpus(
    display_name='product-documentation',
    description='RAG corpus for product documentation and knowledge base articles',
)

print(f"Corpus created: {corpus.name}")
```

## Importing Documents

Now add your documents to the corpus. RAG Engine supports importing from GCS, Google Drive, and other sources:

```python
# import_documents.py
# Import documents into the RAG corpus

import vertexai
from vertexai.preview import rag

vertexai.init(
    project='your-project-id',
    location='us-central1',
)

# Get the existing corpus
corpus_name = 'projects/your-project-id/locations/us-central1/ragCorpora/CORPUS_ID'

# Import files from Cloud Storage
# Supports PDF, TXT, HTML, Markdown, and more
response = rag.import_files(
    corpus_name=corpus_name,
    paths=['gs://your-bucket/documentation/'],
    # Chunking configuration
    chunk_size=512,
    chunk_overlap=100,
)

print(f"Import completed: {response}")
```

You can also import from Google Drive:

```python
# Import from Google Drive
response = rag.import_files(
    corpus_name=corpus_name,
    paths=['https://drive.google.com/drive/folders/YOUR_FOLDER_ID'],
    chunk_size=512,
    chunk_overlap=100,
)
```

## Querying the RAG Corpus

Once your documents are indexed, you can query the corpus to retrieve relevant chunks:

```python
# query_rag.py
# Query the RAG corpus for relevant context

import vertexai
from vertexai.preview import rag

vertexai.init(
    project='your-project-id',
    location='us-central1',
)

corpus_name = 'projects/your-project-id/locations/us-central1/ragCorpora/CORPUS_ID'

# Retrieve relevant chunks for a query
response = rag.retrieval_query(
    rag_resources=[rag.RagResource(rag_corpus=corpus_name)],
    text='How do I configure SSL certificates for my load balancer?',
    similarity_top_k=5,  # Return top 5 most relevant chunks
)

# Print the retrieved chunks
for chunk in response.contexts.contexts:
    print(f"Score: {chunk.score:.4f}")
    print(f"Source: {chunk.source_uri}")
    print(f"Text: {chunk.text[:200]}...")
    print()
```

## Generating Answers with Retrieved Context

The real power comes from combining retrieval with generation:

```python
# rag_generation.py
# Use RAG to generate grounded answers

import vertexai
from vertexai.preview import rag
from vertexai.generative_models import GenerativeModel, Tool

vertexai.init(
    project='your-project-id',
    location='us-central1',
)

corpus_name = 'projects/your-project-id/locations/us-central1/ragCorpora/CORPUS_ID'

# Create a RAG retrieval tool
rag_retrieval_tool = Tool.from_retrieval(
    retrieval=rag.Retrieval(
        source=rag.VertexRagStore(
            rag_resources=[rag.RagResource(rag_corpus=corpus_name)],
            similarity_top_k=5,
        ),
    )
)

# Create a model with the RAG tool
model = GenerativeModel(
    'gemini-1.5-pro',
    tools=[rag_retrieval_tool],
)

# Ask a question - the model will automatically retrieve relevant context
response = model.generate_content(
    'How do I set up auto-scaling for our production cluster?'
)

print(response.text)
```

## Building with Vector Search Directly

For more control over the RAG pipeline, you can use Vertex AI Vector Search directly. This gives you a scalable vector database that you manage yourself.

First, create an index:

```python
# create_index.py
# Create a Vector Search index

from google.cloud import aiplatform

aiplatform.init(
    project='your-project-id',
    location='us-central1',
)

# Create the vector search index
index = aiplatform.MatchingEngineIndex.create_tree_ah_index(
    display_name='documentation-index',
    # Dimension of your embedding vectors
    dimensions=768,
    # Distance metric for similarity
    approximate_neighbors_count=150,
    distance_measure_type='DOT_PRODUCT_DISTANCE',
    description='Vector index for product documentation',
)

print(f"Index created: {index.resource_name}")
```

## Preparing and Uploading Vectors

Process your documents into chunks and embed them:

```python
# prepare_vectors.py
# Chunk documents, generate embeddings, and prepare for Vector Search

import vertexai
from vertexai.language_models import TextEmbeddingModel, TextEmbeddingInput
import json

vertexai.init(
    project='your-project-id',
    location='us-central1',
)

embedding_model = TextEmbeddingModel.from_pretrained('text-embedding-005')

def chunk_text(text, chunk_size=500, overlap=100):
    """Split text into overlapping chunks."""
    chunks = []
    start = 0
    while start < len(text):
        end = start + chunk_size
        chunk = text[start:end]
        chunks.append(chunk)
        start += chunk_size - overlap
    return chunks

# Process your documents
documents = [
    {'id': 'doc1', 'title': 'Load Balancer Setup', 'content': 'Full document text here...'},
    {'id': 'doc2', 'title': 'Auto-scaling Guide', 'content': 'Full document text here...'},
    # ... more documents
]

# Prepare data in JSONL format for Vector Search
vectors = []
for doc in documents:
    chunks = chunk_text(doc['content'])

    for i, chunk in enumerate(chunks):
        # Generate embedding for the chunk
        embedding_input = TextEmbeddingInput(
            text=chunk, task_type='RETRIEVAL_DOCUMENT'
        )
        embeddings = embedding_model.get_embeddings([embedding_input])

        vectors.append({
            'id': f"{doc['id']}_chunk_{i}",
            'embedding': embeddings[0].values,
            'restricts': [
                {'namespace': 'doc_id', 'allow_list': [doc['id']]},
                {'namespace': 'title', 'allow_list': [doc['title']]},
            ],
        })

# Write vectors to JSONL for uploading
with open('vectors.jsonl', 'w') as f:
    for vec in vectors:
        f.write(json.dumps(vec) + '\n')

print(f"Prepared {len(vectors)} vectors")
```

Upload to GCS and update the index:

```bash
# Upload vectors to GCS
gsutil cp vectors.jsonl gs://your-bucket/vector-data/vectors.jsonl
```

## Deploying the Index

To query the index, deploy it to an endpoint:

```python
# deploy_index.py
# Deploy the Vector Search index to an endpoint

from google.cloud import aiplatform

aiplatform.init(
    project='your-project-id',
    location='us-central1',
)

# Create an index endpoint
index_endpoint = aiplatform.MatchingEngineIndexEndpoint.create(
    display_name='documentation-search-endpoint',
    public_endpoint_enabled=True,
)

# Deploy the index to the endpoint
index = aiplatform.MatchingEngineIndex('INDEX_RESOURCE_NAME')
index_endpoint.deploy_index(
    index=index,
    deployed_index_id='doc-search-deployed',
    display_name='Deployed Documentation Index',
    # Machine configuration for the serving infrastructure
    machine_type='e2-standard-2',
    min_replica_count=1,
    max_replica_count=3,
)

print(f"Index deployed to: {index_endpoint.resource_name}")
```

## Complete RAG Pipeline with Vector Search

Here is a complete RAG pipeline using Vector Search and Gemini:

```python
# full_rag_pipeline.py
# Complete RAG pipeline: retrieve from Vector Search, generate with Gemini

import vertexai
from vertexai.language_models import TextEmbeddingModel, TextEmbeddingInput
from vertexai.generative_models import GenerativeModel, GenerationConfig
from google.cloud import aiplatform

vertexai.init(
    project='your-project-id',
    location='us-central1',
)

# Initialize models
embedding_model = TextEmbeddingModel.from_pretrained('text-embedding-005')
gen_model = GenerativeModel('gemini-1.5-pro')

# Get the index endpoint
index_endpoint = aiplatform.MatchingEngineIndexEndpoint('INDEX_ENDPOINT_RESOURCE')

def rag_query(question, top_k=5):
    """Full RAG pipeline: retrieve relevant chunks and generate an answer."""

    # Step 1: Embed the question
    query_input = TextEmbeddingInput(text=question, task_type='RETRIEVAL_QUERY')
    query_embedding = embedding_model.get_embeddings([query_input])
    query_vector = query_embedding[0].values

    # Step 2: Search for similar document chunks
    results = index_endpoint.find_neighbors(
        deployed_index_id='doc-search-deployed',
        queries=[query_vector],
        num_neighbors=top_k,
    )

    # Step 3: Build context from retrieved chunks
    context_parts = []
    for match in results[0]:
        # In a real application, you would look up the original text
        # from a database using the match ID
        context_parts.append(f"[Source: {match.id}] Relevant content here...")

    context = '\n\n'.join(context_parts)

    # Step 4: Generate answer using the context
    prompt = f"""Based on the following context, answer the user's question.
If the context does not contain enough information to answer, say so.

Context:
{context}

Question: {question}

Answer:"""

    response = gen_model.generate_content(
        prompt,
        generation_config=GenerationConfig(temperature=0.3, max_output_tokens=1024),
    )

    return {
        'answer': response.text,
        'sources': [match.id for match in results[0]],
        'num_sources': len(results[0]),
    }

# Use the RAG pipeline
result = rag_query('How do I configure SSL certificates for the load balancer?')
print(f"Answer: {result['answer']}")
print(f"Sources: {result['sources']}")
```

## Best Practices

Choose your chunk size carefully. Too small and you lose context. Too large and you dilute the relevance. 300-500 tokens per chunk with 50-100 token overlap is a good starting point.

Use task types for embeddings. Always use `RETRIEVAL_QUERY` for questions and `RETRIEVAL_DOCUMENT` for document chunks. This significantly improves retrieval quality.

Keep your index updated. When documents change, re-embed the affected chunks and update the index.

Test your retrieval before adding generation. Make sure the right documents are being retrieved before hooking up the LLM. Poor retrieval leads to poor answers, no matter how good the model is.

## Wrapping Up

Building a RAG application on Vertex AI gives you grounded, accurate AI responses based on your own data. The RAG Engine provides a managed, easy-to-use pipeline, while Vector Search gives you more control for custom implementations. Either way, the pattern is the same: chunk your documents, embed them, store the vectors, retrieve relevant context for each question, and let the LLM generate an answer. Start with a small document set, verify the quality of your retrieval, and then scale up as you prove the value.
