# How to Build Document QA with LlamaIndex

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: LlamaIndex, RAG, Document QA, LLM, Python, Vector Database, Embeddings, OpenAI, Retrieval, NLP

Description: Learn how to build a production-ready document question-answering system using LlamaIndex, covering document loading, indexing strategies, retrieval techniques, and deployment best practices.

---

> The magic of document QA lies not in the LLM itself, but in how effectively you retrieve and present relevant context. LlamaIndex provides the building blocks to bridge your documents with language models, turning static files into interactive knowledge bases. Master these patterns and you will unlock powerful applications that understand your data.

Retrieval-Augmented Generation (RAG) has become the standard approach for building AI systems that can answer questions about your documents. LlamaIndex simplifies this process by providing abstractions for document loading, indexing, retrieval, and response generation. This guide walks you through building a complete document QA system from scratch.

---

## Setting Up Your Environment

Before diving into code, let us set up the dependencies. LlamaIndex supports multiple LLM providers and vector stores, giving you flexibility in your architecture choices.

### Installation

```bash
# Core LlamaIndex packages
pip install llama-index llama-index-core

# LLM integrations (choose based on your provider)
pip install llama-index-llms-openai llama-index-llms-anthropic

# Embedding models
pip install llama-index-embeddings-openai llama-index-embeddings-huggingface

# Vector store integrations
pip install llama-index-vector-stores-chroma llama-index-vector-stores-qdrant

# Document loaders for various file types
pip install llama-index-readers-file pypdf docx2txt
```

### Basic Configuration

The following code sets up the foundational components: an LLM for generating responses, an embedding model for creating vector representations of text, and the global settings that LlamaIndex will use throughout your application.

```python
# config.py
# Import core LlamaIndex modules and LLM integrations
import os
from llama_index.core import Settings
from llama_index.llms.openai import OpenAI
from llama_index.embeddings.openai import OpenAIEmbedding

def initialize_llamaindex():
    """Configure LlamaIndex with LLM and embedding model settings"""

    # Configure the LLM for response generation
    # GPT-4 provides better reasoning; GPT-3.5-turbo is faster and cheaper
    Settings.llm = OpenAI(
        model="gpt-4-turbo-preview",  # Model identifier
        temperature=0.1,  # Low temperature for factual responses
        max_tokens=1024,  # Maximum response length
        api_key=os.getenv("OPENAI_API_KEY")  # API key from environment
    )

    # Configure the embedding model for document vectorization
    # text-embedding-3-small is cost-effective with good quality
    Settings.embed_model = OpenAIEmbedding(
        model="text-embedding-3-small",  # Embedding model identifier
        api_key=os.getenv("OPENAI_API_KEY")
    )

    # Configure chunking parameters for document processing
    Settings.chunk_size = 512  # Characters per chunk (smaller = more precise retrieval)
    Settings.chunk_overlap = 50  # Overlap between chunks (preserves context at boundaries)

    return Settings

# Initialize on module import
settings = initialize_llamaindex()
```

---

## Document Loading

LlamaIndex provides readers for virtually any document format. The key is choosing the right loader and understanding how documents are transformed into nodes (the atomic units of indexing).

### Loading Various File Types

This module demonstrates loading documents from different sources. Each reader is optimized for its file type, extracting text while preserving relevant metadata like page numbers and section headers.

```python
# document_loader.py
# Import readers for different document types
from llama_index.core import SimpleDirectoryReader
from llama_index.readers.file import (
    PDFReader,
    DocxReader,
    HTMLTagReader,
    MarkdownReader
)
from pathlib import Path
from typing import List, Optional
from llama_index.core.schema import Document

def load_documents_from_directory(
    directory_path: str,
    recursive: bool = True,
    file_types: Optional[List[str]] = None
) -> List[Document]:
    """
    Load all documents from a directory with automatic format detection.

    Args:
        directory_path: Path to the directory containing documents
        recursive: Whether to search subdirectories
        file_types: Optional list of extensions to include (e.g., ['.pdf', '.docx'])

    Returns:
        List of Document objects ready for indexing
    """

    # Default to common document types if not specified
    if file_types is None:
        file_types = [".pdf", ".docx", ".txt", ".md", ".html"]

    # SimpleDirectoryReader handles multiple formats automatically
    reader = SimpleDirectoryReader(
        input_dir=directory_path,
        recursive=recursive,  # Search subdirectories
        required_exts=file_types,  # Filter by extension
        filename_as_id=True,  # Use filename as document ID
        file_metadata=lambda filepath: {  # Extract metadata from path
            "source": str(filepath),
            "filename": Path(filepath).name,
            "extension": Path(filepath).suffix
        }
    )

    documents = reader.load_data()
    print(f"Loaded {len(documents)} documents from {directory_path}")

    return documents


def load_pdf_with_pages(pdf_path: str) -> List[Document]:
    """
    Load a PDF with page-level granularity for precise citations.
    Each page becomes a separate document with page number metadata.
    """

    pdf_reader = PDFReader()

    # Load PDF and split by pages
    documents = pdf_reader.load_data(
        file=Path(pdf_path),
        extra_info={"source": pdf_path}  # Add source metadata
    )

    # Enrich each document with page number
    for i, doc in enumerate(documents):
        doc.metadata["page_number"] = i + 1  # 1-indexed page numbers
        doc.metadata["total_pages"] = len(documents)

    return documents


def load_from_urls(urls: List[str]) -> List[Document]:
    """
    Load documents from web URLs for indexing web content.
    Useful for documentation sites, knowledge bases, or articles.
    """
    from llama_index.readers.web import SimpleWebPageReader

    reader = SimpleWebPageReader(
        html_to_text=True  # Convert HTML to clean text
    )

    documents = reader.load_data(urls=urls)

    # Add URL as metadata for citation
    for doc, url in zip(documents, urls):
        doc.metadata["url"] = url
        doc.metadata["source_type"] = "web"

    return documents


def load_from_database(
    connection_string: str,
    query: str,
    text_column: str,
    metadata_columns: Optional[List[str]] = None
) -> List[Document]:
    """
    Load documents from a database query result.
    Useful for indexing structured data like articles, tickets, or records.
    """
    from llama_index.readers.database import DatabaseReader

    reader = DatabaseReader(uri=connection_string)

    documents = reader.load_data(
        query=query,
        text_column=text_column,
        metadata_columns=metadata_columns or []
    )

    return documents
```

