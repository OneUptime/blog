# How to Use LlamaIndex Data Loaders

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: LlamaIndex, Data Loaders, RAG, AI, Machine Learning, Python, Vector Databases, LLM

Description: A comprehensive guide to using LlamaIndex data loaders for ingesting documents from various sources. Learn how to load PDFs, web pages, databases, and custom data sources to build powerful retrieval-augmented generation applications.

---

Building a retrieval-augmented generation (RAG) application starts with getting your data into a format that LlamaIndex can process. Data loaders serve as the bridge between your raw documents and the LlamaIndex indexing pipeline. Whether you need to ingest PDFs, scrape websites, query databases, or connect to cloud storage, LlamaIndex provides a unified interface for all these operations.

## What Are LlamaIndex Data Loaders?

Data loaders (also called readers) are components that extract content from various sources and convert them into Document objects. These Document objects contain the text content along with metadata that LlamaIndex uses for indexing and retrieval.

```mermaid
flowchart LR
    subgraph Sources
        PDF[PDF Files]
        Web[Web Pages]
        DB[Databases]
        API[APIs]
        Cloud[Cloud Storage]
    end

    subgraph DataLoaders[Data Loaders]
        PDFLoader[PDF Reader]
        WebLoader[Web Reader]
        DBLoader[Database Reader]
        APILoader[API Reader]
        CloudLoader[S3/GCS Reader]
    end

    subgraph LlamaIndex
        Docs[Document Objects]
        Index[Vector Index]
        Query[Query Engine]
    end

    PDF --> PDFLoader
    Web --> WebLoader
    DB --> DBLoader
    API --> APILoader
    Cloud --> CloudLoader

    PDFLoader --> Docs
    WebLoader --> Docs
    DBLoader --> Docs
    APILoader --> Docs
    CloudLoader --> Docs

    Docs --> Index
    Index --> Query
```

Key benefits of using data loaders:

- **Unified interface** - All loaders return Document objects with consistent structure
- **Metadata preservation** - Source information, page numbers, and custom attributes carry through
- **Extensible architecture** - Create custom loaders for proprietary data formats
- **LlamaHub ecosystem** - Hundreds of community-contributed loaders available

## Installing LlamaIndex

Before working with data loaders, install the core LlamaIndex package and any connector-specific dependencies.

The following commands install LlamaIndex along with common reader dependencies:

```bash
# Install core LlamaIndex package
pip install llama-index

# Install additional reader packages as needed
pip install llama-index-readers-file
pip install llama-index-readers-web
pip install llama-index-readers-database

# Install all common readers at once
pip install llama-index-readers-file llama-index-readers-web llama-index-readers-database

# Verify installation
python -c "from llama_index.core import SimpleDirectoryReader; print('Installation successful')"
```

## SimpleDirectoryReader: The Built-in Loader

SimpleDirectoryReader is included with the core package and handles common file types automatically. Most projects start here before needing specialized loaders.

The following code demonstrates loading documents from a directory with automatic file type detection:

```python
# SimpleDirectoryReader automatically detects and parses common file types
# including .txt, .pdf, .docx, .csv, .md, and many more
from llama_index.core import SimpleDirectoryReader

# Load all supported files from a directory
# The recursive parameter includes subdirectories
reader = SimpleDirectoryReader(
    input_dir="./documents",
    recursive=True,
    required_exts=[".pdf", ".txt", ".md"]  # Optional: filter by extension
)

# Load returns a list of Document objects
documents = reader.load_data()

# Each document contains text content and metadata
for doc in documents:
    print(f"File: {doc.metadata['file_name']}")
    print(f"Content preview: {doc.text[:200]}...")
    print("---")
```

You can also load specific files instead of entire directories:

```python
# Load specific files by providing a list of paths
from llama_index.core import SimpleDirectoryReader

# Specify exact files to load
reader = SimpleDirectoryReader(
    input_files=[
        "./reports/q1-financials.pdf",
        "./reports/q2-financials.pdf",
        "./notes/meeting-notes.txt"
    ]
)

documents = reader.load_data()
print(f"Loaded {len(documents)} documents")
```

## PDF Reader

PDF documents require specialized parsing to handle complex layouts, tables, and embedded images. The PDF reader extracts text while preserving page structure.

The following example shows how to load and process PDF files with page-level metadata:

