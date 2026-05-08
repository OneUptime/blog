# Validation Summary: How to Validate IP Address Allocation by Topology in Calico

## Status
validated

## Post Type
Guide

## Technologies Covered
- Calico Open Source
- Kubernetes
- Calico IPAM
- Calico IPPool resources
- calicoctl
- kubectl

## Sources Consulted
- Calico Open Source documentation: Assign IP addresses based on topology, https://docs.tigera.io/calico/latest/networking/ipam/assign-ip-addresses-topology
- Calico Open Source documentation: IPPool resource, https://docs.tigera.io/calico/latest/reference/resources/ippool
- Calico Open Source documentation: Create multiple IP pools, https://docs.tigera.io/calico/latest/networking/ipam/ippools
- Calico Open Source documentation: calicoctl ipam overview, https://docs.tigera.io/calico/latest/reference/calicoctl/ipam/overview
- Calico Open Source documentation: Configure calicoctl, https://docs.tigera.io/calico/latest/operations/calicoctl/configure/overview
- Calico Enterprise documentation: calicoctl ipam check, https://docs.tigera.io/calico-enterprise/latest/reference/clis/calicoctl/ipam/check
- Calico Enterprise documentation: calicoctl ipam show, https://docs.tigera.io/calico-enterprise/latest/reference/clis/calicoctl/ipam/show/

## Issues Found
- The IPPool example used `nodeSelector: all()`, which does not validate topology-based allocation. Updated the example to use two pools selected by `rack == "0"` and `rack == "1"`, matching Calico's documented topology-based IP allocation pattern.
- The IPPool example set both `ipipMode` and `vxlanMode`, and used `vxlanMode: VXLAN`. Calico documents that `ipipMode` and `vxlanMode` cannot be set at the same time, and valid `vxlanMode` values are `Always`, `CrossSubnet`, and `Never`. Updated the example to use `vxlanMode: Always` only.
- The verification command `kubectl get pods -A -o wide | awk '{print $8}'` printed the node column, not pod IPs. Replaced it with `kubectl get pods -A -o wide` so reviewers can compare pod IPs with the node placement columns.
- The post used `calicoctl ipam check` in a Calico Open Source-oriented prerequisite set. Current Calico Open Source IPAM documentation lists `release`, `show`, and `configure` as IPAM commands, while `ipam check` is documented in the Calico Enterprise CLI reference. Replaced those checks with documented Open Source-compatible `calicoctl ipam show` commands.
- The verification section described `calicoctl ipam show --show-configuration` as a pool utilization check. Updated the section to use `calicoctl ipam show` for utilization and `--show-configuration` for IPAM configuration.

## Review Notes
The guide is now technically consistent for a Calico Open Source workflow using Calico IPAM and topology-selective IPPools. Operators should ensure every node is selected by at least one enabled IPPool before applying this pattern, because Calico documents that unselected nodes may fail to receive workload IPs.
