# How to Set Up Knative Functions CLI for Building and Deploying Functions on Kubernetes

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Knative, Kubernetes, Serverless, Functions, CLI

Description: Use Knative Functions CLI (func) to rapidly build, test, and deploy serverless functions on Kubernetes with support for multiple languages and automatic containerization.

---

Knative Functions provides a developer-friendly CLI that simplifies creating and deploying serverless functions. The func CLI handles containerization, deployment configuration, and integration with Knative Serving automatically. This guide shows you how to build production-ready functions using this streamlined workflow.

## Understanding Knative Functions

Knative Functions extends Knative Serving with a function-as-a-service experience. Instead of writing Dockerfile and YAML manifests, you write handler code and let func handle deployment. The CLI supports Node.js, Python, Go, Java, TypeScript, Rust, and more.

Functions can be triggered by HTTP requests or CloudEvents. The CLI generates boilerplate code and manages the build-deploy lifecycle. This reduces the barrier to entry for developers new to Kubernetes while remaining powerful enough for production workloads.

Under the hood, func creates Knative Services with optimized configurations. It uses Cloud Native Buildpacks to create efficient container images without Dockerfiles. The result is a workflow that feels like AWS Lambda but runs on your Kubernetes cluster.

## Installing the func CLI

Install func on your system:

```bash
# macOS
brew tap knative-sandbox/kn-plugins
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
# Set default registry
func config registries add --default-registry docker.io/your-username

# Or set per-project
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
# .funcignore - build exclusions
```

The generated handler:

```javascript
// index.js
/**
 * Your HTTP handling function, invoked with each request. This is an example
 * function that logs the incoming request and echoes its input to the caller.
 *
 * It can be invoked with 'func invoke'
 * It can be tested with 'npm test'
 *
 * @param {Context} context a context object.
 * @param {object} context.body the request body if any
 * @param {object} context.query the query string deserialalized as an object, if any
 * @param {object} context.log logging object with methods for 'info', 'warn', 'error', etc.
 * @param {object} context.headers the HTTP request headers
 * @param {string} context.method the HTTP request method
 * @param {string} context.httpVersion the HTTP protocol version
 * See: https://github.com/knative/func/blob/main/docs/reference/nodejs-context.md
 */
const handle = async (context) => {
  context.log.info('Function invoked');
  context.log.info(`Method: ${context.method}`);

  // Your business logic
  const name = context.body?.name || context.query?.name || 'World';

  return {
    message: `Hello, ${name}!`,
    timestamp: new Date().toISOString(),
    headers: context.headers
  };
};

module.exports = { handle };
```

Customize the handler:

```javascript
// index.js - Enhanced version
const handle = async (context) => {
  const { body, query, headers, log, method } = context;

  log.info(`Processing ${method} request`);

  try {
    // Extract input
    const name = body?.name || query?.name || 'World';
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
npm install axios uuid

# Update handler to use dependencies
```

```javascript
// index.js with dependencies
const axios = require('axios');
const { v4: uuidv4 } = require('uuid');

const handle = async (context) => {
  const { body, log } = context;

  const requestId = uuidv4();
  log.info(`Processing request ${requestId}`);

  try {
    // Call external API
    const response = await axios.get('https://api.example.com/data');

    return {
      requestId,
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

# Knative Service configuration
build:
  buildEnvs:
    - name: BP_NODE_VERSION
      value: "18.*"

deploy:
  # Resource limits
  resources:
    requests:
      cpu: 100m
      memory: 128Mi
    limits:
      cpu: 500m
      memory: 512Mi

  # Scaling configuration
  options:
    scale:
      min: 0
      max: 10
      metric: concurrency
      target: 10
      utilization: 70

  # Environment variables
  envs:
    - name: LOG_LEVEL
      value: info
    - name: API_KEY
      value: secret:api-credentials:key

  # Labels and annotations
  labels:
    - key: app
      value: hello-node
  annotations:
    - key: autoscaling.knative.dev/class
      value: kpa.autoscaling.knative.dev
```

## Creating CloudEvents Functions

Create a function that handles CloudEvents:

```bash
# Create CloudEvents function
func create event-processor --language python
cd event-processor
```

Implement the handler:

```python
# func.py
from parliament import Context
from cloudevents.http import CloudEvent
import json

def main(context: Context):
    """
    Handle incoming CloudEvent
    """
    # Access CloudEvent attributes
    event_type = context.cloud_event.get_type()
    event_source = context.cloud_event.get_source()
    event_id = context.cloud_event.get_id()

    context.log.info(f"Processing event {event_id}")
    context.log.info(f"Type: {event_type}, Source: {event_source}")

    # Get event data
    data = context.cloud_event.get_data()

    # Process based on event type
    if event_type == "order.created":
        result = process_order(data)
    elif event_type == "user.registered":
        result = process_user(data)
    else:
        context.log.warn(f"Unknown event type: {event_type}")
        result = {"status": "ignored"}

    # Return response (will be wrapped in CloudEvent)
    return result

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
invocation:
  format: cloudevent

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
from parliament import Context
import psycopg2
from psycopg2 import pool
import os

# Create connection pool (reused across invocations)
db_pool = psycopg2.pool.SimpleConnectionPool(
    1, 20,
    host=os.getenv('DB_HOST'),
    database=os.getenv('DB_NAME'),
    user=os.getenv('DB_USER'),
    password=os.getenv('DB_PASSWORD')
)

def main(context: Context):
    """Query database and return results"""

    conn = db_pool.getconn()
    try:
        with conn.cursor() as cur:
            query = context.body.get('query', 'SELECT NOW()')
            cur.execute(query)
            results = cur.fetchall()

            return {
                "status": "success",
                "results": results
            }

    except Exception as e:
        context.log.error(f"Database error: {str(e)}")
        return {
            "status": "error",
            "message": str(e)
        }

    finally:
        db_pool.putconn(conn)
```

## Managing Function Lifecycle

List and manage functions:

```bash
# List all functions
func list

# Get function details
func describe hello-node

# View function logs
func logs --follow

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
