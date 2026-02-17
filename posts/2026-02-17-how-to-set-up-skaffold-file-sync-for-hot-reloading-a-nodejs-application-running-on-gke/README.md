# How to Set Up Skaffold File Sync for Hot Reloading a Node.js Application Running on GKE

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Skaffold, Node.js, GKE, Kubernetes, Hot Reload, Developer Experience

Description: Learn how to configure Skaffold file sync to enable hot reloading for a Node.js application running on GKE, cutting your development feedback loop to seconds.

---

The standard Kubernetes development loop is painful. You change a line of code, wait for a Docker build, wait for the image push, wait for the deployment rollout, and then check if your change worked. For a Node.js application, this can take 30-60 seconds per iteration. That is unacceptable when you are used to the near-instant feedback of local development with nodemon.

Skaffold file sync bridges this gap. Instead of rebuilding the entire Docker image when you change a JavaScript file, Skaffold copies the changed files directly into the running container. Combined with a file watcher like nodemon inside the container, this gives you sub-second hot reloading for a Node.js application running on GKE.

## The Goal

We want a setup where:

1. You run `skaffold dev` and your application starts on GKE
2. You edit a `.js` or `.ts` file locally
3. Skaffold syncs the changed file to the running container within a second
4. Nodemon detects the file change and restarts the Node.js process
5. Your browser shows the updated response

No image rebuild. No push. No deployment rollout.

## Setting Up the Node.js Application

Here is a simple Express application.

```javascript
// src/index.js - Express server with a simple API
const express = require('express');

const app = express();
const PORT = process.env.PORT || 8080;

// Parse JSON request bodies
app.use(express.json());

// Root endpoint
app.get('/', (req, res) => {
    res.json({
        message: 'Hello from GKE with hot reload!',
        timestamp: new Date().toISOString()
    });
});

// Health check for Kubernetes
app.get('/health', (req, res) => {
    res.status(200).send('ok');
});

// Sample API endpoint
app.get('/api/users', (req, res) => {
    res.json([
        { id: 1, name: 'Alice', role: 'developer' },
        { id: 2, name: 'Bob', role: 'designer' }
    ]);
});

app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on port ${PORT}`);
});
```

The `package.json` needs a dev script using nodemon.

```json
{
  "name": "my-gke-app",
  "version": "1.0.0",
  "scripts": {
    "start": "node src/index.js",
    "dev": "nodemon --watch src src/index.js"
  },
  "dependencies": {
    "express": "^4.18.2"
  },
  "devDependencies": {
    "nodemon": "^3.0.2"
  }
}
```

## The Dockerfile

The Dockerfile needs to include nodemon for development mode.

```dockerfile
# Dockerfile - Development-friendly with nodemon included
FROM node:20-alpine

WORKDIR /app

# Install dependencies (cached layer)
COPY package*.json ./
RUN npm install

# Copy application source
COPY . .

# Expose the application port
EXPOSE 8080

# Use nodemon for development - restarts on file changes
CMD ["npm", "run", "dev"]
```

Note that this Dockerfile installs all dependencies including devDependencies. For production, you would use `npm ci --only=production` and `npm start`. We will handle that with Skaffold profiles later.

## The Kubernetes Manifest

```yaml
# k8s/deployment.yaml - Kubernetes deployment for our Node.js app
apiVersion: apps/v1
kind: Deployment
metadata:
  name: my-node-app
  labels:
    app: my-node-app
spec:
  replicas: 1
  selector:
    matchLabels:
      app: my-node-app
  template:
    metadata:
      labels:
        app: my-node-app
    spec:
      containers:
        - name: my-node-app
          image: my-node-app
          ports:
            - containerPort: 8080
          # Liveness probe to detect crashes
          livenessProbe:
            httpGet:
              path: /health
              port: 8080
            initialDelaySeconds: 5
            periodSeconds: 10
          # Resource limits for development
          resources:
            requests:
              memory: "128Mi"
              cpu: "100m"
            limits:
              memory: "256Mi"
              cpu: "500m"
---
apiVersion: v1
kind: Service
metadata:
  name: my-node-app
spec:
  type: ClusterIP
  selector:
    app: my-node-app
  ports:
    - port: 80
      targetPort: 8080
```

## Configuring Skaffold File Sync

This is the important part. The `skaffold.yaml` configuration defines which files get synced instead of triggering a rebuild.

```yaml
# skaffold.yaml - File sync configuration for hot reloading
apiVersion: skaffold/v4beta6
kind: Config
metadata:
  name: my-node-app
