# Validation Summary: How to Understand Cilium API Reference

## Status
validated

## Post Type
Reference guide

## Technologies Covered
- Cilium
- Kubernetes CustomResourceDefinitions
- Cilium agent API
- Hubble gRPC API
- kubectl
- Go client package for Cilium

## Sources Consulted
- Cilium API Reference: https://docs.cilium.io/en/stable/api/
- Cilium gRPC API Reference: https://docs.cilium.io/en/stable/grpcapi/
- Cilium Endpoint CRD documentation: https://docs.cilium.io/en/latest/network/kubernetes/ciliumendpoint/
- Cilium Network Policy documentation: https://docs.cilium.io/en/latest/network/kubernetes/policy.html
- Cilium BGP Control Plane Resources: https://docs.cilium.io/en/stable/network/bgp-control-plane/bgp-control-plane-configuration/
- Cilium Upgrade Guide: https://docs.cilium.io/en/stable/operations/upgrade/
- Kubernetes CRD versioning documentation: https://kubernetes.io/docs/tasks/extend-kubernetes/custom-resources/custom-resource-definition-versioning/
- Cilium cilium-dbg command reference: https://docs.cilium.io/en/stable/cmdref/cilium-dbg.html

## Issues Found
- The REST examples used `/v1/healthz` and `/v1/endpoint`, but the current Cilium API reference documents those paths as `/healthz` and `/endpoint`. Updated both commands so they use the documented routes.
- The CRD table listed `ciliumbgppeerpolicies.cilium.io`, which corresponds to the removed/deprecated BGPv1 API in current Cilium releases. Replaced it with current BGP control plane CRDs, `ciliumbgpclusterconfigs.cilium.io` and `ciliumbgppeerconfigs.cilium.io`.
- The API compatibility section claimed the agent REST API is versioned at `/v1/`, that CRDs follow Kubernetes deprecation policy, and described Hubble gRPC compatibility only in generic proto3 terms. Updated the wording to match Cilium's documented compatibility guarantees and to describe CRD versioning more accurately.

## Review Notes
The Go client snippet matches the Cilium API reference pattern but is intentionally abbreviated and not a complete Go program. The curl-based Unix socket examples are correct for the API paths, assuming the selected Cilium container image includes `curl` and `jq`.
