# Validation Summary: How to Use Istio's Default Profile for Standard Deployments

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Istio
- istioctl
- Kubernetes
- IstioOperator
- Istio Gateway and VirtualService APIs
- Istio PeerAuthentication and mTLS
- Envoy ingress gateway
- Prometheus, Grafana, and cert-manager

## Sources Consulted
- Istio Install with Istioctl: https://istio.io/latest/docs/setup/install/istioctl/
- Istio Download the Istio release: https://istio.io/latest/docs/setup/additional-setup/download-istio-release/
- Istio Installing Gateways: https://istio.io/latest/docs/setup/additional-setup/gateway/
- Istio IstioOperator Options: https://istio.io/latest/docs/reference/config/istio.operator.v1alpha1/
- Istio MeshConfig reference: https://istio.io/latest/docs/reference/config/istio.mesh.v1alpha1/
- Istio Secure Gateways: https://istio.io/latest/docs/tasks/traffic-management/ingress/secure-ingress/
- Istio In-place Upgrades: https://istio.io/latest/docs/setup/upgrade/in-place/
- Istio PeerAuthentication reference: https://istio.io/latest/docs/reference/config/security/peer_authentication/
- Istio Prometheus integration: https://istio.io/latest/docs/ops/integrations/prometheus/
- Istio 1.24 end-of-life announcement: https://istio.io/latest/news/support/announcing-1.24-eol-final/
- Istio 1.29.2 release announcement: https://istio.io/latest/news/releases/1.29.x/announcing-1.29.2/
- Local verification with `istioctl` 1.29.2 downloaded from the official Istio release script.

## Issues Found
- The installation example used Istio 1.24.0, which is no longer supported. Updated the example to pin and install Istio 1.29.2, the current supported release checked during review.
- The upgrade example used Istio 1.25.0, which is also out of support. Updated it to use an `ISTIO_VERSION` variable and note that it should be replaced with the supported target version.
- The resource inspection command used `istioctl profile dump`, which is not available in current `istioctl` 1.29.2. Replaced it with `kubectl get deployment ... -o jsonpath=...` commands that inspect the installed istiod and ingress gateway resources directly.
- The ingress gateway default resource snippet omitted the default CPU and memory limits rendered by Istio 1.29.2. Added the gateway limits shown by `istioctl manifest generate --set profile=default`.
- The production `IstioOperator` example repeated `meshConfig.defaultConfig` three times. In YAML, duplicate keys can overwrite previous values, so `tracing`, `holdApplicationUntilProxyStarts`, and `proxyMetadata` were combined under one `defaultConfig` block.
- The text said the default profile sets resource requests and limits for all shown components, but istiod's default rendered resources only include requests. Adjusted the wording to "resource settings."
- The troubleshooting section described `istioctl proxy-status` as an istiod health check. Updated the wording because the command reports Envoy proxy synchronization status.

## Review Notes
The corrected production `IstioOperator` example was rendered successfully with `istioctl manifest generate -f` using `istioctl` 1.29.2. The post remains technically valid, but Istio's own gateway installation documentation recommends decoupling gateways from the control plane for production operations, especially beyond simple deployments.
