# Validation Summary: How to Set Up Kiali for Istio Mesh Visualization

## Status
validated

## Post Type
Tutorial / installation guide

## Technologies Covered
- Kiali
- Istio
- Kubernetes
- Helm
- Prometheus
- Grafana
- Jaeger
- kubectl
- istioctl

## Sources Consulted
- Kiali Helm installation documentation: https://kiali.io/docs/installation/installation-guide/install-with-helm/
- Kiali Custom Resource documentation: https://kiali.io/docs/installation/installation-guide/creating-updating-kiali-cr/
- Kiali CR reference: https://kiali.io/docs/configuration/kialis.kiali.io/
- Kiali namespace management documentation: https://kiali.io/docs/configuration/namespace-management/
- Kiali Jaeger tracing configuration: https://kiali.io/docs/configuration/p8s-jaeger-grafana/tracing/jaeger/
- Kiali traffic health documentation: https://kiali.io/docs/configuration/health/
- Istio Kiali integration documentation: https://istio.io/latest/docs/ops/integrations/kiali/
- Istio Prometheus integration documentation: https://istio.io/latest/docs/ops/integrations/prometheus/
- Istio supported releases documentation: https://istio.io/latest/docs/releases/supported-releases/
- Istio istioctl command reference: https://istio.io/latest/docs/reference/commands/istioctl/

## Issues Found
- Updated the prerequisites from fixed old minimums (`Kubernetes 1.23+`, `Istio 1.16+`) to require a Kubernetes cluster supported by the installed Istio release and a supported Istio release. Istio 1.16 is no longer supported, and current supported releases have specific Kubernetes compatibility ranges.
- Corrected the Prometheus prerequisite. Prometheus is not something to assume from the Istio demo profile; Istio documents Prometheus as a separate sample addon for quick-start use.
- Updated the Helm prerequisite to Helm 3.10 or newer, matching Kiali's current Helm installation requirements.
- Added `--set cr.spec.auth.strategy=anonymous` to the Helm install example so the later unauthenticated local dashboard access matches the generated Kiali CR behavior documented by Kiali.
- Renamed the "Installing with istioctl" quick method because the example uses `kubectl apply`, not `istioctl`.
- Updated the Istio sample Kiali addon URL from `release-1.22` to `release-1.30`, matching the current Istio documentation and avoiding an outdated release branch.
- Replaced deprecated Kiali CR fields `deployment.accessible_namespaces` and `api.namespaces.label_selector_include` with current `deployment.cluster_wide_access` and `deployment.discovery_selectors` examples.
- Replaced deprecated `external_services.grafana.in_cluster_url` and `external_services.tracing.in_cluster_url` with `internal_url`, and added `provider: jaeger` to the tracing configuration.
- Updated the troubleshooting note for missing namespaces to reference the current namespace access settings.

## Review Notes
The example still uses `auth.strategy: anonymous` for simplicity. That is valid, but production deployments should choose an authentication strategy appropriate for the environment.
