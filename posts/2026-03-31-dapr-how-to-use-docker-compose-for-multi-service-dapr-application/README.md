# How to Use Docker Compose for Multi-Service Dapr Applications

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Docker Compose, Local Development, Microservice, DevEx, Container

Description: Learn how to set up a complete multi-service Dapr application with Docker Compose, including sidecars, state stores, and pub/sub for local development and testing.

---

Kubernetes is the production home for most Dapr applications, but it is heavyweight for local development and CI testing. Docker Compose offers a fast, reproducible alternative: you define all your services, their Dapr sidecars, and the backing infrastructure (Redis, Zipkin, etc.) in a single `docker-compose.yaml` file. Developers can spin up the entire system with one command and tear it down just as easily.

## Project Structure

A typical multi-service Dapr application with Docker Compose looks like this:

```text
my-dapr-app/
  docker-compose.yaml
  components/
    statestore.yaml
    pubsub.yaml
    config.yaml
  order-service/
    app.py
    Dockerfile
    requirements.txt
  inventory-service/
    app.js
    Dockerfile
    package.json
  notification-service/
    main.go
    Dockerfile
    go.mod
```

## Writing the Docker Compose File

Each microservice gets its own Dapr sidecar container. The sidecar and the app share a network and communicate over localhost within the same Compose project network:

```yaml
# docker-compose.yaml
version: "3.9"

services:
  # Infrastructure
  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 5s
      timeout: 3s
      retries: 5

  zipkin:
    image: openzipkin/zipkin:latest
    ports:
      - "9411:9411"

  placement:
    image: daprio/placement:1.14.0
    command: ["./placement", "--port", "50006"]
    ports:
      - "50006:50006"

  # Order Service + Dapr sidecar
  order-service:
    build: ./order-service
    ports:
      - "5001:5001"
    depends_on:
      redis:
        condition: service_healthy
    environment:
      - DAPR_HTTP_PORT=3501

  order-service-dapr:
    image: daprio/daprd:1.14.0
    command:
      - "./daprd"
      - "--app-id"
      - "order-service"
      - "--app-port"
      - "5001"
      - "--dapr-http-port"
      - "3501"
      - "--placement-host-address"
      - "placement:50006"
      - "--resources-path"
      - "/components"
      - "--config"
      - "/components/config.yaml"
    volumes:
      - ./components:/components
    network_mode: "service:order-service"
    depends_on:
      - placement
      - order-service

  # Inventory Service + Dapr sidecar
  inventory-service:
    build: ./inventory-service
    ports:
      - "5002:5002"
    depends_on:
      redis:
        condition: service_healthy
    environment:
      - DAPR_HTTP_PORT=3502

  inventory-service-dapr:
    image: daprio/daprd:1.14.0
    command:
      - "./daprd"
      - "--app-id"
      - "inventory-service"
      - "--app-port"
      - "5002"
      - "--dapr-http-port"
      - "3502"
      - "--placement-host-address"
      - "placement:50006"
      - "--resources-path"
      - "/components"
      - "--config"
      - "/components/config.yaml"
    volumes:
      - ./components:/components
    network_mode: "service:inventory-service"
    depends_on:
      - placement
      - inventory-service

  # Notification Service + Dapr sidecar
  notification-service:
    build: ./notification-service
    ports:
      - "5003:5003"
    environment:
      - DAPR_HTTP_PORT=3503

  notification-service-dapr:
    image: daprio/daprd:1.14.0
    command:
      - "./daprd"
      - "--app-id"
      - "notification-service"
      - "--app-port"
      - "5003"
      - "--dapr-http-port"
      - "3503"
      - "--placement-host-address"
      - "placement:50006"
      - "--resources-path"
      - "/components"
      - "--config"
      - "/components/config.yaml"
    volumes:
      - ./components:/components
    network_mode: "service:notification-service"
    depends_on:
      - placement
      - notification-service
```

## Dapr Component Definitions

