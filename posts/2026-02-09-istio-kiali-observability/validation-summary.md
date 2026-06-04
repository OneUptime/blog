# Validation Summary: How to Implement Istio Observability with Kiali

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- Kiali
- Istio
- Kubernetes
- Helm
- Prometheus
- Jaeger
- Grafana
- Go
- GitLab CI

## Sources Consulted
- Kiali Helm installation documentation: https://kiali.io/docs/installation/installation-guide/install-with-helm/
- Kiali namespace management documentation: https://kiali.io/docs/configuration/namespace-management/
- Kiali Prometheus, tracing, and Grafana configuration documentation: https://kiali.io/docs/configuration/p8s-jaeger-grafana/
- Kiali Jaeger configuration documentation: https://kiali.io/docs/configuration/p8s-jaeger-grafana/tracing/jaeger/
- Kiali Grafana configuration documentation: https://kiali.io/docs/configuration/p8s-jaeger-grafana/grafana/
- Kiali traffic health configuration documentation: https://kiali.io/docs/configuration/health/
- Kiali topology documentation: https://kiali.io/docs/features/topology/
- Kiali security documentation: https://kiali.io/docs/features/security/
- Kiali detail views documentation: https://kiali.io/docs/features/details/
- Kiali validation documentation: https://kiali.io/docs/features/validations/
- Kiali internal API reference: https://github.com/kiali/kiali/blob/master/kiali_internal_api.md
- Istio distributed tracing overview: https://istio.io/latest/docs/tasks/observability/distributed-tracing/overview/
- Istio PeerAuthentication reference: https://istio.io/latest/docs/reference/config/security/peer_authentication/
- Istio mutual TLS task documentation: https://istio.io/latest/docs/tasks/security/authentication/authn-policy/

## Issues Found
- The installation section used the standalone `kiali-server` Helm chart with the removed `deployment.accessible_namespaces` setting. Updated it to the Kiali-recommended operator Helm installation and noted default cluster-wide namespace access.
- The data source configuration used obsolete Kiali field names (`in_cluster_url`, `url`) and presented the settings as a ConfigMap edit. Updated the example to a Kiali custom resource using current `internal_url` and `external_url` fields for tracing and Grafana.
- The custom health example omitted current tolerance fields for `direction` and `protocol` and described the configuration as a ConfigMap. Updated it to a Kiali custom resource with the supported traffic health configuration shape.
- Istio examples used `security.istio.io/v1beta1` and `networking.istio.io/v1beta1`. Updated examples to the current stable `security.istio.io/v1` and `networking.istio.io/v1` API versions.
- The tracing header propagation example omitted W3C `traceparent` and `tracestate` headers recommended by Istio. Added them.
- The Go snippet assigned `resp` without using it, which would not compile. Added basic error handling, response close, and status propagation.
- The CI/CD section referenced a non-existent `POST /api/namespaces/default/istio/validate` endpoint for validating arbitrary YAML before applying. Updated it to use Kiali's documented validation summary endpoint after applying to a non-production cluster, with `kubectl --dry-run=server` as a pre-apply API validation step.

## Review Notes
The post is technically valid after correction. Future improvements could mention that tracing backends and sampling are configured in Istio separately from Kiali, and that production Kiali access should use an authenticated strategy with appropriate RBAC.
