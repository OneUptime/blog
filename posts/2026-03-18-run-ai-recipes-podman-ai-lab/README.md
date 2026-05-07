# How to Run AI Recipes with Podman AI Lab

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Podman, Container, DevOps, AI, Machine Learning, Recipes, RAG, Chatbot

Description: Learn how to use the pre-built AI recipes in Podman AI Lab to quickly deploy chatbots, summarizers, and RAG applications.

---

> AI Recipes are ready-to-run application templates that pair a model with a purpose-built frontend.

Podman AI Lab includes a collection of AI Recipes, which are complete application stacks that combine a model server with a frontend application. These recipes let you deploy functional AI applications like chatbots, code generators, and retrieval-augmented generation (RAG) systems with a single click. This guide walks through discovering, running, and customizing recipes.

---

## Prerequisites

```bash
# Ensure Podman machine has enough resources for recipe containers

podman machine inspect --format 'CPUs: {{.Resources.CPUs}}, RAM: {{.Resources.Memory}}MB'

# Recipes run multiple containers, so allocate enough resources
podman machine stop
podman machine set --cpus 6 --memory 12288
podman machine start

# Verify at least one model is downloaded
podman machine ssh ls /home/user/ai-lab/models/
```

## Browsing Available Recipes

### Accessing the Recipe Catalog

1. Open Podman Desktop and navigate to **AI Apps > Recipe Catalog**.
2. Browse the catalog of available recipes.

Common recipes include:

- **Chatbot**: A conversational AI interface backed by a local LLM.
- **Summarizer**: Paste text and get AI-generated summaries.
- **Code Generation**: Generate code from natural language prompts.
- **RAG Chatbot**: Chat with your own documents using retrieval-augmented generation.
- **Object Detection**: Analyze images with a local vision model.

## Running a Recipe

### Starting the Chatbot Recipe

1. In the Recipes catalog, select **Chatbot**.
2. Choose a model to use (e.g., mistral-7b-instruct).
3. Click **Start** to launch the recipe.
4. Wait for all containers to pull and start.

```bash
# Monitor the recipe containers as they start
podman pod ps --filter "label=ai-lab-recipe-id=chatbot" \
  --format "table {{.Name}}\t{{.Status}}\t{{.Labels}}"

POD_NAME=$(podman pod ps --filter "label=ai-lab-recipe-id=chatbot" --format "{{.Name}}" | head -1)
podman ps --filter "pod=$POD_NAME" \
  --format "table {{.Names}}\t{{.Image}}\t{{.Status}}\t{{.Ports}}"

# A typical chatbot recipe runs two containers:
# 1. Model server (inference backend)
# 2. Web frontend (chat UI)

# Check logs of the model server
podman logs $(podman ps --filter "pod=$POD_NAME" --filter "name=llamacpp-server" -q) 2>&1 | tail -10

# Check logs of the frontend
podman logs $(podman ps --filter "pod=$POD_NAME" --filter "name=streamlit-chat-app" -q) 2>&1 | tail -10
```

### Accessing the Recipe Frontend

```bash
# Find the frontend port
POD_NAME=$(podman pod ps --filter "label=ai-lab-recipe-id=chatbot" --format "{{.Name}}" | head -1)
podman ps --filter "pod=$POD_NAME" --format "table {{.Names}}\t{{.Ports}}"

# The recipe frontend is typically available at:
# http://localhost:8501 (for Streamlit-based recipes run manually)
# If you started the recipe from Podman Desktop, use the
# AI App Details "Open AI App" button because the UI can assign a random port.

# Open it in your default browser
# On macOS
open http://localhost:8501

# On Linux
xdg-open http://localhost:8501
```

## Running the RAG Recipe

The RAG (Retrieval-Augmented Generation) recipe lets you chat with your own documents.

```bash
# The RAG recipe typically includes three containers:
# 1. Model server (inference backend)
# 2. Vector database (ChromaDB or similar)
# 3. Web frontend (chat UI with document upload)

# After starting the RAG recipe from the UI, verify all containers are running
podman pod ps --filter "label=ai-lab-recipe-id=rag" \
  --format "table {{.Name}}\t{{.Status}}"

# Upload documents through the web frontend:
# 1. Open the RAG frontend in your browser
# 2. Click "Upload Document"
# 3. Select a PDF or TXT file
# 4. Wait for document indexing to complete
# 5. Ask questions about your uploaded documents
```

