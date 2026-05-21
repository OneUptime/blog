# Validation Summary: How to Handle Deprecated Features Across Istio Versions

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Istio
- Kubernetes
- Kubernetes Gateway API
- Istio Telemetry API
- Istio networking and security APIs
- EnvoyFilter
- Helm
- istioctl

## Sources Consulted
- Istio networking API references: https://istio.io/latest/docs/reference/config/networking/
- Istio VirtualService reference: https://istio.io/latest/docs/reference/config/networking/virtual-service/
- Istio DestinationRule reference: https://istio.io/latest/docs/reference/config/networking/destination-rule/
- Istio Gateway reference: https://istio.io/latest/docs/reference/config/networking/gateway/
- Istio ServiceEntry reference: https://istio.io/latest/docs/reference/config/networking/service-entry/
- Istio Sidecar reference: https://istio.io/latest/docs/reference/config/networking/sidecar/
- Istio security API references: https://istio.io/latest/docs/reference/config/security/
- Istio Telemetry API reference: https://istio.io/latest/docs/reference/config/telemetry/
- Istio Envoy access logs documentation: https://istio.io/latest/docs/tasks/observability/logs/access-log/
- Istio rate limiting task: https://istio.io/latest/docs/tasks/policy-enforcement/rate-limit/
- Istio in-cluster operator deprecation announcement: https://istio.io/latest/blog/2024/in-cluster-operator-deprecation-announcement/
- Istio install with istioctl: https://istio.io/latest/docs/setup/install/istioctl/
- Istio install with Helm: https://istio.io/latest/docs/setup/install/helm/
- Istio Kubernetes Gateway API task: https://istio.io/latest/docs/tasks/traffic-management/ingress/gateway-api/
- Istio sidecar injection documentation: https://istio.io/latest/docs/setup/additional-setup/sidecar-injection/
- Istio ambient workload enrollment documentation: https://istio.io/latest/docs/ambient/usage/add-workloads/

## Issues Found
- The post described `networking.istio.io/v1beta1` as the current recommended networking API. Current Istio documentation uses `networking.istio.io/v1` for VirtualService, DestinationRule, Gateway, ServiceEntry, and Sidecar examples, so the examples and guidance were updated to v1.
- The post used cluster `kubectl get ... -o json` commands to detect old manifest API versions. Kubernetes serves converted resources, so this is not a reliable way to find manifests originally authored with older Istio API versions. The detection examples were changed to scan manifests for older apiVersion values.
- The Telemetry examples used `telemetry.istio.io/v1alpha1`. Current Istio documentation uses `telemetry.istio.io/v1`, so the examples were updated.
- The post incorrectly said `istioctl install` moved to maintenance mode in Istio 1.23-1.24. The official deprecation was for the in-cluster Istio operator; `istioctl install` remains documented and supported. The section was rewritten to target in-cluster IstioOperator usage.
- The post suggested rate limiting could be replaced with the Telemetry API. Istio's documented rate limiting task still uses EnvoyFilter, with the usual upgrade caution, so that guidance was corrected.
- The post implied custom access log format is configured through the Telemetry API. Istio documents Telemetry for enabling/disabling access logs, while custom formats are configured through mesh access log settings such as `meshConfig.accessLogFormat`. The wording was corrected.
- Gateway and HTTPRoute snippets were missing current API versions or required metadata. The examples were updated to `networking.istio.io/v1` and given `metadata.name` where needed.
- Broad deprecation timing statements were softened to avoid implying every minor Istio release has deprecations or that every deprecated feature is removed within exactly two to three minor releases.

## Review Notes
The post is technically relevant and salvageable. Istio API support is version-dependent, so future reviews should re-check the latest Istio release notes and API references before relying on specific deprecation timelines.
