# Validation Summary: How to Monitor Service Registry in Istio

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Istio
- istiod
- Envoy xDS
- Kubernetes
- Prometheus and PrometheusRule
- Kiali
- Grafana

## Sources Consulted
- Istio istioctl command reference: https://istio.io/latest/docs/reference/commands/istioctl/
- Istio debugging Envoy and istiod documentation: https://istio.io/latest/docs/ops/diagnostic-tools/proxy-cmd/
- Istio debug endpoints documentation: https://preliminary.istio.io/latest/docs/ops/integrations/integration-guide/debug-endpoints/
- Istio Sidecar API reference: https://istio.io/latest/docs/reference/config/networking/sidecar/
- Istio Kiali integration documentation: https://istio.io/latest/docs/ops/integrations/kiali/
- Kiali Istio configuration and validation documentation: https://kiali.io/docs/features/configuration
- Kubernetes kubectl exec reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_exec/
- Kubernetes field selectors documentation: https://kubernetes.io/docs/concepts/overview/working-with-objects/field-selectors/
- Prometheus Operator API reference for PrometheusRule: https://prometheus-operator.dev/docs/api-reference/api/

## Issues Found
- The post described Istio's service registry as containing routing and security configuration. Updated the wording to distinguish service registry data from other Istio configuration that istiod watches and combines into generated proxy config.
- The endpoint inspection example used `/debug/endpointz`, which is not the current documented debug endpoint. Replaced it with `/debug/edsz`.
- The proxy sync status section implied every xDS column should always be `SYNCED`. Updated it to note that `NOT SENT` can be normal and that `STALE` means istiod sent an update without receiving an acknowledgement.
- The post referenced `pilot_conflict_inbound_listener` and `pilot_conflict_outbound_listener_tcp_over_current_tcp`, which are not listed in the current Istio metric reference. Replaced them with current rejection metrics: `pilot_total_rejected_configs` and `pilot_total_xds_rejects`.
- The `IstioPilotPushErrors` alert used a narrow `pilot_xds_pushes{type="cds_senderr"}` expression. Replaced it with `pilot_total_xds_internal_errors`, which is a current Istio metric for internal XDS errors.
- The `IstioProxyStale` alert counted `pilot_proxy_convergence_time_bucket`, which would be true whenever histogram bucket series exist and would not detect stale proxies. Replaced it with a high proxy convergence latency alert using `histogram_quantile`.
- The event tracking command used a case-sensitive grep that could miss Kubernetes resource names in common output. Changed it to `grep -Ei`.
- The xDS configuration size section used `pilot_xds{type="cds"}`, but `pilot_xds` tracks connected XDS endpoints, not configuration size. Replaced it with a query over `pilot_xds_config_size_bytes_bucket`.
- The health check section called `/healthz/ready` a liveness check. Updated it to readiness check.

## Review Notes
The PrometheusRule YAML structure is valid for the Prometheus Operator CRD, but the alert thresholds are examples and should be tuned to the size and churn rate of a specific mesh. The post does not pin an Istio version; the review used current Istio documentation available on 2026-05-21.
