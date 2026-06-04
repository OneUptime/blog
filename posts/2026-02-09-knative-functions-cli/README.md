# How to Set Up Knative Functions CLI for Building and Deploying Functions

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Knative, Kubernetes, Serverless, Function, CLI

Description: Use Knative Functions CLI (func) to rapidly build, test, and deploy serverless functions on Kubernetes with support for multiple languages and automatic containerization.

---

Knative Functions provides a developer-friendly CLI that simplifies creating and deploying serverless functions. The func CLI handles containerization, deployment configuration, and integration with Knative Serving automatically. This guide shows you how to build production-ready functions using this streamlined workflow.

## Understanding Knative Functions

Knative Functions extends Knative Serving with a function-as-a-service experience. Instead of writing Dockerfile and YAML manifests, you write handler code and let func handle deployment. The CLI includes templates for Node.js, Python, Go, Quarkus, Spring Boot, TypeScript, Rust, and more through language packs.

Functions can be triggered by HTTP requests or CloudEvents. The CLI generates boilerplate code and manages the build-deploy lifecycle. This reduces the barrier to entry for developers new to Kubernetes while remaining powerful enough for production workloads.

Under the hood, func creates Knative Services with optimized configurations. It uses Cloud Native Buildpacks to create efficient container images without Dockerfiles. The result is a workflow that feels like AWS Lambda but runs on your Kubernetes cluster.

## Installing the func CLI

Install func on your system:

```bash
# macOS

brew tap knative-extensions/kn-plugins
brew install func

# Linux
curl -L https://github.com/knative/func/releases/latest/download/func_linux_amd64 -o func
chmod +x func
sudo mv func /usr/local/bin/

# Verify installation
func version
```

Configure func for your environment:

```bash
# Provide a registry when running, building, or deploying
func deploy --registry docker.io/your-username

# Or set it through the environment
export FUNC_REGISTRY=docker.io/your-username
```

## Creating Your First Function

Create a Node.js HTTP function:

```bash
# Create new function
func create hello-node --language node

# Navigate to function directory
cd hello-node

# Examine generated files
ls -la
# func.yaml - function configuration
# index.js - handler code
# package.json - dependencies
# README.md - generated function documentation
# test/ - generated tests
```

The generated handler:

```javascript
// index.js
/**
 * Your HTTP handling function, invoked with each request. This is an example
 * function that returns "OK" for all requests.
 *
 * It can be invoked with 'func invoke'
 * It can be tested with 'npm test'
 *
 * @param {Context} context - A context object.
 * @param {object} context.query - The query string deserialized as an object, if any.
 * @param {object} context.log - Logging object with methods for 'info', 'warn', 'error', etc.
 * @param {object} context.headers - The HTTP request headers.
 * @param {string} context.method - The HTTP request method.
 * @param {string} context.httpVersion - The HTTP protocol version.
 * @param {object} body - The request body if any.
 * @returns {object} HTTP response object.
 *
 * See: https://github.com/knative/func/blob/main/docs/function-templates/nodejs.md#the-context-object
 */
const handle = async (context, body) => {
  context.log.info("query", context.query);
  context.log.info("body", body);

  return {
    body: "OK",
    headers: {
      'content-type': 'text/plain'
    }
  };
};

module.exports = { handle };
```

Customize the handler:

```javascript
// index.js - Enhanced version
const handle = async (context, body) => {
  const { query, headers, log, method } = context;
  const requestBody = body ?? context.body;

  log.info(`Processing ${method} request`);

  try {
    // Extract input
    const name = requestBody?.name || query?.name || 'World';
    const format = query?.format || 'json';

    // Process request
    const result = {
      greeting: `Hello, ${name}!`,
      timestamp: new Date().toISOString(),
      requestId: headers['x-request-id'] || 'unknown'
    };

    // Handle different response formats
    if (format === 'text') {
      return {
        statusCode: 200,
        headers: { 'Content-Type': 'text/plain' },
        body: `${result.greeting} (${result.timestamp})`
      };
    }

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: result
    };

  } catch (error) {
    log.error('Error processing request:', error);

    return {
      statusCode: 500,
      body: {
        error: error.message
      }
    };
  }
};

module.exports = { handle };
```

## Building and Testing Locally

Run the function locally:

```bash
# Start local development server
func run

# In another terminal, test it
curl http://localhost:8080?name=Developer

# Test with POST
curl -X POST http://localhost:8080 \
  -H "Content-Type: application/json" \
  -d '{"name": "Developer"}'

# Use func invoke for testing
func invoke --data '{"name":"Test"}'
```

Add dependencies:

```bash
# Add npm packages
cd hello-node
npm install axios

# Update handler to use dependencies
```

```javascript
// index.js with dependencies
const axios = require('axios');
const { randomUUID } = require('crypto');

const handle = async (context, body) => {
  const { log } = context;
  const requestBody = body ?? context.body;

  const requestId = randomUUID();
  log.info(`Processing request ${requestId}`);

  try {
    // Call external API
    const response = await axios.get('https://api.example.com/data');

    return {
      requestId,
      input: requestBody,
      data: response.data,
      processedAt: new Date().toISOString()
    };

  } catch (error) {
    log.error(`Request ${requestId} failed:`, error.message);
    throw error;
  }
};

module.exports = { handle };
```

## Deploying to Kubernetes

Deploy the function:

```bash
# Build and deploy
func deploy --verbose

# The CLI will:
# 1. Build container image using buildpacks
# 2. Push image to registry
# 3. Create Knative Service
# 4. Wait for deployment to be ready

# Get function URL
func info

# Test deployed function
curl $(func info -o url)?name=Production
```

