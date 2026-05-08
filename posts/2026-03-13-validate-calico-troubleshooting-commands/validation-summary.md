# Validation Summary: How to Validate Calico Troubleshooting Commands

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Calico
- calicoctl
- Kubernetes
- kubectl
- Kubernetes networking
- BGP
- Calico IPAM

## Sources Consulted
- Calico calicoctl version reference: https://docs.tigera.io/calico/latest/reference/calicoctl/version
- Calico calicoctl user reference: https://docs.tigera.io/calico/latest/reference/calicoctl/overview
- Calico calicoctl get reference: https://docs.tigera.io/calico/latest/reference/calicoctl/get
- Calico calicoctl ipam show reference: https://docs.tigera.io/calico-enterprise/latest/reference/clis/calicoctl/ipam/show/
- Calico troubleshooting commands: https://docs.tigera.io/calico/latest/operations/troubleshoot/commands
- Calico BGP configuration guide: https://docs.tigera.io/calico/latest/networking/configuring/bgp
- Calico BGP peer resource reference: https://docs.tigera.io/calico/latest/reference/resources/bgppeer
- Calico FelixConfiguration resource reference: https://docs.tigera.io/calico/latest/reference/resources/felixconfig
- Calico GlobalNetworkPolicy resource reference: https://docs.tigera.io/calico/latest/reference/resources/globalnetworkpolicy
- Calico TigeraStatus reference: https://docs.tigera.io/calico-enterprise/latest/reference/installation/tigerastatus
- Kubernetes kubectl command reference: https://kubernetes.io/docs/reference/kubectl/

## Issues Found
- The `calicoctl version` expected output used `Cluster Calico Version`, but current Calico documentation lists the field as `Cluster Version`. The post now uses `Cluster Version`.
- The version-discovery snippet extracted a tag with `cut -d: -f2`, which can be unreliable for image references with registry ports or nonstandard references. The post now prints the selected `calico-node` container image directly.
- The BGP peer count command used `calicoctl get bgppeer --no-headers`, but `--no-headers` is not a documented `calicoctl get` option. The post now counts default table rows with `awk`.
- The IPAM validation snippet searched for `IPs in use`, but documented `calicoctl ipam show` output uses a table with the `IPS IN USE` column and per-pool rows. The post now sums the documented `IP Pool` table rows.
- The running pod count used `grep Running` over default `kubectl get pods` output. The post now uses the Kubernetes field selector `status.phase=Running`, which is more precise.
- The IPAM-to-pod-count note implied the numbers should simply be close. The post now scopes that comparison to single-stack clusters using Calico IPAM.

## Review Notes
The commands assume an operator-based Calico installation that uses the `calico-system` namespace. Calico's own troubleshooting documentation notes that manifest-based installations commonly use `kube-system` instead.
