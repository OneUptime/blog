# Validation Summary: How to Install Flannel CNI with a Custom IPv4 Subnet in Kubernetes

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes
- kubeadm
- kubectl
- Flannel
- CNI
- IPv4 pod networking
- VXLAN
- host-gw
- WireGuard

## Sources Consulted
- Flannel upstream README: https://github.com/flannel-io/flannel
- Current upstream Flannel manifest: https://github.com/flannel-io/flannel/releases/latest/download/kube-flannel.yml
- Flannel backend documentation: https://github.com/flannel-io/flannel/blob/master/Documentation/backends.md
- `kubeadm init` reference: https://kubernetes.io/docs/reference/setup-tools/kubeadm/kubeadm-init/
- Creating a cluster with kubeadm: https://kubernetes.io/docs/setup/production-environment/tools/kubeadm/create-cluster-kubeadm/
- `kubectl run` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_run/
- `kubectl exec` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_exec/
- `kubectl logs` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_logs/

## Issues Found
- The post downloaded `kube-flannel.yml` from the mutable `raw.githubusercontent.com/.../master/...` path. Updated it to the official Flannel release asset URL that upstream currently documents for manual installation.
- The `kubeadm init` example under the "custom Pod CIDR" step still used Flannel's default `10.244.0.0/16` range. Changed it to the same custom `172.16.0.0/16` network used throughout the rest of the post so the walkthrough is internally consistent.
- The embedded ConfigMap and backend JSON examples were out of date relative to the current upstream manifest. Added the `portmap` CNI plugin entry and the `EnableNFTables` field so the snippets match current Flannel packaging.
- The Flannel introduction described Flannel as an overlay CNI that reads Pod CIDRs from the API. Tightened this to Flannel's upstream description as a Kubernetes layer 3 network fabric and clarified that its `Network` value must match the `--pod-network-cidr` used with `kubeadm init`.
- The DaemonSet and log inspection commands were valid but imprecise. Updated them to target the named `kube-flannel-ds` DaemonSet and Flannel-labeled pods explicitly.
- The backend table and closing claim were slightly over-broad. Adjusted the backend wording to match Flannel's current documentation more closely and changed the final sentence to the narrower, accurate statement that Flannel is used by distributions such as K3s.

## Review Notes
Flannel's upstream documentation currently notes two prerequisites that are outside the post's main focus but can affect real installs: standard CNI plugin binaries should exist in `/opt/cni/bin`, and recent kubeadm versions do not verify the `br_netfilter` kernel module before Flannel starts. The core subnet-matching guidance in the post is otherwise correct.
