# How to Deploy an API with Cloud Endpoints Using an OpenAPI Specification

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Cloud Endpoints, OpenAPI, API Management, ESP

Description: Step-by-step guide to deploying a REST API with Google Cloud Endpoints using an OpenAPI specification, including configuration, deployment, and testing.

---

Cloud Endpoints is Google's API management platform. It sits in front of your API backend and handles authentication, monitoring, logging, and quota management. The core of your Cloud Endpoints configuration is an OpenAPI specification that describes your API - its endpoints, request/response formats, and security requirements.

This guide walks through deploying an API with Cloud Endpoints from scratch, using the OpenAPI specification as the single source of truth.

## How Cloud Endpoints Works

The architecture has three main components:

1. **OpenAPI specification**: A YAML or JSON file describing your API
2. **Extensible Service Proxy (ESP/ESPv2)**: A sidecar that sits in front of your backend, handling authentication and request validation
3. **Service Management API**: Google's backend that manages your API configuration

When a request comes in, ESP validates it against your OpenAPI spec, checks authentication, logs the request, and then forwards it to your backend.

## Prerequisites

- A GCP project with billing enabled
- A backend API service (Cloud Run, GKE, Compute Engine, or App Engine)
- gcloud CLI installed and configured

```bash
# Enable the required APIs
gcloud services enable \
  servicemanagement.googleapis.com \
  servicecontrol.googleapis.com \
  endpoints.googleapis.com \
  --project=my-project-id
```

## Step 1: Write the OpenAPI Specification

Create an OpenAPI 2.0 specification that describes your API. Cloud Endpoints uses OpenAPI 2.0 (Swagger) with Google-specific extensions.

```yaml
# openapi.yaml
# OpenAPI specification for the Task Management API
swagger: "2.0"
info:
  title: "Task Management API"
  description: "API for managing tasks and projects"
  version: "1.0.0"
# Replace with your actual Cloud Endpoints service name
host: "my-api.endpoints.my-project-id.cloud.goog"
basePath: "/"
schemes:
  - "https"
consumes:
  - "application/json"
produces:
  - "application/json"

# Google Cloud Endpoints extension for backend configuration
x-google-backend:
  address: "https://my-backend-service-abc123-uc.a.run.app"

paths:
  /tasks:
    get:
      summary: "List all tasks"
      operationId: "listTasks"
      parameters:
        - name: "status"
          in: "query"
          type: "string"
          enum: ["pending", "in_progress", "completed"]
          description: "Filter tasks by status"
        - name: "limit"
          in: "query"
          type: "integer"
          default: 20
          description: "Maximum number of tasks to return"
      responses:
        200:
          description: "A list of tasks"
          schema:
            type: "array"
            items:
              $ref: "#/definitions/Task"
    post:
      summary: "Create a new task"
      operationId: "createTask"
      parameters:
        - name: "body"
          in: "body"
          required: true
          schema:
            $ref: "#/definitions/TaskInput"
      responses:
        201:
          description: "Task created"
          schema:
            $ref: "#/definitions/Task"
        400:
          description: "Invalid input"

  /tasks/{taskId}:
    get:
      summary: "Get a specific task"
      operationId: "getTask"
      parameters:
        - name: "taskId"
          in: "path"
          required: true
          type: "string"
      responses:
        200:
          description: "Task details"
          schema:
            $ref: "#/definitions/Task"
        404:
          description: "Task not found"
    put:
      summary: "Update a task"
      operationId: "updateTask"
      parameters:
        - name: "taskId"
          in: "path"
          required: true
          type: "string"
        - name: "body"
          in: "body"
          required: true
          schema:
            $ref: "#/definitions/TaskInput"
      responses:
        200:
          description: "Task updated"
          schema:
            $ref: "#/definitions/Task"
    delete:
      summary: "Delete a task"
      operationId: "deleteTask"
      parameters:
        - name: "taskId"
          in: "path"
          required: true
          type: "string"
      responses:
        204:
          description: "Task deleted"

definitions:
  Task:
    type: "object"
    properties:
      id:
        type: "string"
      title:
        type: "string"
      description:
        type: "string"
      status:
        type: "string"
        enum: ["pending", "in_progress", "completed"]
      created_at:
        type: "string"
        format: "date-time"
  TaskInput:
    type: "object"
    required:
      - "title"
    properties:
      title:
        type: "string"
      description:
        type: "string"
      status:
        type: "string"
        enum: ["pending", "in_progress", "completed"]
```