```python
# PDFReader provides granular control over PDF parsing
# Each page becomes a separate Document by default
from llama_index.readers.file import PDFReader

# Initialize the reader
pdf_reader = PDFReader()

# Load a single PDF file
# return_full_document=False creates one Document per page
documents = pdf_reader.load_data(
    file="./documents/technical-manual.pdf",
    return_full_document=False
)

# Access page-specific metadata
for doc in documents:
    page_num = doc.metadata.get("page_label", "unknown")
    print(f"Page {page_num}: {len(doc.text)} characters")
```

For more advanced PDF processing with OCR and table extraction, use the LlamaParse service:

```python
# LlamaParse handles complex PDFs with tables, images, and multi-column layouts
# Requires an API key from cloud.llamaindex.ai
from llama_index.readers.file import LlamaParse

# Initialize with your API key
parser = LlamaParse(
    api_key="your-api-key",
    result_type="markdown",  # Output format: markdown or text
    num_workers=4,  # Parallel processing
    verbose=True
)

# Parse complex documents
documents = parser.load_data("./documents/research-paper.pdf")

# The output preserves table structure in markdown format
print(documents[0].text)
```

## Web Page Reader

Fetching and parsing web content enables building knowledge bases from online sources. The web reader handles HTML parsing and content extraction.

The following code demonstrates loading content from web pages:

```python
# SimpleWebPageReader fetches and parses HTML content
# BeautifulSoup handles the HTML parsing automatically
from llama_index.readers.web import SimpleWebPageReader

# Initialize with a list of URLs
reader = SimpleWebPageReader(
    html_to_text=True  # Convert HTML to plain text
)

# Load content from multiple URLs
urls = [
    "https://docs.python.org/3/tutorial/index.html",
    "https://docs.python.org/3/library/functions.html"
]

documents = reader.load_data(urls=urls)

# Each URL becomes a Document with source metadata
for doc in documents:
    print(f"URL: {doc.metadata['url']}")
    print(f"Content length: {len(doc.text)} characters")
```

For crawling entire websites, use the recursive web reader:

```python
# WholeSiteReader crawls multiple pages following links
# Useful for ingesting documentation sites
from llama_index.readers.web import WholeSiteReader

# Initialize the crawler with depth limits
reader = WholeSiteReader(
    prefix="https://docs.example.com",  # Only follow links matching this prefix
    max_depth=3  # Maximum crawl depth
)

# Start crawling from the base URL
documents = reader.load_data(
    base_url="https://docs.example.com/getting-started"
)

print(f"Crawled {len(documents)} pages")
```

## Database Reader

Loading data from SQL databases allows incorporating structured data into your RAG pipeline. The database reader executes queries and converts results to documents.

The following example shows connecting to a PostgreSQL database and loading query results:

```python
# DatabaseReader connects to SQL databases via SQLAlchemy
# Supports PostgreSQL, MySQL, SQLite, and other SQLAlchemy-compatible databases
from llama_index.readers.database import DatabaseReader

# Create a database connection using SQLAlchemy connection string
reader = DatabaseReader(
    uri="postgresql://user:password@localhost:5432/mydb"
)

# Execute a query and load results as documents
# Each row becomes a Document by default
documents = reader.load_data(
    query="SELECT title, content, created_at FROM articles WHERE published = true"
)

# Access query results
for doc in documents:
    print(f"Article: {doc.text[:100]}...")
```

For more complex scenarios, customize how rows map to documents:

```python
# Custom row-to-document mapping for structured data
from llama_index.readers.database import DatabaseReader

reader = DatabaseReader(
    uri="postgresql://user:password@localhost:5432/mydb"
)

# Define a custom query with specific columns
query = """
    SELECT
        p.title,
        p.body,
        u.name as author,
        c.name as category
    FROM posts p
    JOIN users u ON p.author_id = u.id
    JOIN categories c ON p.category_id = c.id
    WHERE p.status = 'published'
    ORDER BY p.created_at DESC
    LIMIT 1000
"""

documents = reader.load_data(query=query)

# The reader combines all columns into the document text
# Metadata contains column information
print(f"Loaded {len(documents)} published posts")
```

## Cloud Storage Readers

S3, Google Cloud Storage, and Azure Blob readers enable loading documents directly from cloud storage buckets.

The following code demonstrates loading files from Amazon S3:

```python
# S3Reader loads files directly from S3 buckets
# Requires boto3 and proper AWS credentials
from llama_index.readers.s3 import S3Reader

# Initialize with bucket name and optional prefix
reader = S3Reader(
    bucket="my-documents-bucket",
    prefix="reports/2024/",  # Optional: filter by prefix
    aws_access_id="your-access-key",  # Or use environment variables
    aws_access_secret="your-secret-key"
)

# Load all matching files
documents = reader.load_data()

# S3 metadata is preserved
for doc in documents:
    print(f"S3 Key: {doc.metadata['file_name']}")
```

Google Cloud Storage follows a similar pattern:

```python
# GCSReader loads files from Google Cloud Storage
# Requires google-cloud-storage package
from llama_index.readers.gcs import GCSReader

# Initialize with project and bucket information
reader = GCSReader(
    project_id="your-gcp-project",
    bucket="your-bucket-name",
    prefix="documents/"
)

# Load documents with GCS metadata
documents = reader.load_data()
print(f"Loaded {len(documents)} documents from GCS")
```

## Notion Reader

The Notion reader extracts content from Notion workspaces, enabling RAG applications over team knowledge bases.

The following example demonstrates connecting to Notion and loading page content:

```python
# NotionPageReader loads content from Notion pages and databases
# Requires a Notion integration token with read access
from llama_index.readers.notion import NotionPageReader

# Initialize with your integration token
reader = NotionPageReader(
    integration_token="your-notion-integration-token"
)

# Load specific pages by ID
page_ids = [
    "page-id-1",
    "page-id-2"
]

documents = reader.load_data(page_ids=page_ids)

# Load an entire database
database_id = "your-database-id"
documents = reader.load_data(database_id=database_id)

# Notion metadata includes page titles and properties
for doc in documents:
    print(f"Title: {doc.metadata.get('title', 'Untitled')}")
```

## Slack Reader

Loading Slack conversations creates searchable archives of team discussions and decisions.

The following code shows how to load messages from Slack channels:

```python
# SlackReader loads messages from Slack channels
# Requires a Slack Bot token with appropriate scopes
from llama_index.readers.slack import SlackReader

# Initialize with your bot token
reader = SlackReader(
    slack_token="xoxb-your-bot-token"
)

# Load messages from specific channels
# Use channel IDs, not names
channel_ids = [
    "C01234567",  # general
    "C89012345"   # engineering
]

documents = reader.load_data(
    channel_ids=channel_ids,
    earliest_date="2024-01-01",  # Optional: filter by date
    latest_date="2024-12-31"
)

# Each message becomes a Document with conversation context
for doc in documents:
    print(f"Channel: {doc.metadata['channel']}")
    print(f"Message: {doc.text[:100]}...")
```

## GitHub Reader

The GitHub reader loads repository content including code, documentation, and issues.

The following example demonstrates loading repository files:

```python
# GithubRepositoryReader loads files from GitHub repositories
# Supports filtering by file type and directory
from llama_index.readers.github import GithubRepositoryReader

# Initialize with authentication
reader = GithubRepositoryReader(
    github_token="your-github-token",
    owner="organization",
    repo="repository-name",
    filter_file_extensions=[".md", ".py", ".txt"],  # File types to include
    filter_directories=["docs", "src"]  # Directories to include
)

# Load repository contents
documents = reader.load_data(branch="main")

# Each file becomes a Document with path metadata
for doc in documents:
    print(f"File: {doc.metadata['file_path']}")
```

Loading GitHub issues provides context about project discussions:

```python
# GithubIssuesReader loads issues and pull requests
from llama_index.readers.github import GithubIssuesReader

reader = GithubIssuesReader(
    github_token="your-github-token",
    owner="organization",
    repo="repository-name"
)

# Load open issues
documents = reader.load_data(state="open")

# Issue metadata includes labels, assignees, and timestamps
for doc in documents:
    print(f"Issue #{doc.metadata['issue_number']}: {doc.metadata['title']}")
```

## Custom Data Loaders

When existing loaders do not fit your needs, create custom loaders by extending the BaseReader class.

The following diagram shows the custom loader architecture:

```mermaid
flowchart TD
    subgraph CustomLoader[Custom Data Loader]
        Init[__init__]
        Load[load_data]
        Parse[parse_content]
    end

    subgraph BaseReader
        Interface[Abstract load_data method]
    end

    subgraph Output
        Docs[List of Documents]
    end

    BaseReader --> CustomLoader
    Init --> Load
    Load --> Parse
    Parse --> Docs
```