---

## Index Types and When to Use Them

LlamaIndex offers several index types, each optimized for different use cases. Understanding when to use each index is crucial for building effective QA systems.

### Vector Store Index

The most common index type for semantic search. It converts documents into embeddings and retrieves based on similarity to the query.

```python
# vector_index.py
# Vector Store Index - the workhorse of semantic search
from llama_index.core import VectorStoreIndex, StorageContext
from llama_index.vector_stores.chroma import ChromaVectorStore
import chromadb
from typing import List
from llama_index.core.schema import Document

def create_vector_index(
    documents: List[Document],
    persist_dir: str = "./storage/vector_index"
) -> VectorStoreIndex:
    """
    Create a vector store index for semantic similarity search.

    Best for:
    - General-purpose document QA
    - When queries may use different words than the documents
    - Large document collections (scales well)

    Args:
        documents: List of documents to index
        persist_dir: Directory to persist the index for later use

    Returns:
        VectorStoreIndex ready for querying
    """

    # Initialize Chroma as the vector store backend
    # Chroma provides persistent storage and efficient similarity search
    chroma_client = chromadb.PersistentClient(path=persist_dir)

    # Create or get existing collection
    chroma_collection = chroma_client.get_or_create_collection(
        name="documents",
        metadata={"hnsw:space": "cosine"}  # Use cosine similarity
    )

    # Wrap Chroma collection for LlamaIndex
    vector_store = ChromaVectorStore(chroma_collection=chroma_collection)

    # Create storage context with our vector store
    storage_context = StorageContext.from_defaults(
        vector_store=vector_store
    )

    # Build the index - this embeds all documents
    index = VectorStoreIndex.from_documents(
        documents,
        storage_context=storage_context,
        show_progress=True  # Display progress bar during indexing
    )

    print(f"Created vector index with {len(documents)} documents")

    return index


def load_existing_index(persist_dir: str) -> VectorStoreIndex:
    """Load a previously created vector index from disk"""

    chroma_client = chromadb.PersistentClient(path=persist_dir)
    chroma_collection = chroma_client.get_collection("documents")
    vector_store = ChromaVectorStore(chroma_collection=chroma_collection)

    # Reconstruct the index from stored vectors
    index = VectorStoreIndex.from_vector_store(
        vector_store=vector_store
    )

    return index
```

### Summary Index

Creates a summary of all documents, useful when you need holistic understanding rather than specific fact retrieval.

```python
# summary_index.py
# Summary Index - for holistic document understanding
from llama_index.core import SummaryIndex
from typing import List
from llama_index.core.schema import Document

def create_summary_index(documents: List[Document]) -> SummaryIndex:
    """
    Create a summary index for comprehensive document understanding.

    Best for:
    - Questions requiring synthesis across multiple documents
    - Generating overviews or summaries
    - When context from the entire corpus is needed

    Trade-offs:
    - Slower queries (processes more content)
    - Higher token usage
    - Better for smaller document sets
    """

    # Summary index stores documents and creates summaries on demand
    index = SummaryIndex.from_documents(
        documents,
        show_progress=True
    )

    return index
```

### Keyword Table Index

Uses keyword extraction for retrieval, complementing vector search for exact term matching.

```python
# keyword_index.py
# Keyword Table Index - for exact term matching
from llama_index.core import KeywordTableIndex
from typing import List
from llama_index.core.schema import Document

def create_keyword_index(documents: List[Document]) -> KeywordTableIndex:
    """
    Create a keyword-based index for exact term retrieval.

    Best for:
    - Technical documentation with specific terms
    - When exact keyword matching is important
    - Complementing vector search in hybrid approaches

    Trade-offs:
    - Does not understand synonyms or paraphrasing
    - Requires queries to use exact document terms
    """

    index = KeywordTableIndex.from_documents(
        documents,
        show_progress=True
    )

    return index
```

