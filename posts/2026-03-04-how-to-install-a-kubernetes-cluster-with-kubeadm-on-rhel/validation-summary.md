# Validation Summary: How to Install a Kubernetes Cluster with kubeadm on RHEL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Red Hat Enterprise Linux
- Kubernetes
- kubeadm
- kubelet
- kubectl
- containerd
- Calico CNI
- firewalld

## Sources Consulted
- Kubernetes documentation: Installing kubeadm - https://kubernetes.io/docs/setup/production-environment/tools/kubeadm/install-kubeadm/
- Kubernetes documentation: Creating a cluster with kubeadm - https://kubernetes.io/docs/setup/production-environment/tools/kubeadm/create-cluster-kubeadm/
- Kubernetes documentation: Container Runtimes - https://kubernetes.io/docs/setup/production-environment/container-runtimes/
- Kubernetes documentation: Ports and Protocols - https://kubernetes.io/docs/reference/networking/ports-and-protocols/
- Kubernetes reference: kubeadm - https://kubernetes.io/docs/reference/setup-tools/kubeadm/
- Docker documentation: Install Docker Engine on RHEL - https://docs.docker.com/engine/install/rhel/
- Calico documentation: Stand up Kubernetes - https://docs.tigera.io/calico/latest/getting-started/kubernetes/hardway/standing-up-kubernetes
- Calico documentation: Quickstart - https://docs.tigera.io/calico/latest/getting-started/kubernetes/k3s/quickstart

## Issues Found
- The Docker repository setup used `dnf config-manager` without first installing the documented `dnf-plugins-core` package. Added `sudo dnf -y install dnf-plugins-core`.
- The Kubernetes RPM repository was pinned to v1.29, which is outdated as of the 2026-05-15 review date. Updated the repository and GPG key URLs to v1.36.
- The Kubernetes RPM repository block omitted the official `exclude=` line, and the install command did not disable those excludes for the Kubernetes repository. Added the documented `exclude=kubelet kubeadm kubectl cri-tools kubernetes-cni` line and `--disableexcludes=kubernetes`.
- The kubelet enable command did not start kubelet immediately. Updated it to `sudo systemctl enable --now kubelet`, matching Kubernetes documentation.
- The kubeadm pod CIDR used `10.244.0.0/16` while the Calico manifest defaults to `192.168.0.0/16`. Updated the kubeadm init command to use `192.168.0.0/16`.
- The Calico manifest URL referenced v3.27.0, which is outdated. Updated it to v3.32.0.
- The firewall commands omitted documented Kubernetes ports for kube-controller-manager, kube-scheduler, kube-proxy, and UDP NodePort services. Added ports 10257/tcp, 10259/tcp, 10256/tcp, and 30000-32767/udp.

## Review Notes
The example control plane IP address `192.168.1.100` is environment-specific and must be replaced with the actual control plane node address. The firewall commands cover Kubernetes component ports from the upstream documentation; production Calico deployments may require additional firewall allowances depending on the selected encapsulation or BGP mode.
