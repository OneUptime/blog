# How to Deploy Fission Serverless Framework on K8s for Cold-Start Optimized

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Fission, Serverless, FaaS, Cold-Start

Description: Deploy Fission serverless framework on Kubernetes and optimize function cold starts using pool managers, pre-warmed containers, and efficient execution strategies.

---

Fission is a fast, Kubernetes-native serverless framework that minimizes cold start times through intelligent container management. Unlike some serverless platforms that spin up containers on-demand, Fission maintains pools of pre-warmed containers, dramatically reducing latency. This guide shows you how to deploy Fission and optimize it for the fastest possible function execution.

## Understanding Fission's Architecture

Fission uses a unique approach to minimize cold starts. It maintains a pool of generic containers running different language environments. When you deploy a function, Fission loads your code into an existing container from the pool rather than starting a new container from scratch. This specialization process takes milliseconds instead of seconds.

Fission supports multiple executor types. The poolmgr executor maintains warm containers and specializes them on first invocation. The newdeploy executor creates dedicated deployments for functions, similar to Knative but with more control over scaling behavior.

The framework includes a router that handles HTTP requests, a controller that manages function metadata, and environment-specific containers that execute your code. This architecture enables sub-100ms cold starts for many workloads.

## Installing Fission on Kubernetes

Install Fission using Helm. First, ensure you have a Kubernetes cluster with at least 4GB of memory available:

```bash
# Add Fission Helm repository

helm repo add fission-charts https://fission.github.io/fission-charts/
helm repo update

# Create namespace
kubectl create namespace fission

# Install Fission CRDs
kubectl create -k "github.com/fission/fission/crds/v1?ref=v1.24.0"

# Install Fission with default settings
helm install --version 1.24.0 fission fission-charts/fission-all \
  --namespace fission \
  --set serviceType=NodePort \
  --set routerServiceType=NodePort
```

For production deployments with better cold-start optimization:

```bash
# Install with external router access and canary support
helm install --version 1.24.0 fission fission-charts/fission-all \
  --namespace fission \
  --set serviceType=LoadBalancer \
  --set routerServiceType=LoadBalancer \
  --set prometheus.serviceEndpoint=http://prometheus-server.monitoring.svc.cluster.local \
  --set canaryDeployment.enabled=true
```

Verify the installation:

```bash
# Check Fission components
kubectl get pods -n fission

# Install Fission CLI
curl -Lo fission https://github.com/fission/fission/releases/download/v1.24.0/fission-v1.24.0-linux-amd64
chmod +x fission
sudo mv fission /usr/local/bin/

# Verify CLI
fission version
```

## Creating Pre-Warmed Environment Pools

Environments define the runtime for your functions. Configure pool sizes to minimize cold starts:

```bash
# Create a Node.js environment with pre-warmed pool
fission environment create \
  --name nodejs \
  --image ghcr.io/fission/node-env \
  --poolsize 3 \
  --mincpu 100 \
  --maxcpu 500 \
  --minmemory 128 \
  --maxmemory 512 \
  --version 3 \
  --keeparchive

# Create Python environment with larger pool
fission environment create \
  --name python \
  --image ghcr.io/fission/python-env \
  --poolsize 5 \
  --mincpu 100 \
  --maxcpu 1000 \
  --minmemory 256 \
  --maxmemory 1024

# Create Go environment (very fast cold starts)
fission environment create \
  --name go \
  --image ghcr.io/fission/go-env \
  --poolsize 2 \
  --builder ghcr.io/fission/go-builder
```

The poolsize parameter determines how many warm containers are maintained. Higher values reduce cold starts but consume more resources.

## Deploying Your First Function

Create a simple Node.js function with minimal overhead:

```javascript
// hello.js
module.exports = async function(context) {
    const { request } = context;

    // Get request parameters
    const name = request.query.name || (request.body && request.body.name) || 'World';

    // Measure execution time
    const startTime = Date.now();

    // Your function logic
    const message = `Hello, ${name}!`;

    const executionTime = Date.now() - startTime;

    // Return response
    return {
        status: 200,
        body: {
            message: message,
            executionTime: `${executionTime}ms`
        },
        headers: {
            'Content-Type': 'application/json'
        }
    };
};
```

