# Validation Summary: How to Fix GKE Pod-to-Service Communication Failures Across Namespaces

## Status
validated

## Post Type
Technical troubleshooting guide

## Technologies Covered
- Google Kubernetes Engine (GKE)
- Kubernetes Services and DNS
- Kubernetes EndpointSlices
- Kubernetes NetworkPolicy
- Kubernetes Service port and targetPort configuration
- Kubernetes headless Services and ExternalName Services
- Istio PeerAuthentication and mTLS
- kubectl troubleshooting commands

## Sources Consulted
- Kubernetes Namespaces and DNS documentation: https://kubernetes.io/docs/concepts/overview/working-with-objects/namespaces/#namespaces-and-dns
- Kubernetes DNS for Services and Pods documentation: https://kubernetes.io/docs/concepts/services-networking/dns-pod-service/
- Kubernetes Service documentation, including ClusterIP, headless Services, and ExternalName: https://kubernetes.io/docs/concepts/services-networking/service/
- Kubernetes EndpointSlice documentation: https://kubernetes.io/docs/concepts/services-networking/endpoint-slices/
- Kubernetes Endpoints API reference noting deprecation in v1.33+: https://kubernetes.io/docs/reference/kubernetes-api/core/endpoints-v1/
- Kubernetes kubectl run reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_run/
- Kubernetes NetworkPolicy documentation: https://kubernetes.io/docs/concepts/services-networking/network-policies/
- GKE network policy documentation: https://cloud.google.com/kubernetes-engine/docs/how-to/network-policy
- GKE Dataplane V2 documentation: https://cloud.google.com/kubernetes-engine/docs/concepts/dataplane-v2
- Istio PeerAuthentication reference: https://istio.io/latest/docs/reference/config/security/peer_authentication/

## Issues Found
- The post used `kubectl get endpoints` as the primary way to verify Service backends. The Kubernetes Endpoints API is deprecated as of Kubernetes v1.33, so this was changed to `kubectl get endpointslice -l kubernetes.io/service-name=api-service` and surrounding text was updated to refer to EndpointSlices.
- The egress NetworkPolicy example allowed only UDP port 53 for DNS. DNS can use TCP port 53 as well, so TCP 53 was added to the DNS egress rule.
- The Istio PeerAuthentication example used `security.istio.io/v1beta1`. The current Istio reference documents the stable `security.istio.io/v1` API, so the snippet was updated.
- The ExternalName section described DNS as redirecting to the backend service without noting that Kubernetes returns a CNAME and does not proxy traffic. The text was corrected and a brief HTTP/TLS hostname caveat was added.

## Review Notes
The remaining commands and examples are technically consistent with current Kubernetes and GKE behavior. NetworkPolicy enforcement details can vary by GKE dataplane and cluster configuration, but the examples use standard Kubernetes NetworkPolicy fields.
