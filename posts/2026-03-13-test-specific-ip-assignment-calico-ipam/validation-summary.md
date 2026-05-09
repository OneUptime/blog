# Validation Summary: How to Test Specific IP Assignment with Calico IPAM Before Production

## Status
validated

## Post Type
Guide

## Technologies Covered
- Calico Open Source
- Calico IPAM
- calicoctl
- Kubernetes Pods
- Kubernetes YAML manifests

## Sources Consulted
- Calico documentation: Use a specific IP address with a pod - https://docs.tigera.io/calico/latest/networking/ipam/use-specific-ip
- Calico documentation: IPPool resource reference - https://docs.tigera.io/calico/latest/reference/resources/ippool
- Calico documentation: calicoctl ipam show - https://docs.tigera.io/calico/latest/reference/calicoctl/ipam/show
- Calico documentation: calicoctl ipam check - https://docs.tigera.io/calico/latest/reference/calicoctl/ipam/check
- Kubernetes documentation: Pods - https://kubernetes.io/docs/concepts/workloads/pods/

## Issues Found
- The example only defined an IPPool, so it did not actually test specific IP assignment. Calico requires the `cni.projectcalico.org/ipAddrs` pod annotation, the requested address must be in a configured Calico IP pool and unused, and the annotation must be present when the pod is created. I added a pod manifest that requests `10.48.0.10` from the example pool.
- The prerequisites did not state that the cluster must be using Calico IPAM. Calico's specific pod IP annotation requires Calico IPAM, so I added that prerequisite.
- The verification commands checked general IPAM health and pod addresses but did not verify the requested static IP directly. I added `calicoctl ipam show --ip=10.48.0.10`, which is documented for reporting whether a specific IP is in use.

## Review Notes
The existing IPPool fields `apiVersion`, `kind`, `spec.cidr`, `spec.blockSize`, and `spec.natOutgoing` are valid in the current Calico IPPool resource reference. The existing `calicoctl ipam check -o ipam-report.json`, `calicoctl ipam show --show-blocks`, and `kubectl get pods -A -o wide` commands are valid. In a future expansion, the post could mention reserving manually assigned addresses to avoid automatic assignment of the same address before the test pod is created.
