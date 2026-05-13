# How to Migrate to Application-Layer Policy with Calico and Istio

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, Kubernetes, Network Policy, Istio, Application Layer, Security

Description: Migrate Calico application-layer network policies using Istio integration for HTTP method and path-based access control.

---

## Introduction

Application-Layer Policy with Calico and Istio combines Calico's network-layer enforcement with Istio's application-layer visibility. This powerful combination lets you write policies that reference HTTP attributes - methods and paths - in addition to network-level properties like IP addresses and ports.

Calico's `projectcalico.org/v3` NetworkPolicy and GlobalNetworkPolicy resources support HTTP match criteria when Istio application-layer policy is enabled. These rules are evaluated through Istio's Envoy sidecar proxies and Calico's Dikastes sidecar rather than only at the network layer. This enables fine-grained control like "allow GET requests to /api/health but deny POST requests to /api/admin."

This guide covers migrate App-Layer Policy using Calico and Istio together.

## Prerequisites

- Kubernetes cluster with Calico CNI and a supported Istio version installed
- Calico-Istio integration configured with application-layer policy enabled
- `calicoctl` and `kubectl` installed
- Workloads with Istio and Dikastes sidecar injection enabled

## Core Configuration

```yaml
apiVersion: projectcalico.org/v3
kind: NetworkPolicy
metadata:
  name: migrate-app-layer-policy
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
    - action: Deny
      source:
        selector: app == 'frontend'
      http:
        methods:
          - DELETE
          - PUT
        paths:
          - prefix: /api/v1/admin
  types:
    - Ingress
```

## Istio + Calico Setup

```bash
# Verify Calico-Istio integration

kubectl get felixconfiguration default -o yaml | grep policySyncPathPrefix
kubectl get configmap -n istio-system istio-sidecar-injector -o yaml | grep "dikastes:" -A 5

# Enable sidecar injection for namespace
kubectl label namespace production istio-injection=enabled

# Enable Dikastes injection for the workload pod template
kubectl patch deployment backend-api -n production \
  -p '{"spec":{"template":{"metadata":{"annotations":{"inject.istio.io/templates":"sidecar,dikastes"}}}}}'

# Verify the workload pod has the Dikastes sidecar
kubectl get pod -n production -l app=backend-api \
  -o jsonpath='{.items[0].spec.containers[*].name}'
```

## Test Application-Layer Policy

```bash
# Test allowed method
kubectl exec -n production frontend-pod -- curl -X GET http://backend-api:8080/api/v1/data
echo "GET /api/v1/data (should pass): $?"

# Test denied method/path
kubectl exec -n production frontend-pod -- curl -X DELETE http://backend-api:8080/api/v1/admin
echo "DELETE /api/v1/admin (should be denied): $?"
```

## Architecture

```mermaid
flowchart TD
    A[Frontend Pod] -->|HTTP Request| B[Envoy Sidecar]
    B -->|Calico App Policy| C{HTTP Method + Path Check}
    C -->|GET /api/v1/data - ALLOW| D[Backend Pod]
    C -->|DELETE /api/v1/admin - DENY| E[403 Forbidden]
    F[Calico Dikastes] -->|App Policy Rules| B
```

## Conclusion

Application-Layer Policy with Calico and Istio provides fine-grained network security in Kubernetes, combining network-layer enforcement with application-layer policy evaluation. By filtering on HTTP methods and paths, you can implement access controls that are impossible with pure network-layer policies. Ensure your Calico-Istio integration is properly configured and test both allowed and denied request patterns to verify your application-layer policies are working correctly.
