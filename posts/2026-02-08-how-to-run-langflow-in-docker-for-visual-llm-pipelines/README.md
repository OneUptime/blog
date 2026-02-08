# How to Run LangFlow in Docker for Visual LLM Pipelines

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: docker, langflow, llm, langchain, visual pipelines, ai, docker compose, workflow

Description: Deploy LangFlow in Docker to build and test LangChain-based LLM pipelines through an interactive visual flow editor with drag-and-drop components.

---

LangFlow is a visual tool for building LangChain applications. It provides a React-based flow editor where you drag and connect components to create LLM pipelines. Each component represents a LangChain abstraction like a prompt template, language model, memory module, or tool. What sets LangFlow apart is its tight integration with LangChain's ecosystem and the ability to export flows as Python code. Docker deployment gives you a consistent environment for both development and production.

## Key Features

LangFlow brings several capabilities to the table:

- Visual flow editor built on React Flow
- Full LangChain component library available as drag-and-drop nodes
- Python code export for any flow you build
- Built-in chat interface for testing conversational flows
- API endpoints for every flow
- Custom component support for extending functionality
- Multi-user support with project management

## Quick Start

Get LangFlow running in seconds.

```bash
# Run LangFlow with persistent storage
docker run -d \
  --name langflow \
  -p 7860:7860 \
  -v langflow_data:/app/langflow \
  langflowai/langflow:latest
```

Open `http://localhost:7860` to access the visual editor.

## Docker Compose Setup

A more complete setup with environment configuration.

```yaml
# docker-compose.yml
# LangFlow with persistent storage and configuration
version: "3.8"

services:
  langflow:
    image: langflowai/langflow:latest
    container_name: langflow
    ports:
      - "7860:7860"
    volumes:
      # Persist flows, database, and configuration
      - langflow_data:/app/langflow
    environment:
      # Database configuration (SQLite by default)
      - LANGFLOW_DATABASE_URL=sqlite:////app/langflow/langflow.db
      # Auto-login for development (disable for production)
      - LANGFLOW_AUTO_LOGIN=true
      # Log level
      - LANGFLOW_LOG_LEVEL=info
      # Worker configuration
      - LANGFLOW_WORKERS=1
    restart: unless-stopped

volumes:
  langflow_data:
```

```bash
# Start LangFlow
docker compose up -d

# Watch the startup logs
docker compose logs -f langflow
```

## Production Setup with PostgreSQL

For production, switch to PostgreSQL for better performance and reliability.

```yaml
# docker-compose-prod.yml
# Production LangFlow with PostgreSQL backend
version: "3.8"

services:
  langflow:
    image: langflowai/langflow:latest
    container_name: langflow
    ports:
      - "7860:7860"
    volumes:
      - langflow_data:/app/langflow
    environment:
      # PostgreSQL connection string
      - LANGFLOW_DATABASE_URL=postgresql://langflow:securepassword@postgres:5432/langflow
      # Disable auto-login for production
      - LANGFLOW_AUTO_LOGIN=false
      # Superuser credentials
      - LANGFLOW_SUPERUSER=admin
      - LANGFLOW_SUPERUSER_PASSWORD=your-admin-password
      # Number of worker processes
      - LANGFLOW_WORKERS=2
      - LANGFLOW_LOG_LEVEL=warning
    depends_on:
      postgres:
        condition: service_healthy
    restart: unless-stopped

  postgres:
    image: postgres:16-alpine
    container_name: langflow-db
    volumes:
      - langflow_pg_data:/var/lib/postgresql/data
    environment:
      - POSTGRES_USER=langflow
      - POSTGRES_PASSWORD=securepassword
      - POSTGRES_DB=langflow
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U langflow"]
      interval: 10s
      timeout: 5s
      retries: 5
    restart: unless-stopped

volumes:
  langflow_data:
  langflow_pg_data:
```

```bash
# Deploy the production stack
docker compose -f docker-compose-prod.yml up -d

# Verify services
docker compose -f docker-compose-prod.yml ps
```

## Full Local AI Stack

Deploy LangFlow with Ollama for completely local LLM processing.

```yaml
# docker-compose-local.yml
# LangFlow with Ollama and ChromaDB for a fully local AI stack
version: "3.8"

services:
  langflow:
    image: langflowai/langflow:latest
    container_name: langflow
    ports:
      - "7860:7860"
    volumes:
      - langflow_data:/app/langflow
    environment:
      - LANGFLOW_AUTO_LOGIN=true
    depends_on:
      - ollama
      - chromadb
    restart: unless-stopped

  ollama:
    image: ollama/ollama:latest
    container_name: langflow-ollama
    volumes:
      - ollama_data:/root/.ollama
    ports:
      - "11434:11434"
    # Uncomment for GPU support
    # deploy:
    #   resources:
    #     reservations:
    #       devices:
    #         - driver: nvidia
    #           count: all
    #           capabilities: [gpu]
    restart: unless-stopped

  chromadb:
    image: chromadb/chroma:latest
    container_name: langflow-chroma
    volumes:
      - chroma_data:/chroma/chroma
    ports:
      - "8000:8000"
    restart: unless-stopped

volumes:
  langflow_data:
  ollama_data:
  chroma_data:
```

