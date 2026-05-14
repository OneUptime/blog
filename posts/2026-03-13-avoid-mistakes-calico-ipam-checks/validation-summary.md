# Validation Summary: Common Mistakes to Avoid with Calico IPAM Checks

## Status
validated

## Post Type
Operational guide

## Technologies Covered
- Calico Open Source
- Calico IPAM
- calicoctl
- Kubernetes Services and node pod CIDRs
- Prometheus metrics

## Sources Consulted
- Calico calicoctl ipam release documentation: https://docs.tigera.io/calico/latest/reference/calicoctl/ipam/release
- Calico calicoctl ipam show documentation: https://docs.tigera.io/calico/latest/reference/calicoctl/ipam/show
- Calico IPPool resource documentation: https://docs.tigera.io/calico/latest/reference/resources/ippool
- Calico kube-controllers Prometheus metrics documentation: https://docs.tigera.io/calico/latest/reference/kube-controllers/prometheus
- Calico migrate from one IP pool to another documentation: https://docs.tigera.io/calico/latest/networking/ipam/migrate-pools
- Kubernetes Service ClusterIP allocation documentation: https://kubernetes.io/docs/concepts/services-networking/cluster-ip-allocation/
- Kubernetes kube-apiserver reference: https://kubernetes.io/docs/reference/command-line-tools-reference/kube-apiserver/

## Issues Found
- The `ipam show --show-blocks` explanation said a block has 256 IPs and that most addresses are reserved for one node. Calico's default IPv4 block size is `/26`, which provides 64 addresses, and Calico can borrow addresses from another node's block when StrictAffinity is disabled. Updated the explanation to match Calico's block behavior.
- The IPPool overlap checks queried `kubectl get svc -n kube-system kubernetes`, but the built-in `kubernetes` Service normally exists in the `default` namespace. Replaced this with a cluster-wide Service ClusterIP query and added a note to check the configured API server `--service-cluster-ip-range`.
- The monitoring section referred to a specific `CalicoIPAMUtilizationHigh` alert and a fixed "2-4 weeks warning" claim. Calico documents kube-controllers metrics such as `ipam_allocations_in_use` and `ipam_ippool_size`, but not that alert name or warning interval. Updated the example to describe a Prometheus utilization expression and a threshold chosen for the cluster's growth rate.
- The active IPPool deletion verification used `calicoctl ipam show | grep my-pool`, but documented `ipam show` output identifies pools by CIDR. Updated the check to retrieve the pool CIDR and then inspect `calicoctl ipam show --show-blocks`.
- The conclusion said deleting an active IPPool immediately breaks pods. Calico documentation notes disabling a pool does not affect existing allocations, while migration guidance still requires moving pods before deletion. Softened the claim to "can break pods using those IPs."

## Review Notes
The command examples use current Calico Open Source and Kubernetes concepts as of 2026-05-14. The post intentionally remains version-neutral; exact metric names and IPPool behavior should be rechecked if targeting a specific older Calico version.