### Hybrid Index Strategy

Combining multiple index types often yields the best results. This pattern uses both vector and keyword search.

```python
# hybrid_index.py
# Hybrid indexing strategy combining vector and keyword search
from llama_index.core import VectorStoreIndex, KeywordTableIndex
from llama_index.core.retrievers import (
    VectorIndexRetriever,
    KeywordTableSimpleRetriever
)
from llama_index.core.query_engine import RetrieverQueryEngine
from llama_index.core.postprocessor import SimilarityPostprocessor
from llama_index.core.schema import Document
from typing import List

class HybridIndex:
    """
    Combines vector similarity and keyword matching for robust retrieval.

    This approach catches both:
    - Semantic matches (same meaning, different words)
    - Exact matches (specific terms, acronyms, names)
    """

    def __init__(self, documents: List[Document]):
        # Create both index types from the same documents
        self.vector_index = VectorStoreIndex.from_documents(documents)
        self.keyword_index = KeywordTableIndex.from_documents(documents)

    def create_hybrid_retriever(
        self,
        vector_top_k: int = 5,
        keyword_top_k: int = 3
    ):
        """
        Create a retriever that queries both indexes and merges results.

        Args:
            vector_top_k: Number of results from vector search
            keyword_top_k: Number of results from keyword search
        """
        from llama_index.core.retrievers import QueryFusionRetriever

        # Create individual retrievers
        vector_retriever = VectorIndexRetriever(
            index=self.vector_index,
            similarity_top_k=vector_top_k
        )

        keyword_retriever = KeywordTableSimpleRetriever(
            index=self.keyword_index,
            top_k=keyword_top_k
        )

        # Fuse results from both retrievers
        # Uses Reciprocal Rank Fusion to combine rankings
        hybrid_retriever = QueryFusionRetriever(
            retrievers=[vector_retriever, keyword_retriever],
            similarity_top_k=vector_top_k + keyword_top_k,
            num_queries=1,  # Use original query (no query generation)
            mode="reciprocal_rerank"  # RRF for combining results
        )

        return hybrid_retriever

    def create_query_engine(self):
        """Create a query engine using hybrid retrieval"""

        retriever = self.create_hybrid_retriever()

        # Add post-processing to filter low-relevance results
        postprocessor = SimilarityPostprocessor(
            similarity_cutoff=0.5  # Minimum similarity threshold
        )

        query_engine = RetrieverQueryEngine.from_args(
            retriever=retriever,
            node_postprocessors=[postprocessor]
        )

        return query_engine
```

---

## Query Engines and Retrieval

Query engines orchestrate the retrieval and response generation process. LlamaIndex provides several patterns for different use cases.

### Basic Query Engine

The simplest approach - retrieve relevant context and generate a response.

```python
# query_engine.py
# Basic query engine for document QA
from llama_index.core import VectorStoreIndex
from llama_index.core.query_engine import RetrieverQueryEngine
from llama_index.core.retrievers import VectorIndexRetriever
from llama_index.core.response_synthesizers import get_response_synthesizer

def create_basic_query_engine(
    index: VectorStoreIndex,
    similarity_top_k: int = 5,
    response_mode: str = "compact"
) -> RetrieverQueryEngine:
    """
    Create a basic query engine for straightforward QA.

    Args:
        index: The vector index to query
        similarity_top_k: Number of similar chunks to retrieve
        response_mode: How to synthesize the response
            - "compact": Combine chunks, single LLM call (fast, cheap)
            - "refine": Iteratively refine answer (better quality)
            - "tree_summarize": Build summary tree (good for synthesis)

    Returns:
        Query engine ready to answer questions
    """

    # Configure the retriever
    retriever = VectorIndexRetriever(
        index=index,
        similarity_top_k=similarity_top_k
    )

    # Configure response synthesis
    response_synthesizer = get_response_synthesizer(
        response_mode=response_mode,
        verbose=True  # Show intermediate steps
    )

    # Assemble the query engine
    query_engine = RetrieverQueryEngine(
        retriever=retriever,
        response_synthesizer=response_synthesizer
    )

    return query_engine


def query_with_sources(query_engine, question: str) -> dict:
    """
    Query the engine and return response with source citations.
    Essential for verifiable, trustworthy answers.
    """

    response = query_engine.query(question)

    # Extract source information from retrieved nodes
    sources = []
    for node in response.source_nodes:
        sources.append({
            "text": node.text[:200] + "...",  # Truncate for display
            "score": node.score,  # Similarity score
            "metadata": node.metadata  # File, page, etc.
        })

    return {
        "answer": str(response),
        "sources": sources,
        "source_count": len(sources)
    }
```

### Chat Engine for Conversational QA

When you need multi-turn conversations with context retention.

