# Validation Summary: How to Migrate Existing Workloads to Calico on MicroK8s

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- MicroK8s
- Kubernetes
- Calico
- CNI networking
- Kubernetes NetworkPolicy
- Calico IPAM

## Sources Consulted
- MicroK8s CNI Configuration: https://microk8s.io/docs/change-cidr
- MicroK8s Addons documentation: https://microk8s.io/docs/addons
- MicroK8s Upgrading documentation: https://microk8s.io/docs/upgrading
- Kubernetes kubectl wait reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_wait/
- Kubernetes kubectl scale reference: https://kubernetes.io/docs/reference/generated/kubectl/kubectl-commands
- Calico calicoctl IPAM show reference: https://docs.tigera.io/calico/latest/reference/calicoctl/ipam/show
- Calico IPPool resource reference: https://docs.tigera.io/calico/latest/reference/resources/ippool
- Calico BlockAffinity resource reference: https://docs.tigera.io/calico/latest/reference/resources/blockaffinity

## Issues Found
- The post described Calico as a MicroK8s add-on that can be enabled with `microk8s enable calico`. Current MicroK8s documentation describes Calico as the default CNI from MicroK8s 1.19 onward, with the manifest stored under `/var/snap/microk8s/current/args/cni-network/cni.yaml`. The wording and migration command were changed to use the MicroK8s-provided Calico manifest.
- The command `microk8s disable flannel 2>/dev/null || true` implied that Flannel is disabled through a normal MicroK8s add-on path. The documented MicroK8s CNI workflow does not present Flannel that way, so the command was removed.
- The workload export commands were presented as directly reusable redeployment manifests. Raw `kubectl get ... -o yaml` exports include generated metadata and status fields that should not be treated as clean source manifests. The post now tells readers to use original manifests or clean generated fields before applying exported YAML.
- The restart step scaled every deployment in every namespace to one replica, which can change intended replica counts. The post now tells readers to record original replica counts before scale-down and restore those counts explicitly.
- The Calico IPAM verification step assumed `calicoctl` is installed and configured. The post now uses Kubernetes CRD checks for IPPools and BlockAffinities first, and keeps `calicoctl ipam show` as an optional command.
- The conclusion still referred to enabling a Calico add-on. It was updated to match the manifest-based workflow used in the corrected steps.

## Review Notes
The post remains a high-level migration guide. For production clusters, future improvements could include a more explicit maintenance-window plan, namespace-by-namespace workload restoration, and a warning to test the CNI change on a non-production MicroK8s node before touching critical workloads.
