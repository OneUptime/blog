# Validation Summary: How to Deploy a Multi-Node Kubernetes Cluster on RHEL from Scratch

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Red Hat Enterprise Linux
- Kubernetes
- kubeadm
- kubelet
- kubectl
- containerd
- HAProxy
- Calico CNI
- etcd
- firewalld
- NetworkManager

## Sources Consulted
- Kubernetes documentation: Installing kubeadm - https://kubernetes.io/docs/setup/production-environment/tools/kubeadm/install-kubeadm/
- Kubernetes documentation: Creating Highly Available Clusters with kubeadm - https://kubernetes.io/docs/setup/production-environment/tools/kubeadm/high-availability/
- Kubernetes documentation: Container Runtimes - https://kubernetes.io/docs/setup/production-environment/container-runtimes/
- Kubernetes documentation: Ports and Protocols - https://kubernetes.io/docs/reference/networking/ports-and-protocols/
- Kubernetes documentation: Version Skew Policy - https://kubernetes.io/releases/version-skew-policy/
- Docker documentation: Install Docker Engine on RHEL - https://docs.docker.com/engine/install/rhel/
- Calico documentation: System requirements for Kubernetes - https://docs.tigera.io/calico/latest/getting-started/kubernetes/requirements
- Calico documentation: Troubleshooting and diagnostics, Configure NetworkManager - https://docs.tigera.io/calico/latest/operations/troubleshoot/troubleshooting#configure-networkmanager
- Calico documentation: Installing on on-premises deployments - https://docs.tigera.io/calico/latest/getting-started/kubernetes/self-managed-onprem/onpremises

## Issues Found
- The Kubernetes repository was pinned to v1.29, which is no longer one of the Kubernetes project's currently maintained minor releases as of 2026-05-15. Updated the package repository and GPG key URLs to v1.36, matching the current Kubernetes documentation.
- The Kubernetes RPM repository configuration was missing the official `exclude` line, and the install command was missing `--disableexcludes=kubernetes`. Added both so kubelet, kubeadm, kubectl, cri-tools, and kubernetes-cni are protected from unplanned package updates while still allowing the initial install.
- The kubelet service was enabled but not started. Updated the command to `systemctl enable --now kubelet`, matching the official kubeadm installation instructions.
- The Docker repository setup used `dnf config-manager` without first installing the package that provides it. Added `dnf-plugins-core` before adding the Docker RHEL repository.
- The Calico manifest version was v3.27.0, which is old for a current Kubernetes install. Updated it to v3.32.0, which Calico documents as tested with Kubernetes v1.36.
- The RHEL node preparation omitted Calico-specific host prerequisites. Added commands to disable firewalld on Kubernetes nodes and configure NetworkManager to leave Calico interfaces unmanaged, as recommended by Calico documentation.

## Review Notes
The tutorial uses a stacked etcd topology through kubeadm, which is valid for a three-control-plane HA cluster. The HAProxy configuration is a basic TCP forwarding example and is technically plausible, but production deployments should also consider redundant load balancers or a virtual IP because a single HAProxy node remains a single point of failure.
