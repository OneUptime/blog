# Validation Summary: How to Use KEDA HTTPScaledObject for HTTP-Based Autoscaling

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes
- KEDA
- KEDA HTTP Add-on
- HTTPScaledObject
- Helm
- Kubernetes Ingress
- Horizontal Pod Autoscaler

## Sources Consulted
- KEDA HTTP Add-on v0.14 Getting Started: https://keda.sh/http-add-on/0.14/getting-started/
- KEDA HTTP Add-on v0.14 installation guide: https://keda.sh/http-add-on/0.14/operations/installation/
- KEDA HTTP Add-on v0.14 HTTPScaledObject reference: https://keda.sh/http-add-on/0.14/reference/httpscaledobject/
- KEDA HTTP Add-on v0.14 architecture documentation: https://keda.sh/http-add-on/0.14/concepts/architecture/
- KEDA HTTP Add-on v0.14 scaling documentation: https://keda.sh/http-add-on/0.14/concepts/scaling/
- KEDA HTTP Add-on v0.14 ingress configuration: https://keda.sh/http-add-on/0.14/user-guide/configure-ingress/
- KEDA HTTP Add-on v0.14 metrics reference: https://keda.sh/http-add-on/0.14/reference/metrics/
- KEDA HTTP Add-on v0.14 CRD source: https://github.com/kedacore/http-add-on/tree/v0.14.0
- KEDA ScaledObject specification: https://keda.sh/docs/2.19/reference/scaledobject-spec/

## Issues Found
- The Helm chart name was incorrect as `kedacore/keda-add-on-http`. Changed it to the documented `kedacore/keda-add-ons-http` and added the required `helm repo add` / `helm repo update` commands before installing charts.
- The install example used unsupported Helm values `interceptor.replicas` and `scaler.replicas`. Removed those values and kept the documented default install command.
- The HTTPScaledObject examples used `minReplicaCount`, `maxReplicaCount`, and integer `replicas` fields. Replaced them with the documented `spec.replicas.min` and `spec.replicas.max` object.
- The examples described `replicas` as an initial activation replica count. Removed that claim because HTTPScaledObject does not use `replicas` for scale-from-zero burst size.
- The concurrency examples included `granularity`, which is only part of the request-rate metric. Removed it from concurrency snippets.
- The post described `targetPendingRequests` as a queue limit. Removed that field because it is deprecated and documented as a target metric value, not a request queue cap.
- The advanced HPA behavior snippet used `advanced.horizontalPodAutoscalerConfig`, which is part of KEDA ScaledObject configuration and not part of HTTPScaledObject. Replaced that section with documented HTTPScaledObject replica limits and `scaledownPeriod`.
- The ingress example created a same-named interceptor Service in the application namespace with a selector that would not select the interceptor pods. Updated the example to place the Ingress in the interceptor service namespace and explain the ExternalName option for other namespaces.
- The monitoring section referenced `.status.pendingRequests`, which is not a documented HTTPScaledObject status field. Replaced it with YAML status inspection and Prometheus metrics commands using the documented interceptor metrics endpoint.
- The WebSocket-specific section and claims were not supported by the consulted KEDA HTTP Add-on docs. Reframed the section around long-running streaming HTTP requests and concurrency-based scaling.
- Added a note that HTTPScaledObject is deprecated in current KEDA HTTP Add-on docs and that InterceptorRoute with a separate ScaledObject is recommended for new deployments.

## Review Notes
The corrected post remains focused on HTTPScaledObject because that is the post topic, but current KEDA HTTP Add-on documentation marks HTTPScaledObject as deprecated. A future update should migrate the tutorial to InterceptorRoute plus a separately managed KEDA ScaledObject.
