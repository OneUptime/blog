# Validation Summary: How to Build a Runbook for CIDRNotAvailable Errors with Calico and kubeadm

## Status
validated

## Post Type
Technical guide / operational runbook

## Technologies Covered
- Kubernetes
- kubeadm
- Calico
- Calico IPAM
- calicoctl
- kubectl
- Bash
- jq

## Sources Consulted
- Kubernetes kubeadm config documentation: https://kubernetes.io/docs/reference/setup-tools/kubeadm/kubeadm-config/
- Kubernetes kubeadm v1beta4 ClusterConfiguration API: https://kubernetes.io/docs/reference/config-api/kubeadm-config.v1beta4/
- Kubernetes kubeadm dual-stack and podSubnet documentation: https://kubernetes.io/docs/setup/production-environment/tools/kubeadm/dual-stack-support/
- Kubernetes kubectl get reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_get/
- Kubernetes kubectl run reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_run/
- Calico IPAM overview: https://docs.tigera.io/calico/latest/networking/ipam/get-started-ip-addresses
- Calico IPPool resource reference: https://docs.tigera.io/calico/latest/reference/resources/ippool
- Calico IP pool migration guide: https://docs.tigera.io/calico/latest/networking/ipam/migrate-pools
- Calico calicoctl IPAM show reference: https://docs.tigera.io/calico/latest/reference/calicoctl/ipam/show
- Calico calicoctl IPAM check reference: https://docs.tigera.io/calico/latest/reference/calicoctl/ipam/check
- Calico calicoctl IPAM release reference: https://docs.tigera.io/calico/latest/reference/calicoctl/ipam/release

## Issues Found
- The post treated `CIDRNotAvailable` and Calico IPAM allocation failures as the same symptom. Updated the symptom text to distinguish Kubernetes node `CIDRNotAvailable` events from pod-level Calico IPAM allocation failures, because Calico IPAM does not normally use Kubernetes `Node.spec.podCIDR`.
- The decision tree checked whether a single Calico IPPool CIDR exactly matched kubeadm's `podSubnet`. This was too strict because Calico supports multiple disjoint IPPools, but Kubernetes expects pod IPs to stay within the cluster CIDR. Updated the check to verify enabled Calico IPPools are inside the kubeadm pod subnet / Kubernetes cluster CIDR rather than requiring exact equality.
- The diagnostic script compared only `.items[0].spec.cidr` from `calicoctl get ippools -o json`, which could miss additional enabled pools and incorrectly flag valid multi-pool configurations. Replaced it with `calicoctl get ippools -o wide` and explicit operator guidance to verify all enabled pools.
- The node CIDR check did not state that missing `Node.spec.podCIDR` matters only when Kubernetes node CIDR allocation is enabled or Calico uses host-local IPAM. Added a kube-controller-manager flag check and clarified the finding.
- The CIDR mismatch resolution advised deleting the incorrect IPPool before creating the replacement pool. Updated the procedure to create the replacement pool first, disable the old pool, recreate affected pods, and delete the old pool only after active workloads no longer use it, aligning with Calico's IP pool migration guidance.
- The supplementary IPPool example did not state that the new pool must be non-overlapping and inside the Kubernetes cluster CIDR. Added a comment to the manifest.

## Review Notes
The remaining commands and configuration fields reviewed are current and syntactically valid: `kubectl get` with `--all-namespaces`, `--field-selector`, `--sort-by`, custom columns, and JSONPath output; `kubectl run --image --command --`; Calico `IPPool` fields `cidr`, `ipipMode`, `natOutgoing`, `nodeSelector`, and `blockSize`; and `calicoctl ipam show`, `calicoctl ipam check`, and `calicoctl get ippools -o wide`.
