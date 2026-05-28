# Validation Summary: How to Choose Between VPC-Native and Routes-Based GKE Clusters

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Google Kubernetes Engine (GKE)
- VPC-native GKE clusters
- Routes-based GKE clusters
- Google Cloud VPC networking
- Alias IP ranges and subnet secondary ranges
- VPC Network Peering and Shared VPC
- Cloud NAT and VPC Flow Logs
- Container-native load balancing and network endpoint groups (NEGs)
- Google Cloud CLI
- Kubernetes Service manifests

## Sources Consulted
- Google Cloud GKE documentation: VPC-native clusters, https://docs.cloud.google.com/kubernetes-engine/docs/concepts/alias-ips
- Google Cloud GKE documentation: Create a VPC-native cluster, https://docs.cloud.google.com/kubernetes-engine/docs/how-to/alias-ips
- Google Cloud GKE documentation: Creating a routes-based cluster, https://cloud.google.com/kubernetes-engine/docs/how-to/routes-based-cluster
- Google Cloud GKE documentation: About cluster configuration choices, https://docs.cloud.google.com/kubernetes-engine/docs/concepts/configuration-overview
- Google Cloud GKE documentation: Container-native load balancing, https://docs.cloud.google.com/kubernetes-engine/docs/concepts/container-native-load-balancing
- Google Cloud GKE documentation: Standalone zonal NEGs, https://docs.cloud.google.com/kubernetes-engine/docs/how-to/standalone-neg
- Google Cloud VPC documentation: VPC Network Peering, https://cloud.google.com/vpc/docs/vpc-peering
- Google Cloud VPC documentation: Quotas and limits, https://docs.cloud.google.com/vpc/docs/quota
- Google Cloud VPC documentation: VPC Flow Logs, https://cloud.google.com/vpc/docs/flow-logs
- Google Cloud NAT documentation: IP addresses and ports, https://docs.cloud.google.com/nat/docs/ports-and-addresses

## Issues Found
- The routes-based cluster example reused `gke-subnet` and `10.4.0.0/14`, which the preceding VPC-native example had already configured as a pod secondary range. A routes-based cluster creates custom static routes for pod CIDRs, so the example was potentially misleading and could conflict with existing subnet ranges. I changed the comparison example to create and use a separate `legacy-gke-subnet` without secondary ranges.
- The post described routes-based cluster scaling as hitting "dynamic routes" limits. GKE routes-based clusters create custom static routes, so I changed the wording to refer to static route quotas.
- The VPC Flow Logs claim was too broad for pod-to-pod traffic on the same node. I added the current caveat that intranode visibility is required for same-node pod flows.
- The Cloud NAT bullet implied per-pod granularity. Cloud NAT applies to subnet ranges and alias IP ranges, with port allocation tied to node VMs, so I clarified that it can apply to the pod secondary range.
- The routes-based visibility paragraph overstated that pod IPs are invisible to the VPC. I corrected it to say pod IPs are represented by per-node custom routes rather than subnet secondary ranges.
- The node IP planning example counted all addresses in a `/20` primary subnet as usable node IPs. Google Cloud reserves four addresses in each primary subnet range, so I changed it to 4,092 usable node IPs.

## Review Notes
The post's main recommendation is consistent with current Google Cloud guidance: VPC-native routing is the default and recommended mode for new GKE clusters, and routes-based clusters are a legacy Standard-only option selected at cluster creation. The `cloud.google.com/neg: '{"ingress": true}'` Service annotation remains valid for container-native load balancing through Ingress on VPC-native clusters.
