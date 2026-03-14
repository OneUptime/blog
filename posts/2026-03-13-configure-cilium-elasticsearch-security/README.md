# How to Secure Elasticsearch Using Cilium

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Cilium, Kubernetes, Elasticsearch, Security, Network Policy, EBPF

Description: Use Cilium network policies to control access to Elasticsearch, preventing unauthorized data access and protecting against exfiltration from within the cluster.

---

## Introduction

Elasticsearch clusters running in Kubernetes are exposed to all pods in the cluster by default. Any pod that knows the service name can query, delete, or export index data. Cilium network policies restrict access to Elasticsearch at the network level, ensuring only authorized services can communicate with the cluster.

Beyond basic port-level access control, Cilium's L7 HTTP policies can restrict access to specific Elasticsearch index patterns and HTTP methods, providing fine-grained control over what each client can do.

## Prerequisites

- Cilium with L7 HTTP policy support
- Elasticsearch deployed in Kubernetes
- `kubectl` CLI

## Deploy Test Elasticsearch

```bash
kubectl apply -f https://raw.githubusercontent.com/cilium/cilium/main/examples/kubernetes-es/es-deploy.yaml
```

## Architecture

```mermaid
flowchart TD
    A[Authorized Service] -->|GET /my-index/_search| B{Cilium L7 Policy}
    B -->|Allowed| C[Elasticsearch]
    D[Unauthorized Pod] -->|DELETE /_all| B
    B -->|DENIED| E[HTTP 403]
    C --> F[Index Data]
```

## Apply Basic Access Policy

Only allow specific pods to reach Elasticsearch:

```yaml
apiVersion: cilium.io/v2
kind: CiliumNetworkPolicy
metadata:
  name: elasticsearch-access
  namespace: default
spec:
  endpointSelector:
    matchLabels:
      app: elasticsearch
  ingress:
    - fromEndpoints:
        - matchLabels:
            app: kibana
      toPorts:
        - ports:
            - port: "9200"
              protocol: TCP
    - fromEndpoints:
        - matchLabels:
            app: logstash
      toPorts:
        - ports:
            - port: "9200"
              protocol: TCP
          rules:
            http:
              - method: POST
                path: "^/.*/_doc$"
```

## Apply L7 HTTP Policy

Restrict which HTTP methods and paths are allowed:

```yaml
spec:
  endpointSelector:
    matchLabels:
      app: elasticsearch
  ingress:
    - fromEndpoints:
        - matchLabels:
            app: read-only-client
      toPorts:
        - ports:
            - port: "9200"
              protocol: TCP
          rules:
            http:
              - method: GET
                path: "^/allowed-index/.*"
```

```bash
kubectl apply -f elasticsearch-policy.yaml
```

## Test Policy Enforcement

```bash
# Authorized client - should succeed
kubectl exec -it kibana-pod -- \
  curl -s http://elasticsearch:9200/allowed-index/_search

# Unauthorized client - should fail
kubectl exec -it unauthorized-pod -- \
  curl -s http://elasticsearch:9200/_cat/indices
```

## Monitor Access with Hubble

```bash
hubble observe --to-label app=elasticsearch \
  --protocol http --follow
```

## Conclusion

Securing Elasticsearch with Cilium policies prevents unauthorized data access from within the cluster. L7 HTTP policies provide method and path-level control, enabling least-privilege access patterns that protect against data exfiltration and accidental or malicious index deletion.