Here is a complete example of a custom loader for a REST API:

```python
# Custom loader for loading data from a REST API
# Extends BaseReader to integrate with the LlamaIndex ecosystem
from typing import List
from llama_index.core.readers.base import BaseReader
from llama_index.core.schema import Document
import requests


class CustomAPIReader(BaseReader):
    """Reader for loading documents from a custom REST API."""

    def __init__(
        self,
        api_base_url: str,
        api_key: str,
        timeout: int = 30
    ):
        """
        Initialize the API reader.

        Args:
            api_base_url: Base URL of the API
            api_key: Authentication key
            timeout: Request timeout in seconds
        """
        self.api_base_url = api_base_url.rstrip("/")
        self.api_key = api_key
        self.timeout = timeout
        self.session = requests.Session()
        self.session.headers.update({
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json"
        })

    def load_data(
        self,
        endpoint: str,
        params: dict = None
    ) -> List[Document]:
        """
        Load documents from the API endpoint.

        Args:
            endpoint: API endpoint path
            params: Query parameters

        Returns:
            List of Document objects
        """
        url = f"{self.api_base_url}/{endpoint.lstrip('/')}"

        response = self.session.get(
            url,
            params=params,
            timeout=self.timeout
        )
        response.raise_for_status()

        data = response.json()

        # Convert API response to Documents
        documents = []
        for item in data.get("items", []):
            doc = Document(
                text=item.get("content", ""),
                metadata={
                    "id": item.get("id"),
                    "title": item.get("title"),
                    "source": url,
                    "created_at": item.get("created_at")
                }
            )
            documents.append(doc)

        return documents


# Usage example
reader = CustomAPIReader(
    api_base_url="https://api.example.com/v1",
    api_key="your-api-key"
)

documents = reader.load_data(
    endpoint="/articles",
    params={"category": "technology", "limit": 100}
)
```

## Loading and Transforming Documents

After loading documents, you often need to transform them before indexing. LlamaIndex provides transformation pipelines for common operations.

The following diagram illustrates the transformation pipeline:

```mermaid
flowchart LR
    Load[Data Loader] --> Docs[Documents]
    Docs --> Split[Text Splitter]
    Split --> Chunks[Chunks]
    Chunks --> Meta[Metadata Extractor]
    Meta --> Embed[Embedding Model]
    Embed --> Index[Vector Index]
```

The following code demonstrates a complete loading and transformation pipeline:

```python
# Complete pipeline from loading to indexing
# Combines data loading with text splitting and metadata extraction
from llama_index.core import SimpleDirectoryReader, VectorStoreIndex
from llama_index.core.node_parser import SentenceSplitter
from llama_index.core.extractors import (
    TitleExtractor,
    QuestionsAnsweredExtractor
)
from llama_index.core.ingestion import IngestionPipeline

# Step 1: Load documents from various sources
reader = SimpleDirectoryReader(
    input_dir="./documents",
    recursive=True
)
documents = reader.load_data()

# Step 2: Create transformation pipeline
# Transformations are applied in order
pipeline = IngestionPipeline(
    transformations=[
        # Split documents into smaller chunks
        SentenceSplitter(
            chunk_size=1024,
            chunk_overlap=200
        ),
        # Extract titles from content
        TitleExtractor(),
        # Generate potential questions each chunk answers
        QuestionsAnsweredExtractor(questions=3)
    ]
)

# Step 3: Run the pipeline
nodes = pipeline.run(documents=documents)

# Step 4: Create index from processed nodes
index = VectorStoreIndex(nodes)

# Now ready for querying
query_engine = index.as_query_engine()
response = query_engine.query("What are the key features?")
print(response)
```

## Handling Large Document Collections

Processing thousands of documents requires efficient batch loading and memory management.

The following code shows strategies for handling large collections:

```python
# Batch processing for large document collections
# Prevents memory issues by processing in chunks
from llama_index.core import SimpleDirectoryReader, VectorStoreIndex
from llama_index.core.node_parser import SentenceSplitter
import os

def process_documents_in_batches(
    input_dir: str,
    batch_size: int = 100
) -> VectorStoreIndex:
    """
    Process large document collections in batches.

    Args:
        input_dir: Directory containing documents
        batch_size: Number of files to process at once

    Returns:
        VectorStoreIndex containing all documents
    """
    # Get list of all files
    all_files = []
    for root, dirs, files in os.walk(input_dir):
        for file in files:
            all_files.append(os.path.join(root, file))

    print(f"Found {len(all_files)} files to process")

    # Initialize components
    splitter = SentenceSplitter(chunk_size=1024)
    all_nodes = []

    # Process in batches
    for i in range(0, len(all_files), batch_size):
        batch_files = all_files[i:i + batch_size]

        print(f"Processing batch {i // batch_size + 1}: {len(batch_files)} files")

        # Load batch
        reader = SimpleDirectoryReader(input_files=batch_files)
        documents = reader.load_data()

        # Transform to nodes
        nodes = splitter.get_nodes_from_documents(documents)
        all_nodes.extend(nodes)

        # Clear documents from memory
        del documents

    # Create index from all nodes
    print(f"Creating index with {len(all_nodes)} nodes")
    index = VectorStoreIndex(all_nodes)

    return index


# Usage
index = process_documents_in_batches(
    input_dir="./large_document_collection",
    batch_size=50
)
```

## Combining Multiple Data Sources

Real applications often need data from multiple sources. Combining loaders creates unified knowledge bases.

The following example demonstrates merging documents from different sources:

```python
# Combining multiple data sources into a unified index
# Each source can have different loaders and configurations
from llama_index.core import SimpleDirectoryReader, VectorStoreIndex
from llama_index.readers.web import SimpleWebPageReader
from llama_index.readers.database import DatabaseReader
from llama_index.core.schema import Document

def load_from_multiple_sources() -> list:
    """
    Load and combine documents from multiple sources.

    Returns:
        Combined list of Documents
    """
    all_documents = []

    # Source 1: Local PDF files
    print("Loading local documents...")
    local_reader = SimpleDirectoryReader(
        input_dir="./documents",
        required_exts=[".pdf", ".txt"]
    )
    local_docs = local_reader.load_data()

    # Add source identifier to metadata
    for doc in local_docs:
        doc.metadata["source_type"] = "local_file"
    all_documents.extend(local_docs)

    # Source 2: Web documentation
    print("Loading web content...")
    web_reader = SimpleWebPageReader(html_to_text=True)
    web_docs = web_reader.load_data(urls=[
        "https://docs.example.com/guide",
        "https://docs.example.com/api"
    ])

    for doc in web_docs:
        doc.metadata["source_type"] = "web"
    all_documents.extend(web_docs)

    # Source 3: Database records
    print("Loading database content...")
    db_reader = DatabaseReader(
        uri="postgresql://user:pass@localhost/db"
    )
    db_docs = db_reader.load_data(
        query="SELECT content FROM knowledge_base WHERE active = true"
    )

    for doc in db_docs:
        doc.metadata["source_type"] = "database"
    all_documents.extend(db_docs)

    print(f"Total documents loaded: {len(all_documents)}")
    return all_documents


# Load and index combined documents
documents = load_from_multiple_sources()
index = VectorStoreIndex.from_documents(documents)

# Query with source filtering
query_engine = index.as_query_engine(
    filters={"source_type": "web"}  # Only search web sources
)
```

## Error Handling and Retry Logic

Production systems need robust error handling when loading documents from external sources.

The following code demonstrates implementing retry logic and error handling:

```python
# Robust document loading with retry logic and error handling
# Handles transient failures gracefully
from llama_index.core import SimpleDirectoryReader
from llama_index.readers.web import SimpleWebPageReader
from llama_index.core.schema import Document
import time
from typing import List, Optional
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


def load_with_retry(
    loader_func,
    max_retries: int = 3,
    retry_delay: float = 1.0
) -> Optional[List[Document]]:
    """
    Load documents with retry logic.

    Args:
        loader_func: Callable that returns documents
        max_retries: Maximum number of retry attempts
        retry_delay: Delay between retries in seconds

    Returns:
        List of Documents or None if all retries fail
    """
    last_exception = None

    for attempt in range(max_retries):
        try:
            documents = loader_func()
            logger.info(f"Successfully loaded {len(documents)} documents")
            return documents

        except Exception as e:
            last_exception = e
            logger.warning(
                f"Attempt {attempt + 1}/{max_retries} failed: {str(e)}"
            )

            if attempt < max_retries - 1:
                time.sleep(retry_delay * (attempt + 1))  # Exponential backoff

    logger.error(f"All {max_retries} attempts failed: {str(last_exception)}")
    return None


def load_web_pages_safely(urls: List[str]) -> List[Document]:
    """
    Load web pages with per-URL error handling.

    Args:
        urls: List of URLs to load

    Returns:
        List of successfully loaded Documents
    """
    all_documents = []
    failed_urls = []

    reader = SimpleWebPageReader(html_to_text=True)

    for url in urls:
        def load_single():
            return reader.load_data(urls=[url])

        documents = load_with_retry(load_single)

        if documents:
            all_documents.extend(documents)
        else:
            failed_urls.append(url)

    if failed_urls:
        logger.warning(f"Failed to load {len(failed_urls)} URLs: {failed_urls}")

    return all_documents


# Usage example
urls = [
    "https://example.com/page1",
    "https://example.com/page2",
    "https://example.com/page3"
]

documents = load_web_pages_safely(urls)
print(f"Successfully loaded {len(documents)} documents")
```

