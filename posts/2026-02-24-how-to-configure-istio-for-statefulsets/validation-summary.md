# Validation Summary: How to Configure Istio for StatefulSets

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Istio
- Kubernetes StatefulSets
- Kubernetes Services and DNS
- Istio sidecar injection
- Istio DestinationRule
- Istio PeerAuthentication
- Redis
- Kafka
- MongoDB
- MySQL
- PostgreSQL

## Sources Consulted
- Istio Protocol Selection: https://istio.io/latest/docs/ops/configuration/traffic-management/protocol-selection/
- Istio Sidecar Injection: https://istio.io/latest/docs/setup/additional-setup/sidecar-injection/
- Istio Sidecar Injection Problems: https://istio.io/latest/docs/ops/common-problems/injection/
- Istio DestinationRule reference: https://istio.io/latest/docs/reference/config/networking/destination-rule/
- Istio PeerAuthentication reference: https://istio.io/latest/docs/reference/config/security/peer_authentication/
- Istio TLS configuration: https://istio.io/latest/docs/ops/configuration/traffic-management/tls-configuration/
- Istio Resource Annotations: https://istio.io/latest/docs/reference/config/annotations/
- Kubernetes StatefulSet documentation: https://kubernetes.io/docs/concepts/workloads/controllers/statefulset/
- Kubernetes kubectl label reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_label/
- Kubernetes dependent environment variables: https://kubernetes.io/docs/tasks/inject-data-application/define-interdependent-environment-variables/
- Kubernetes Downward API: https://kubernetes.io/docs/concepts/workloads/pods/downward-api/

## Issues Found
- The startup-order explanation said the kubelet waits for the sidecar readiness probe. Updated it to match Istio documentation: the sidecar injector orders the proxy first and blocks application containers until the proxy is ready.
- The DestinationRule example used `networking.istio.io/v1beta1`. Updated it to the current `networking.istio.io/v1` API version used in current Istio documentation.
- The database protocol section incorrectly described database protocols generally as server-speaks-first and suggested `mongo` as normal built-in support. Updated the wording to identify MySQL as a server-first example, use opaque TCP names by default, and note that `mongo` is experimental protocol support that requires enabling the corresponding parser.
- The Kafka example lacked the required StatefulSet selector and referenced `$(POD_NAME)` without defining it. Added `.spec.selector.matchLabels` and a Downward API `POD_NAME` environment variable.
- The Kafka explanation said advertised addresses are pod IPs while the example used DNS names. Updated it to recommend stable pod DNS names.
- The mTLS section overstated application TLS as conflicting with Istio mTLS. Updated it to explain that application TLS can usually run inside Istio mTLS, with caveats for workloads needing plaintext mesh traffic or migration periods.
- The mTLS disable example only set `PeerAuthentication`, which controls inbound acceptance. Added a matching `DestinationRule` with `trafficPolicy.tls.mode: DISABLE` because outbound TLS behavior is controlled by DestinationRule or auto mTLS.
- The sidecar opt-out example used the deprecated `sidecar.istio.io/inject` annotation form. Updated it to the label form documented by current Istio sidecar injection behavior.

## Review Notes
The article is technically relevant and the remaining examples use current Kubernetes and Istio APIs. Some examples are still intentionally minimal and would need application-specific settings for production Redis or Kafka clusters.
