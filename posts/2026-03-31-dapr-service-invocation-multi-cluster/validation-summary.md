# Validation Summary: How to Use Dapr Service Invocation in a Multi-Cluster Setup

## Status
validated

## Post Type
Guide

## Technologies Covered
- Dapr (HTTPEndpoint, Configuration, service invocation, mTLS)
- Kubernetes
- Istio (ServiceEntry for multi-cluster federation)
- Linkerd (mentioned)
- HashiCorp Consul (multi-datacenter name resolution)
- Dapr JavaScript SDK (`@dapr/dapr`)

## Sources Consulted
- Dapr HTTPEndpoint API reference and source code (`pkg/apis/httpEndpoint/v1alpha1/types.go`) — https://docs.dapr.io/reference/api/service_invocation_api/
- Dapr name resolution component docs (Consul) — https://docs.dapr.io/reference/components-reference/supported-name-resolution/setup-nr-consul/
- Dapr mTLS documentation — https://docs.dapr.io/operations/security/mtls/
- Dapr JavaScript SDK reference — https://docs.dapr.io/developing-applications/sdks/js/js-client/
- Dapr JS SDK GitHub repository — https://github.com/dapr/js-sdk
- Istio ServiceEntry API reference — https://istio.io/latest/docs/reference/config/networking/service-entry/
- Istio v1 APIs blog post — https://istio.io/latest/blog/2024/v1-apis/

## Issues Found

1. **Istio ServiceEntry apiVersion outdated**: Changed `networking.istio.io/v1beta1` to `networking.istio.io/v1`. The v1beta1 version still works but has been superseded since Istio 1.22 when networking APIs were promoted to v1.

2. **Istio ServiceEntry location incorrect**: Changed `MESH_EXTERNAL` to `MESH_INTERNAL`. For a multi-cluster service mesh scenario where the remote service is part of the same Istio mesh, `MESH_INTERNAL` is correct. `MESH_EXTERNAL` disables mTLS and server-side policy enforcement, which contradicts the security goals of a federated mesh.

3. **Dapr JavaScript SDK invocation API incorrect**: Changed `daprClient.invoke('cluster-b-order-service', ...)` to `daprClient.invoker.invoke('cluster-b-order-service', ...)` and changed the string `'GET'` to `HttpMethod.GET`. The Dapr JS SDK uses the `invoker` sub-object for service invocation, not a direct `invoke()` method on the client. Added the required `import { HttpMethod } from "@dapr/dapr"` statement.

## Review Notes
- The Consul name resolution approach hardcodes `queryOptions.datacenter: cluster-b`, which means all service lookups will target cluster-b. In a real multi-cluster setup, you may want different configurations per service or use Consul's prepared queries for more flexible routing.
- The trust bundle exchange section is simplified. In production, you would typically use a shared root CA or a certificate management tool rather than manually copying secrets between clusters.
- The post correctly notes that Dapr does not natively support multi-cluster service invocation — the approaches shown are valid workarounds using external systems.
