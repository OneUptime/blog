# Validation Summary: How to Install and Configure Kubernetes (kubeadm) on RHEL 9

## Status
validated

## Post Type
Tutorial / installation guide

## Technologies Covered
- Red Hat Enterprise Linux 9
- Kubernetes
- kubeadm
- kubelet
- kubectl
- containerd
- Flannel CNI
- Linux kernel modules and sysctl settings
- SELinux

## Sources Consulted
- Kubernetes documentation: Installing kubeadm: https://kubernetes.io/docs/setup/production-environment/tools/kubeadm/install-kubeadm/
- Kubernetes documentation: Creating a cluster with kubeadm: https://kubernetes.io/docs/setup/production-environment/tools/kubeadm/create-cluster-kubeadm/
- Kubernetes documentation: Container runtimes: https://kubernetes.io/docs/setup/production-environment/container-runtimes/
- Docker documentation: Install Docker Engine on RHEL: https://docs.docker.com/engine/install/rhel/
- Flannel project README: https://github.com/flannel-io/flannel

## Issues Found
- The containerd installation used `dnf install -y containerd.io` without first configuring a repository that provides the `containerd.io` package on RHEL. Added `dnf-plugins-core` installation and the Docker RHEL repository setup command, matching Docker's RHEL installation documentation.
- The Kubernetes package repository used `v1.29`, which is outdated for a post being validated on 2026-05-15. Updated the repository URL and GPG key URL to the current Kubernetes `v1.36` stable repository documented by Kubernetes.
- The Kubernetes repository definition omitted the `exclude` setting and the install command omitted `--disableexcludes=kubernetes`. Added both so package upgrades follow Kubernetes' documented upgrade process while still allowing initial installation.
- The RHEL-based kubeadm setup omitted SELinux permissive-mode commands from the official Kubernetes package installation flow. Added the documented `setenforce` and `/etc/selinux/config` update commands.
- The kubelet service was only enabled, while the official kubeadm installation flow enables and starts it. Changed the command to `systemctl enable --now kubelet`.
- The conclusion claimed that kubeadm on RHEL 9 provides a production-ready cluster. Kubernetes documentation frames kubeadm as a bootstrapping tool and building block, so the wording was changed to say it provides a foundation for a Kubernetes cluster.

## Review Notes
- The Flannel manifest URL and the `10.244.0.0/16` pod CIDR are consistent with the Flannel project's documented manual deployment path.
- The containerd `SystemdCgroup = true` setting is correct for containerd 1.x and remains aligned with Kubernetes guidance to use the systemd cgroup driver on cgroup v2 systems. Future revisions could mention the containerd 2.x configuration path if the guide expands beyond a minimal install.
