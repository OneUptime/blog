# Validation Summary: How to Configure Istio with Kubernetes Network Policies

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes NetworkPolicy
- Istio AuthorizationPolicy
- Istio sidecar proxies and istiod
- Kubernetes DNS and namespace selectors
- kubectl

## Sources Consulted
- Kubernetes Network Policies documentation: https://kubernetes.io/docs/concepts/services-networking/network-policies/
- Kubernetes kubectl exec reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_exec/
- Istio NetworkPolicy setup documentation: https://istio.io/latest/docs/setup/additional-setup/network-policy/
- Istio Application Requirements, ports used by Istio: https://istio.io/latest/docs/ops/deployment/application-requirements/
- Istio AuthorizationPolicy reference: https://istio.io/latest/docs/reference/config/security/authorization-policy/
- Istio Security Best Practices, defense in depth with NetworkPolicy: https://istio.io/latest/docs/ops/best-practices/security/

## Issues Found
- The default-deny NetworkPolicy example included both `Ingress` and `Egress`, but the text said it only blocked ingress. Updated the text to state that it blocks both ingress and egress.
- The Istio control-plane section described traffic as coming from istiod and mentioned sidecar-to-sidecar traffic. In sidecar mode, workloads typically need egress to istiod for xDS/CA traffic, while service-to-service traffic needs separate workload rules. Updated the explanation and narrowed the example to egress to istiod on TCP port 15012.
- The complete example claimed to be a full three-tier configuration but only defined policies in the `backend` namespace. Updated the wording to describe it as the backend-tier configuration.
- The blocked test claimed `frontend -> database` was denied, but the shown policies did not isolate the `frontend` or `database` namespaces. Changed the blocked test to `database -> backend`, which is denied by the backend ingress policy shown.

## Review Notes
- The YAML examples parse successfully.
- The examples use the stable `networking.k8s.io/v1` NetworkPolicy API and current `security.istio.io/v1` AuthorizationPolicy API.
- DNS allow rules may need adjustment in clusters using NodeLocal DNSCache or custom DNS labels, but the example is valid for a conventional kube-system DNS deployment.
