# Validation Summary: How to Set Up Traffic Management with a Service Mesh via Portainer

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Portainer
- Kubernetes Deployments and Services
- Istio service mesh
- Istio VirtualService
- Istio DestinationRule
- Istio traffic shifting, retries, timeouts, circuit breaking, and mirroring
- Prometheus and PromQL
- Kiali

## Sources Consulted
- Istio VirtualService reference: https://istio.io/latest/docs/reference/config/networking/virtual-service/
- Istio DestinationRule reference: https://istio.io/latest/docs/reference/config/networking/destination-rule/
- Istio traffic management concepts: https://istio.io/latest/docs/concepts/traffic-management/
- Istio sidecar injection documentation: https://istio.io/latest/docs/setup/additional-setup/sidecar-injection/
- Istio standard metrics reference: https://istio.io/latest/docs/reference/config/metrics/
- Prometheus `promtool` command reference: https://prometheus.io/docs/prometheus/latest/command-line/promtool/
- Portainer create application from manifest documentation: https://docs.portainer.io/sts/user/kubernetes/applications/manifest/create
- Kiali access documentation: https://kiali.io/docs/installation/installation-guide/accessing-kiali/
- Kubernetes Deployment documentation: https://kubernetes.io/docs/concepts/workloads/controllers/deployment/
- Kubernetes Service documentation: https://kubernetes.io/docs/concepts/services-networking/service/
- Envoy retry behavior reference: https://www.envoyproxy.io/docs/envoy/latest/configuration/http/http_filters/router_filter.html

## Issues Found
- Replaced the generic "Istio or Linkerd" prerequisite and traffic-management wording with Istio-specific wording because the manifests use Istio-only resources such as `VirtualService` and `DestinationRule`.
- Updated all Istio networking manifests from `networking.istio.io/v1beta1` to the current stable `networking.istio.io/v1` API used by current Istio documentation.
- Replaced deprecated `LEAST_CONN` load balancing with `LEAST_REQUEST`, which Istio documents as the preferred replacement.
- Corrected the Portainer deployment path from a generic Kubernetes manifests section to Portainer's application manifest workflow.
- Clarified that later examples should update the same `VirtualService` and `DestinationRule` resources instead of creating multiple resources for the same host, which can cause conflicts for in-mesh routing.
- Updated the circuit breaker example to modify the existing `my-service-dr`, preserve the subsets, and use `consecutive5xxErrors` for the documented "5 consecutive 5xx errors" behavior.
- Corrected the `minHealthPercent` comment to describe host health percentage behavior instead of incorrectly calling it a minimum request count.
- Corrected retry comments so `perTryTimeout` is described as a per-try timeout, not a delay between retries, and adjusted the overall timeout to leave enough budget for retries.
- Fixed the Prometheus verification command by adding the required `promtool query instant` server argument and grouping the query by `destination_version` so it actually verifies traffic distribution.
- Replaced the vague Kiali port-forward instruction with the documented `kubectl port-forward -n istio-system svc/kiali 20001:20001` command.

## Review Notes
The short host name `my-service` is valid because the Istio resources and Service are all in the `production` namespace, but a fully qualified service name is safer in larger clusters. Prometheus and Kiali verification assumes those observability add-ons are installed in the cluster.
