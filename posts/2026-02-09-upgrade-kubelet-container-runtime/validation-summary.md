# Validation Summary: How to Upgrade kubelet and Container Runtime on Worker Nodes

## Status
validated

## Post Type
Tutorial / operational guide

## Technologies Covered
- Kubernetes
- kubelet
- kubeadm
- kubectl
- containerd
- CRI-O
- Container Runtime Interface (CRI)
- Linux systemd package management

## Sources Consulted
- Kubernetes: Upgrading Linux nodes with kubeadm: https://kubernetes.io/docs/tasks/administer-cluster/kubeadm/upgrading-linux-nodes/
- Kubernetes: kubectl drain reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_drain/
- Kubernetes: Container Runtime Interface documentation: https://kubernetes.io/docs/concepts/containers/cri/
- Kubernetes: Container runtimes documentation: https://kubernetes.io/docs/setup/production-environment/container-runtimes/
- Kubernetes: Version skew policy: https://kubernetes.io/releases/version-skew-policy/
- CRI-O packaging repository installation guidance: https://github.com/cri-o/packaging
- Kubernetes blog: CRI-O community package infrastructure: https://kubernetes.io/blog/2023/10/10/cri-o-community-package-infrastructure/

## Issues Found
- The runtime overview described Docker Engine with dockershim as a deprecated runtime option. Kubernetes removed the built-in dockershim integration in v1.24, so the text now distinguishes Docker Engine through cri-dockerd from CRI-compatible runtimes such as containerd and CRI-O.
- The kubelet upgrade examples skipped `kubeadm upgrade node`, which kubeadm documentation requires on worker nodes to update the local kubelet configuration. Added `kubeadm` package upgrade and `sudo kubeadm upgrade node` before restarting kubelet.
- The apt package examples used the legacy `1.29.0-00` package suffix. Updated them to version glob syntax such as `kubelet=1.29.0-*`, matching current Kubernetes package repository conventions.
- The RHEL/CentOS example omitted Kubernetes package exclude handling. Added `--disableexcludes=kubernetes` to the commented yum command.
- The containerd tar extraction command used a nonstandard old-style tar option form. Updated it to `sudo tar -C /usr/local -xzf ...`.
- The CRI-O upgrade example used obsolete `devel:kubic` repositories and deprecated `apt-key`. Updated it to the current CRI-O OBS repository format with `/etc/apt/keyrings` and `signed-by`.
- The CRI-O package example installed `cri-o-runc`, which is not part of the current official CRI-O packaging command. Updated it to install `cri-o`.
- The bulk upgrade script had a malformed `echo` line that made the bash invalid. Split it into valid `echo` commands.
- The bulk upgrade script used a quoted SSH heredoc, preventing target version variables from expanding in the remote commands. Changed it to an expanding heredoc so the configured versions are used.

## Review Notes
- The scripts are examples for kubeadm-managed Linux workers. Managed Kubernetes services or nodes installed through different package sources may require provider-specific upgrade procedures.
- `kubectl top nodes` depends on metrics-server or another metrics API provider being installed.
- The containerd tarball commands are appropriate for nodes managed from upstream containerd tarballs; package-managed containerd installations should generally be upgraded through the host package manager.
