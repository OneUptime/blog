# How to Use Dapr with Azure Container Apps Serverless

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Azure Container Apps, Serverless, Cloud, Microservice, Azure

Description: Learn how to deploy Dapr-enabled microservices on Azure Container Apps, leveraging built-in Dapr support for service invocation, pub/sub, and state management without managing sidecars.

---

Azure Container Apps (ACA) has first-class built-in support for Dapr: you declare Dapr components through the ACA API, and the platform injects and manages the Dapr sidecar for you. There is no need to manually configure the sidecar, manage certificates, or run the Dapr control plane - ACA handles it all. This makes ACA one of the fastest ways to get Dapr microservices into production on Azure.

## Understanding ACA's Dapr Integration

In a standard Kubernetes deployment, you manage the Dapr operator, sentry, and placement services yourself. In ACA:

- Dapr is enabled per Container App with a simple flag
- Components are defined at the ACA Environment level
- The sidecar is automatically injected and configured
- mTLS between services is handled by ACA's internal networking
- Scaling can be triggered by Dapr pub/sub queue depth via KEDA

The ACA Dapr integration supports all core Dapr building blocks: service invocation, pub/sub, state store, bindings, secrets, and configuration.

## Setting Up the Azure Environment

Install the Azure CLI and Container Apps extension:

```bash
az extension add --name containerapp --upgrade
az provider register --namespace Microsoft.App
az provider register --namespace Microsoft.OperationalInsights

# Set variables
RESOURCE_GROUP="dapr-aca-demo"
LOCATION="eastus"
ENVIRONMENT="dapr-env"
STORAGE_ACCOUNT="dapracacache$(shuf -i 1000-9999 -n 1)"

# Create resource group
az group create --name $RESOURCE_GROUP --location $LOCATION

# Create Log Analytics workspace
LOG_WORKSPACE_ID=$(az monitor log-analytics workspace create \
  --resource-group $RESOURCE_GROUP \
  --workspace-name dapr-logs \
  --query customerId -o tsv)

LOG_WORKSPACE_KEY=$(az monitor log-analytics workspace get-shared-keys \
  --resource-group $RESOURCE_GROUP \
  --workspace-name dapr-logs \
  --query primarySharedKey -o tsv)

# Create Container Apps Environment
az containerapp env create \
  --name $ENVIRONMENT \
  --resource-group $RESOURCE_GROUP \
  --location $LOCATION \
  --logs-workspace-id $LOG_WORKSPACE_ID \
  --logs-workspace-key $LOG_WORKSPACE_KEY
```

## Configuring Dapr Components at the Environment Level

Define a Redis state store component at the environment level so all Container Apps in the environment can use it:

```bash
# Create Azure Cache for Redis
az redis create \
  --name dapr-redis-demo \
  --resource-group $RESOURCE_GROUP \
  --location $LOCATION \
  --sku Basic \
  --vm-size c0

REDIS_HOST=$(az redis show \
  --name dapr-redis-demo \
  --resource-group $RESOURCE_GROUP \
  --query hostName -o tsv)

REDIS_KEY=$(az redis list-keys \
  --name dapr-redis-demo \
  --resource-group $RESOURCE_GROUP \
  --query primaryKey -o tsv)
```

Create the Dapr state store component:

```bash
az containerapp env dapr-component set \
  --name $ENVIRONMENT \
  --resource-group $RESOURCE_GROUP \
  --dapr-component-name statestore \
  --yaml - << 'EOF'
name: statestore
componentType: state.redis
version: v1
metadata:
  - name: redisHost
    value: "dapr-redis-demo.redis.cache.windows.net:6380"
  - name: redisPassword
    secretRef: redis-password
  - name: enableTLS
    value: "true"
  - name: actorStateStore
    value: "true"
secrets:
  - name: redis-password
    value: "<your-redis-key>"
EOF
```

Add a pub/sub component using Azure Service Bus:

```bash
az containerapp env dapr-component set \
  --name $ENVIRONMENT \
  --resource-group $RESOURCE_GROUP \
  --dapr-component-name pubsub \
  --yaml - << 'EOF'
name: pubsub
componentType: pubsub.azure.servicebus.topics
version: v1
metadata:
  - name: connectionString
    secretRef: servicebus-connection
secrets:
  - name: servicebus-connection
    value: "<your-service-bus-connection-string>"
EOF
```