build:
  artifacts:
    - image: my-node-app
      docker:
        dockerfile: Dockerfile
      sync:
        # Sync JavaScript files directly to the container
        manual:
          - src: 'src/**/*.js'
            dest: /app
          - src: 'src/**/*.json'
            dest: /app
          # Sync view templates if you have any
          - src: 'views/**'
            dest: /app
deploy:
  kubectl:
    manifests:
      - k8s/*.yaml
portForward:
  # Forward the service port to localhost
  - resourceType: service
    resourceName: my-node-app
    port: 80
    localPort: 8080
```

The `sync.manual` section tells Skaffold: "When these files change, do not rebuild the image. Just copy them into the running container at the specified destination."

The `portForward` section automatically sets up port forwarding so you can access your application at `http://localhost:8080`.

## Running the Development Loop

Start the development loop.

```bash
# Start Skaffold dev with file sync
skaffold dev --port-forward
```

Skaffold will:

1. Build the Docker image (first time only)
2. Push it to your registry
3. Deploy to GKE
4. Set up port forwarding
5. Start watching for file changes

Now edit `src/index.js`. Change the message in the root endpoint. Within a second or two, you will see:

1. Skaffold detects the file change
2. The file is synced to the container
3. Nodemon detects the change and restarts Node.js
4. Your next request to `http://localhost:8080` shows the updated response

## Using Inferred Sync

For simpler setups, Skaffold can infer what to sync based on your Dockerfile's `COPY` instructions.

```yaml
# skaffold.yaml - Using inferred sync
apiVersion: skaffold/v4beta6
kind: Config
metadata:
  name: my-node-app
build:
  artifacts:
    - image: my-node-app
      docker:
        dockerfile: Dockerfile
      sync:
        # Infer sync rules from Dockerfile COPY instructions
        infer:
          - '**/*.js'
          - '**/*.json'
          - '**/*.html'
deploy:
  kubectl:
    manifests:
      - k8s/*.yaml
```

With inferred sync, Skaffold looks at the `COPY . .` instruction in your Dockerfile and figures out where files should be synced to in the container.

## Handling npm Package Changes

File sync only works for source code changes. When you add a new npm package (change `package.json`), Skaffold needs to rebuild the image because the `npm install` step needs to run.

Skaffold handles this automatically. If a changed file does not match any sync pattern, it falls back to a full rebuild. So when you change `package.json`, you get a full rebuild, and when you change `src/index.js`, you get a quick sync.

## Adding TypeScript Support

If you are using TypeScript, the setup is slightly different because files need to be compiled.

```json
{
  "name": "my-gke-app",
  "scripts": {
    "start": "node dist/index.js",
    "dev": "ts-node-dev --respawn --watch src src/index.ts",
    "build": "tsc"
  },
  "dependencies": {
    "express": "^4.18.2"
  },
  "devDependencies": {
    "@types/express": "^4.17.21",
    "ts-node-dev": "^2.0.0",
    "typescript": "^5.3.3"
  }
}
```

Update the sync config.

```yaml
# skaffold.yaml - TypeScript file sync
build:
  artifacts:
    - image: my-node-app
      docker:
        dockerfile: Dockerfile
      sync:
        manual:
          - src: 'src/**/*.ts'
            dest: /app
```

`ts-node-dev` watches for `.ts` file changes and automatically recompiles and restarts.

## Profiles for Development and Production

You do not want nodemon and devDependencies in production. Use Skaffold profiles.

```yaml
# skaffold.yaml - With development and production profiles
apiVersion: skaffold/v4beta6
kind: Config
metadata:
  name: my-node-app
build:
  artifacts:
    - image: my-node-app
deploy:
  kubectl:
    manifests:
      - k8s/*.yaml
profiles:
  # Development profile with file sync and hot reload
  - name: dev
    build:
      artifacts:
        - image: my-node-app
          docker:
            dockerfile: Dockerfile.dev
          sync:
            manual:
              - src: 'src/**/*.js'
                dest: /app
    portForward:
      - resourceType: service
        resourceName: my-node-app
        port: 80
        localPort: 8080
  # Production profile with optimized build
  - name: prod
    build:
      artifacts:
        - image: my-node-app
          docker:
            dockerfile: Dockerfile
```

Use the dev profile during development.

```bash
# Start with the dev profile
skaffold dev -p dev
```

## Wrapping Up

Skaffold file sync turns GKE development from a multi-minute build-push-deploy cycle into a sub-second hot reload experience. The key is combining file sync (to skip image rebuilds) with nodemon (to restart the Node.js process on file changes) and port forwarding (to access the service locally). The result is a development experience that feels almost identical to local development but runs on a real Kubernetes cluster with all its services and infrastructure.
