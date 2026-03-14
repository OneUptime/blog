# Using the Cilium API Reference

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Cilium, API, Documentation, Kubernetes, Reference

Description: Navigate and use the Cilium API reference documentation to understand available endpoints, request formats, and response structures.

---

## Introduction

Effective participation in open source projects requires understanding the available resources and processes. Cilium api reference documentation provides essential information and collaboration opportunities for users and contributors alike.

Knowing how to navigate and api reference effectively helps you get the most out of the Cilium ecosystem, whether you are troubleshooting an issue, planning a deployment, or contributing code.

This guide covers practical steps for using Cilium API reference documentation in your daily workflow.

## Prerequisites

- Familiarity with the Cilium project and its ecosystem
- kubectl access to a Cilium cluster
- Understanding of Cilium architecture and features

## Navigating the API Reference

The Cilium API reference is available at the official Cilium documentation site. It covers:

- **Agent API**: Endpoints for interacting with the Cilium agent (endpoints, policies, identity)
- **Operator API**: Endpoints for cluster-wide operations
- **Hubble API**: Endpoints for network observability

### Accessing the API Locally

```bash
# The agent API is accessible via Unix socket inside the Cilium pod
CILIUM_POD=$(kubectl -n kube-system get pods -l k8s-app=cilium \
  -o jsonpath='{.items[0].metadata.name}')

# List available API endpoints
kubectl -n kube-system exec "$CILIUM_POD" -c cilium-agent -- \
  curl -s --unix-socket /var/run/cilium/cilium.sock http://localhost/v1/

# Get agent health
kubectl -n kube-system exec "$CILIUM_POD" -c cilium-agent -- \
  curl -s --unix-socket /var/run/cilium/cilium.sock http://localhost/v1/healthz

# List endpoints
kubectl -n kube-system exec "$CILIUM_POD" -c cilium-agent -- \
  curl -s --unix-socket /var/run/cilium/cilium.sock http://localhost/v1/endpoint
```

### Understanding API Versioning

The Cilium API uses versioned paths (`/v1/`) and follows REST conventions:

- `GET /v1/endpoint` - List all endpoints
- `GET /v1/endpoint/{id}` - Get specific endpoint
- `GET /v1/identity` - List all identities
- `GET /v1/policy` - Get policy tree

### Using the API with curl

```bash
# Get endpoint details in JSON format
kubectl -n kube-system exec "$CILIUM_POD" -c cilium-agent -- \
  curl -s --unix-socket /var/run/cilium/cilium.sock \
  http://localhost/v1/endpoint | jq '.[0]'

# Get specific endpoint by ID
kubectl -n kube-system exec "$CILIUM_POD" -c cilium-agent -- \
  curl -s --unix-socket /var/run/cilium/cilium.sock \
  http://localhost/v1/endpoint/12345 | jq .
```

```mermaid
flowchart LR
    A[Client] -->|Unix Socket| B[Cilium Agent API]
    B --> C[/v1/endpoint]
    B --> D[/v1/identity]
    B --> E[/v1/policy]
    B --> F[/v1/healthz]
```

## Verification

Confirm you can access the API endpoints and receive valid JSON responses.

## Troubleshooting

- **Cannot find meeting links**: Check the Cilium community calendar and #community Slack channel.
- **Slack workspace access**: Request an invite through the Cilium website.
- **GitHub permissions**: Ensure your account has the necessary access for the repositories you need.
- **Timezone confusion**: All official times are in UTC. Use a timezone converter for your local time.

## Conclusion

The Cilium API reference is an essential resource for understanding and interacting with the Cilium agent programmatically. provides opportunities to working with Cilium programmatically. Active participation strengthens both your own Cilium practice and the broader community.