```python
# chat_engine.py
# Conversational chat engine with memory
from llama_index.core import VectorStoreIndex
from llama_index.core.chat_engine import CondensePlusContextChatEngine
from llama_index.core.memory import ChatMemoryBuffer

def create_chat_engine(
    index: VectorStoreIndex,
    system_prompt: str = None,
    memory_token_limit: int = 3000
):
    """
    Create a chat engine for multi-turn conversations.

    The chat engine:
    - Maintains conversation history
    - Reformulates questions based on context
    - Retrieves relevant documents per turn

    Args:
        index: Vector index to retrieve from
        system_prompt: Custom instructions for the assistant
        memory_token_limit: Maximum tokens to retain in memory
    """

    # Default system prompt for document QA
    if system_prompt is None:
        system_prompt = """You are a helpful assistant that answers questions
        based on the provided documents. Always cite your sources and indicate
        when information is not found in the documents. Be concise but thorough."""

    # Chat memory maintains conversation history
    memory = ChatMemoryBuffer.from_defaults(
        token_limit=memory_token_limit
    )

    # CondensePlusContext reformulates queries using chat history
    # then retrieves relevant context for each turn
    chat_engine = index.as_chat_engine(
        chat_mode="condense_plus_context",
        memory=memory,
        system_prompt=system_prompt,
        verbose=True
    )

    return chat_engine


def run_chat_session(chat_engine):
    """Interactive chat session for testing"""

    print("Chat started. Type 'quit' to exit.\n")

    while True:
        user_input = input("You: ").strip()

        if user_input.lower() == 'quit':
            break

        # Stream the response for better UX
        response = chat_engine.stream_chat(user_input)

        print("Assistant: ", end="")
        for token in response.response_gen:
            print(token, end="", flush=True)
        print("\n")
```

---

## Retrieval Strategies

The retrieval phase is critical for QA quality. LlamaIndex supports several advanced retrieval strategies.

### Sentence Window Retrieval

Retrieves surrounding context around matched sentences for better coherence.

```python
# sentence_window.py
# Sentence window retrieval for precise context
from llama_index.core.node_parser import SentenceWindowNodeParser
from llama_index.core import VectorStoreIndex
from llama_index.core.postprocessor import MetadataReplacementPostProcessor
from typing import List
from llama_index.core.schema import Document

def create_sentence_window_index(
    documents: List[Document],
    window_size: int = 3
) -> VectorStoreIndex:
    """
    Create an index with sentence-level granularity and surrounding context.

    How it works:
    1. Parse documents into sentences
    2. Store surrounding sentences as metadata
    3. Embed individual sentences (precise matching)
    4. At query time, expand to full window (better context)

    Best for:
    - Documents where single sentences contain key facts
    - When you need precise retrieval with sufficient context

    Args:
        documents: Documents to index
        window_size: Sentences before/after to include as context
    """

    # Parser that extracts sentences and their windows
    node_parser = SentenceWindowNodeParser.from_defaults(
        window_size=window_size,  # Sentences on each side
        window_metadata_key="window",  # Key for storing window
        original_text_metadata_key="original_text"  # Key for sentence
    )

    # Parse documents into sentence nodes with windows
    nodes = node_parser.get_nodes_from_documents(documents)

    # Build index from sentence nodes
    index = VectorStoreIndex(nodes)

    return index


def create_sentence_window_query_engine(index: VectorStoreIndex):
    """
    Query engine that uses sentence windows for context.
    The postprocessor replaces the short sentence with its full window.
    """

    # This postprocessor swaps the sentence for its window
    postprocessor = MetadataReplacementPostProcessor(
        target_metadata_key="window"
    )

    query_engine = index.as_query_engine(
        similarity_top_k=5,
        node_postprocessors=[postprocessor]
    )

    return query_engine
```

### Auto-Merging Retrieval

Automatically merges child nodes into parent nodes when enough children are retrieved.

```python
# auto_merging.py
# Auto-merging retrieval for hierarchical context
from llama_index.core.node_parser import HierarchicalNodeParser, get_leaf_nodes
from llama_index.core import VectorStoreIndex, StorageContext
from llama_index.core.retrievers import AutoMergingRetriever
from llama_index.core.query_engine import RetrieverQueryEngine
from typing import List
from llama_index.core.schema import Document

def create_auto_merging_index(
    documents: List[Document],
    chunk_sizes: List[int] = [2048, 512, 128]
) -> tuple:
    """
    Create a hierarchical index that can auto-merge retrieved chunks.

    How it works:
    1. Parse documents at multiple granularities (large -> small)
    2. Index the smallest chunks (leaf nodes)
    3. During retrieval, if many children of a parent are retrieved,
       automatically merge them into the parent for coherent context

    Best for:
    - Long documents with hierarchical structure
    - When query relevance spans multiple small chunks
    - Balancing precision (small chunks) and context (large chunks)

    Args:
        documents: Documents to index
        chunk_sizes: Chunk sizes from largest to smallest
    """

    # Hierarchical parser creates parent-child node relationships
    node_parser = HierarchicalNodeParser.from_defaults(
        chunk_sizes=chunk_sizes  # [parent, child, grandchild]
    )

    # Parse into hierarchical nodes
    nodes = node_parser.get_nodes_from_documents(documents)

    # Get leaf nodes (smallest chunks) for indexing
    leaf_nodes = get_leaf_nodes(nodes)

    # Storage context needs to store the full hierarchy
    storage_context = StorageContext.from_defaults()
    storage_context.docstore.add_documents(nodes)

    # Index only leaf nodes, but store all for merging
    index = VectorStoreIndex(
        leaf_nodes,
        storage_context=storage_context
    )

    return index, storage_context


def create_auto_merging_query_engine(
    index: VectorStoreIndex,
    storage_context: StorageContext
) -> RetrieverQueryEngine:
    """
    Query engine that automatically merges related chunks.
    """

    # Retriever that performs auto-merging
    retriever = AutoMergingRetriever(
        index.as_retriever(similarity_top_k=12),  # Retrieve many small chunks
        storage_context=storage_context,
        simple_ratio_thresh=0.3  # Merge if 30% of children retrieved
    )

    query_engine = RetrieverQueryEngine.from_args(
        retriever=retriever
    )

    return query_engine
```

