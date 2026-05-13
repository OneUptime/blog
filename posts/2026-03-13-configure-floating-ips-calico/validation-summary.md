# Validation Summary: How to Configure Floating IPs with Calico

## Status
validated

## Post Type
Guide

## Technologies Covered
- Calico
- Kubernetes
- Calico CNI
- Calico IPAM
- Calico IPPool resources
- calicoctl

## Sources Consulted
- Calico documentation: Add a floating IP to a pod - https://docs.tigera.io/calico/latest/networking/ipam/add-floating-ip
- Calico documentation: Configure the Calico CNI plugins - https://docs.tigera.io/calico/latest/reference/configure-cni-plugins
- Calico documentation: IP pool resource - https://docs.tigera.io/calico/latest/reference/resources/ippool
- Calico documentation: calicoctl get - https://docs.tigera.io/calico/latest/reference/calicoctl/get
- Calico documentation: calicoctl ipam show - https://docs.tigera.io/calico/latest/reference/calicoctl/ipam/show
- Calico documentation: calicoctl ipam check - https://docs.tigera.io/calico/latest/reference/calicoctl/ipam/check
- Calico documentation: Workload endpoint resource - https://docs.tigera.io/calico/latest/reference/resources/workloadendpoint

## Issues Found
- The post described floating IPs but only showed ordinary IPPool/IPAM inspection. I added the documented `feature_control.floating_ips` CNI configuration and the `cni.projectcalico.org/floatingIPs` pod annotation.
- The prerequisites implied any Calico v3.20+ installation was enough. I changed this to require the Calico CNI plugin with manifest-managed CNI configuration because Calico documentation states Kubernetes pod floating IPs are not currently supported for operator-managed Calico clusters.
- The example IPPool was valid but did not demonstrate assigning a floating IP. I kept the IPPool and added a pod example that requests a floating IP from that pool.
- The verification commands did not show where Calico represents the floating IP mapping. I added `calicoctl get workloadendpoints -A -o yaml` so the workload endpoint NAT mapping can be inspected.
- The description called the address an external IP. I changed this to stable IP because Calico floating IPs are additional workload endpoint addresses and are not necessarily externally routed without the surrounding network configuration.

## Review Notes
The corrected guide is technically valid as a concise Calico floating IP guide. A future expanded version could explain admission-control risk for arbitrary floating IP annotations and show a complete `calico-config` `cni_network_config` example, but those additions were outside the minimal correction scope.
