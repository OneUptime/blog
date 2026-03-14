# How to Understand the Calico REST API

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, Kubernetes, REST API, CNI, Programmatic Access, calicoctl, Automation

Description: A comprehensive guide to Calico's REST API for programmatic access, covering the API structure, authentication, and how it differs from kubectl and calicoctl workflows.

---

## Introduction

Calico exposes a REST API that allows programmatic management of Calico resources without using `kubectl` or `calicoctl`. This API is the foundation that `calicoctl` itself uses under the hood, and it enables automation scenarios like dynamically managing network policies from CI/CD pipelines, monitoring tools, or custom controllers.

Understanding the Calico REST API means understanding the API server endpoint structure, authentication, and how the `projectcalico.org/v3` API group is accessed via standard HTTP calls.

## Prerequisites

- A Calico cluster with the API server deployed
- `curl` or an HTTP client for testing
- Understanding of Kubernetes API server authentication (service accounts, kubeconfig)
- Basic familiarity with REST API concepts

## The Calico REST API Structure

The Calico REST API is exposed through the Kubernetes API aggregation layer. All Calico v3 resources are accessible at:

```
https://<kubernetes-api-server>/apis/projectcalico.org/v3/
```

For namespaced resources:
```
https://<kubernetes-api-server>/apis/projectcalico.org/v3/namespaces/<namespace>/<resource-type>/<name>
```

For cluster-scoped resources:
```
https://<kubernetes-api-server>/apis/projectcalico.org/v3/<resource-type>/<name>
```

## Available Resource Endpoints

```bash
# Discover all available Calico API resources
kubectl get --raw /apis/projectcalico.org/v3 | jq '.resources[].name'
```

Common endpoints:
- `/apis/projectcalico.org/v3/globalnetworkpolicies`
- `/apis/projectcalico.org/v3/namespaces/{ns}/networkpolicies`
- `/apis/projectcalico.org/v3/ippools`
- `/apis/projectcalico.org/v3/bgpconfigurations`
- `/apis/projectcalico.org/v3/bgppeers`
- `/apis/projectcalico.org/v3/workloadendpoints`

## Authentication

The Calico REST API uses the same authentication as the Kubernetes API server. The most common approaches:

**Using kubeconfig token**:
```bash
TOKEN=$(kubectl config view --raw -o jsonpath='{.users[0].user.token}')
APISERVER=$(kubectl config view --raw -o jsonpath='{.clusters[0].cluster.server}')

curl -s -k -H "Authorization: Bearer $TOKEN" \
  $APISERVER/apis/projectcalico.org/v3/globalnetworkpolicies
```

**Using a service account**:
```bash
# Get service account token
SA_TOKEN=$(kubectl create token my-service-account)

curl -s -k -H "Authorization: Bearer $SA_TOKEN" \
  $APISERVER/apis/projectcalico.org/v3/ippools
```

## CRUD Operations via REST

**List resources**:
```bash
curl -s -k -H "Authorization: Bearer $TOKEN" \
  $APISERVER/apis/projectcalico.org/v3/globalnetworkpolicies | jq '.items[].metadata.name'
```

**Get a specific resource**:
```bash
curl -s -k -H "Authorization: Bearer $TOKEN" \
  $APISERVER/apis/projectcalico.org/v3/globalnetworkpolicies/my-policy | jq '.spec'
```

**Create a resource** (POST):
```bash
curl -s -k -X POST \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "apiVersion": "projectcalico.org/v3",
    "kind": "GlobalNetworkPolicy",
    "metadata": {"name": "api-created-policy"},
    "spec": {
      "order": 500,
      "selector": "test == true",
      "ingress": [{"action": "Pass"}]
    }
  }' \
  $APISERVER/apis/projectcalico.org/v3/globalnetworkpolicies
```

**Update a resource** (PUT):
```bash
curl -s -k -X PUT \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d @updated-policy.json \
  $APISERVER/apis/projectcalico.org/v3/globalnetworkpolicies/api-created-policy
```

**Delete a resource**:
```bash
curl -s -k -X DELETE \
  -H "Authorization: Bearer $TOKEN" \
  $APISERVER/apis/projectcalico.org/v3/globalnetworkpolicies/api-created-policy
```

## Using kubectl as a REST Proxy

For development and testing, `kubectl` can proxy requests to the API server without manual token management:

```bash
# Start kubectl proxy
kubectl proxy --port=8080 &

# Access Calico REST API via proxy (no auth token needed)
curl -s http://localhost:8080/apis/projectcalico.org/v3/globalnetworkpolicies | jq '.items[].metadata.name'

# Create a resource
curl -s -X POST \
  -H "Content-Type: application/json" \
  -d @policy.json \
  http://localhost:8080/apis/projectcalico.org/v3/globalnetworkpolicies
```

## Best Practices

- Use service account tokens with minimal permissions for automation — never use admin kubeconfig tokens in scripts
- Always handle API errors explicitly — a 409 Conflict error means the resource already exists; a 422 means validation failed
- Use `kubectl proxy` for local development but use proper service account tokens in CI/CD
- Set appropriate timeouts on REST calls — the API server can be temporarily slow during upgrades

## Conclusion

The Calico REST API provides programmatic access to all Calico resources through the standard Kubernetes API aggregation layer. It uses Kubernetes authentication and RBAC, making it secure and consistent with the rest of your Kubernetes tooling. For automation scenarios — CI/CD policy management, monitoring integrations, or custom controllers — the REST API is the foundation for building Calico-aware tooling.
