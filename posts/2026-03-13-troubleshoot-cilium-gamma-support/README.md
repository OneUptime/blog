# How to Troubleshoot Cilium GAMMA Support

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Cilium, Kubernetes, GAMMA, Gateway API, Troubleshooting, Service Mesh

Description: Diagnose and resolve issues with Cilium GAMMA support including route attachment failures, traffic not matching mesh routes, and eBPF datapath errors.

---

## Introduction

Cilium's GAMMA implementation extends Gateway API to mesh (east-west) traffic, but misconfiguration can result in routes that appear accepted but do not redirect traffic through the expected L7 route. Understanding the failure modes specific to GAMMA helps resolve issues quickly.

Unlike ingress routes, GAMMA HTTPRoutes use a Service as the parentRef rather than a Gateway. This means route attachment and status conditions behave differently. In Cilium, producer HTTPRoutes must be in the same namespace as the Service they bind to. A route may show `Accepted: True` while traffic is not redirected through the expected Envoy L7 route.

This guide covers diagnosing GAMMA route attachment problems, eBPF policy mismatches, and status condition interpretation.

## Prerequisites

- Cilium with Gateway API enabled
- `kubeProxyReplacement=true` and `l7Proxy=true` in Cilium
- Gateway API CRDs supported by your Cilium version installed
- `kubectl`, `cilium`, and `hubble` CLIs

## Check Gateway API Feature Flag

Ensure Gateway API support is enabled:

```bash
kubectl get cm -n kube-system cilium-config -o jsonpath='{.data.enable-gateway-api}'
```

If empty or false, enable it:

```bash
helm upgrade cilium cilium/cilium --reuse-values \
  --namespace kube-system \
  --set kubeProxyReplacement=true \
  --set gatewayAPI.enabled=true
```

## Inspect HTTPRoute Status

```bash
kubectl describe httproute <route-name> -n <namespace>
```

Check `Status.Parents` for the Service parentRef:

```yaml
status:
  parents:
    - parentRef:
        group: ""
        kind: Service
        name: my-service
        port: 8080
      conditions:
        - type: Accepted
          status: "True"
        - type: ResolvedRefs
          status: "True"
```

If `ResolvedRefs` is `False`, the backend Service or port is not found.

## Architecture

```mermaid
flowchart TD
    A[HTTPRoute] --> B{parentRef resolution}
    B -->|Service found| C[Cilium eBPF Program]
    B -->|Service not found| D[ResolvedRefs: False]
    C --> E{Route Match}
    E -->|Match| F[Redirect to Backend]
    E -->|No Match| G[Request rejected]
    D --> H[Traffic bypasses route]
```

## Verify Backend Service Exists

```bash
kubectl get svc <backend-name> -n <namespace>
kubectl get endpoints <backend-name> -n <namespace>
```

Empty endpoints mean no pods are selected by the Service selector.

## Check Cilium Endpoint Policy

```bash
kubectl exec -n kube-system ds/cilium -- cilium-dbg endpoint list
kubectl exec -n kube-system ds/cilium -- cilium-dbg policy get
```

## Use Hubble to Trace GAMMA Traffic

```bash
hubble observe --namespace <namespace> --follow \
  --from-service <source-service> --to-service <target-service>
```

Look for `FORWARDED` or `DROPPED` verdicts. Dropped flows often indicate policy or datapath issues; route mismatches usually appear as rejected HTTP responses or missing flows to the expected backend.

## Conclusion

Troubleshooting Cilium GAMMA requires inspecting HTTPRoute status conditions, verifying backend Service resolution, and using Hubble to trace actual traffic flows. With these tools you can distinguish between configuration issues, missing backends, and eBPF datapath problems.
