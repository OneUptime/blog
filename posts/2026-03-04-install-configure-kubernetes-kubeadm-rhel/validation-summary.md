# Validation Summary: How to Install and Configure Kubernetes (kubeadm) on RHEL

## Status
validated

## Post Type
Tutorial / installation guide

## Technologies Covered
- Red Hat Enterprise Linux
- Kubernetes
- kubeadm
- kubelet
- kubectl
- containerd
- firewalld
- Flannel CNI

## Sources Consulted
- Kubernetes: Installing kubeadm: https://kubernetes.io/docs/setup/production-environment/tools/kubeadm/install-kubeadm/
- Kubernetes: Creating a cluster with kubeadm: https://kubernetes.io/docs/setup/production-environment/tools/kubeadm/create-cluster-kubeadm/
- Kubernetes: Container runtimes: https://kubernetes.io/docs/setup/production-environment/container-runtimes/
- Kubernetes: Ports and Protocols: https://kubernetes.io/docs/reference/networking/ports-and-protocols/
- Docker: Install Docker Engine on RHEL: https://docs.docker.com/engine/install/rhel/
- Flannel README and backend documentation: https://github.com/flannel-io/flannel

## Issues Found
- The RHEL prerequisites did not include the Kubernetes-documented SELinux permissive configuration for kubeadm-managed nodes. Added `setenforce 0` and the persistent `/etc/selinux/config` update.
- The Docker/containerd repository setup used `dnf config-manager` without installing the package that provides repository-management commands. Added `dnf-plugins-core`.
- The Kubernetes RPM repository snippet used the outdated v1.29 package repository and omitted the upstream `exclude` line. Updated the repository to v1.36 and added `exclude=kubelet kubeadm kubectl cri-tools kubernetes-cni`.
- The Kubernetes package install command did not bypass the repository exclusions during installation. Added `--disableexcludes=kubernetes` and enabled kubelet with `--now`.
- The worker firewall rules omitted the Kubernetes-documented kube-proxy port `10256/tcp` and UDP NodePort range. Added both.
- The firewall rules did not account for Flannel's default VXLAN backend port when firewalld is enabled. Added `8472/udp` on control plane and worker nodes.

## Review Notes
The guide remains a basic single-control-plane kubeadm walkthrough. The sample `--apiserver-advertise-address=192.168.1.10` and join command placeholders are technically valid as examples, but readers must replace them with their own node IP, token, and CA certificate hash. For DNF5-based systems, Kubernetes documents `--setopt=disable_excludes=kubernetes` instead of `--disableexcludes=kubernetes`.
