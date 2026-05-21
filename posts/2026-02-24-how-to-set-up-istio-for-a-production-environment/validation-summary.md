# Validation Summary: How to Set Up Istio for a Production Environment

## Status
validated

## Post Type
Tutorial / production configuration guide

## Technologies Covered
- Istio
- Kubernetes
- Helm
- Envoy
- Prometheus
- AWS Network Load Balancer service annotations
- Kubernetes NetworkPolicy

## Sources Consulted
- Istio Helm installation documentation: https://istio.io/latest/docs/setup/install/helm/
- Istio Helm upgrade documentation: https://istio.io/latest/docs/setup/upgrade/helm/
- Istio canary upgrade documentation: https://istio.io/latest/docs/setup/upgrade/canary/
- Istio 1.30 istiod Helm chart values and templates: https://github.com/istio/istio/tree/release-1.30/manifests/charts/istio-control/istio-discovery
- Istio 1.30 gateway Helm chart values and templates: https://github.com/istio/istio/tree/release-1.30/manifests/charts/gateway
- Istio PeerAuthentication reference: https://istio.io/latest/docs/reference/config/security/peer_authentication/
- Istio authentication policy task for mesh-wide STRICT mTLS: https://istio.io/latest/docs/tasks/security/authentication/authn-policy/
- Istio workload minimum TLS version task: https://istio.io/latest/docs/tasks/security/tls-configuration/workload-min-tls-version/
- Istio AuthorizationPolicy reference: https://istio.io/latest/docs/reference/config/security/authorization-policy/
- Istio Prometheus integration documentation: https://istio.io/latest/docs/ops/integrations/prometheus/
- Istio standard metrics reference: https://istio.io/latest/docs/reference/config/metrics/
- Istio pilot-discovery command and exported metrics reference: https://istio.io/latest/docs/reference/commands/pilot-discovery/
- Istio 1.19 change notes: https://istio.io/latest/news/releases/1.19.x/announcing-1.19/change-notes/
- Kubernetes NetworkPolicy documentation: https://kubernetes.io/docs/concepts/services-networking/network-policies/

## Issues Found
- The istiod Helm values were nested under `pilot:`, but the current `istio/istiod` chart expects these settings at the chart root after profile/default merging. Moved autoscaling, resources, topology spread constraints, and PDB configuration to the correct root-level keys.
- The istiod PDB snippet used `pilot.podDisruptionBudget`, which is not the current chart key. Changed it to `pdb.minAvailable`.
- The control plane snippet set `PILOT_ENABLE_PROTOCOL_SNIFFING_FOR_INBOUND` and `PILOT_ENABLE_PROTOCOL_SNIFFING_FOR_OUTBOUND`, but Istio removed those feature flags in 1.19. Removed them.
- The sidecar drain example used `global.proxy.lifecycle`, which is not a supported global proxy Helm value for injected application sidecars. Replaced it with `meshConfig.defaultConfig.terminationDrainDuration`.
- The gateway topology spread and anti-affinity selectors used `istio: ingressgateway`, but the gateway chart release name in the post would otherwise label pods as `istio: ingress`. Added `labels.istio: ingressgateway` so the selectors match the rendered gateway pods.
- The alert metric `pilot_xds_push_errors` is not listed in the current pilot-discovery exported metrics. Replaced it with `pilot_total_xds_internal_errors` and `pilot_total_xds_rejects`.
- The mTLS handshake failure metric was too generic. Updated it to reference Envoy TLS error counters such as `envoy_listener_ssl_connection_error`.
- The canary upgrade example used an outdated fixed version and skipped official Helm canary steps. Updated it to include `istioctl x precheck`, base chart upgrade, gateway canary install, Istio 1.30.0, and setting the base chart default revision after removing the old control plane.
- The backup command claimed to export all Istio resources but only listed a subset. Changed the wording to "common Istio resources" and added commonly used Istio CRDs including Sidecar, EnvoyFilter, RequestAuthentication, Telemetry, and WasmPlugin.

## Review Notes
- The resource sizing table is reasonable as a starting point, but production sizing still depends heavily on service count, config object count, request volume, telemetry cardinality, and proxy concurrency.
- `REGISTRY_ONLY` is valid but can break external calls unless required external dependencies are modeled with `ServiceEntry` resources.
- Metrics merging is enabled by default in Istio, but it exposes merged metrics over plaintext and may not fit strict TLS scraping requirements.