## Best Practices

Follow these guidelines when working with LlamaIndex data loaders.

### 1. Add Meaningful Metadata

Metadata enables filtering and improves retrieval quality:

```python
# Adding custom metadata during loading
from llama_index.core import SimpleDirectoryReader
from llama_index.core.schema import Document

# Use file_metadata parameter to add custom metadata
def add_custom_metadata(file_path: str) -> dict:
    """Generate metadata based on file path."""
    return {
        "department": file_path.split("/")[2],
        "document_type": "policy" if "policy" in file_path else "general",
        "confidentiality": "internal"
    }

reader = SimpleDirectoryReader(
    input_dir="./documents",
    file_metadata=add_custom_metadata
)

documents = reader.load_data()
```

### 2. Validate Document Content

Check document quality before indexing:

```python
# Validate documents before indexing
def validate_documents(documents: list) -> list:
    """Filter out invalid or low-quality documents."""
    valid_docs = []

    for doc in documents:
        # Skip empty documents
        if not doc.text or len(doc.text.strip()) < 50:
            continue

        # Skip documents that are mostly whitespace
        text_ratio = len(doc.text.strip()) / len(doc.text)
        if text_ratio < 0.5:
            continue

        valid_docs.append(doc)

    print(f"Validated {len(valid_docs)}/{len(documents)} documents")
    return valid_docs
```

### 3. Use Appropriate Chunk Sizes

Match chunk size to your use case:

```python
# Configure chunk size based on content type
from llama_index.core.node_parser import SentenceSplitter

# Smaller chunks for Q&A applications
qa_splitter = SentenceSplitter(chunk_size=512, chunk_overlap=50)

# Larger chunks for summarization
summary_splitter = SentenceSplitter(chunk_size=2048, chunk_overlap=200)

# Code-aware splitting for source code
code_splitter = SentenceSplitter(
    chunk_size=1024,
    chunk_overlap=100,
    separator="\n\n"  # Split on double newlines
)
```

### 4. Cache Loaded Documents

Avoid reloading unchanged documents:

```python
# Simple document caching with pickle
import pickle
import os
import hashlib

def load_with_cache(input_dir: str, cache_file: str) -> list:
    """Load documents with caching."""

    # Generate cache key from directory contents
    file_list = []
    for root, dirs, files in os.walk(input_dir):
        for f in files:
            path = os.path.join(root, f)
            mtime = os.path.getmtime(path)
            file_list.append(f"{path}:{mtime}")

    cache_key = hashlib.md5("".join(sorted(file_list)).encode()).hexdigest()

    # Check cache
    if os.path.exists(cache_file):
        with open(cache_file, "rb") as f:
            cached = pickle.load(f)
            if cached.get("key") == cache_key:
                print("Using cached documents")
                return cached["documents"]

    # Load fresh
    print("Loading documents from source")
    from llama_index.core import SimpleDirectoryReader
    reader = SimpleDirectoryReader(input_dir=input_dir)
    documents = reader.load_data()

    # Save to cache
    with open(cache_file, "wb") as f:
        pickle.dump({"key": cache_key, "documents": documents}, f)

    return documents
```

---

Data loaders form the foundation of any LlamaIndex application. Starting with SimpleDirectoryReader covers most common scenarios, while specialized readers handle specific sources like databases, cloud storage, and APIs. When building production systems, implement proper error handling and validation to ensure reliable document ingestion. The extensive LlamaHub ecosystem provides ready-made loaders for nearly any data source you might encounter.