### Reranking for Better Relevance

Use a reranker model to improve retrieval quality after initial retrieval.

```python
# reranking.py
# Reranking for improved retrieval relevance
from llama_index.core import VectorStoreIndex
from llama_index.core.postprocessor import SentenceTransformerRerank
from llama_index.postprocessor.cohere_rerank import CohereRerank
import os

def create_reranking_query_engine(
    index: VectorStoreIndex,
    rerank_model: str = "cross-encoder/ms-marco-MiniLM-L-6-v2",
    initial_top_k: int = 20,
    final_top_k: int = 5
):
    """
    Query engine with two-stage retrieval: retrieve then rerank.

    How it works:
    1. Retrieve more candidates than needed (initial_top_k)
    2. Rerank using a cross-encoder model
    3. Return top results after reranking (final_top_k)

    Why reranking helps:
    - Embedding models optimize for speed over accuracy
    - Cross-encoders directly compare query-document pairs
    - Catches relevant documents that embedding search misses

    Args:
        index: Vector index to query
        rerank_model: HuggingFace model ID for reranking
        initial_top_k: Candidates to retrieve before reranking
        final_top_k: Results to return after reranking
    """

    # Sentence transformer reranker (local, no API needed)
    reranker = SentenceTransformerRerank(
        model=rerank_model,
        top_n=final_top_k  # Keep top N after reranking
    )

    query_engine = index.as_query_engine(
        similarity_top_k=initial_top_k,  # Over-retrieve
        node_postprocessors=[reranker]  # Then rerank
    )

    return query_engine


def create_cohere_reranking_engine(
    index: VectorStoreIndex,
    initial_top_k: int = 25,
    final_top_k: int = 5
):
    """
    Query engine using Cohere's reranking API (higher quality).
    Cohere's reranker often outperforms open-source alternatives.
    """

    cohere_reranker = CohereRerank(
        api_key=os.getenv("COHERE_API_KEY"),
        top_n=final_top_k,
        model="rerank-english-v3.0"  # Latest Cohere rerank model
    )

    query_engine = index.as_query_engine(
        similarity_top_k=initial_top_k,
        node_postprocessors=[cohere_reranker]
    )

    return query_engine
```

---

## Response Synthesis

How you synthesize the response from retrieved context significantly impacts answer quality. LlamaIndex provides several strategies.

### Response Modes Explained

```python
# response_synthesis.py
# Different response synthesis strategies
from llama_index.core import VectorStoreIndex
from llama_index.core.response_synthesizers import (
    get_response_synthesizer,
    ResponseMode
)
from llama_index.core.prompts import PromptTemplate

def create_compact_engine(index: VectorStoreIndex):
    """
    Compact mode: Stuff all context into one prompt.

    Pros: Fast, cheap (single LLM call)
    Cons: Limited by context window, may truncate
    Best for: Short documents, simple questions
    """

    synthesizer = get_response_synthesizer(
        response_mode=ResponseMode.COMPACT
    )

    return index.as_query_engine(response_synthesizer=synthesizer)


def create_refine_engine(index: VectorStoreIndex):
    """
    Refine mode: Iteratively improve answer with each chunk.

    Pros: Handles large context, thorough answers
    Cons: Slower, more expensive (multiple LLM calls)
    Best for: Complex questions, many relevant documents
    """

    synthesizer = get_response_synthesizer(
        response_mode=ResponseMode.REFINE,
        verbose=True  # Show refinement steps
    )

    return index.as_query_engine(
        response_synthesizer=synthesizer,
        similarity_top_k=10  # More chunks to refine through
    )


def create_tree_summarize_engine(index: VectorStoreIndex):
    """
    Tree summarize: Build a summary tree bottom-up.

    Pros: Good for synthesis, handles many chunks well
    Cons: Higher latency, more LLM calls
    Best for: Summarization, questions needing broad synthesis
    """

    synthesizer = get_response_synthesizer(
        response_mode=ResponseMode.TREE_SUMMARIZE
    )

    return index.as_query_engine(response_synthesizer=synthesizer)


def create_custom_prompt_engine(index: VectorStoreIndex):
    """
    Custom prompts for domain-specific response formatting.
    """

    # Custom QA prompt with specific instructions
    qa_prompt = PromptTemplate(
        """You are a technical documentation assistant. Answer the question
        based ONLY on the provided context. If the answer is not in the context,
        say "I could not find this information in the documentation."

        Context:
        {context_str}

        Question: {query_str}

        Instructions:
        - Be precise and technical
        - Include code examples when relevant
        - Cite specific sections when possible

        Answer:"""
    )

    synthesizer = get_response_synthesizer(
        response_mode=ResponseMode.COMPACT,
        text_qa_template=qa_prompt
    )

    return index.as_query_engine(response_synthesizer=synthesizer)
```

