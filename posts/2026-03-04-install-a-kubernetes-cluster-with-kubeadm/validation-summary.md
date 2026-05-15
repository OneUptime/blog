# Validation Summary: How to Install a Kubernetes Cluster with kubeadm on RHEL 9

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Red Hat Enterprise Linux 9
- Kubernetes
- kubeadm
- kubelet
- kubectl
- containerd
- Calico
- Linux kernel modules and sysctl configuration

## Sources Consulted
- Kubernetes documentation: Installing kubeadm - https://kubernetes.io/docs/setup/production-environment/tools/kubeadm/install-kubeadm/
- Kubernetes documentation: Creating a cluster with kubeadm - https://kubernetes.io/docs/setup/production-environment/tools/kubeadm/create-cluster-kubeadm/
- Kubernetes documentation: Container Runtimes - https://kubernetes.io/docs/setup/production-environment/container-runtimes/
- Calico documentation: Install Calico networking and network policy for on-premises deployments - https://docs.tigera.io/calico/latest/getting-started/kubernetes/self-managed-onprem/onpremises
- Docker documentation: Install Docker Engine on RHEL - https://docs.docker.com/engine/install/rhel/

## Issues Found
- The Kubernetes repository was pinned to v1.29, which is outdated for a current 2026 RHEL 9 kubeadm guide. Updated the repository URL and GPG key to the current v1.36 stable repository.
- The Kubernetes RPM repository snippet omitted the official `exclude=` line and the install command omitted `--disableexcludes=kubernetes`. Added both so package upgrades and installs follow kubeadm's documented package-management guidance.
- The RHEL kubeadm setup omitted the SELinux permissive-mode commands documented for Red Hat-based distributions. Added the commands to avoid kubeadm and CNI setup failures on enforcing systems.
- The kubelet service was only enabled, not started. Updated the command to `systemctl enable --now kubelet`, matching the documented optional kubelet startup step.
- The containerd package command used `dnf install containerd`, which is not the documented Docker RPM package name for installing containerd from the Docker repository on RHEL. Added the Docker RPM repository setup and changed the package to `containerd.io`.
- The Calico install used an older v3.27 raw manifest and paired it with a `10.244.0.0/16` pod CIDR commonly used by Flannel. Updated the kubeadm pod CIDR to `192.168.0.0/16` and replaced the Calico command with the current v3.32 Tigera Operator installation commands.

## Review Notes
The guide remains a single-control-plane kubeadm setup, which Kubernetes documents as having limited resilience. For production use, a future improvement would be to add high-availability control plane guidance, firewall/port requirements, and explicit checks for unique hostnames, MAC addresses, and product UUIDs.
