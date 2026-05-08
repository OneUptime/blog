# Using the Cilium API Reference

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Cilium, API, Documentation, Kubernetes, Reference

Description: Navigate and use the Cilium API reference documentation to understand available endpoints, request formats, and response structures.

---

## Introduction

Effective participation in open source projects requires understanding the available resources and processes. Cilium API reference documentation provides essential information about the agent and related APIs for users and contributors alike.

Knowing how to navigate the API reference effectively helps you get the most out of the Cilium ecosystem, whether you are troubleshooting an issue, planning a deployment, or contributing code.

This guide covers practical steps for using Cilium API reference documentation in your daily workflow.

## Prerequisites

- Familiarity with the Cilium project and its ecosystem
- kubectl access to a Cilium cluster
- Understanding of Cilium architecture and features

## Navigating the API Reference

The Cilium API reference is available at the official Cilium documentation site. It covers:

- **Agent API**: JSON API provided by `cilium-agent` for the local agent instance (endpoints, identities, services, policy selectors)
- **Operator API**: Endpoints exposed by `cilium-operator` for health, metrics, and remote cluster status
- **Hubble API**: gRPC API for network observability

### Accessing the API Locally

```bash
# The agent API is accessible via Unix socket inside the Cilium pod

CILIUM_POD=$(kubectl -n kube-system get pods -l k8s-app=cilium \
  -o jsonpath='{.items[0].metadata.name}')

# Get agent status through the supported CLI client
kubectl -n kube-system exec "$CILIUM_POD" -c cilium-agent -- \
  cilium-dbg -H unix:///var/run/cilium/cilium.sock status

# Get agent health
kubectl -n kube-system exec "$CILIUM_POD" -c cilium-agent -- \
  curl -s --unix-socket /var/run/cilium/cilium.sock http://localhost/v1/healthz

# List endpoints
kubectl -n kube-system exec "$CILIUM_POD" -c cilium-agent -- \
  curl -s --unix-socket /var/run/cilium/cilium.sock http://localhost/v1/endpoint

# List identities
kubectl -n kube-system exec "$CILIUM_POD" -c cilium-agent -- \
  curl -s --unix-socket /var/run/cilium/cilium.sock http://localhost/v1/identity
```

### Understanding API Versioning

The Cilium API uses versioned paths (`/v1/`) and follows REST conventions:

- `GET /v1/endpoint` - List all endpoints
- `GET /v1/endpoint/{id}` - Get specific endpoint
- `GET /v1/identity` - List all identities
- `GET /v1/policy/selectors` - Show which selectors match which identities

### Using the API with curl

```bash
# Get endpoint details in JSON format
kubectl -n kube-system exec "$CILIUM_POD" -c cilium-agent -- \
  curl -s --unix-socket /var/run/cilium/cilium.sock \
  http://localhost/v1/endpoint | jq '.[0]'

# Get specific endpoint by ID
kubectl -n kube-system exec "$CILIUM_POD" -c cilium-agent -- \
  curl -s --unix-socket /var/run/cilium/cilium.sock \
  http://localhost/v1/endpoint/cilium-local:12345 | jq .
```

```mermaid
flowchart LR
    A[Client] -->|Unix Socket| B[Cilium Agent API]
    B --> C[/v1/endpoint]
    B --> D[/v1/identity]
    B --> E[/v1/policy/selectors]
    B --> F[/v1/healthz]
```

## Verification

Confirm you can access the API endpoints and receive valid JSON responses. If you use an endpoint-specific ID, choose an ID from `GET /v1/endpoint`.

## Troubleshooting

- **Cannot connect to the socket**: Verify you are executing the command in a running Cilium agent pod and that the socket path is `/var/run/cilium/cilium.sock`.
- **API returns 403 Forbidden**: Check whether administrative API access has disabled the endpoint you are calling.
- **Endpoint ID returns 404 Not Found**: Use an ID from `GET /v1/endpoint`; unprefixed IDs are treated as `cilium-local:` IDs.
- **Missing curl or jq**: Use `cilium-dbg -H unix:///var/run/cilium/cilium.sock` commands from inside the agent container, or run curl from an environment that can reach the socket.

## Conclusion

The Cilium API reference is an essential resource for understanding and interacting with the Cilium agent programmatically. It provides the endpoint details, request formats, and response structures you need when automating or debugging Cilium behavior.
