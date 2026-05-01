# How to Deploy Open WebUI for AI Chat via Portainer

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Open WebUI, Ollama, AI, Portainer, Docker, LLM, Self-Hosted

Description: Deploy Open WebUI alongside Ollama using Portainer to provide a ChatGPT-like web interface for your team to interact with locally-running large language models.

---

Open WebUI (formerly Ollama WebUI) is a feature-rich, self-hosted web interface for LLMs that supports Ollama backends as well as OpenAI-compatible APIs. Pairing it with Ollama via a Portainer stack gives your team a private ChatGPT experience on your own infrastructure.

## Step 1: Deploy the Stack

```yaml
# open-webui-stack.yml

version: "3.8"

services:
  ollama:
    image: ollama/ollama:latest
    volumes:
      - ollama-data:/root/.ollama
    restart: unless-stopped
    networks:
      - ai-net
    # Add GPU resources below if NVIDIA GPU is available:
    # deploy:
    #   resources:
    #     reservations:
    #       devices:
    #         - driver: nvidia
    #           count: all
    #           capabilities: [gpu]

  open-webui:
    image: ghcr.io/open-webui/open-webui:main
    environment:
      # Point Open WebUI at the Ollama service in this stack
      - OLLAMA_BASE_URL=http://ollama:11434
      # Optional: also connect to OpenAI API
      # - OPENAI_API_KEY=your-openai-key
    volumes:
      - open-webui-data:/app/backend/data
    ports:
      - "3000:8080"    # Open WebUI accessible at http://host:3000
    depends_on:
      - ollama
    restart: unless-stopped
    networks:
      - ai-net

volumes:
  ollama-data:
  open-webui-data:

networks:
  ai-net:
    driver: bridge
```

## Step 2: Pull Models into Ollama

After deploying the stack, use the Portainer console to pull models into the Ollama container:

```bash
# Enter the Ollama container via Portainer's console tab
ollama pull llama3
ollama pull mistral
ollama pull codellama

# List available models
ollama list
```

Or pull models directly from the Open WebUI admin interface at `http://<host>:3000` under **Admin Settings > Connections > Ollama**.

## Step 3: Configure Open WebUI

Access the UI at `http://<host>:3000`:

1. **Create admin account** on first login
2. **Configure provider connections** under **Admin Settings > Connections**
3. **Set up user accounts** for team members
4. **Configure RAG** (Retrieval-Augmented Generation) by uploading documents in **Workspace > Knowledge**

## Step 4: Enable Document RAG

Open WebUI supports uploading documents into Knowledge for use as context in conversations:

1. Create a knowledge base in **Workspace > Knowledge**
2. Upload PDFs, markdown files, or text documents
3. Reference the knowledge base in conversations: `#knowledge-base-name`
4. The model can use the documents as context for answers

To use a separate ChromaDB server for RAG storage, update the `open-webui` service:

```yaml
# Update the open-webui service
environment:
  - OLLAMA_BASE_URL=http://ollama:11434
  - VECTOR_DB=chroma
  - CHROMA_HTTP_HOST=chromadb
  - CHROMA_HTTP_PORT=8000
depends_on:
  - ollama
  - chromadb
```

Add ChromaDB to the stack and add `chromadb-data` under the existing top-level `volumes` block:

```yaml
  chromadb:
    image: chromadb/chroma:0.5.15
    environment:
      - IS_PERSISTENT=TRUE
      - ALLOW_RESET=TRUE
      - PERSIST_DIRECTORY=/chroma/chroma
    volumes:
      - chromadb-data:/chroma/chroma
    networks:
      - ai-net

volumes:
  chromadb-data:
```

## Step 5: HTTPS with Nginx Reverse Proxy

For production use, put Open WebUI behind Nginx with TLS and set the public URL in Open WebUI:

```yaml
# Add to the open-webui service environment
- WEBUI_URL=https://ai.example.com
- CORS_ALLOW_ORIGIN=https://ai.example.com
```

Then add Nginx to the stack:

```yaml
  nginx:
    image: nginx:1.25-alpine
    volumes:
      - /opt/nginx/nginx.conf:/etc/nginx/nginx.conf:ro
      - /opt/certs:/etc/nginx/certs:ro
    ports:
      - "443:443"
    depends_on:
      - open-webui
    networks:
      - ai-net
```

```nginx
# /opt/nginx/nginx.conf
events {}

http {
    server {
        listen 443 ssl;
        server_name ai.example.com;

        ssl_certificate /etc/nginx/certs/server.crt;
        ssl_certificate_key /etc/nginx/certs/server.key;

        location / {
            # Proxy to Open WebUI with WebSocket and streaming support
            proxy_pass http://open-webui:8080;
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection "upgrade";
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
            proxy_buffering off;
            proxy_cache off;
            client_max_body_size 20M;
            proxy_read_timeout 1800;
            proxy_send_timeout 1800;
            proxy_connect_timeout 1800;
        }
    }
}
```

## Summary

Open WebUI with Ollama via Portainer gives your team a self-hosted AI chat platform. When you keep the backend local to Ollama, your chat traffic stays on your infrastructure, models are customizable, and Portainer handles deployment and updates. It's a practical replacement for ChatGPT for teams with data privacy requirements.
