# Validation Summary: How to Configure TLS Passthrough in the Cilium Gateway API

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Cilium Gateway API
- Kubernetes Gateway API
- Gateway and TLSRoute resources
- TLS passthrough and SNI routing
- OpenSSL
- Hubble CLI

## Sources Consulted
- Cilium Gateway API Support documentation: https://docs.cilium.io/en/latest/network/servicemesh/gateway-api/gateway-api/
- Cilium stable Gateway API Support documentation: https://docs.cilium.io/en/stable/network/servicemesh/gateway-api/gateway-api/
- Kubernetes Gateway API TLSRoute documentation: https://gateway-api.sigs.k8s.io/api-types/tlsroute/
- Kubernetes Gateway API specification reference: https://gateway-api.sigs.k8s.io/reference/spec/
- Gateway API v1.5.1 TLSRoute CRD: https://raw.githubusercontent.com/kubernetes-sigs/gateway-api/v1.5.1/config/crd/standard/gateway.networking.k8s.io_tlsroutes.yaml
- Cilium Hubble CLI documentation: https://docs.cilium.io/en/latest/observability/hubble/hubble-cli.html
- Cilium Hubble observe filter source: https://github.com/cilium/cilium/blob/v1.19.3/hubble/cmd/observe/flows_filter.go
- RFC 6066, TLS Extensions / Server Name Indication: https://www.rfc-editor.org/rfc/rfc6066

## Issues Found
- The prerequisites omitted required Cilium Gateway API settings documented by Cilium. Added kube-proxy replacement and L7 proxy requirements to the Cilium prerequisite.
- The TLSRoute manifest used `apiVersion: gateway.networking.k8s.io/v1alpha2`. Current Gateway API releases make TLSRoute part of the standard channel with `apiVersion: gateway.networking.k8s.io/v1`, so the manifest was updated.
- The architecture diagram used `service.example.com` while the TLSRoute matched `secure.example.com`. Updated the diagram SNI label to match the route.
- The source-IP section incorrectly said `externalTrafficPolicy: Local` makes the backend see the original source IP for Cilium TLS passthrough. Cilium documents that TLS passthrough is proxied as a new TCP stream and the backend sees Cilium Envoy's IP, so the section and tradeoff table were corrected.
- The Hubble command was changed from the ambiguous `--port` filter to the explicit destination-port filter `--to-port`, matching Cilium's Hubble observe filter naming.

## Review Notes
Cilium stable documentation currently references Gateway API v1.4.1, where TLSRoute was still provided from the experimental bundle. Cilium latest documentation references Gateway API v1.5.1, where TLSRoute is in the standard channel and uses `apiVersion: gateway.networking.k8s.io/v1`. The post now follows the current Gateway API form.
