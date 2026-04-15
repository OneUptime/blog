# How to Use Dapr Dubbo Output Binding

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Binding, Dubbo, RPC, Microservice

Description: Learn how to configure the Dapr Dubbo output binding to invoke Apache Dubbo RPC services from Dapr-enabled microservices in a polyglot environment.

---

## Overview of the Dapr Dubbo Binding

Apache Dubbo is a high-performance Java RPC framework widely used in enterprise Java microservices. The Dapr Dubbo output binding enables non-Java services to call Dubbo RPC endpoints through Dapr's uniform binding API, without writing Dubbo client code. The binding connects directly to a Dubbo provider via hostname and port.

## Prerequisites

You need a running Dubbo service accessible via its provider hostname and port.

## Start a Sample Dubbo Service

```bash
# Deploy your Dubbo service (example Spring Boot app)
# The service should be accessible on a known hostname and port (e.g., localhost:20880)
```

## Configure the Dubbo Output Binding Component

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: dubbo-service
spec:
  type: bindings.dubbo
  version: v1
  metadata:
  - name: providerHostname
    value: "localhost"
  - name: providerPort
    value: "20880"
  - name: interfaceName
    value: "com.example.UserService"
  - name: methodName
    value: "getUserById"
  - name: version
    value: "1.0.0"
  - name: group
    value: mygroup
```

## Invoke a Dubbo Service Method

The `interfaceName` and `methodName` can be set in the component YAML (as shown above) or overridden per request via metadata. The `data` field contains the raw payload passed to the Dubbo service method.

```bash
curl -X POST http://localhost:3500/v1.0/bindings/dubbo-service \
  -H "Content-Type: application/json" \
  -d '{
    "operation": "create",
    "data": "user-123",
    "metadata": {
      "interfaceName": "com.example.UserService",
      "methodName": "getUserById"
    }
  }'
```

## Invoke a Different Method

Override the `interfaceName` and `methodName` in per-request metadata to call a different service method without creating a new component:

```bash
curl -X POST http://localhost:3500/v1.0/bindings/dubbo-service \
  -H "Content-Type: application/json" \
  -d '{
    "operation": "create",
    "data": {
      "customerId": "cust-456",
      "productId": "prod-789",
      "quantity": 3
    },
    "metadata": {
      "interfaceName": "com.example.OrderService",
      "methodName": "createOrder"
    }
  }'
```

## Application Code Integration

```python
import requests

def call_dubbo_service(interface: str, method: str, data):
    response = requests.post(
        "http://localhost:3500/v1.0/bindings/dubbo-service",
        json={
            "operation": "create",
            "data": data,
            "metadata": {
                "interfaceName": interface,
                "methodName": method,
            },
        },
    )
    response.raise_for_status()
    return response.json()

# Fetch user from Java Dubbo service
user = call_dubbo_service(
    interface="com.example.UserService",
    method="getUserById",
    data="user-123",
)
print("User:", user)
```

## Multiple Dubbo Services

Define separate binding components for each Dubbo provider:

```yaml
# user-service-binding.yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: user-dubbo-service
spec:
  type: bindings.dubbo
  version: v1
  metadata:
  - name: providerHostname
    value: "user-service-host"
  - name: providerPort
    value: "20880"
  - name: interfaceName
    value: "com.example.UserService"
  - name: methodName
    value: "getUserById"
```

```yaml
# order-service-binding.yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: order-dubbo-service
spec:
  type: bindings.dubbo
  version: v1
  metadata:
  - name: providerHostname
    value: "order-service-host"
  - name: providerPort
    value: "20880"
  - name: interfaceName
    value: "com.example.OrderService"
  - name: methodName
    value: "createOrder"
```

## Summary

The Dapr Dubbo output binding enables polyglot services to call Apache Dubbo RPC endpoints without Dubbo client libraries. Configure the provider hostname and port in the component, then invoke Dubbo service methods by specifying the interface name and method name in the component metadata or per-request metadata, with the raw payload passed in the data field.
