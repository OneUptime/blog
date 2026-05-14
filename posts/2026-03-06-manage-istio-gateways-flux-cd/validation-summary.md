# Validation Summary: How to Manage Istio Gateways with Flux CD

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Istio Gateway and VirtualService resources
- Istio ingress and egress gateways
- Flux CD Kustomization resources
- Kubernetes Secrets
- cert-manager Certificate resources
- TLS, mTLS, and TLS passthrough
- kubectl, istioctl, and flux CLI commands

## Sources Consulted
- Istio Gateway reference: https://istio.io/latest/docs/reference/config/networking/gateway/
- Istio secure ingress gateway task: https://istio.io/latest/docs/tasks/traffic-management/ingress/secure-ingress/
- Istio ingress gateway task: https://istio.io/latest/docs/tasks/traffic-management/ingress/ingress-control/
- Istio egress gateway task: https://istio.io/latest/docs/tasks/traffic-management/egress/egress-gateway/
- Istio TLS configuration guide: https://istio.io/latest/docs/ops/configuration/traffic-management/tls-configuration/
- Istio protocol selection guide: https://istio.io/latest/docs/ops/configuration/traffic-management/protocol-selection/
- Istio istioctl command reference: https://istio.io/latest/docs/reference/commands/istioctl/
- Flux Kustomization documentation: https://fluxcd.io/flux/components/kustomize/kustomizations/
- Flux Kustomize API reference: https://fluxcd.io/flux/components/kustomize/api/v1/
- Kubernetes Secret documentation: https://kubernetes.io/docs/concepts/configuration/secret/
- cert-manager Certificate documentation: https://cert-manager.io/docs/usage/certificate/
- Envoy TLS common proto reference for cipher suite behavior: https://www.envoyproxy.io/docs/envoy/latest/api-v3/extensions/transport_sockets/tls/v3/common.proto

## Issues Found
- The Istio ingress Gateway examples used `selector: istio: ingress`, which does not match the standard Istio ingress gateway label shown in official Istio examples. Changed the selectors to `istio: ingressgateway`.
- The mTLS example set `minProtocolVersion: TLSV1_3` while also listing `cipherSuites`. Envoy cipher suite configuration applies to TLS 1.0-1.2 negotiation and has no effect for TLS 1.3, so the example was misleading. Changed the minimum version to `TLSV1_2` to match the cipher suite configuration.
- The mTLS Secret used `type: generic`. Kubernetes accepts custom secret type strings, but `kubectl create secret generic` creates an `Opaque` Secret and Istio documents this pattern with generic/Opaque secrets containing `tls.crt`, `tls.key`, and `ca.crt`. Changed the manifest to `type: Opaque`.
- The TCP Gateway example configured TLS settings on a port declared as `protocol: TCP`. Istio TLS settings are valid for HTTPS/TLS ports, while TCP is treated as opaque TCP. Removed the TLS settings and used `hosts: ["*"]` for the raw TCP listener.
- The egress Gateway example used an HTTPS server with `ISTIO_MUTUAL` and HTTP routes for outbound HTTPS traffic, omitting the ServiceEntry and DestinationRule needed for the documented egress gateway pattern. Updated it to the official HTTPS passthrough pattern using a `ServiceEntry`, `Gateway` with `protocol: TLS` and `mode: PASSTHROUGH`, a `DestinationRule` subset for the egress gateway service, and `VirtualService` TLS routing with SNI matches.
- The `istioctl proxy-config` verification commands targeted `deploy/istio-ingress`, which does not match the standard deployment name used in the article's namespace. Updated them to `deploy/istio-ingressgateway`.
- The conclusion said Git stores the edge configuration "including TLS certificates", which can encourage committing certificate material or conflict with cert-manager-managed Secrets. Changed this to "certificate references".

## Review Notes
All YAML examples parse successfully after the corrections. The article uses Istio's `networking.istio.io/v1` APIs and Flux `kustomize.toolkit.fluxcd.io/v1`, which are current APIs. The cert-manager wildcard certificate example is syntactically valid, but in a real ACME setup wildcard names require a DNS-01 solver in the referenced Issuer or ClusterIssuer.