## Deploying a Dapr-Enabled Container App

Deploy a Python order service with Dapr enabled:

```bash
az containerapp create \
  --name order-service \
  --resource-group $RESOURCE_GROUP \
  --environment $ENVIRONMENT \
  --image mcr.microsoft.com/azuredocs/containerapps-helloworld:latest \
  --target-port 5000 \
  --ingress external \
  --enable-dapr \
  --dapr-app-id order-service \
  --dapr-app-port 5000 \
  --dapr-app-protocol http \
  --min-replicas 1 \
  --max-replicas 10
```

The Python order service application:

```python
# app.py
import json
import os
from flask import Flask, request, jsonify
import requests

app = Flask(__name__)

DAPR_HTTP_PORT = int(os.environ.get("DAPR_HTTP_PORT", 3500))
DAPR_BASE_URL = f"http://localhost:{DAPR_HTTP_PORT}"

@app.route("/orders", methods=["POST"])
def create_order():
    order = request.json
    order_id = order["orderId"]
    
    # Save to state store via Dapr
    requests.post(
        f"{DAPR_BASE_URL}/v1.0/state/statestore",
        json=[{"key": order_id, "value": order}]
    )
    
    # Publish to orders topic
    requests.post(
        f"{DAPR_BASE_URL}/v1.0/publish/pubsub/orders",
        json=order
    )
    
    return jsonify({"status": "created", "orderId": order_id}), 201

@app.route("/orders/<order_id>", methods=["GET"])
def get_order(order_id):
    resp = requests.get(f"{DAPR_BASE_URL}/v1.0/state/statestore/{order_id}")
    if resp.status_code == 200:
        return jsonify(resp.json()), 200
    return jsonify({"error": "not found"}), 404

# Dapr subscription endpoint
@app.route("/dapr/subscribe", methods=["GET"])
def subscribe():
    subscriptions = [
        {
            "pubsubname": "pubsub",
            "topic": "orders",
            "route": "/order-handler"
        }
    ]
    return jsonify(subscriptions)

@app.route("/order-handler", methods=["POST"])
def handle_order():
    event = request.json
    print(f"Processing order: {event['data']['orderId']}")
    return jsonify({"status": "SUCCESS"})

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000)
```

## Calling Services via Dapr Service Invocation

Deploy a second service (notification service) and call it via Dapr:

```bash
az containerapp create \
  --name notification-service \
  --resource-group $RESOURCE_GROUP \
  --environment $ENVIRONMENT \
  --image myregistry.azurecr.io/notification-service:latest \
  --target-port 5001 \
  --ingress internal \
  --enable-dapr \
  --dapr-app-id notification-service \
  --dapr-app-port 5001 \
  --min-replicas 1 \
  --max-replicas 5
```

Invoke the notification service from the order service:

```python
# Call notification-service via Dapr service invocation
def notify_customer(order_id: str, customer_id: str):
    response = requests.post(
        f"{DAPR_BASE_URL}/v1.0/invoke/notification-service/method/notify",
        json={"orderId": order_id, "customerId": customer_id}
    )
    return response.status_code == 200
```

## Scaling Based on Service Bus Queue Depth

ACA supports KEDA-based scaling triggers. Scale the order processor based on pub/sub backlog:

```bash
az containerapp update \
  --name order-service \
  --resource-group $RESOURCE_GROUP \
  --scale-rule-name servicebus-scale \
  --scale-rule-type azure-servicebus \
  --scale-rule-metadata \
    "topicName=orders" \
    "subscriptionName=order-service" \
    "messageCount=10" \
    "activationMessageCount=1" \
  --scale-rule-auth "connection=servicebus-connection"
```

## Summary

Azure Container Apps provides the simplest path to running Dapr microservices in production on Azure. The platform manages the Dapr control plane, sidecar injection, and mTLS, letting you focus on application logic. Define Dapr components at the Environment level, enable Dapr per Container App with `--dapr-enabled true`, and use the Dapr HTTP/gRPC APIs exactly as you would in any other environment. Combine with ACA's built-in KEDA support to auto-scale consumers based on pub/sub queue depth for a fully serverless event-driven architecture.
