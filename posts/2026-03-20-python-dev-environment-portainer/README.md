# How to Set Up a Python Development Environment with Portainer

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Python, Development Environment, Docker, Virtual Environments, Dev Container

Description: Learn how to set up a Python development environment with hot-reload and debugging support in a container managed by Portainer.

---

Running your Python development environment in Docker via Portainer ensures all team members use identical dependencies and eliminates "works on my machine" issues. This guide creates a Python dev container with hot-reload.

## Dev Environment Compose Stack

```yaml
services:
  python-dev:
    image: python:3.12-slim
    restart: unless-stopped
    ports:
      - "8000:8000"    # Application
      - "5678:5678"    # debugpy remote debugger
    environment:
      PYTHONDONTWRITEBYTECODE: "1"
      PYTHONUNBUFFERED: "1"
    volumes:
      # Mount your source code for hot-reload. In Portainer, replace ./src
      # with an absolute path on the Docker host unless the stack is deployed
      # from Git with Relative path volumes enabled.
      - ./src:/app
      - pip_cache:/root/.cache/pip    # Cache pip downloads
    working_dir: /app
    command: >
      sh -c "
        pip install -r requirements.txt &&
        python -m debugpy --listen 0.0.0.0:5678 -m uvicorn main:app --host 0.0.0.0 --port 8000 --reload
      "

volumes:
  pip_cache:
```

## Requirements

```text
# src/requirements.txt

fastapi
uvicorn[standard]
debugpy
httpx
pytest
pytest-asyncio
```

## Hot-Reload Development

The `--reload` flag in uvicorn watches for file changes. When you edit code in the bind-mounted source directory, the development server automatically restarts:

```python
# src/main.py
from fastapi import FastAPI

app = FastAPI()

@app.get("/")
async def root():
    # Edit this and save - hot-reload picks it up automatically
    return {"message": "Hello, Python dev environment!"}
```

## Remote Debugging with VS Code

Attach VS Code to the running container's debugpy listener:

```json
// .vscode/launch.json
{
  "configurations": [
    {
      "name": "Python Debugger: Remote Attach",
      "type": "debugpy",
      "request": "attach",
      "host": "localhost",
      "port": 5678,
      "pathMappings": [
        {
          "localRoot": "${workspaceFolder}/src",
          "remoteRoot": "/app"
        }
      ]
    }
  ]
}
```

## Running Tests in the Container

```bash
# Via Portainer Exec console or an interactive shell in the container:
cd /app && pytest tests/ -v

# Or run a specific test file
pytest tests/test_api.py -v
```
