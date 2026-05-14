# Validation Summary: Multi-Cluster Cilium Cluster Mesh

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Cilium
- Cilium Cluster Mesh
- Kubernetes
- Helm
- Hubble
- Kubernetes Services
- Cilium Network Policy

## Sources Consulted
- Cilium Cluster Mesh setup documentation: https://docs.cilium.io/en/stable/network/clustermesh/clustermesh/
- Cilium Cluster Mesh load-balancing and service discovery documentation: https://docs.cilium.io/en/stable/network/clustermesh/services/
- Cilium Cluster Mesh network policy documentation: https://docs.cilium.io/en/latest/network/clustermesh/policy.html
- Cilium Cluster Mesh troubleshooting documentation: https://docs.cilium.io/en/stable/operations/troubleshooting_clustermesh/
- Cilium Hubble setup documentation: https://docs.cilium.io/en/stable/observability/hubble/setup/
- Cilium CLI command reference for `cilium clustermesh enable`: https://docs.cilium.io/en/latest/cmdref/cilium_clustermesh_enable/

## Issues Found
- The original setup order enabled Cluster Mesh before configuring unique cluster names and IDs. Cilium documentation recommends assigning `cluster.name` and `cluster.id` at installation time, before enabling Cluster Mesh. I reordered the steps so cluster identity is configured first and added the workload restart caveat for changing identity on running clusters.
- The Cluster Mesh architecture explanation described a shared etcd exposed between peer clusters. Current Cilium documentation describes Cluster Mesh API server state exchange and KVStoreMesh, which caches remote cluster information in the local key-value store by default in current releases. I updated the explanation and diagram label.
- The prerequisites omitted current Cluster Mesh addressing requirements. I added same datapath mode, non-overlapping Pod CIDRs, node connectivity, and firewall/port requirements.
- The post claimed standard Kubernetes DNS directly discovers services in other clusters. I clarified that cross-cluster service access is through Cilium global services backed by endpoints across clusters.
- The validation command used `cilium endpoint list | grep cluster2` for global endpoints. Official troubleshooting guidance recommends `cilium-dbg service list` for validating global service backends, so I updated the command.
- The Hubble example used `hubble observe --context`, which is not the documented Hubble CLI access pattern. I changed it to `hubble observe -P --follow`, matching the documented port-forward flow.
- The conclusion said network policies can reference remote endpoints using the same label selectors as local policies. Current Cilium docs note policies select local endpoints by default unless remote clusters are targeted, commonly with `io.cilium.k8s.policy.cluster`. I updated the wording to mention combining application labels with Cilium's cluster label.
- The conclusion claimed Cluster Mesh does not use overlay tunnels. Cilium Cluster Mesh supports different datapath modes and requires all clusters to use the same mode, so that blanket claim was removed.

## Review Notes
The global service example is technically valid with `service.cilium.io/shared: "true"`, although Cilium implicitly treats global services as shared by default unless `service.cilium.io/shared: "false"` is set. The post intentionally keeps the explicit annotation for clarity.
