# Validation Summary: How to Migrate from Custom Service Discovery to Istio

## Status
validated

## Post Type
Tutorial / migration guide

## Technologies Covered
- Istio
- Kubernetes Services, DNS, probes, and EndpointSlices
- Consul service discovery and Consul Connect
- Spring Cloud Netflix Eureka
- Apache ZooKeeper / Apache Curator service discovery
- Go
- Java / Spring

## Sources Consulted
- Istio ServiceEntry reference: https://istio.io/latest/docs/reference/config/networking/service-entry/
- Istio PeerAuthentication reference: https://istio.io/latest/docs/reference/config/security/peer_authentication/
- Istio sidecar injection documentation: https://istio.io/latest/docs/setup/additional-setup/sidecar-injection/
- Istio istioctl command reference: https://istio.io/latest/docs/reference/commands/istioctl/
- Istio install with istioctl documentation: https://istio.io/latest/docs/setup/install/istioctl/
- Kubernetes DNS for Services and Pods: https://kubernetes.io/docs/concepts/services-networking/dns-pod-service/
- Kubernetes Service documentation: https://kubernetes.io/docs/concepts/services-networking/service/
- Kubernetes EndpointSlices documentation: https://kubernetes.io/docs/concepts/services-networking/endpoint-slices/
- Spring Cloud Netflix Eureka reference: https://docs.spring.io/spring-cloud-netflix/docs/current/reference/html/
- Apache Curator service discovery documentation: https://curator.apache.org/docs/service-discovery/
- HashiCorp Consul Agent service API documentation: https://developer.hashicorp.com/consul/api-docs/agent/service
- HashiCorp Consul Agent check API documentation: https://developer.hashicorp.com/consul/api-docs/agent/check
- HashiCorp Consul service mesh documentation: https://developer.hashicorp.com/consul/docs/connect

## Issues Found
- The post said Istio sidecar proxies get endpoints directly from the Kubernetes API. Updated this to clarify that Istiod watches Kubernetes and distributes endpoint configuration to sidecars.
- The migration strategy said there were three phases while the post listed eight detailed phases. Updated the wording to "three broad phases" to make the statement internally consistent.
- The endpoint verification command used `kubectl get endpoints`. Updated it to use EndpointSlices with the `kubernetes.io/service-name` label because EndpointSlice is the current scalable Kubernetes API for service backends.
- The PeerAuthentication and ServiceEntry examples used older `v1beta1` Istio API versions. Updated them to `security.istio.io/v1` and `networking.istio.io/v1`.
- The Eureka migration comment implied Envoy resolves the service name. Updated it to state that Kubernetes DNS resolves the name and Envoy handles mesh traffic.
- The cross-namespace DNS section said the full DNS name is required. Updated it to show namespace-qualified DNS as the normal form and the fully qualified name as an optional form.
- The cross-namespace visibility note suggested ServiceEntries for simplifying namespace visibility. Updated it to mention Istio export settings and Sidecar egress hosts instead.
- The static IP ServiceEntry example used a short host name. Updated it to a DNS-style host name that better matches Istio ServiceEntry host expectations.
- The Consul Connect section implied a current first-party Consul/Istio integration. Updated it to describe side-by-side operation as a separate mesh or registry-integration step.

## Review Notes
The examples are intentionally minimal and omit surrounding imports, Spring bean wiring, and Kubernetes Deployment context. They are acceptable as focused migration snippets, but a future expanded version could add production caveats around Istio revision labels, applying the PeerAuthentication manifest, and readiness-gated rollout sequencing.
