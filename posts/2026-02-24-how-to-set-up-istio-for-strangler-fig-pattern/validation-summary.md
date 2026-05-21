# Validation Summary: How to Set Up Istio for Strangler Fig Pattern

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Istio ServiceEntry
- Istio VirtualService
- Istio traffic routing, traffic splitting, mirroring, timeouts, and retries
- Istio telemetry metrics
- Kubernetes Deployments and Services
- Python Flask service example
- Prometheus query expressions

## Sources Consulted
- Istio ServiceEntry reference: https://istio.io/latest/docs/reference/config/networking/service-entry/
- Istio VirtualService reference: https://istio.io/latest/docs/reference/config/networking/virtual-service/
- Istio traffic management concepts: https://istio.io/latest/docs/concepts/traffic-management/
- Istio traffic mirroring task: https://istio.io/latest/docs/tasks/traffic-management/mirroring/
- Istio standard metrics reference: https://istio.io/latest/docs/reference/config/metrics/
- Kubernetes Service documentation: https://kubernetes.io/docs/concepts/services-networking/service/
- Kubernetes Deployment documentation: https://kubernetes.io/docs/concepts/workloads/controllers/deployment/
- Flask API documentation: https://flask.palletsprojects.com/

## Issues Found
- The Istio manifests used `apiVersion: networking.istio.io/v1beta1`. Current Istio documentation uses the stable `networking.istio.io/v1` API for ServiceEntry and VirtualService, so the examples were updated to `v1`.
- The traffic mirroring section said to compare the responses from the legacy and new services. Istio mirrored requests are fire-and-forget and mirrored responses are discarded, so the text was corrected to recommend comparing logs, traces, or validation output from the new service.

## Review Notes
The examples are intentionally illustrative and assume prerequisite Istio Gateway configuration, sidecar injection or ambient setup, application databases, and service implementations exist outside the snippets. Istio documentation recommends fully qualified Kubernetes service names to avoid namespace ambiguity; the post's short service names are valid when the VirtualService and Services are in the same namespace, but fully qualified names would be safer in multi-namespace examples.
