# Validation Summary: How to Secure Custom Calico Ingress Gateways

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Calico (projectcalico.org/v3 API)
- Kubernetes (Deployment, Service, NetworkPolicy)
- Envoy Proxy (v1.28.0)
- kubectl / calicoctl
- LoadBalancer services
- Mermaid (for architecture diagram)

## Sources Consulted
- Calico GlobalNetworkPolicy reference: https://docs.tigera.io/calico/latest/reference/resources/globalnetworkpolicy
- Calico NetworkPolicy reference: https://docs.tigera.io/calico/latest/reference/resources/networkpolicy
- Calico EntityRule (selector/namespaceSelector) reference: https://docs.tigera.io/calico/latest/reference/resources/networkpolicy#entityrule
- Kubernetes Deployment/Service API: https://kubernetes.io/docs/reference/kubernetes-api/workload-resources/deployment-v1/
- Kubernetes namespace label `kubernetes.io/metadata.name` (NamespaceDefaultLabelName, GA in 1.22): https://kubernetes.io/docs/concepts/overview/working-with-objects/labels/
- Envoy Docker images on Docker Hub: https://hub.docker.com/r/envoyproxy/envoy/tags (v1.28.0 is a valid release tag)
- kubectl jsonpath: https://kubernetes.io/docs/reference/kubectl/jsonpath/

## Issues Found
No technical issues found.

The Calico GlobalNetworkPolicy uses the correct `projectcalico.org/v3` apiVersion, valid selector syntax (`app == 'custom-gateway'`), and properly structured egress rule with `destination.namespaceSelector`, `destination.ports`, and `protocol: TCP`. The namespaced NetworkPolicy correctly omits `types` since Calico infers it from the rules present (ingress-only here). The `kubernetes.io/metadata.name` label used in the namespaceSelector is automatically added to all namespaces by Kubernetes (GA since 1.22), so the selector will match. The Envoy image tag `envoyproxy/envoy:v1.28.0` exists on Docker Hub. The kubectl jsonpath expression for retrieving the LoadBalancer IP is valid.

## Review Notes
- The post intentionally leaves the namespaced NetworkPolicy ingress rule fully permissive (no `destination.ports`); in production users would typically also constrain `destination.ports` and `protocol`, but as written it is syntactically and semantically valid.
- The `\n` line breaks inside Mermaid node labels render as literal newlines in current Mermaid versions; this is acceptable but some renderers prefer `<br/>`.
- The post does not include namespace creation manifests (`gateway-system`, `production`) or a label on the `gateway-system` namespace; readers will need to ensure those exist with appropriate labels for the policies to take effect. This is a common omission in short tutorials and not technically incorrect.
