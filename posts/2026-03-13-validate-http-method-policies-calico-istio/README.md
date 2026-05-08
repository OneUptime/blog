# How to Validate HTTP Method Policies with Calico and Istio Before Production

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, Kubernetes, Network Policy, Istio, HTTP Methods, Security

Description: Validate Calico HTTP method-based network policies using Istio to control access by HTTP verb (GET, POST, DELETE, etc.).

---

## Introduction

HTTP Method Policies with Calico and Istio combines Calico's network-layer enforcement with Istio's application-layer visibility. This powerful combination lets you write policies that reference HTTP attributes - methods and paths - in addition to network-level properties like IP addresses and ports.

Calico's `projectcalico.org/v3` NetworkPolicy and GlobalNetworkPolicy resources (with application layer policy enabled for Istio integration) allow you to write rules that are evaluated by Istio's Envoy sidecar proxies rather than only at the network layer. This enables fine-grained control like "allow GET requests to /api/health while leaving POST requests to /api/admin denied by default."

This guide covers validate HTTP Method Policies using Calico and Istio together.

## Prerequisites

- Kubernetes cluster with Calico installed, Kubernetes v1.29+, and Istio v1.22+ installed
- Calico-Istio integration configured (Dikastes sidecar)
- `calicoctl` and `kubectl` installed
- Workloads with Istio sidecar and Dikastes injection enabled

## Core Configuration

```yaml
apiVersion: projectcalico.org/v3
kind: NetworkPolicy
metadata:
  name: validate-http-method-policies
  namespace: production
spec:
  order: 100
  selector: app == 'backend-api'
  ingress:
    - action: Allow
      source:
        selector: app == 'frontend'
      http:
        methods:
          - GET
          - POST
        paths:
          - exact: /api/v1/data
          - prefix: /api/v1/public
  types:
    - Ingress
```

## Istio + Calico Setup

```bash
# Verify Calico-Istio integration

kubectl get felixconfiguration default -o yaml | grep policySyncPathPrefix
kubectl get pods -n calico-system -l k8s-app=csi-node-driver

# Enable sidecar injection for namespace
kubectl label namespace production istio-injection=enabled

# Ensure workload pods use the Dikastes injection template
kubectl patch deployment -n production backend-api -p '{"spec":{"template":{"metadata":{"annotations":{"inject.istio.io/templates":"sidecar,dikastes"}}}}}'
kubectl rollout restart deployment -n production backend-api
kubectl get pods -n production -l app=backend-api -o jsonpath='{.items[*].spec.containers[*].name}' | grep dikastes
```

## Test Application-Layer Policy

```bash
# Test allowed method
kubectl exec -n production frontend-pod -- curl -s -o /dev/null -w "%{http_code}\n" -X GET http://backend-api:8080/api/v1/data

# Test denied method/path
kubectl exec -n production frontend-pod -- curl -s -o /dev/null -w "%{http_code}\n" -X DELETE http://backend-api:8080/api/v1/admin
```

## Architecture

```mermaid
flowchart TD
    A[Frontend Pod] -->|HTTP Request| B[Envoy Sidecar]
    B -->|Calico App Policy| C{HTTP Method + Path Check}
    C -->|GET /api/v1/data - ALLOW| D[Backend Pod]
    C -->|DELETE /api/admin - DENY| E[403 Forbidden]
    F[Calico Dikastes] -->|App Policy Rules| B
```

## Conclusion

HTTP Method Policies with Calico and Istio provides fine-grained network security in Kubernetes, combining network-layer enforcement with application-layer policy evaluation. By filtering on HTTP methods and paths, you can implement access controls that are impossible with pure network-layer policies. Ensure your Calico-Istio integration is properly configured and test both allowed and denied request patterns to verify your application-layer policies are working correctly.
