# Validation Summary: How to Use Cilium for Multi-Cluster Networking

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- Cilium
- Cilium ClusterMesh
- Kubernetes Services and Deployments
- CiliumNetworkPolicy and CiliumClusterwideNetworkPolicy
- Hubble
- Prometheus Operator
- OneUptime monitoring

## Sources Consulted
- Cilium ClusterMesh setup documentation: https://docs.cilium.io/en/stable/network/clustermesh/clustermesh/
- Cilium ClusterMesh load-balancing and service discovery documentation: https://docs.cilium.io/en/stable/network/clustermesh/services/
- Cilium ClusterMesh service affinity documentation: https://docs.cilium.io/en/stable/network/clustermesh/affinity/
- Cilium Kubernetes policy documentation for multi-cluster labels: https://docs.cilium.io/en/stable/security/policy/kubernetes/
- Cilium 1.19 upgrade notes for `policy-default-local-cluster`: https://docs.cilium.io/en/stable/operations/upgrade/
- Cilium ClusterMesh troubleshooting documentation: https://docs.cilium.io/en/stable/operations/troubleshooting_clustermesh/
- Cilium Hubble setup documentation: https://docs.cilium.io/en/stable/observability/hubble/setup/
- Cilium connectivity test command reference: https://docs.cilium.io/en/latest/cmdref/cilium_connectivity_test/
- Cilium monitoring and metrics documentation: https://docs.cilium.io/en/stable/observability/metrics/

## Issues Found
- The cluster requirements said service CIDRs must not overlap. Cilium's documented ClusterMesh addressing requirement is non-overlapping PodCIDRs; service CIDRs may overlap for standard ClusterMesh global services. Updated the example and conclusion to focus on PodCIDRs.
- The service discovery example implied that a Service created only in cluster1 would resolve via Kubernetes DNS in cluster2. Cilium's global service documentation requires a matching Service with the same name and namespace in each participating cluster. Added a matching Service creation step for cluster2.
- The shared database service example implied `service.cilium.io/shared: "true"` pins all traffic to one cluster. In Cilium, global services are shared by default, and single-cluster backends are achieved by only running endpoints in that cluster while creating matching Service objects elsewhere. Removed the misleading annotation and comment.
- The cross-cluster policy example relied on implicit matching of endpoints in any cluster. Cilium 1.19 defaults endpoint selectors to the local cluster unless a cluster label is specified. Updated the policy to explicitly match the `io.cilium.k8s.policy.cluster` label.
- The default-deny policy used a templated `{{.ClusterName}}` placeholder that Kubernetes would not substitute. Replaced it with a concrete cluster name and a comment instructing readers to replace it per cluster.
- Several in-pod diagnostic commands used `cilium` subcommands where current Cilium troubleshooting documentation uses `cilium-dbg`. Updated those commands and aligned the remote-state checks with documented identity and service-list checks.
- The Hubble example used `hubble observe --context`, which is not the documented Hubble CLI access pattern. Updated it to use `hubble observe -P` with Hubble Relay port-forwarding.
- The Prometheus health-monitoring example created an ad hoc Service on port 9879 and used unverified ClusterMesh metric names. Replaced it with Cilium's documented Helm values for enabling ClusterMesh API server metrics and automatic ServiceMonitor creation, and changed the alert rule to a generic Prometheus `up` check for ClusterMesh scrape targets.
- The OneUptime example treated the ClusterMesh API server as an HTTP health endpoint on port 2379. Port 2379 is the ClusterMesh control-plane endpoint, so the example now uses TCP monitors for that endpoint.

## Review Notes
- The ClusterMesh setup commands, `--service-type LoadBalancer`, one-way `cilium clustermesh connect`, service affinity annotations, cluster policy label, and `cilium connectivity test --multi-cluster` flag were verified against current Cilium documentation.
- The example application images and endpoint paths are placeholders and would need to be replaced with real application artifacts in a runnable environment.
