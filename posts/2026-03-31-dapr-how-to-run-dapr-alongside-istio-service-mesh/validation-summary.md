# Validation Summary: How to Run Dapr Alongside Istio Service Mesh

## Status
validated

## Post Type
Guide

## Technologies Covered
- Dapr (sidecar architecture, mTLS, service invocation, Configuration CRD)
- Istio (Envoy sidecar, PeerAuthentication, VirtualService, traffic management)
- Kubernetes (Deployments, annotations, pod specs)
- Zipkin (distributed tracing)

## Sources Consulted
- Dapr arguments and annotations reference: https://docs.dapr.io/reference/arguments-annotations-overview/
- Dapr Configuration overview: https://docs.dapr.io/operations/configuration/configuration-overview/
- Dapr Health API reference: https://docs.dapr.io/reference/api/health_api/
- Dapr service invocation overview: https://docs.dapr.io/developing-applications/building-blocks/service-invocation/service-invocation-overview/
- Dapr Placement service docs: https://docs.dapr.io/concepts/dapr-services/placement/
- Istio Application Requirements (ports): https://istio.io/latest/docs/ops/deployment/application-requirements/
- Istio Resource Annotations: https://istio.io/latest/docs/reference/config/annotations/
- Istio PeerAuthentication reference: https://istio.io/latest/docs/reference/config/security/peer_authentication/
- Istio VirtualService reference: https://istio.io/latest/docs/reference/config/networking/virtual-service/
- Istio v1 APIs announcement: https://istio.io/latest/blog/2024/v1-apis/
- Istio Zipkin integration: https://istio.io/latest/docs/ops/integrations/zipkin/
- Istio Zipkin addon (extras): https://github.com/istio/istio/blob/master/samples/addons/extras/zipkin.yaml
- Zipkin API spec: https://github.com/openzipkin/zipkin-api/blob/master/zipkin2-api.yaml

## Issues Found
1. **Zipkin addon URL had wrong path and outdated version**: The URL `https://raw.githubusercontent.com/istio/istio/release-1.20/samples/addons/zipkin.yaml` was incorrect. Zipkin is located in the `extras/` subdirectory (`samples/addons/extras/zipkin.yaml`), not the main addons directory. The original URL would result in a 404. Also updated the version from `release-1.20` (late 2023) to `release-1.25`. Fixed to `https://raw.githubusercontent.com/istio/istio/release-1.25/samples/addons/extras/zipkin.yaml`.

2. **Istio PeerAuthentication API version was outdated**: Changed `apiVersion: security.istio.io/v1beta1` to `security.istio.io/v1`. The PeerAuthentication API has been GA (`v1`) since Istio 1.22. While `v1beta1` still works, using the GA version is correct practice.

3. **Istio VirtualService API version was outdated**: Changed `apiVersion: networking.istio.io/v1alpha3` to `networking.istio.io/v1`. Istio promoted networking APIs to GA (`v1`) in Istio 1.22. While `v1alpha3` still works, `v1` is the current recommended version.

4. **Service discovery table was misleading**: Changed "Dapr placement + name-based" to "Dapr name resolution (K8s DNS)". The Dapr placement service is specifically for actor placement and is not a general-purpose service discovery mechanism. Dapr uses its name resolution component (Kubernetes DNS in K8s deployments) for service invocation.

## Review Notes
- The post does not list Dapr's internal gRPC port (50002, used for sidecar-to-sidecar communication) in the pod diagram. This is acceptable as a simplification since the diagram is a high-level overview, and the post's approach of disabling Dapr mTLS means Istio will handle encryption on that port anyway.
- The port exclusion strategy (excluding 3500, 50001, 9090 from Istio inbound; 3500, 50001 from outbound) is a valid design choice. Not excluding port 50002 means Istio handles mTLS for Dapr sidecar-to-sidecar traffic, which is consistent with the post's recommendation to let Istio manage network-level encryption.
- All Dapr annotations, Configuration CRD fields, and kubectl commands are correct.
- The Dapr health endpoint (`/v1.0/healthz`) and Zipkin endpoint (`/api/v2/spans`) are both correct.
- The overall architectural guidance (use Istio for network-level concerns, Dapr for application-level concerns) is sound and aligns with both projects' documentation.
