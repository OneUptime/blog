# Validation Summary: How to Configure Egress Traffic Policies per Namespace

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Istio
- Kubernetes
- Istio ServiceEntry
- Istio Sidecar
- Istio meshConfig and outboundTrafficPolicy
- Kubernetes NetworkPolicy

## Sources Consulted
- Istio ServiceEntry reference: https://istio.io/latest/docs/reference/config/networking/service-entry/
- Istio Sidecar reference: https://istio.io/latest/docs/reference/config/networking/sidecar/
- Istio Configuration Scoping documentation: https://istio.io/latest/docs/ops/configuration/mesh/configuration-scoping/
- Istio Accessing External Services task: https://istio.io/latest/docs/tasks/traffic-management/egress/egress-control/
- Istio meshConfig reference: https://istio.io/latest/docs/reference/config/istio.mesh.v1alpha1/

## Issues Found
- The post described Sidecar scoping as if it directly blocks outbound traffic. Istio documents Sidecar as a configuration scoping mechanism and warns that unmatched outbound traffic may still be allowed, depending on outbound traffic policy. Updated the Sidecar sections to say that blocking requires `REGISTRY_ONLY` or another enforcement layer.
- The `exportTo: ["."]` explanation implied that other namespaces cannot reach the external host at all. Updated it to clarify that `exportTo` controls ServiceEntry visibility and that fail-closed behavior requires `REGISTRY_ONLY` or network enforcement.
- The mesh policy section said "all outbound traffic is blocked unless explicitly registered." Updated this to "unknown outbound traffic is dropped unless explicitly registered," matching Istio's `REGISTRY_ONLY` behavior.
- The closing claim overstated the strength of Istio-only egress controls. Updated it to recommend Kubernetes NetworkPolicy or an egress gateway for hard network enforcement.

## Review Notes
The Kubernetes and Istio resource snippets use current `networking.istio.io/v1` APIs and valid fields. The examples assume sidecar mode and an Istio installation where `REGISTRY_ONLY` is enabled when fail-closed egress behavior is expected.