```bash
# Start the local stack
docker compose -f docker-compose-local.yml up -d

# Pull models for Ollama
docker exec langflow-ollama ollama pull llama3.1
docker exec langflow-ollama ollama pull nomic-embed-text

# Verify all services are running
docker compose -f docker-compose-local.yml ps
```

## Building a Flow in the UI

Here is how to create a basic chatbot flow:

1. Open `http://localhost:7860`
2. Click "New Project" and choose "Blank Flow"
3. From the sidebar, drag these components onto the canvas:

**Chat Input** - Receives user messages
**Prompt** - Defines the system prompt template
**Ollama** (or OpenAI) - The language model
**Chat Output** - Displays the response

4. Connect the components:

```mermaid
graph LR
    A["Chat Input"] --> B["Prompt Template"]
    B --> C["Ollama LLM"]
    C --> D["Chat Output"]
```

5. Configure the Ollama node with the base URL `http://ollama:11434` and select your model
6. Click the Play button to test the flow in the built-in chat panel

## Building a RAG Flow

For a retrieval-augmented generation pipeline:

1. Create a new flow
2. Add these components:

**File Loader** - Load PDF or text documents
**Recursive Character Text Splitter** - Chunk documents
**Ollama Embeddings** - Generate vector embeddings
**Chroma** - Store and retrieve vectors
**Chat Input** - User queries
**Prompt** - RAG prompt template with context variable
**Ollama** - Language model for generation
**Chat Output** - Response display

3. Connect them according to the RAG pattern:

```mermaid
graph TD
    A["File Loader"] --> B["Text Splitter"]
    B --> C["Chroma Vector Store"]
    D["Ollama Embeddings"] --> C
    E["Chat Input"] --> F["Prompt Template"]
    C --> F
    F --> G["Ollama LLM"]
    G --> H["Chat Output"]
```

4. In the Chroma node configuration, set the host to `chromadb` and port to `8000`

## Using the LangFlow API

Every flow gets an API endpoint automatically.

```bash
# Get the flow ID from the LangFlow UI (bottom of the flow editor)

# Run a flow via the API
curl -X POST http://localhost:7860/api/v1/run/<flow-id> \
  -H "Content-Type: application/json" \
  -d '{
    "input_value": "What is containerization?",
    "output_type": "chat",
    "input_type": "chat"
  }' | python3 -m json.tool
```

```python
# langflow_client.py
# Python client for LangFlow API
import requests

LANGFLOW_URL = "http://localhost:7860"
FLOW_ID = "your-flow-id"

def run_flow(message, tweaks=None):
    """Send a message to a LangFlow flow and get the response."""
    payload = {
        "input_value": message,
        "output_type": "chat",
        "input_type": "chat",
    }
    if tweaks:
        payload["tweaks"] = tweaks

    response = requests.post(
        f"{LANGFLOW_URL}/api/v1/run/{FLOW_ID}",
        json=payload
    )
    data = response.json()

    # Extract the output text
    outputs = data.get("outputs", [])
    if outputs:
        results = outputs[0].get("outputs", [])
        if results:
            return results[0].get("results", {}).get("message", {}).get("text", "")
    return "No response"

# Test the flow
answer = run_flow("Explain Docker volumes in simple terms")
print(f"Response: {answer}")
```

## Exporting Flows as Python Code

One of LangFlow's strongest features is the ability to export any visual flow as standalone Python code. Click the "Code" button in the flow editor to see the generated code. This is valuable for:

- Moving from prototype to production
- Version controlling your flows in git
- Customizing behavior beyond what the visual editor supports
- Running flows in environments without the LangFlow UI

## Custom Components

LangFlow supports custom components written in Python.

```python
# custom_component.py
# A custom LangFlow component that adds logging to LLM responses
from langflow import CustomComponent
from langchain.schema import Document

class ResponseLogger(CustomComponent):
    display_name = "Response Logger"
    description = "Logs LLM responses to a file"

    def build_config(self):
        return {
            "input_text": {"display_name": "Input Text"},
            "log_file": {"display_name": "Log File Path", "value": "/app/langflow/responses.log"},
        }

    def build(self, input_text: str, log_file: str) -> str:
        with open(log_file, "a") as f:
            f.write(f"{input_text}\n---\n")
        return input_text
```

Place custom components in the custom components directory and they appear in the sidebar.

## Backup and Monitoring

```bash
# Backup LangFlow data
docker run --rm \
  -v langflow_data:/data \
  -v $(pwd):/backup \
  alpine tar czf /backup/langflow-backup.tar.gz -C /data .

# Monitor resources
docker stats langflow

# View logs
docker compose logs -f langflow

# Check health
curl http://localhost:7860/health
```

## Updating LangFlow

```bash
# Pull the latest version
docker compose pull

# Recreate the container
docker compose up -d

# Check version in the logs
docker compose logs langflow | head -10
```

## Summary

LangFlow in Docker gives you a visual environment for building LangChain-based LLM pipelines. The drag-and-drop interface makes it fast to prototype, while the Python code export lets you move to production. Docker handles the dependencies, and the combination with Ollama and ChromaDB provides a fully self-hosted AI development platform. The automatic API generation means every flow you build is immediately available as a service endpoint.
