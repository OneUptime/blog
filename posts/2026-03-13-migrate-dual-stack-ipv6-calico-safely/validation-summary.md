# Validation Summary: How to Migrate to Dual-Stack IPv6 with Calico Safely

## Status
validated

## Post Type
Guide

## Technologies Covered
- Calico
- Kubernetes
- IPv6
- IPv4/IPv6 dual-stack networking
- calicoctl
- kubectl

## Sources Consulted
- Calico documentation: Configure dual stack or IPv6 only: https://docs.tigera.io/calico/latest/networking/ipam/ipv6
- Calico documentation: IPPool resource reference: https://docs.tigera.io/calico/latest/reference/resources/ippool
- Calico documentation: Configure outgoing NAT: https://docs.tigera.io/calico/latest/networking/configuring/workloads-outside-cluster
- Calico documentation: calicoctl ipam check: https://docs.tigera.io/calico/latest/reference/calicoctl/ipam/check
- Kubernetes documentation: IPv4/IPv6 dual-stack: https://kubernetes.io/docs/concepts/services-networking/dual-stack/
- Kubernetes documentation: Validate IPv4/IPv6 dual-stack: https://kubernetes.io/docs/tasks/network/validate-dual-stack/

## Issues Found
- The description said the migration could be done by adding IPv6 pools. Calico also requires IPv6 allocation to be enabled in the CNI configuration, node IPv6 support to be enabled, and Kubernetes to be configured with dual-stack pod and service CIDRs. Updated the description and prerequisites to reflect those requirements.
- The example IPPool used an IPv4 CIDR in a post about adding IPv6. Replaced it with an IPv6 IPPool example and included standard fields from the Calico IPPool schema.
- The post implied existing pods would receive IPv6 addresses without disruption. New pods receive both families after dual-stack configuration; existing pods keep their assigned addresses until recreated. Added that caveat.
- The architecture diagram showed Calico IPPools feeding Service IPs. Calico IPPools allocate workload/pod IPs; Kubernetes allocates Service IPs from service CIDRs. Updated the diagram and conclusion accordingly.
- Verification only listed Services. Added pod address verification with `kubectl get pods -A -o wide` and kept `calicoctl ipam check`, which is a valid Calico IPAM consistency command.

## Review Notes
The post is still a high-level guide rather than a complete migration runbook. A future update could add Kubernetes control-plane flag examples for `--cluster-cidr` and `--service-cluster-ip-range`, plus guidance for updating existing Services to `PreferDualStack` or `RequireDualStack`.
