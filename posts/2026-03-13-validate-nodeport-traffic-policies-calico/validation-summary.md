# Validation Summary: How to Validate Calico NodePort Traffic Policies Before Production

## Status
validated

## Post Type
Guide

## Technologies Covered
- Calico GlobalNetworkPolicy
- Calico HostEndpoints and pre-DNAT policy
- Kubernetes Services and NodePort
- calicoctl
- curl

## Sources Consulted
- Calico GlobalNetworkPolicy resource documentation: https://docs.tigera.io/calico/latest/reference/resources/globalnetworkpolicy
- Calico pre-DNAT policy documentation: https://docs.tigera.io/calico/latest/reference/host-endpoints/pre-dnat
- Calico apply-on-forward host policy documentation: https://docs.tigera.io/calico/latest/network-policy/hosts/host-forwarded-traffic
- Calico Kubernetes node protection and automatic HostEndpoint documentation: https://docs.tigera.io/calico/latest/network-policy/hosts/kubernetes-nodes
- Calico calicoctl apply documentation: https://docs.tigera.io/calico/latest/reference/calicoctl/apply
- Calico StagedGlobalNetworkPolicy resource documentation: https://docs.tigera.io/calico/latest/reference/resources/stagedglobalnetworkpolicy
- Kubernetes Service NodePort documentation: https://kubernetes.io/docs/concepts/services-networking/service/#type-nodeport

## Issues Found
- The original Calico port range syntax used `ports: [30000-32767]`, which is not the documented Calico range format. Changed it to the string range syntax `ports: ['30000:32767']`.
- The original policy matched ports without specifying a protocol. Calico port matches are protocol-specific in practice, and Kubernetes NodePort services may use TCP, UDP, or SCTP. Added protocol-specific allow and deny rules for TCP, UDP, and SCTP.
- The original example used `preDNAT: true` and `applyOnForward: true` without stating that these fields are meaningful only for policies that select HostEndpoints. Added a HostEndpoint prerequisite.
- The original selector `has(kubernetes.io/hostname)` was not aligned with Calico's documented automatic HostEndpoint example. Changed it to `has(kubernetes-host)`, matching the documented node label pattern that syncs to automatic HostEndpoints.
- The original explanation said that without this policy any source could reach NodePort or ClusterIP services. ClusterIP services are internal service IPs by default, while NodePort services are reachable through node IPs and node ports. Narrowed the claim to NodePort exposure.
- The original verification command tested a ClusterIP-style service name from inside a pod, which does not validate pre-DNAT NodePort host policy. Replaced it with a curl to `<node-ip>:<node-port>` from an allowed or denied source.
- Corrected duplicate and inconsistent wording around "NodePort Traffic" and "NodePort Traffic Policies policies" where it affected the technical clarity of the post.

## Review Notes
- The post is now technically valid for the default Kubernetes NodePort range. Clusters that customize `--service-node-port-range` need to adjust the Calico port range accordingly.
- The policy depends on HostEndpoints being present and labeled. In production, teams should verify the HostEndpoints with `calicoctl get heps -owide` before relying on this policy.