---

## Evaluation

Measuring QA system quality is essential for improvement. LlamaIndex provides evaluation tools for both retrieval and response quality.

### Retrieval Evaluation

```python
# evaluation.py
# Evaluation framework for document QA systems
from llama_index.core.evaluation import (
    RetrieverEvaluator,
    FaithfulnessEvaluator,
    RelevancyEvaluator,
    CorrectnessEvaluator
)
from llama_index.core import VectorStoreIndex
from llama_index.llms.openai import OpenAI
from typing import List, Dict
import pandas as pd

async def evaluate_retrieval(
    index: VectorStoreIndex,
    eval_questions: List[str],
    expected_ids: List[List[str]]
) -> Dict:
    """
    Evaluate retrieval quality using standard IR metrics.

    Metrics computed:
    - Hit rate: % of queries where relevant doc is in top-k
    - MRR (Mean Reciprocal Rank): Average of 1/rank of first relevant doc

    Args:
        index: Index to evaluate
        eval_questions: List of test questions
        expected_ids: List of relevant document IDs for each question
    """

    retriever = index.as_retriever(similarity_top_k=5)

    # Create evaluator with metrics
    evaluator = RetrieverEvaluator.from_metric_names(
        ["hit_rate", "mrr"],  # Information retrieval metrics
        retriever=retriever
    )

    # Run evaluation
    results = []
    for question, expected in zip(eval_questions, expected_ids):
        result = await evaluator.aevaluate(
            query=question,
            expected_ids=expected
        )
        results.append({
            "question": question,
            "hit_rate": result.metric_dict["hit_rate"].score,
            "mrr": result.metric_dict["mrr"].score
        })

    # Aggregate results
    df = pd.DataFrame(results)

    return {
        "mean_hit_rate": df["hit_rate"].mean(),
        "mean_mrr": df["mrr"].mean(),
        "detailed_results": results
    }


async def evaluate_response_quality(
    query_engine,
    eval_questions: List[str],
    reference_answers: List[str] = None
) -> Dict:
    """
    Evaluate response quality using LLM-based evaluation.

    Metrics:
    - Faithfulness: Is the answer supported by retrieved context?
    - Relevancy: Does the answer address the question?
    - Correctness: Is the answer correct? (requires reference)
    """

    # Create evaluators (use GPT-4 for evaluation)
    eval_llm = OpenAI(model="gpt-4-turbo-preview")

    faithfulness_evaluator = FaithfulnessEvaluator(llm=eval_llm)
    relevancy_evaluator = RelevancyEvaluator(llm=eval_llm)

    results = []

    for i, question in enumerate(eval_questions):
        # Get response from query engine
        response = query_engine.query(question)

        # Evaluate faithfulness (grounded in context?)
        faithfulness = await faithfulness_evaluator.aevaluate_response(
            response=response
        )

        # Evaluate relevancy (answers the question?)
        relevancy = await relevancy_evaluator.aevaluate_response(
            query=question,
            response=response
        )

        result = {
            "question": question,
            "response": str(response),
            "faithfulness_score": faithfulness.score,
            "faithfulness_feedback": faithfulness.feedback,
            "relevancy_score": relevancy.score,
            "relevancy_feedback": relevancy.feedback
        }

        # Optional: correctness evaluation if reference provided
        if reference_answers and i < len(reference_answers):
            correctness_evaluator = CorrectnessEvaluator(llm=eval_llm)
            correctness = await correctness_evaluator.aevaluate(
                query=question,
                response=str(response),
                reference=reference_answers[i]
            )
            result["correctness_score"] = correctness.score
            result["correctness_feedback"] = correctness.feedback

        results.append(result)

    # Compute averages
    df = pd.DataFrame(results)

    return {
        "mean_faithfulness": df["faithfulness_score"].mean(),
        "mean_relevancy": df["relevancy_score"].mean(),
        "mean_correctness": df.get("correctness_score", pd.Series()).mean(),
        "detailed_results": results
    }
```

### Building an Evaluation Dataset

