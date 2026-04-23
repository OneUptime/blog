# How to Configure Hot Reloading for Applications on Rancher - Reload

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rancher, Kubernetes, Hot Reload, Development, Live Updates

Description: Configure hot reloading for Node.js, Python, Go, and Java applications running in Rancher Kubernetes clusters to speed up your development feedback loop.

## Introduction

Hot reloading allows your application to reflect code changes quickly without rebuilding the Docker image or restarting the Kubernetes Pod. In most setups, the application process is restarted inside the container when watched files change. This guide covers setting up hot reload for various language runtimes in development containers deployed to Rancher, significantly reducing the time between making a change and seeing it in action.

## Prerequisites

- Rancher-managed development cluster
- Applications deployed with development Dockerfiles
- File sync tool (kubectl cp, Skaffold, Telepresence, or DevSpace)

## Step 1: Node.js Hot Reload with Nodemon

```dockerfile
# Dockerfile.dev - Node.js development container

FROM node:24-alpine
WORKDIR /app

# Install nodemon globally
RUN npm install -g nodemon

COPY package*.json ./
RUN npm install

COPY . .

# Use nodemon for hot reload
CMD ["nodemon", "--watch", "src", "--ext", "js,json,ts", "src/index.js"]
```

```yaml
# deployment-dev.yaml - Development deployment
apiVersion: apps/v1
kind: Deployment
metadata:
  name: node-app-dev
  namespace: development
spec:
  replicas: 1
  selector:
    matchLabels:
      app: node-app
  template:
    metadata:
      labels:
        app: node-app
    spec:
      containers:
        - name: app
          image: registry.example.com/node-app:dev
          env:
            - name: NODE_ENV
              value: development
```

## Step 2: Python Hot Reload with Uvicorn

```dockerfile
# Dockerfile.dev - Python FastAPI development container
FROM python:3.11-slim
WORKDIR /app

COPY requirements.txt .
RUN pip install -r requirements.txt uvicorn[standard]

COPY . .

# --reload flag enables hot reload
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000", "--reload", "--reload-dir", "/app"]
```

```yaml
# Development deployment
apiVersion: apps/v1
kind: Deployment
metadata:
  name: python-api-dev
  namespace: development
spec:
  replicas: 1
  selector:
    matchLabels:
      app: python-api
  template:
    metadata:
      labels:
        app: python-api
    spec:
      containers:
        - name: api
          image: registry.example.com/python-api:dev
          ports:
            - containerPort: 8000
          env:
            - name: PYTHONPATH
              value: /app
            - name: LOG_LEVEL
              value: debug
```

## Step 3: Go Hot Reload with Air

```dockerfile
# Dockerfile.dev - Go development container with Air
FROM golang:1.25-alpine
WORKDIR /app

# Install Air for hot reloading
RUN go install github.com/air-verse/air@latest

COPY go.mod go.sum ./
RUN go mod download

COPY . .

CMD ["air", "-c", ".air.toml"]
```

```toml
# .air.toml - Air configuration
root = "."
tmp_dir = "tmp"

[build]
cmd = "go build -o ./tmp/main ."
entrypoint = ["./tmp/main"]
include_ext = ["go", "tpl", "tmpl", "html"]
exclude_dir = ["assets", "tmp", "vendor", "testdata"]
exclude_regex = ["_test\\.go"]
log = "build-errors.log"
delay = 0
stop_on_error = true
send_interrupt = false
kill_delay = 500
rerun = false
rerun_delay = 500
poll = false
poll_interval = 500

[log]
time = false
main_only = false

[color]
main = "magenta"
watcher = "cyan"
build = "yellow"
runner = "green"

[misc]
clean_on_exit = false
```

## Step 4: Java Hot Reload with Spring DevTools

```dockerfile
# Dockerfile.dev - Spring Boot development container
FROM eclipse-temurin:17-jdk
WORKDIR /app

# Automatic restart must be explicitly enabled for packaged java -jar deployments
COPY target/*.jar app.jar

# Spring DevTools restart is disabled by default for packaged applications
CMD ["java", \
     "-Dspring.profiles.active=dev", \
     "-Dspring.devtools.restart.enabled=true", \
     "-jar", "app.jar"]
```

```yaml
# application-dev.yml - Spring Boot dev config
spring:
  devtools:
    restart:
      enabled: true
    livereload:
      enabled: true
    remote:
      secret: ${SPRING_DEVTOOLS_REMOTE_SECRET}
  jpa:
    show-sql: true
```

When you run a packaged `java -jar` application in a container, Spring DevTools only restarts after classpath resources change. For a remote Rancher workflow, include `spring-boot-devtools` in the repackaged archive, set `spring.devtools.remote.secret`, and run the `RemoteSpringApplication` client from your IDE to push updated classpath resources.

## Step 5: Sync Files with kubectl

```bash
# Sync files directly to the running container
kubectl cp ./src/. development/$(kubectl get pod -n development -l app=node-app -o jsonpath='{.items[0].metadata.name}'):/app/src

# macOS
fswatch -o ./src | while read -r _; do
  kubectl cp ./src/. development/$(kubectl get pod -n development -l app=node-app \
  -o jsonpath='{.items[0].metadata.name}'):/app/src
done
```

## Step 6: Using Skaffold File Sync

```yaml
# skaffold.yaml - Configure file sync for hot reload
apiVersion: skaffold/v4beta13
kind: Config
build:
  artifacts:
    - image: registry.example.com/node-app
      docker:
        dockerfile: Dockerfile.dev
      sync:
        manual:
          - src: "src/**/*.js"
            dest: /app
          - src: "src/**/*.ts"
            dest: /app
```

## Step 7: Configure Resource Requests for Dev

```yaml
# Ensure sufficient resources for dev tooling
containers:
  - name: app
    image: registry.example.com/app:dev
    resources:
      requests:
        cpu: 200m
        memory: 256Mi
      limits:
        cpu: 1000m
        memory: 1Gi
    readinessProbe:
      # Longer timeout for hot reload restarts
      httpGet:
        path: /health
        port: 8080
      initialDelaySeconds: 10
      periodSeconds: 5
      failureThreshold: 10
```

## Conclusion

Hot reloading dramatically speeds up the development feedback loop for Kubernetes applications on Rancher. By choosing the appropriate hot reload solution for each language runtime-Nodemon for Node.js, Uvicorn's reload flag for Python, Air for Go, and Spring DevTools remote updates for Java-you can achieve near-instant code updates. Combined with file sync tools like Skaffold or Telepresence, this workflow provides a local development experience while running on the actual Rancher cluster infrastructure.
