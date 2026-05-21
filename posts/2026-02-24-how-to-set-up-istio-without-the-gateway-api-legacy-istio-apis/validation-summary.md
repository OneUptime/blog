# Validation Summary: How to Set Up Istio Without the Gateway API (Legacy Istio APIs)

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Istio
- Kubernetes
- Istio Gateway
- Istio VirtualService
- Istio DestinationRule
- Istio ServiceEntry
- Helm
- istioctl

## Sources Consulted
- Istio Install with istioctl: https://istio.io/latest/docs/setup/install/istioctl/
- Istio Install with Helm: https://istio.io/latest/docs/setup/install/helm/
- Istio Installing Gateways: https://istio.io/latest/docs/setup/additional-setup/gateway/
- Istio Ingress Gateways task: https://istio.io/latest/docs/tasks/traffic-management/ingress/ingress-control/
- Istio Gateway API reference: https://istio.io/latest/docs/reference/config/networking/gateway/
- Istio VirtualService API reference: https://istio.io/latest/docs/reference/config/networking/virtual-service/
- Istio ServiceEntry API reference: https://istio.io/latest/docs/reference/config/networking/service-entry/
- Istio TLS configuration guide: https://istio.io/latest/docs/ops/configuration/traffic-management/tls-configuration/
- Istio Egress TLS Origination task: https://istio.io/latest/docs/tasks/traffic-management/egress/egress-tls-origination/
- Istio istioctl command reference: https://istio.io/latest/docs/reference/commands/istioctl/

## Issues Found
- The IstioOperator ingress gateway example did not put the gateway deployment in the `istio-ingress` namespace used by the later Gateway and TLS secret examples. Added `namespace: istio-ingress`, set the `istio: ingressgateway` label explicitly, and added the namespace creation command so the selector, secret location, and verification commands align.
- The Helm ingress gateway release name was `istio-ingress`, while the rest of the post selected and verified `istio-ingressgateway`. Changed the Helm release name to `istio-ingressgateway` to match Istio's gateway installation documentation and the later commands.
- The external service section described `tls.mode: SIMPLE` as mTLS. In Istio, `SIMPLE` performs standard TLS origination; mutual TLS origination requires `MUTUAL` and client certificate settings. Updated the wording to "TLS origination."
- The TLS origination DestinationRule was not paired with a matching ServiceEntry port. Updated the ServiceEntry to include an HTTP port 80 with `targetPort: 443`, kept HTTPS on port 443, and scoped the DestinationRule TLS setting to port 80, matching Istio's documented egress TLS origination pattern.
- The `istioctl proxy-config` examples used `deploy/istio-ingress`, which did not match the gateway deployment name used by the installation examples. Updated them to use `deployment/istio-ingressgateway` and the documented plural `listeners` subcommand.

## Review Notes
The classic Istio networking APIs shown in the post are still valid under the current `networking.istio.io/v1` API. Istio documentation continues to point users toward the Kubernetes Gateway API as a future/default direction, but the legacy Istio Gateway, VirtualService, DestinationRule, and ServiceEntry APIs remain documented and usable.
