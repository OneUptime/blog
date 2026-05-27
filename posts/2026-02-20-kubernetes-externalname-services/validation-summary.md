# Validation Summary: How to Use Kubernetes ExternalName Services for External Endpoints

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes Services
- ExternalName Services
- Kubernetes DNS / CoreDNS
- EndpointSlices
- kubectl
- PostgreSQL client usage
- Python psycopg2 connection configuration

## Sources Consulted
- Kubernetes Services documentation: https://kubernetes.io/docs/concepts/services-networking/service/
- Kubernetes Service API reference: https://kubernetes.io/docs/reference/kubernetes-api/core/service-v1/
- Kubernetes EndpointSlices documentation: https://kubernetes.io/docs/concepts/services-networking/endpoint-slices/
- Kubernetes DNS for Services and Pods documentation: https://kubernetes.io/docs/concepts/services-networking/dns-pod-service/
- Kubernetes kubectl exec reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_exec/
- Kubernetes kubectl get reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_get/

## Issues Found
- The post recommended manually managed `Endpoints` for IP-based external targets. Kubernetes v1.33 marks the legacy Endpoints API as deprecated and recommends using `EndpointSlice` objects directly for selectorless Services. I replaced the `Endpoints` manifest with a `discovery.k8s.io/v1` `EndpointSlice` manifest and updated surrounding wording.
- The ExternalName IP example described an IPv4-looking `externalName` as simply invalid. Kubernetes documentation says an IPv4 address string can be accepted but is treated as a DNS name, not an IP address, and will not resolve as an IP target. I changed the wording and inline comment to reflect that behavior.
- The comparison table referred to `ClusterIP + Endpoints` and described TLS as transparent. I updated it to `ClusterIP + EndpointSlice` and changed the TLS note to indicate hostname configuration may still be needed.

## Review Notes
The remaining ExternalName behavior, CNAME explanation, lack of kube-proxy involvement, DNS-level redirection, selectorless Service pattern, kubectl command shapes, and TLS/SNI caveats match the official Kubernetes documentation. `kubectl` was not installed in the local environment, so command syntax was checked against the official kubectl reference rather than local `--help` output.
