# How to Configure Hot Reloading for Applications on Rancher

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rancher, Hot Reloading, Developer Experience, Kubernetes, File Sync, Skaffold

Description: Configure hot reloading for Node.js, Python, and Go applications deployed on Rancher using file sync tools and process managers for near-instant code iteration.

## Introduction

Hot reloading speeds up development by applying code changes without rebuilding and redeploying the container for every edit. On Kubernetes, this usually means syncing local changes into the running container and using a process manager that watches for file changes and reloads or restarts the application. Another option is to run the service locally with Telepresence while it stays connected to cluster dependencies.

## Approach 1: Skaffold File Sync (Recommended)

Skaffold's `sync` configuration copies file changes directly into the running container during `skaffold dev`:

```yaml
# skaffold.yaml
apiVersion: skaffold/v4beta13
kind: Config

build:
  artifacts:
    - image: myregistry/nodeapp
      docker:
        dockerfile: Dockerfile.dev    # Dev Dockerfile with nodemon
      sync:
        manual:
          - src: 'src/**/*.js'       # Sync JS changes without rebuilding
            dest: /app/src
          - src: 'src/**/*.ts'
            dest: /app/src
```

### Development Dockerfile with Nodemon

```dockerfile
# Dockerfile.dev
FROM node:20-alpine

WORKDIR /app

# Install nodemon for hot reloading
RUN npm install -g nodemon

COPY package*.json ./
RUN npm install

COPY . .

# Use nodemon to watch for file changes
CMD ["nodemon", "--watch", "src", "--exec", "node", "src/index.js"]
```

## Approach 2: Python Hot Reload with Uvicorn

```dockerfile
# Dockerfile.dev for Python/FastAPI
FROM python:3.11-slim

WORKDIR /app
COPY requirements.txt .
RUN pip install -r requirements.txt

COPY . .

# Uvicorn with --reload flag watches for changes
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000", "--reload"]
```

```yaml
# skaffold.yaml for Python
apiVersion: skaffold/v4beta13
kind: Config

build:
  artifacts:
    - image: myregistry/pyapp
      sync:
        manual:
          - src: '**/*.py'    # Sync Python files directly
            dest: /app
```

## Approach 3: Tilt with Live Update

```python
# Tiltfile
load('ext://restart_process', 'docker_build_with_restart')

docker_build_with_restart(
    'myregistry/goapp',
    '.',
    entrypoint='/app/server',
    live_update=[
        # Sync Go source files
        sync('./cmd', '/app/cmd'),
        sync('./internal', '/app/internal'),
        # Rebuild in the container; the extension restarts the entrypoint after Live Update
        run('cd /app && go build -o /app/server ./cmd/server'),
    ]
)
```

## Approach 4: Telepresence for Local Execution

Telepresence does not sync files into the cluster. Instead, it intercepts service traffic so you can run the application locally with your IDE's normal hot reload:

```bash
# Connect to cluster
telepresence connect

# Intercept the service
telepresence intercept myapp --port 8080

# Run locally with your IDE's hot reload
npm run dev    # Intercepted traffic is now handled by your local process
```

## Development vs Production Images

Always use separate Dockerfiles for development and production:

```yaml
# skaffold.yaml - profile-based image selection
apiVersion: skaffold/v4beta13
kind: Config

profiles:
  - name: dev
    build:
      artifacts:
        - image: myregistry/myapp
          docker:
            dockerfile: Dockerfile.dev    # With hot reload tools
  - name: prod
    build:
      artifacts:
        - image: myregistry/myapp
          docker:
            dockerfile: Dockerfile        # Optimized production image
```

## Conclusion

Hot reloading on Rancher-managed Kubernetes clusters usually comes from either a file sync tool (Skaffold or Tilt) plus a process watcher (nodemon, uvicorn --reload, or a Go rebuild-and-restart workflow), or from Telepresence running the service locally while it talks to in-cluster dependencies. Either approach can provide iteration speeds comparable to local development.