## Step 2: Deploy the API Configuration

Deploy the OpenAPI specification to Service Management.

```bash
# Deploy the OpenAPI specification
gcloud endpoints services deploy openapi.yaml --project=my-project-id
```

This command creates or updates the managed service. Note the service name from the output - it should match the `host` field in your OpenAPI spec.

You can check the deployed configuration.

```bash
# List deployed service configurations
gcloud endpoints services describe my-api.endpoints.my-project-id.cloud.goog \
  --project=my-project-id

# List configuration versions
gcloud endpoints configs list \
  --service=my-api.endpoints.my-project-id.cloud.goog \
  --project=my-project-id
```

## Step 3: Deploy the Backend with ESPv2

The Extensible Service Proxy v2 (ESPv2) acts as the API gateway. Deploy it alongside your backend.

### On Cloud Run

For Cloud Run, build a custom ESPv2 container with your configuration baked in.

```bash
# Download the ESPv2 startup script
chmod +x gcloud_build_image

# Build the ESPv2 image with your API config
gcloud builds submit \
  --tag gcr.io/my-project-id/endpoints-runtime-serverless:latest \
  --project=my-project-id
```

Alternatively, deploy ESPv2 as a separate Cloud Run service that proxies to your backend.

```bash
# Deploy ESPv2 on Cloud Run
gcloud run deploy my-api-gateway \
  --image="gcr.io/endpoints-release/endpoints-runtime-serverless:2" \
  --set-env-vars="ESPv2_ARGS=--service=my-api.endpoints.my-project-id.cloud.goog --rollout_strategy=managed --backend=https://my-backend-abc123-uc.a.run.app" \
  --allow-unauthenticated \
  --platform=managed \
  --region=us-central1 \
  --project=my-project-id
```

### On GKE

On GKE, deploy ESP as a sidecar container in your pod.

```yaml
# deployment-with-esp.yaml
# Deploys the API backend with ESPv2 sidecar on GKE
apiVersion: apps/v1
kind: Deployment
metadata:
  name: my-api
spec:
  replicas: 3
  selector:
    matchLabels:
      app: my-api
  template:
    metadata:
      labels:
        app: my-api
    spec:
      containers:
        # ESPv2 sidecar - handles API management
        - name: esp
          image: gcr.io/endpoints-release/endpoints-runtime:2
          args:
            - "--service=my-api.endpoints.my-project-id.cloud.goog"
            - "--rollout_strategy=managed"
            - "--backend=http://127.0.0.1:8080"
          ports:
            - containerPort: 8081
          readinessProbe:
            httpGet:
              path: /healthz
              port: 8081
        # Your API backend
        - name: backend
          image: us-central1-docker.pkg.dev/my-project-id/docker-images/my-api:v1.0.0
          ports:
            - containerPort: 8080
```

## Step 4: Test the Deployed API

Once deployed, test your API endpoints.

```bash
# Test the list tasks endpoint
curl -X GET "https://my-api.endpoints.my-project-id.cloud.goog/tasks"

# Test creating a task
curl -X POST "https://my-api.endpoints.my-project-id.cloud.goog/tasks" \
  -H "Content-Type: application/json" \
  -d '{"title": "Write documentation", "description": "Update the API docs"}'

# Test getting a specific task
curl -X GET "https://my-api.endpoints.my-project-id.cloud.goog/tasks/abc123"
```

## Step 5: View API Metrics

Cloud Endpoints automatically provides metrics in Cloud Console.

```bash
# View the API overview in the console
# Navigate to: APIs & Services > Endpoints > your service

# Or use gcloud to see recent activity
gcloud endpoints services describe my-api.endpoints.my-project-id.cloud.goog \
  --project=my-project-id
```

The Endpoints dashboard shows:
- Request count and latency
- Error rates by response code
- Traffic by API method
- Top consumers

## Updating the API

To update your API, modify the OpenAPI spec and redeploy.

```bash
# After updating openapi.yaml
gcloud endpoints services deploy openapi.yaml --project=my-project-id

# ESPv2 with --rollout_strategy=managed will pick up the new config automatically
# No need to restart the proxy
```

## Summary

Cloud Endpoints gives you API management without building it yourself. The OpenAPI specification serves as both documentation and configuration, defining your API's structure and behavior. ESPv2 enforces the spec at the proxy level, while Google's backend handles service management. Deploy the spec, run ESPv2 in front of your backend, and you get authentication, monitoring, and logging out of the box. Updates are as simple as modifying the OpenAPI spec and redeploying.