```yaml
# components/statestore.yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: statestore
spec:
  type: state.redis
  version: v1
  metadata:
  - name: redisHost
    value: redis:6379
  - name: actorStateStore
    value: "true"
```

```yaml
# components/pubsub.yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: pubsub
spec:
  type: pubsub.redis
  version: v1
  metadata:
  - name: redisHost
    value: redis:6379
```

```yaml
# components/config.yaml
apiVersion: dapr.io/v1alpha1
kind: Configuration
metadata:
  name: appconfig
spec:
  tracing:
    samplingRate: "1"
    zipkin:
      endpointAddress: http://zipkin:9411/api/v2/spans
```

## Sample Services

The order service (Python):

```python
# order-service/app.py
from flask import Flask, request, jsonify
import requests
import os

app = Flask(__name__)
DAPR_PORT = os.environ.get("DAPR_HTTP_PORT", 3501)

@app.route("/orders", methods=["POST"])
def create_order():
    order = request.json
    order_id = order["orderId"]
    
    # Check inventory via Dapr service invocation
    inv_resp = requests.post(
        f"http://localhost:{DAPR_PORT}/v1.0/invoke/inventory-service/method/reserve",
        json={"itemId": order["itemId"], "quantity": order["quantity"]}
    )
    
    if inv_resp.status_code != 200:
        return jsonify({"error": "Inventory unavailable"}), 400
    
    # Save order state
    requests.post(
        f"http://localhost:{DAPR_PORT}/v1.0/state/statestore",
        json=[{"key": order_id, "value": order}]
    )
    
    # Publish order created event
    requests.post(
        f"http://localhost:{DAPR_PORT}/v1.0/publish/pubsub/orders",
        json={"orderId": order_id, "customerId": order["customerId"]}
    )
    
    return jsonify({"status": "created", "orderId": order_id}), 201

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5001)
```

The notification service subscribing to orders (Go):

```go
// notification-service/main.go
package main

import (
    "encoding/json"
    "fmt"
    "log"
    "net/http"
)

type Subscription struct {
    Pubsubname string `json:"pubsubname"`
    Topic      string `json:"topic"`
    Route      string `json:"route"`
}

type CloudEvent struct {
    Data json.RawMessage `json:"data"`
}

func main() {
    http.HandleFunc("/dapr/subscribe", func(w http.ResponseWriter, r *http.Request) {
        subs := []Subscription{
            {Pubsubname: "pubsub", Topic: "orders", Route: "/handle-order"},
        }
        w.Header().Set("Content-Type", "application/json")
        json.NewEncoder(w).Encode(subs)
    })

    http.HandleFunc("/handle-order", func(w http.ResponseWriter, r *http.Request) {
        var event CloudEvent
        json.NewDecoder(r.Body).Decode(&event)
        fmt.Printf("Notification: new order received: %s\n", string(event.Data))
        w.WriteHeader(http.StatusOK)
        json.NewEncoder(w).Encode(map[string]string{"status": "SUCCESS"})
    })

    log.Println("Notification service running on :5003")
    log.Fatal(http.ListenAndServe(":5003", nil))
}
```

## Running and Testing the Stack

```bash
# Start all services
docker compose up --build

# Check all containers are running
docker compose ps

# View logs for a specific service + sidecar
docker compose logs order-service order-service-dapr -f

# Test the order creation flow
curl -X POST http://localhost:5001/orders \
  -H "Content-Type: application/json" \
  -d '{"orderId":"ord-1","customerId":"cust-99","itemId":"item-42","quantity":2}'

# View distributed traces in Zipkin
open http://localhost:9411

# Tear down everything
docker compose down -v
```

## Summary

Docker Compose with Dapr provides a fast, reproducible local development environment for multi-service applications. The key pattern is pairing each service container with a dedicated `daprd` sidecar container using `network_mode: "service:<app-name>"` so the sidecar shares the app's network namespace. Mount the `components/` directory into every sidecar so all services use the same state store, pub/sub, and configuration. This setup mirrors how Dapr behaves in Kubernetes, making it easy to catch integration issues before deploying to production.