```python
# eval_dataset.py
# Generate evaluation datasets for systematic testing
from llama_index.core.evaluation import DatasetGenerator
from llama_index.core import VectorStoreIndex
from llama_index.llms.openai import OpenAI
from typing import List
from llama_index.core.schema import Document

async def generate_eval_dataset(
    documents: List[Document],
    num_questions_per_doc: int = 3
) -> List[Dict]:
    """
    Automatically generate evaluation questions from documents.
    Useful for creating test datasets without manual labeling.

    Note: Generated questions should be reviewed by humans
    for production evaluation.
    """

    # Use GPT-4 for high-quality question generation
    generator_llm = OpenAI(model="gpt-4-turbo-preview")

    # Create dataset generator
    generator = DatasetGenerator.from_documents(
        documents,
        llm=generator_llm,
        num_questions_per_chunk=num_questions_per_doc
    )

    # Generate question-answer pairs
    eval_questions = await generator.agenerate_questions_from_nodes()

    return eval_questions


def create_golden_dataset(
    questions: List[str],
    answers: List[str],
    relevant_doc_ids: List[List[str]]
) -> List[Dict]:
    """
    Create a golden evaluation dataset from manual annotations.
    This is the gold standard for evaluation.
    """

    dataset = []
    for q, a, docs in zip(questions, answers, relevant_doc_ids):
        dataset.append({
            "question": q,
            "reference_answer": a,
            "relevant_document_ids": docs
        })

    return dataset
```

---

## Production Deployment

Moving from prototype to production requires attention to performance, reliability, and observability.

### FastAPI Application

```python
# api.py
# Production-ready FastAPI application for document QA
from fastapi import FastAPI, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from typing import List, Optional
import asyncio
from contextlib import asynccontextmanager

# Import our modules
from config import initialize_llamaindex
from vector_index import create_vector_index, load_existing_index
from query_engine import create_basic_query_engine, query_with_sources

# Pydantic models for request/response validation
class QueryRequest(BaseModel):
    question: str = Field(..., min_length=1, max_length=1000)
    top_k: int = Field(default=5, ge=1, le=20)

class Source(BaseModel):
    text: str
    score: float
    metadata: dict

class QueryResponse(BaseModel):
    answer: str
    sources: List[Source]
    processing_time_ms: float

class HealthResponse(BaseModel):
    status: str
    index_loaded: bool
    document_count: int

# Global state for the application
app_state = {
    "index": None,
    "query_engine": None,
    "document_count": 0
}

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Initialize resources on startup, cleanup on shutdown"""

    # Startup: Load index and create query engine
    print("Initializing LlamaIndex...")
    initialize_llamaindex()

    print("Loading index from storage...")
    try:
        app_state["index"] = load_existing_index("./storage/vector_index")
        app_state["query_engine"] = create_basic_query_engine(
            app_state["index"],
            similarity_top_k=5
        )
        # Get document count for health check
        app_state["document_count"] = len(
            app_state["index"].docstore.docs
        )
        print(f"Index loaded with {app_state['document_count']} documents")
    except Exception as e:
        print(f"Failed to load index: {e}")
        # Application can still start, but queries will fail

    yield  # Application runs here

    # Shutdown: Cleanup resources
    print("Shutting down...")

# Create FastAPI application
app = FastAPI(
    title="Document QA API",
    description="Question answering over your documents using LlamaIndex",
    version="1.0.0",
    lifespan=lifespan
)

# CORS middleware for web frontends
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Configure for your domain in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"]
)

@app.get("/health", response_model=HealthResponse)
async def health_check():
    """Health check endpoint for load balancers and monitoring"""
    return HealthResponse(
        status="healthy" if app_state["index"] else "degraded",
        index_loaded=app_state["index"] is not None,
        document_count=app_state["document_count"]
    )

@app.post("/query", response_model=QueryResponse)
async def query_documents(request: QueryRequest):
    """
    Query the document index with a natural language question.
    Returns the answer with source citations.
    """
    import time

    if not app_state["query_engine"]:
        raise HTTPException(
            status_code=503,
            detail="Index not loaded. Please try again later."
        )

    start_time = time.time()

    try:
        # Run query in thread pool to avoid blocking
        loop = asyncio.get_event_loop()
        result = await loop.run_in_executor(
            None,
            query_with_sources,
            app_state["query_engine"],
            request.question
        )

        processing_time = (time.time() - start_time) * 1000

        return QueryResponse(
            answer=result["answer"],
            sources=[
                Source(
                    text=s["text"],
                    score=s["score"],
                    metadata=s["metadata"]
                )
                for s in result["sources"]
            ],
            processing_time_ms=round(processing_time, 2)
        )

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Query failed: {str(e)}"
        )

@app.post("/index/refresh")
async def refresh_index(background_tasks: BackgroundTasks):
    """
    Trigger index refresh from source documents.
    Runs in background to avoid blocking.
    """

    def rebuild_index():
        from document_loader import load_documents_from_directory

        documents = load_documents_from_directory("./documents")
        app_state["index"] = create_vector_index(documents)
        app_state["query_engine"] = create_basic_query_engine(
            app_state["index"]
        )
        app_state["document_count"] = len(documents)

    background_tasks.add_task(rebuild_index)

    return {"message": "Index refresh started"}

# Run with: uvicorn api:app --host 0.0.0.0 --port 8000
```

### Caching for Performance

