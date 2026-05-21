# Validation Summary: How to Set Up East-West Gateway in Istio

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Istio
- Istio east-west gateway
- Istio multi-cluster and multi-network mesh
- IstioOperator
- Istio Gateway and VirtualService APIs
- Kubernetes LoadBalancer Services
- Kubernetes PodDisruptionBudget
- Prometheus metrics

## Sources Consulted
- Istio multi-primary multi-network installation guide: https://istio.io/latest/docs/setup/install/multicluster/multi-primary_multi-network/
- Istio resource labels reference for `topology.istio.io/network`: https://istio.io/latest/docs/reference/config/labels/
- Istio `istioctl proxy-config` command reference: https://istio.io/latest/docs/reference/commands/istioctl/
- Istio multicluster troubleshooting guide: https://istio.io/latest/docs/ops/diagnostic-tools/multicluster/
- Istio standard metrics reference: https://istio.io/latest/docs/reference/config/metrics/
- Istio sample `gen-eastwest-gateway.sh`: https://raw.githubusercontent.com/istio/istio/master/samples/multicluster/gen-eastwest-gateway.sh
- Istio sample `expose-services.yaml`: https://raw.githubusercontent.com/istio/istio/master/samples/multicluster/expose-services.yaml
- Istio sample `expose-istiod.yaml`: https://raw.githubusercontent.com/istio/istio/master/samples/multicluster/expose-istiod.yaml

## Issues Found
- The `expose-services.yaml` example used `networking.istio.io/v1beta1`. Updated it to the current `networking.istio.io/v1` API used by Istio's sample manifest.
- The primary-remote Istiod exposure example only showed the Gateway. Added the required VirtualService from the official Istio sample so traffic on ports 15012 and 15017 is actually routed to Istiod.
- The Istiod exposure example used uppercase `TLS` protocol values while the current official sample uses `tls`. Updated the snippet to match the current sample.
- The post referred to SNI as a header. Changed this to TLS SNI value, which is technically more accurate.
- The monitoring section labeled `istioctl proxy-config clusters` as active connections. Changed the label to gateway clusters because the command displays Envoy cluster configuration.
- The throughput query used `istio_requests_total`, which is for HTTP, HTTP/2, and gRPC request metrics. Changed it to `istio_tcp_received_bytes_total`, which better matches TLS passthrough gateway traffic.
- The troubleshooting note only mentioned namespace network labels. Added the gateway Service label because Istio uses the gateway Service's `topology.istio.io/network` label for cross-network gateway discovery.

## Review Notes
The post is generally accurate for sidecar-based Istio multicluster setups. Current Istio documentation also shows Helm-based east-west gateway installation as a primary path in some guides, but the `gen-eastwest-gateway.sh | istioctl install -f -` workflow remains present in official samples and documentation.