Configure deployment settings:

```yaml
# func.yaml
specVersion: 0.35.0
name: hello-node
runtime: node
registry: docker.io/your-username
image: docker.io/your-username/hello-node:latest
created: 2026-06-04T00:00:00Z

# Knative Service configuration
build:
  buildEnvs:
    - name: BP_NODE_VERSION
      value: "18.*"

run:
  # Environment variables
  envs:
    - name: LOG_LEVEL
      value: info
    - name: API_KEY
      value: '{{ secret:api-credentials:key }}'

deploy:
  # Scaling configuration
  options:
    scale:
      min: 0
      max: 10
      metric: concurrency
      target: 10
      utilization: 70
    # Resource limits
    resources:
      requests:
        cpu: 100m
        memory: 128Mi
      limits:
        cpu: 500m
        memory: 512Mi

  # Labels and annotations
  labels:
    - key: app
      value: hello-node
  annotations:
    autoscaling.knative.dev/class: kpa.autoscaling.knative.dev
```

## Creating CloudEvents Functions

Create a function that handles CloudEvents:

```bash
# Create CloudEvents function
func create event-processor --language python --template cloudevents
cd event-processor
```

Implement the handler:

```python
# function/func.py
import logging
from cloudevents.core.v1.event import CloudEvent


def new():
    return Function()


class Function:
    async def handle(self, scope, receive, send):
        """
        Handle incoming CloudEvent
        """
        event = scope["event"]

        # Access CloudEvent attributes
        event_type = event.get_type()
        event_source = event.get_source()
        event_id = event.get_id()

        logging.info("Processing event %s", event_id)
        logging.info("Type: %s, Source: %s", event_type, event_source)

        # Get event data
        data = event.data or {}

        # Process based on event type
        if event_type == "order.created":
            result = process_order(data)
        elif event_type == "user.registered":
            result = process_user(data)
        else:
            logging.warning("Unknown event type: %s", event_type)
            result = {"status": "ignored"}

        # Return response as a CloudEvent
        response = CloudEvent(
            attributes={
                "type": "function.response",
                "source": "event-processor",
                "id": f"response-{event_id or 'unknown'}",
            },
            data=result,
        )
        await send(response)

def process_order(order_data):
    """Process order creation event"""
    order_id = order_data.get('order_id')
    print(f"Processing order: {order_id}")

    # Your business logic
    return {
        "status": "processed",
        "order_id": order_id
    }

def process_user(user_data):
    """Process user registration event"""
    user_id = user_data.get('user_id')
    print(f"Processing user registration: {user_id}")

    # Your business logic
    return {
        "status": "processed",
        "user_id": user_id
    }
```

Configure for CloudEvents:

```yaml
# func.yaml
specVersion: 0.35.0
name: event-processor
runtime: python
created: 2026-06-04T00:00:00Z
invoke: cloudevent

deploy:
  options:
    scale:
      min: 1  # Keep warm for event processing
```

Test with CloudEvents:

```bash
# Send test CloudEvent
func invoke --format=cloudevent \
  --type=order.created \
  --source=test \
  --data='{"order_id":"12345","total":99.99}'
```

## Advanced Function Patterns

Create a function with database connectivity:

```python
# func.py with database
from psycopg2 import pool
import os
import json
import logging


def new():
    return Function()


class Function:
    def start(self, cfg):
        # Create connection pool (reused across invocations)
        self.db_pool = pool.SimpleConnectionPool(
            1, 20,
            host=cfg.get('DB_HOST'),
            database=cfg.get('DB_NAME'),
            user=cfg.get('DB_USER'),
            password=cfg.get('DB_PASSWORD')
        )

    async def handle(self, scope, receive, send):
        """Query database and return results"""

        conn = self.db_pool.getconn()
        try:
            with conn.cursor() as cur:
                cur.execute('SELECT NOW()')
                results = cur.fetchall()

                response = {
                    "status": "success",
                    "results": results
                }

        except Exception as e:
            logging.error("Database error: %s", str(e))
            response = {
                "status": "error",
                "message": str(e)
            }

        finally:
            self.db_pool.putconn(conn)

        await send({
            'type': 'http.response.start',
            'status': 200,
            'headers': [[b'content-type', b'application/json']],
        })
        await send({
            'type': 'http.response.body',
            'body': json.dumps(response, default=str).encode(),
        })
```

## Managing Function Lifecycle

List and manage functions:

```bash
# List all functions
func list

# Get function details
func describe hello-node

# Stream function logs
func logs

# Update function
# Modify code, then
func deploy

# Delete function
func delete hello-node
```

## Best Practices

Keep functions focused. Each function should do one thing well. Create multiple small functions rather than one large function.

Use environment variables for configuration. Never hardcode credentials or configuration. Load them from environment variables or secrets.

Implement proper error handling. Return appropriate status codes and error messages. Log errors for debugging.

Optimize cold start time. Minimize dependencies and initialization code. Use connection pools for databases.

Test locally before deploying. Use func run to test changes quickly without deploying to cluster.

Version your functions. Use Git tags and image tags to track function versions. This enables easy rollbacks.

Monitor function performance. Track invocation counts, error rates, and execution times. Set up alerts for anomalies.

## Conclusion

Knative Functions CLI simplifies serverless development on Kubernetes by abstracting infrastructure complexity. The func CLI handles containerization, deployment, and scaling automatically while giving you full control over code and configuration. This developer-friendly approach accelerates function development without sacrificing the power and flexibility of Kubernetes. Whether building HTTP APIs or event processors, func provides a productive workflow for serverless applications.
