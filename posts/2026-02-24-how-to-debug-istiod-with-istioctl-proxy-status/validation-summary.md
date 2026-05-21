# Validation Summary: How to Debug Istiod with istioctl proxy-status

## Status
validated

## Post Type
Tutorial / Debugging guide

## Technologies Covered
- Istio
- Istiod
- istioctl
- Envoy xDS
- Kubernetes
- Prometheus metrics
- IstioOperator
- Istio Sidecar resources

## Sources Consulted
- Istio `istioctl proxy-status` command reference: https://istio.io/latest/docs/reference/commands/istioctl/#istioctl-proxy-status
- Istio Debugging Envoy and Istiod guide: https://istio.io/latest/docs/ops/diagnostic-tools/proxy-cmd/
- Istio Sidecar API reference: https://istio.io/latest/docs/reference/config/networking/sidecar/
- IstioOperator options reference: https://istio.io/latest/docs/reference/config/istio.operator.v1alpha1/
- Istio `pilot-discovery` exported metrics reference: https://istio.io/latest/docs/reference/commands/pilot-discovery/#exported-metrics
- Istio debug endpoint documentation: https://preliminary.istio.io/latest/docs/ops/integrations/integration-guide/debug-endpoints/

## Issues Found
- The article said `istioctl proxy-status` queries Istiod debug endpoints. The official command reference describes it as retrieving last sent and last acknowledged xDS sync state from Istiod, so the wording was corrected.
- The namespace filtering example used `grep` against proxy names. Istio officially supports `istioctl proxy-status --namespace`, so the example was changed to use that flag.
- The canary revision example used `--revision` while describing selection of a specific Istiod instance by revision label. Istio's command examples use `--xds-label istio.io/rev=...` for that case, so the command was updated.
- The Istiod debug commands used `kubectl exec ... curl localhost:15014`, which depends on `curl` being present in the Istiod container. The examples were changed to supported `istioctl x internal-debug` commands.
- The monitoring section referenced `pilot_xds_push_errors`, which is not listed in the current official Istio metrics. It was replaced with `pilot_total_xds_internal_errors` and `pilot_total_xds_rejects`.

## Review Notes
The Sidecar resource snippet, IstioOperator resource/HPA fields, xDS sync state explanations, and `proxy-status` diff usage are consistent with the official Istio documentation. The debug endpoint documentation consulted is currently published under Istio's preliminary documentation area, so endpoint availability and access control may vary slightly by Istio release.