Deploy the function:

```bash
# Create the function
fission function create \
  --name hello \
  --env nodejs \
  --code hello.js \
  --minscale 1 \
  --maxscale 10 \
  --targetcpu 70

# Create an HTTP trigger
fission httptrigger create \
  --name hello-trigger \
  --url /hello \
  --method GET \
  --method POST \
  --function hello

# Get the router URL
export FISSION_ROUTER=$(kubectl -n fission get svc router -o jsonpath='{.status.loadBalancer.ingress[0].ip}')

# Test the function
curl http://$FISSION_ROUTER/hello?name=Developer
```

## Optimizing Cold Start Performance

Use the newdeploy executor for functions that need guaranteed low latency:

```bash
# Create environment with newdeploy executor
fission environment create \
  --name nodejs-newdeploy \
  --image ghcr.io/fission/node-env \
  --mincpu 100 \
  --maxcpu 500 \
  --minmemory 128 \
  --maxmemory 512

# Create function with minimum replicas always running
fission function create \
  --name instant-api \
  --env nodejs-newdeploy \
  --code api.js \
  --minscale 2 \
  --maxscale 20 \
  --targetcpu 80 \
  --executortype newdeploy
```

This maintains at least 2 running instances, eliminating cold starts for the first requests.

## Building Efficient Functions

Optimize your function code to minimize startup overhead:

```python
# fast-function.py
import json
import time
import flask

# Initialize expensive resources at module level (runs once)
import redis
redis_client = redis.Redis(
    host='redis-service',
    port=6379,
    decode_responses=True,
    socket_connect_timeout=1
)

# Cache expensive computations
_cache = {}

def main():
    """Main function handler"""
    start_time = time.time()

    # Get request data
    request = flask.request

    try:
        # Use cached resources
        result = process_request(request)

        execution_time = (time.time() - start_time) * 1000

        return {
            'statusCode': 200,
            'body': json.dumps({
                'result': result,
                'executionTime': f'{execution_time:.2f}ms'
            }),
            'headers': {
                'Content-Type': 'application/json'
            }
        }
    except Exception as e:
        return {
            'statusCode': 500,
            'body': json.dumps({'error': str(e)})
        }

def process_request(request):
    """Process the request using cached resources"""
    data = request.get_json()

    # Check cache first
    cache_key = f"result:{data.get('id')}"
    if cache_key in _cache:
        return _cache[cache_key]

    # Compute result
    result = expensive_computation(data)

    # Cache result
    _cache[cache_key] = result
    redis_client.setex(cache_key, 300, json.dumps(result))

    return result

def expensive_computation(data):
    """Your business logic here"""
    return {'processed': True, 'data': data}
```

Deploy the optimized function:

```bash
fission function create \
  --name fast-api \
  --env python \
  --code fast-function.py \
  --minscale 3 \
  --maxscale 50 \
  --targetcpu 75
```

## Implementing Function Specialization

For compiled languages like Go, use specialized builds:

```go
// handler.go
package main

import (
    "encoding/json"
    "net/http"
    "time"
)

type Response struct {
    Message       string  `json:"message"`
    ExecutionTime float64 `json:"executionTime"`
    Timestamp     string  `json:"timestamp"`
}

// Handler is the entry point
func Handler(w http.ResponseWriter, r *http.Request) {
    startTime := time.Now()

    // Process request
    name := r.URL.Query().Get("name")
    if name == "" {
        name = "World"
    }

    response := Response{
        Message:       "Hello, " + name,
        ExecutionTime: time.Since(startTime).Seconds() * 1000,
        Timestamp:     time.Now().Format(time.RFC3339),
    }

    w.Header().Set("Content-Type", "application/json")
    json.NewEncoder(w).Encode(response)
}
```

Build and deploy:

```bash
# Create package with Go source
zip -r go-function.zip handler.go go.mod

# Create function with builder
fission function create \
  --name go-handler \
  --env go \
  --src go-function.zip \
  --entrypoint Handler \
  --minscale 2 \
  --maxscale 20

# Go functions have excellent cold-start performance
fission httptrigger create \
  --name go-trigger \
  --url /api/go \
  --function go-handler
```