```python
# caching.py
# Caching layer for improved query performance
from llama_index.core import VectorStoreIndex
from functools import lru_cache
import hashlib
import redis
import json
from typing import Optional

class QueryCache:
    """
    Cache query results to avoid redundant LLM calls.
    Critical for production cost control and latency.
    """

    def __init__(
        self,
        redis_url: str = "redis://localhost:6379",
        ttl_seconds: int = 3600
    ):
        self.redis = redis.from_url(redis_url)
        self.ttl = ttl_seconds

    def _cache_key(self, question: str, top_k: int) -> str:
        """Generate consistent cache key from query parameters"""
        content = f"{question}:{top_k}"
        return f"qa:{hashlib.sha256(content.encode()).hexdigest()}"

    def get(self, question: str, top_k: int) -> Optional[dict]:
        """Retrieve cached response if available"""
        key = self._cache_key(question, top_k)
        cached = self.redis.get(key)

        if cached:
            return json.loads(cached)
        return None

    def set(self, question: str, top_k: int, response: dict):
        """Cache a response with TTL"""
        key = self._cache_key(question, top_k)
        self.redis.setex(
            key,
            self.ttl,
            json.dumps(response)
        )

    def invalidate_all(self):
        """Clear all cached queries (call after index update)"""
        keys = self.redis.keys("qa:*")
        if keys:
            self.redis.delete(*keys)


def create_cached_query_function(query_engine, cache: QueryCache):
    """
    Wrap query engine with caching layer.
    """

    def cached_query(question: str, top_k: int = 5) -> dict:
        # Check cache first
        cached = cache.get(question, top_k)
        if cached:
            cached["from_cache"] = True
            return cached

        # Execute query
        from query_engine import query_with_sources
        result = query_with_sources(query_engine, question)

        # Cache the result
        cache.set(question, top_k, result)
        result["from_cache"] = False

        return result

    return cached_query
```

### Observability Integration

```python
# observability.py
# OpenTelemetry integration for production monitoring
from opentelemetry import trace
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.sdk.trace.export import BatchSpanProcessor
from opentelemetry.exporter.otlp.proto.http.trace_exporter import OTLPSpanExporter
from opentelemetry.sdk.resources import Resource
from functools import wraps
import time
import os

def setup_tracing(service_name: str = "document-qa"):
    """Configure OpenTelemetry tracing for the QA service"""

    resource = Resource.create({
        "service.name": service_name,
        "service.version": os.getenv("SERVICE_VERSION", "1.0.0")
    })

    provider = TracerProvider(resource=resource)

    # Export traces to OneUptime or your observability platform
    exporter = OTLPSpanExporter(
        endpoint=os.getenv("OTLP_ENDPOINT", "https://oneuptime.com/otlp/v1/traces"),
        headers={"x-oneuptime-token": os.getenv("ONEUPTIME_TOKEN", "")}
    )

    provider.add_span_processor(BatchSpanProcessor(exporter))
    trace.set_tracer_provider(provider)

    return trace.get_tracer(service_name)


def trace_query(tracer):
    """Decorator to trace query execution with detailed spans"""

    def decorator(func):
        @wraps(func)
        def wrapper(question: str, *args, **kwargs):
            with tracer.start_as_current_span("document_query") as span:
                # Record query metadata
                span.set_attribute("query.question", question[:100])
                span.set_attribute("query.top_k", kwargs.get("top_k", 5))

                start_time = time.time()

                try:
                    result = func(question, *args, **kwargs)

                    # Record result metadata
                    span.set_attribute("query.source_count", len(result.get("sources", [])))
                    span.set_attribute("query.from_cache", result.get("from_cache", False))
                    span.set_attribute("query.success", True)

                    return result

                except Exception as e:
                    span.set_attribute("query.success", False)
                    span.set_attribute("query.error", str(e))
                    span.record_exception(e)
                    raise

                finally:
                    duration_ms = (time.time() - start_time) * 1000
                    span.set_attribute("query.duration_ms", duration_ms)

        return wrapper
    return decorator


# Usage with query function
tracer = setup_tracing()

@trace_query(tracer)
def monitored_query(question: str, top_k: int = 5) -> dict:
    """Query with full observability"""
    # Your query logic here
    pass
```

---

## Best Practices Summary

1. **Choose the right index type** - Vector for semantic search, keyword for exact matching, hybrid for best of both
2. **Tune chunk size carefully** - Smaller chunks improve precision, larger chunks provide more context
3. **Use reranking** - Two-stage retrieval significantly improves result quality
4. **Implement caching** - Cache frequent queries to reduce latency and costs
5. **Evaluate systematically** - Measure both retrieval metrics and response quality
6. **Add observability** - Trace queries to understand performance and debug issues
7. **Handle edge cases** - What happens when no relevant documents are found?
8. **Iterate on prompts** - Custom prompts dramatically impact response quality
9. **Consider sentence windows** - Provides precise retrieval with sufficient context
10. **Monitor costs** - Track LLM token usage and embedding API calls

---

*Ready to build observable AI applications? [OneUptime](https://oneuptime.com) provides comprehensive monitoring for your LlamaIndex deployments, including LLM latency tracking, error alerting, and cost monitoring. Get full visibility into your document QA system with native OpenTelemetry support.*
