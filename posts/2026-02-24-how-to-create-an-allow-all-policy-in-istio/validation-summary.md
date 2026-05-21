# Validation Summary: How to Create an Allow-All Policy in Istio

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Istio AuthorizationPolicy
- Kubernetes custom resources
- kubectl
- istioctl

## Sources Consulted
- Istio Authorization Policy reference: https://istio.io/latest/docs/reference/config/security/authorization-policy/
- Istio istioctl analyze diagnostic documentation: https://istio.io/latest/docs/ops/diagnostic-tools/istioctl-analyze/
- Kubernetes kubectl apply reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_apply/
- Kubernetes kubectl get reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_get/

## Issues Found
- The source namespace example said it allowed traffic from the `frontend` namespace regardless of identity. Istio derives `source.namespaces` from the peer certificate and requires mTLS, so the explanation was updated to say the match is based on mTLS peer identity and is independent of method or path.
- The DENY override example matched HTTP paths without scoping the rule to a port. Istio treats missing HTTP attributes in DENY rules as matches for TCP traffic, so the example was updated to include `ports: ["8080"]` and the explanation now describes the path block as applying to HTTP traffic on port 8080. The same explanation was also clarified to note that namespace-based source matching depends on mTLS identity.

## Review Notes
The allow-all and allow-nothing examples use the current `security.istio.io/v1` API and match Istio's documented semantics: an empty rule matches all requests, omitted rules match no requests for ALLOW policies, DENY is evaluated before ALLOW, and requests are allowed when no ALLOW policies apply to the workload. The kubectl and istioctl commands use current documented flags and forms.