## Event-Driven Functions with Message Queues

Reduce latency for async workloads using message queue triggers:

```bash
# Create NATS message queue trigger
fission mqtrigger create \
  --name process-events \
  --function event-processor \
  --mqtype nats-jetstream \
  --mqtkind keda \
  --topic user.events \
  --resptopic user.events.response \
  --errortopic user.events.errors \
  --maxretries 3 \
  --contenttype application/json \
  --metadata stream=user \
  --metadata natsServerMonitoringEndpoint=nats-jetstream.default.svc.cluster.local:8222 \
  --metadata natsServer=nats://nats-jetstream.default.svc.cluster.local:4222 \
  --metadata consumer=fission_consumer \
  --metadata account=\$G

# The function remains warm in the pool
# Processing starts immediately when messages arrive
```

Function implementation:

```javascript
// event-processor.js
module.exports = async function(context) {
    const { request } = context;

    // Get message from queue
    const event = request.body;

    console.log('Processing event:', event.id);

    try {
        // Process the event
        const result = await processEvent(event);

        // Return result (will be published to response topic)
        return {
            status: 200,
            body: {
                eventId: event.id,
                result: result,
                processedAt: new Date().toISOString()
            }
        };
    } catch (error) {
        console.error('Processing failed:', error);

        // Error will be published to error topic
        return {
            status: 500,
            body: {
                eventId: event.id,
                error: error.message
            }
        };
    }
};

async function processEvent(event) {
    // Your processing logic
    return { success: true };
}
```

## Monitoring Cold Start Metrics

Track cold start performance:

```bash
# Check function metrics
fission function get --name hello

# View pod statistics
kubectl get pods -n fission-function -l functionName=hello

# Check environment pool status
kubectl get pods -n fission-function -l environmentName=nodejs

# View logs including cold start indicators
fission function log --name hello --follow
```

Create a monitoring dashboard query:

```promql
# Cold start rate
rate(fission_function_cold_starts_total[5m])

# Function call rate
rate(fission_function_calls_total[5m])

# Function error rate
rate(fission_function_errors_total[5m])

# Function overhead introduced by Fission
fission_function_overhead_seconds
```

## Advanced Pool Configuration

Fine-tune pool behavior for optimal performance:

```yaml
# custom-environment.yaml
apiVersion: fission.io/v1
kind: Environment
metadata:
  name: optimized-nodejs
  namespace: default
spec:
  version: 3
  runtime:
    image: ghcr.io/fission/node-env

  # Pool manager settings
  poolsize: 5

  # Resource requests and limits for pool manager pods
  resources:
    requests:
      cpu: 100m
      memory: 128Mi
    limits:
      cpu: 500m
      memory: 512Mi

  # Specialization timeout
  terminationGracePeriod: 360

  # Keep specialized pods for faster subsequent calls
  keeparchive: true
```

Apply the configuration:

```bash
kubectl apply -f custom-environment.yaml

# Use the optimized environment
fission function create \
  --name fast-function \
  --env optimized-nodejs \
  --code function.js
```

## Best Practices

Size your pools appropriately. Monitor actual function invocation patterns and adjust pool sizes to match demand. Overprovisioning wastes resources while underprovisioning causes cold starts.

Use the right executor for your workload. Poolmgr offers the best cold-start performance for bursty workloads. Newdeploy works better for consistent traffic patterns.

Minimize function dependencies. Each dependency adds to specialization time. Bundle frequently used libraries with your environment image rather than loading them in function code.

Implement health checks. Functions that fail health checks get removed from the pool, causing cold starts for subsequent requests. Make your functions resilient and responsive.

Cache expensive initialization. Move database connections, API clients, and configuration loading to module scope so they run once per container, not per invocation.

## Conclusion

Fission's pool-based architecture provides excellent cold-start performance for serverless functions on Kubernetes. By maintaining pre-warmed containers and specializing them quickly, you can achieve response times comparable to always-running services while retaining the benefits of serverless scaling. Careful tuning of pool sizes, executor types, and function implementations ensures your serverless platform delivers consistently low latency even under variable load conditions.
