# Validation Summary: How to use Gateway API policy attachment for extensibility

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes Gateway API
- Gateway API policy attachment
- Envoy Gateway BackendTrafficPolicy
- Envoy Gateway SecurityPolicy
- Kubernetes CustomResourceDefinitions
- controller-runtime reconcilers
- kubectl
- Prometheus Operator ServiceMonitor

## Sources Consulted
- Gateway API GEP-713: Metaresources and Policy Attachment: https://gateway-api.sigs.k8s.io/geps/gep-713/
- Gateway API specification reference: https://gateway-api.sigs.k8s.io/reference/spec/
- Envoy Gateway BackendTrafficPolicy documentation: https://gateway.envoyproxy.io/docs/concepts/gateway_api_extensions/backend-traffic-policy/
- Envoy Gateway API extension reference: https://gateway.envoyproxy.io/docs/api/extension_types/
- Envoy Gateway SecurityPolicy documentation: https://gateway.envoyproxy.io/docs/concepts/gateway_api_extensions/security-policy/
- Envoy Gateway CORS task documentation: https://gateway.envoyproxy.io/docs/tasks/security/cors/
- Envoy Gateway circuit breaker task documentation: https://gateway.envoyproxy.io/docs/tasks/traffic/circuit-breaker/
- Kubernetes CustomResourceDefinition API reference: https://kubernetes.io/docs/reference/kubernetes-api/apiextensions/custom-resource-definition-v1/
- Kubernetes kubectl get reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_get/
- Prometheus Operator getting started documentation: https://prometheus-operator.dev/docs/developer/getting-started/

## Issues Found
- Envoy Gateway examples used deprecated singular `targetRef`. Updated concrete Envoy Gateway `BackendTrafficPolicy` and `SecurityPolicy` examples to use `targetRefs`, matching current Envoy Gateway API guidance.
- The post described namespace attachment as a standard Gateway API attachment point. Clarified that namespace-scoped targeting is implementation-specific and not a standard Gateway API attachment point.
- The rate limit example used deprecated `rateLimit.type: Global`. Removed it and kept the current `global` configuration.
- The rate limit example implied the policy alone was sufficient for global rate limiting. Added a note that Envoy Gateway global rate limiting also requires the rate limit service backend configuration.
- The CORS example used numeric `maxAge: 86400`, but Envoy Gateway defines `maxAge` as a Gateway API duration. Changed it to `24h`.
- The circuit breaker example used outdated `maxRequests` and `maxRetries` fields. Changed them to current Envoy Gateway fields `maxParallelRequests` and `maxParallelRetries`.
- The policy precedence text presented `Route > Gateway > Namespace` as universal. Narrowed it to defaults-style policy hierarchies where the policy type defines that behavior.
- The custom CRD showed policy status later in the post but did not define a status subresource or status schema. Added a basic `status.conditions` schema and enabled the `status` subresource.
- The controller snippet could be read as standalone Go even though `CustomPolicy` would normally be a generated CRD type. Added a note clarifying that assumption.

## Review Notes
The vendor-specific policy examples for transformation, observability, timeout, and template policies are illustrative CRDs rather than standard Gateway API or Envoy Gateway resources. They remain plausible only if a controller defines and implements those schemas and merge rules.
