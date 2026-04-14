# How to Understand Dapr Service Discovery Mechanisms

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Service Discovery, Kubernetes, Name Resolution, Networking

Description: Learn how Dapr service discovery works, including name resolution components, mDNS for local development, and Kubernetes service discovery in production.

---

## How Dapr Resolves Service Addresses

Dapr decouples your application from network topology by providing a name resolution abstraction. When service A calls service B by app-id, Dapr's sidecar resolves the target address using a name resolution component. The application never deals with IP addresses or DNS hostnames - only logical app IDs.

## Name Resolution Components

Dapr ships with several built-in name resolution components:

| Component | Use Case |
|---|---|
| `mdns` | Local self-hosted development |
| `kubernetes` | Kubernetes production deployments |
| `consul` | HashiCorp Consul service mesh |

## Kubernetes Name Resolution (Default)

In Kubernetes, Dapr resolves app IDs using the cluster's DNS provider. The Kubernetes name resolution component constructs DNS names based on the app ID and cluster domain, relying on standard Kubernetes DNS resolution.

The default Kubernetes name resolution component is configured automatically when using the Dapr Kubernetes operator. Verify the active name resolution component:

```bash
kubectl get configurations.dapr.io daprsystem -n dapr-system -o yaml | grep nameResolution
```

## mDNS for Local Development

mDNS broadcasts service announcements on the local network, enabling zero-configuration discovery without a registry:

```yaml
apiVersion: dapr.io/v1alpha1
kind: Configuration
metadata:
  name: local-config
spec:
  nameResolution:
    component: "mdns"
```

Start multiple services and they discover each other automatically:

```bash
# Terminal 1 - order service on port 8080
dapr run --app-id order-service --app-port 8080 -- python order_service.py

# Terminal 2 - payment service on port 8081
dapr run --app-id payment-service --app-port 8081 -- python payment_service.py

# Order service can now call payment-service by app-id with no extra config
curl http://localhost:3500/v1.0/invoke/payment-service/method/charge
```

## How Service Invocation Uses Name Resolution

The Dapr service invocation flow:

1. App calls `http://localhost:3500/v1.0/invoke/{app-id}/method/{method}`
2. Dapr sidecar queries the name resolution component with `{app-id}`
3. Name resolution returns the target Dapr sidecar address
4. Dapr forwards the request with mTLS to the target sidecar
5. Target sidecar calls the app on its app port

```python
# Your app makes this call
response = client.invoke_method(
    app_id="payment-service",
    method_name="charge",
    data=json.dumps({"amount": 99.99}),
    content_type="application/json"
)
# Dapr handles all resolution, routing, and mTLS
```

## Custom Name Resolution Component

For environments with custom service registries, configure a name resolver in the Configuration resource:

```yaml
apiVersion: dapr.io/v1alpha1
kind: Configuration
metadata:
  name: appconfig
spec:
  nameResolution:
    component: "consul"
    version: "v1"
    configuration:
      selfRegister: true
```

## Verifying Service Discovery

Test that service A can discover and call service B:

```bash
# Check registered app IDs
curl http://localhost:3500/v1.0/metadata | jq '.appConnectionProperties'

# Attempt a service invocation
curl http://localhost:3500/v1.0/invoke/payment-service/method/health
```

## Summary

Dapr abstracts service discovery through pluggable name resolution components, with mDNS for local development and Kubernetes-native discovery for production. Applications reference services only by app ID, while Dapr handles address resolution, load balancing, and mTLS transparently. Switching between discovery mechanisms requires only a configuration change, not application code modifications.
