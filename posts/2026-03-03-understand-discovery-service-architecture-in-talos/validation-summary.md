# Validation Summary: How to Understand Discovery Service Architecture in Talos

## Status
validated

## Post Type
Technical architecture guide

## Technologies Covered
- Talos Linux
- Talos Discovery Service
- KubeSpan
- Kubernetes registry discovery
- gRPC
- AES-GCM encryption

## Sources Consulted
- Talos Linux Discovery Service documentation: https://www.talos.dev/latest/talos-guides/discovery/
- Talos Linux KubeSpan documentation: https://www.talos.dev/latest/talos-guides/network/kubespan/
- Sidero Labs Discovery Service repository README: https://github.com/siderolabs/discovery-service
- Sidero Labs discovery-api gRPC definition: https://github.com/siderolabs/discovery-api/blob/main/api/v1alpha1/server/cluster.proto
- Talos cluster resource definitions: https://pkg.go.dev/github.com/siderolabs/talos/pkg/machinery/resources/cluster

## Issues Found
- The post described the discovery service as an HTTP REST API with `POST`, `GET`, and `DELETE` paths. Updated it to the official gRPC `sidero.discovery.server.Cluster` API with `Hello`, `AffiliateUpdate`, `AffiliateDelete`, `List`, and `Watch`.
- The post used non-official Talos resource names such as `discoveredmembers`, `kubespanidentity`, and `kubespanpeerstatus`. Updated commands to official documented resources: `members`, `identities`, and `kubespanpeerstatuses`.
- The post stated that the service has no persistent storage and no state survives restart. Updated this to reflect current documentation: active data is in memory with TTLs, while encrypted snapshots may be used to speed restart recovery.
- The post said affiliate IDs are derived from machine ID and cluster secrets. Updated this to the documented model where the node identity, a base62-encoded random 32-byte value, is used as the affiliate identifier.
- The post omitted the discovery service's visibility into client version, affiliate count, and encrypted endpoint lists. Updated the security model to include these metadata items and clarify that endpoint values remain encrypted.
- The post gave an unsupported precise refresh interval and fixed memory estimate. Reworded those claims to avoid inaccurate specificity while preserving the operational explanation.

## Review Notes
The article remains a high-level architecture guide. Some operational sizing claims are intentionally qualitative because the official documentation does not publish capacity guarantees for self-hosted discovery service deployments.
