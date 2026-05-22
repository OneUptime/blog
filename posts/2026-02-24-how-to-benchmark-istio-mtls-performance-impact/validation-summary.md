# Validation Summary: How to Benchmark Istio mTLS Performance Impact

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Istio sidecar service mesh
- Istio mutual TLS
- Kubernetes
- kubectl
- Fortio load testing
- Envoy proxy statistics
- IstioOperator configuration

## Sources Consulted
- Istio PeerAuthentication reference: https://istio.io/latest/docs/reference/config/security/peer_authentication/
- Istio mutual TLS migration task: https://istio.io/latest/docs/tasks/security/authentication/mtls-migration/
- Istio TLS configuration guide: https://istio.io/latest/docs/ops/configuration/traffic-management/tls-configuration/
- Istio DestinationRule reference: https://istio.io/latest/docs/reference/config/networking/destination-rule/
- Istio Envoy statistics documentation: https://istio.io/latest/docs/ops/configuration/telemetry/envoy-stats/
- Istio installation and IstioOperator customization documentation: https://istio.io/latest/docs/setup/install/istioctl/
- Istio supported releases documentation: https://istio.io/latest/docs/releases/supported-releases/
- Fortio official command documentation: https://github.com/fortio/fortio

## Issues Found
- The httpbin sample manifests referenced `release-1.22`, which is no longer a supported Istio release. Updated both raw GitHub sample URLs to `release-1.30`, the current supported release line documented by Istio.
- The "disable mTLS" path created a second namespace-wide `PeerAuthentication` named `permissive-mtls` while the earlier `strict-mtls` policy would still exist. Updated the snippet and command to modify the same `strict-mtls` policy to `PERMISSIVE`.
- The connection setup section stated that disabling Fortio keepalive means every request pays the TLS handshake cost. Qualified this because Envoy may still pool upstream sidecar-to-sidecar connections.
- The Envoy stats section stated that `grep ssl` definitively shows TLS counters. Qualified this because Istio configures a minimal default Envoy stats set, and available stats depend on proxy stats configuration.
- The expected overhead section gave universal latency and CPU ranges. Reworded it to emphasize workload-specific measurement instead of a fixed range.

## Review Notes
- Fortio flags used in the post (`-c`, `-qps`, `-t`, `-json`, and `-keepalive`) match Fortio's documented load command behavior.
- The Istio `PeerAuthentication` and `DestinationRule` API versions and fields used in the post are valid for current Istio sidecar-mode documentation.
- The `kubectl top` command requires metrics-server or another metrics API provider in the cluster.
