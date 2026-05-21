# Validation Summary: How to Configure Port-Level Traffic Policies in DestinationRule

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Istio DestinationRule
- Istio traffic policies and portLevelSettings
- Kubernetes Services
- Envoy clusters and outlier detection
- istioctl proxy-config

## Sources Consulted
- Istio DestinationRule reference: https://istio.io/latest/docs/reference/config/networking/destination-rule/
- Istio istioctl command reference: https://istio.io/latest/docs/reference/commands/istioctl/
- Istio Protocol Selection documentation: https://istio.io/latest/docs/ops/configuration/traffic-management/protocol-selection/
- Kubernetes Service documentation: https://kubernetes.io/docs/concepts/services-networking/service/

## Issues Found
- Corrected the explanation of `portLevelSettings` inheritance. Istio's DestinationRule reference states that port-level settings override destination-level settings and omitted fields in a port-level policy use default values rather than inheriting destination-level values.
- Updated the HTTP + gRPC DestinationRule example so `outlierDetection` is specified inside each port-level policy. The original example put `outlierDetection` only at the top level while also defining `portLevelSettings`, which could incorrectly imply inheritance for those ports.
- Clarified the top-level outlier detection explanation to note that it applies independently per port only when those ports do not have their own overriding `portLevelSettings`.
- Corrected the port naming guidance. Istio supports `name: <protocol>[-<suffix>]`, so names like `http`, `grpc`, and `tcp` are valid as well as prefixed names like `http-api`.

## Review Notes
- `istioctl` was not installed in the local environment, so CLI validation was performed against the official Istio command reference rather than local `--help` output.
- The examples use current Istio `networking.istio.io/v1` DestinationRule fields, and the verified fields include `portLevelSettings`, `loadBalancer`, `connectionPool`, `outlierDetection`, `tls`, `http2MaxRequests`, `maxRetries`, and `consistentHash.httpHeaderName`.
