# Validation Summary: How to Test IP Address Allocation by Topology in Calico Before Production

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Calico (Project Calico) v3.20+
- Kubernetes
- Calico IPAM (IP Address Management)
- calicoctl CLI
- kubectl CLI
- IPPool custom resources (projectcalico.org/v3)

## Sources Consulted
- Calico IPPool resource reference: https://docs.tigera.io/calico/latest/reference/resources/ippool
- calicoctl ipam command reference: https://docs.tigera.io/calico/latest/reference/calicoctl/ipam/
- calicoctl ipam show: https://docs.tigera.io/calico/latest/reference/calicoctl/ipam/show
- calicoctl ipam check: https://docs.tigera.io/calico/latest/reference/calicoctl/ipam/check
- Calico topology-aware IPAM docs: https://docs.tigera.io/calico/latest/networking/ipam/legacy-firewalls
- kubectl get pods -o wide column layout (Kubernetes docs)

## Issues Found
1. **Invalid `vxlanMode` value in IPPool example.** The post used `vxlanMode: VXLAN`, which is not a valid value. The Calico IPPool spec only accepts `Always`, `CrossSubnet`, or `Never` for `vxlanMode`. Changed to `vxlanMode: Always` to preserve the author's clear intent of enabling VXLAN encapsulation (since `ipipMode` is `Never`).
2. **Wrong awk column in the "Verify allocations" command.** The post used `awk '{print $8}'` against `kubectl get pods -A -o wide`, which prints the NODE column, not the IP. The column layout for `kubectl get pods -A -o wide` is `NAMESPACE NAME READY STATUS RESTARTS AGE IP NODE ...`, so the IP is `$7`. Changed to `awk '{print $7}'` to actually emit pod IPs, matching the comment "Verify allocations".

## Review Notes
- The title and description promise a focus on topology-aware IPAM, but the example `IPPool` uses `nodeSelector: all()` and does not actually demonstrate topology-scoped allocation (e.g., a per-zone `nodeSelector` such as `topology.kubernetes.io/zone == "us-east-1a"`). The post would be stronger with at least one topology-scoped pool example, but this is a content-completeness observation, not a technical inaccuracy in what is shown.
- `calicoctl ipam check` writes report files; the `-o` flag is accepted on recent calicoctl versions to specify the output file name, so the verification example is left as-is.
- `blockSize: 26` is the default for IPv4 IP pools and is valid.
- `apiVersion: projectcalico.org/v3` is the correct API group/version when applying via `calicoctl`. If applying directly through `kubectl` against the CRD, the group is `crd.projectcalico.org/v1` — worth a future note for readers using kubectl-only workflows.
