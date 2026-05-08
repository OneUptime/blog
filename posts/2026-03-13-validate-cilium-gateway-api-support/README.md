# How to Validate Cilium Gateway API Support

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Cilium, Kubernetes, Gateway API, Validation, Networking

Description: Validate Cilium Gateway API support by verifying Gateway provisioning, HTTPRoute binding, and end-to-end traffic routing.

---

## Introduction

Validating Cilium Gateway API support confirms that the complete traffic path from external IP to backend pods is working correctly. This involves verifying Kubernetes API objects, load balancer service health, and actual network connectivity.

Gateway API validation is typically run after initial deployment, after upgrades, and as part of CI/CD pipelines. A complete validation checklist catches regressions before users are affected.

## Prerequisites

- Cilium with Gateway API enabled
- At least one Gateway and one HTTPRoute deployed
- External IP assigned to the Gateway
- `curl` available externally or from a pod

## Validate GatewayClass

```bash
kubectl get gatewayclass cilium \
  -o jsonpath='{.status.conditions[?(@.type=="Accepted")].status}'
# Expected: True

```

## Validate Gateway Provisioning

```bash
kubectl get gateway -A -o json | jq '
  .items[] | {
    name: .metadata.name,
    ns: .metadata.namespace,
    programmed: ([.status.conditions[]? |
      select(.type=="Programmed") | .status][0] // ""),
    address: (.status.addresses[0].value // "")
  }'
```

All Gateways should show `True` for PROGRAMMED and an IP address.

## Validate HTTPRoute Binding

```bash
kubectl get httproute -A -o json | jq '
  .items[] | . as $route | .status.parents[]? | {
    name: $route.metadata.name,
    ns: $route.metadata.namespace,
    parentRef: .parentRef.name,
    accepted: ([.conditions[]? |
      select(.type=="Accepted") | .status][0] // ""),
    resolvedRefs: ([.conditions[]? |
      select(.type=="ResolvedRefs") | .status][0] // "")
  }'
```

Each parent binding should show `True` for `accepted` and `resolvedRefs`.

## Architecture

```mermaid
sequenceDiagram
    participant Tester
    participant GatewayClass
    participant Gateway
    participant HTTPRoute
    participant Backend

    Tester->>GatewayClass: verify Accepted=True
    Tester->>Gateway: verify Programmed=True and IP
    Tester->>HTTPRoute: verify Accepted=True, ResolvedRefs=True
    Tester->>Backend: curl GATEWAY_IP with Host header
    Backend-->>Tester: HTTP 200
```

## Test End-to-End Traffic

```bash
GATEWAY_IP=$(kubectl get gateway <name> -n <namespace> \
  -o jsonpath='{.status.addresses[0].value}')

# Test HTTP
curl -v -H "Host: myapp.example.com" http://${GATEWAY_IP}/

# Test HTTPS
curl -v --resolve myapp.example.com:443:${GATEWAY_IP} \
  --cacert ca.crt https://myapp.example.com/
```

## Validate Backend Connectivity

Confirm the target Services have ready endpoints:

```bash
kubectl get endpointslice -n <namespace> \
  -l kubernetes.io/service-name=<backend-service>
```

## Run Cilium Connectivity Test

```bash
cilium connectivity test --test gateway-api
```

## Conclusion

Validating Cilium Gateway API support requires checking the GatewayClass, Gateway, and HTTPRoute conditions, verifying load balancer IP assignment, and testing live traffic. This checklist provides confidence that the full ingress path is operational.
