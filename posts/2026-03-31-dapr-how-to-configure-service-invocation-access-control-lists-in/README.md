# How to Configure Service Invocation Access Control Lists in Dapr

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Service Invocation, Access Control, Security, Microservice

Description: Learn how to configure Dapr service invocation access control lists (ACLs) to restrict which services can call each other's methods in your microservice architecture.

---

## What Are Dapr Service Invocation ACLs

Dapr service invocation access control lists (ACLs) let you restrict which Dapr-enabled services can call a specific service, and which methods they can invoke. Without ACLs, any service in the same namespace can invoke any method on any other service. ACLs enforce the principle of least privilege at the service mesh level.

## Prerequisites

- Dapr installed on Kubernetes (mTLS must be enabled - it is by default)
- Basic familiarity with Dapr Configuration resources
- Kubernetes cluster with Dapr sidecar injection

## How Dapr ACLs Work

ACLs are defined in a Dapr `Configuration` resource and attached to the target service (the callee). The configuration specifies which app IDs can call which operations. Dapr enforces this at the sidecar level using the mTLS-verified app identity.

## Define an Access Control Configuration

Create a `Configuration` YAML for the target service:

```yaml
apiVersion: dapr.io/v1alpha1
kind: Configuration
metadata:
  name: order-service-config
  namespace: default
spec:
  accessControl:
    defaultAction: deny   # deny all calls by default
    trustDomain: "public"
    policies:
    - appId: frontend-service
      defaultAction: deny
      namespace: "default"
      operations:
      - name: /orders
        httpVerb: ['GET', 'POST']
        action: allow
      - name: /orders/*
        httpVerb: ['GET']
        action: allow
    - appId: admin-service
      defaultAction: allow   # admin can call any operation
      namespace: "default"
    - appId: payment-service
      defaultAction: deny
      namespace: "default"
      operations:
      - name: /orders/*/payment
        httpVerb: ['POST']
        action: allow
```

## Apply the Configuration to the Target Service

Annotate the deployment to use this configuration:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: order-service
spec:
  template:
    metadata:
      annotations:
        dapr.io/enabled: "true"
        dapr.io/app-id: "order-service"
        dapr.io/app-port: "3000"
        dapr.io/config: "order-service-config"   # reference the config
```

Apply both:

```bash
kubectl apply -f order-service-config.yaml
kubectl apply -f order-service-deployment.yaml
```

## Verify Access Control Works

Test that the frontend can call allowed operations. On Kubernetes, use `curl` against the Dapr sidecar HTTP API from within the calling pod:

```bash
# From within the frontend-service pod
curl http://localhost:3500/v1.0/invoke/order-service/method/orders
# Expected: 200 OK

curl http://localhost:3500/v1.0/invoke/order-service/method/orders/admin-metrics
# Expected: 403 Forbidden (not in ACL)
```

## Configure for gRPC Services

For gRPC-based service invocation, use the gRPC method name:

```yaml
spec:
  accessControl:
    defaultAction: deny
    policies:
    - appId: inventory-service
      defaultAction: deny
      namespace: "default"
      operations:
      - name: /OrderService/GetOrder
        action: allow
      - name: /OrderService/ListOrders
        action: allow
```

## Multi-Namespace Policies

Allow cross-namespace service invocation:

```yaml
spec:
  accessControl:
    defaultAction: deny
    trustDomain: "public"
    policies:
    - appId: api-gateway
      defaultAction: deny
      namespace: "ingress"      # caller is in 'ingress' namespace
      operations:
      - name: /v1/*
        httpVerb: ['GET', 'POST', 'PUT']
        action: allow
    - appId: monitoring-agent
      defaultAction: allow
      namespace: "monitoring"   # monitoring namespace has full access
```

## Example - Microservice Trust Matrix

For an e-commerce system with 5 services:

```yaml
# order-service ACL - only allow specific callers
apiVersion: dapr.io/v1alpha1
kind: Configuration
metadata:
  name: order-service-acl
spec:
  accessControl:
    defaultAction: deny
    policies:
    - appId: api-gateway
      defaultAction: deny
      namespace: default
      operations:
      - name: /orders
        httpVerb: ['GET', 'POST']
        action: allow
    - appId: payment-service
      defaultAction: deny
      namespace: default
      operations:
      - name: /orders/*/confirm
        httpVerb: ['POST']
        action: allow
    - appId: notification-service
      defaultAction: deny
      namespace: default
      operations:
      - name: /orders/*/status
        httpVerb: ['GET']
        action: allow
```

## Troubleshoot ACL Denials

Dapr logs ACL denials at the warn level. Check sidecar logs:

```bash
kubectl logs deployment/order-service -c daprd | grep -i "access control"
```

Look for log entries like:

```text
WARN  Access control list policy has denied this request.
  appId: unauthorized-service
  operation: /orders/delete-all
  verb: DELETE
```

## Summary

Dapr service invocation ACLs enforce fine-grained access control between microservices using mTLS-verified app identities. By setting `defaultAction: deny` and explicitly allowing specific callers and HTTP methods, you implement a zero-trust service mesh where each service only accepts calls from the services that legitimately need to call it - without changing application code.
