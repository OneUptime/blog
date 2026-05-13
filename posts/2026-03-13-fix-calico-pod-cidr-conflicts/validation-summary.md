# Validation Summary: How to Fix Calico Pod CIDR Conflicts

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Calico
- Kubernetes
- calicoctl
- kubectl
- Kubernetes IPAM and pod networking

## Sources Consulted
- Calico IPPool resource documentation: https://docs.tigera.io/calico/latest/reference/resources/ippool
- Calico IP pool migration documentation: https://docs.tigera.io/calico/latest/networking/ipam/migrate-pools
- Calico IP pool configuration documentation: https://docs.tigera.io/calico/latest/getting-started/kubernetes/hardway/configure-ip-pools
- Calico calicoctl patch documentation: https://docs.tigera.io/calico/latest/reference/calicoctl/patch
- Calico calicoctl get documentation: https://docs.tigera.io/calico/latest/reference/calicoctl/get
- Calico calicoctl ipam check documentation: https://docs.tigera.io/calico/latest/reference/calicoctl/ipam/check
- Calico calicoctl ipam show documentation: https://docs.tigera.io/calico/latest/reference/calicoctl/ipam/show
- Kubernetes kubectl rollout restart reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_rollout/kubectl_rollout_restart/

## Issues Found
- The description mentioned updating routing configuration, but the procedure only updates Calico IP pools and restarts workloads. Removed that phrase to avoid implying a routing change that is not shown.
- The post did not state that replacement Calico IP pools should normally remain within the Kubernetes cluster pod CIDR. Added that requirement to the introduction and setup example notes.
- The symptom and prevention sections said `calicoctl ipam check` reports or confirms CIDR conflicts. Official documentation describes `ipam check` as an IPAM integrity check against Kubernetes, while IPPool overlap is surfaced through IPPool validation or status. Reworded those statements to cover IPPool overlap status and IPAM consistency accurately.
- The rollout commands used `kubectl rollout restart ... --all --all-namespaces`. The official `kubectl rollout restart` reference documents namespace-scoped restart examples and does not list `--all-namespaces` for this command. Replaced the commands with namespace-scoped restarts and added StatefulSet coverage.
- The pod verification command used a negative `grep` pipeline that could be misleading. Replaced it with `kubectl get pods --all-namespaces -o wide` and left verification as an explicit inspection step.
- The prevention section recommended specific RFC1918 ranges for pods, nodes, and services in a way that could still conflict in real environments. Reworded it to require distinct, non-overlapping CIDRs without prescribing fixed ranges.

## Review Notes
The Calico IPPool fields used in the snippets (`cidr`, `ipipMode`, `natOutgoing`, and `disabled`) are valid for current Calico. In operator-managed Calico installs, administrators may need to manage pools through the Installation resource or disable operator IP pool management rather than relying only on direct `calicoctl` changes.