## Managing Recipe Containers

```bash
# List all running recipe containers
podman pod ps --filter "label=ai-lab-recipe-id" --format "table {{.Name}}\t{{.Status}}\t{{.Labels}}"

POD_NAME=$(podman pod ps --filter "label=ai-lab-recipe-id=chatbot" --format "{{.Name}}" | head -1)
podman ps --filter "pod=$POD_NAME" --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"

# Check resource usage of recipe containers
podman pod stats --no-stream "$POD_NAME" \
  --format "table {{.Name}}\t{{.CPU}}\t{{.MemUsage}}"

# Stop a running recipe pod (stops all containers in the recipe)
podman pod stop $(podman pod ps --filter "label=ai-lab-recipe-id=chatbot" -q)

# Remove a stopped recipe pod
podman pod rm $(podman pod ps -a --filter "label=ai-lab-recipe-id=chatbot" -q)
```

## Customizing Recipes

### Modifying Recipe Configuration

```bash
# Recipe source code is available on GitHub
# Clone the recipes repository to make modifications
git clone https://github.com/containers/ai-lab-recipes.git
cd ai-lab-recipes

# View the available recipe directories
ls recipes/

# Each recipe contains:
# - ai-lab.yaml (recipe metadata)
# - app/Containerfile (for building the frontend)
# - app/*.py or similar (the application code)
# - app/requirements.txt (Python dependencies)
# - README.md (documentation)
```

### Building a Modified Recipe

```bash
# Navigate to a recipe directory
cd ai-lab-recipes/recipes/natural_language_processing/chatbot

# Modify the application code
# For example, change the system prompt in app/chatbot_ui.py

# Build the custom frontend container
podman build -t my-custom-chatbot:latest app/

# Run your custom recipe manually
# First, start the model server
podman run -d --name recipe-model-server \
  -p 8001:8001 \
  -v /home/user/ai-lab/models/mistral-7b-instruct-q4_0.gguf:/models/mistral-7b-instruct-q4_0.gguf:ro \
  -e MODEL_PATH=/models/mistral-7b-instruct-q4_0.gguf \
  -e HOST=0.0.0.0 \
  -e PORT=8001 \
  quay.io/ai-lab/llamacpp_python:latest

# Then start your custom frontend, connecting it to the model server
podman run -d --name recipe-frontend \
  -p 8501:8501 \
  -e MODEL_ENDPOINT=http://host.containers.internal:8001 \
  my-custom-chatbot:latest
```

## Troubleshooting Recipes

```bash
# If a recipe fails to start, check for port conflicts
podman ps --format "{{.Ports}}" | sort

# Check if containers in the recipe are crashing
POD_NAME=$(podman pod ps -a --filter "label=ai-lab-recipe-id=chatbot" --format "{{.Name}}" | head -1)
podman ps -a --filter "pod=$POD_NAME" \
  --format "table {{.Names}}\t{{.Status}}\t{{.ExitCode}}"

# View detailed logs from a failing container
podman logs --tail 50 $(podman ps -a --filter "pod=$POD_NAME" --filter "status=exited" -q | head -1)

# If the model server runs out of memory, use a smaller model
# Stop the recipe and restart with a smaller quantized model

# Clean up all recipe containers and start fresh
podman pod stop $(podman pod ps --filter "label=ai-lab-recipe-id" -q) 2>/dev/null
podman pod rm $(podman pod ps -a --filter "label=ai-lab-recipe-id" -q) 2>/dev/null
```

## Summary

AI Recipes in Podman AI Lab provide turnkey AI applications that you can deploy locally with minimal effort. From basic chatbots to document-aware RAG systems, recipes bundle a model server with a purpose-built frontend. You can run them as-is for quick experimentation or clone the recipe source code to build custom variations. Recipes are an excellent way to demonstrate AI capabilities without writing application code from scratch.
