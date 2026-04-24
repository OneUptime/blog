# Validation Summary: How to Configure Circuit Breakers in Rancher

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Rancher
- Kubernetes
- Istio
- Envoy
- Prometheus
- Fortio
- Resilience4j
- Spring Boot configuration

## Sources Consulted
- Istio DestinationRule reference: https://istio.io/latest/docs/reference/config/networking/destination-rule/
- Istio circuit breaking task: https://istio.io/latest/docs/tasks/traffic-management/circuit-breaking/
- Istio Envoy statistics guide: https://istio.io/latest/docs/ops/configuration/telemetry/envoy-stats/
- Istio v1 APIs announcement: https://istio.io/latest/blog/2024/v1-apis/
- Kubernetes `kubectl exec` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_exec/
- Envoy circuit breaking overview: https://www.envoyproxy.io/docs/envoy/latest/intro/arch_overview/upstream/circuit_breaking
- Envoy cluster statistics reference: https://www.envoyproxy.io/docs/envoy/latest/configuration/upstream/cluster_manager/cluster_stats.html
- Envoy admin interface and `config_dump`: https://www.envoyproxy.io/docs/envoy/latest/start/quick-start/admin.html
- Rancher Monitoring and Alerting docs: https://ranchermanager.docs.rancher.com/v2.14/integrations-in-rancher/monitoring-and-alerting
- Rancher monitoring architecture docs: https://ranchermanager.docs.rancher.com/integrations-in-rancher/monitoring-and-alerting/how-monitoring-works
- Rancher monitoring enablement docs: https://ranchermanager.docs.rancher.com/v2.14/how-to-guides/advanced-user-guides/monitoring-alerting-guides/enable-monitoring
- Rancher Prometheus configuration docs: https://ranchermanager.docs.rancher.com/v2.13/how-to-guides/advanced-user-guides/monitoring-v2-configuration-guides/advanced-configuration/prometheus
- Rancher Istio setup docs: https://ranchermanager.docs.rancher.com/v2.13/how-to-guides/advanced-user-guides/istio-setup-guide/enable-istio-in-cluster
- Resilience4j CircuitBreaker docs: https://resilience4j.readme.io/docs/circuitbreaker
- Resilience4j Spring Boot configuration docs: https://resilience4j.readme.io/docs/getting-started-3
- Spring Boot externalized configuration and environment variable binding: https://docs.spring.io/spring-boot/4.1/reference/features/external-config.html

## Issues Found
- The post described classic Closed/Open/Half-Open circuit breaker states as if Istio exposes them directly. I corrected the explanation to distinguish application-level circuit breakers from Istio/Envoy’s per-cluster limits and host ejection behavior.
- The Istio examples used `networking.istio.io/v1beta1`. I updated them to the current stable `networking.istio.io/v1` API.
- Several comments in the `DestinationRule` examples were inaccurate. I fixed the descriptions for `http1MaxPendingRequests`, `http2MaxRequests`, `maxRequestsPerConnection`, `minHealthPercent`, and `splitExternalLocalOriginErrors` so they match the Istio reference.
- The Fortio load command used inline comments after line continuations, which makes the shell example invalid. I rewrote the command to be syntactically correct.
- The Fortio test targeted `payment-service` with concurrency that would not line up with the comprehensive `orders-service` circuit breaker example. I aligned the test traffic with the `orders-service` example and used explicit Fortio container execution and higher concurrency to actually exceed the configured limit.
- The Prometheus examples assumed a `deployment/prometheus` in `istio-system`, which does not match Rancher Monitoring’s documented default deployment/namespace. I changed the workflow to use Rancher Monitoring in `cattle-monitoring-system`.
- The Prometheus monitoring section implied the Envoy circuit breaker and outlier metrics are always available. I added the required caveat that Istio exposes only a minimal Envoy stat set by default and that `proxyStatsMatcher` must be configured before querying these metrics reliably.
- The alerting example only watched `envoy_cluster_upstream_rq_pending_overflow`, which is incomplete for modern Envoy circuit breaker behavior because active request overflow increments a different counter. I updated the alert and query examples to cover both pending and active overflow counters.
- The application-level `Deployment` manifest was invalid because `apps/v1` Deployments require a selector and matching pod template labels. I added the missing `spec.selector` and `template.metadata.labels`.
- The Resilience4j example only applies when the application uses the Spring Boot Resilience4j starter, and the environment variable names must follow Spring Boot’s documented binding rules. I clarified that context and corrected the variable names to the uppercase form Spring Boot derives from the canonical property names.
- The Envoy verification commands assumed `curl` inside the `istio-proxy` container and filtered for `ClusterDiscoveryService`, which is not the correct config dump type. I switched the commands to `pilot-agent request GET ...` and corrected the config dump filter to `ClustersConfigDump`.

## Review Notes
- Rancher’s built-in Rancher-Istio distribution is documented as deprecated in Rancher v2.12+. The post remains technically valid for Rancher-managed clusters with Istio installed, but readers should use the supported Istio distribution for their Rancher version.
- The short service names used in the `DestinationRule` examples are valid because the rules are declared in the same namespace as the services in the examples. Istio recommends fully qualified service names when there is any namespace ambiguity.
