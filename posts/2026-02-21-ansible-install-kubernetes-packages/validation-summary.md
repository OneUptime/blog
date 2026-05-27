# Validation Summary: How to Use Ansible to Install Kubernetes Packages

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ansible
- Kubernetes
- kubeadm
- kubelet
- kubectl
- Ubuntu APT repositories
- RHEL/CentOS YUM/DNF repositories
- containerd
- Linux kernel modules and sysctl
- SELinux

## Sources Consulted
- Kubernetes documentation: Installing kubeadm - https://kubernetes.io/docs/setup/production-environment/tools/kubeadm/install-kubeadm/
- Kubernetes documentation: Container runtimes - https://kubernetes.io/docs/setup/production-environment/container-runtimes/
- Kubernetes documentation: kubeadm init reference - https://kubernetes.io/docs/reference/setup-tools/kubeadm/kubeadm-init/
- Kubernetes documentation: Upgrading kubeadm clusters - https://kubernetes.io/docs/tasks/administer-cluster/kubeadm/kubeadm-upgrade/
- Kubernetes documentation: kubeadm upgrade reference - https://kubernetes.io/docs/reference/setup-tools/kubeadm/kubeadm-upgrade/
- Kubernetes documentation: Changing the Kubernetes package repository - https://kubernetes.io/docs/tasks/administer-cluster/kubeadm/change-package-repository/
- Kubernetes v1.36 APT package metadata - https://pkgs.k8s.io/core:/stable:/v1.36/deb/Packages.gz
- Kubernetes v1.36 RPM repository metadata - https://pkgs.k8s.io/core:/stable:/v1.36/rpm/repodata/repomd.xml
- Ansible documentation: ansible.builtin.dpkg_selections - https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/dpkg_selections_module.html
- Ansible documentation: ansible.builtin.dnf - https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/dnf_module.html
- Ansible documentation: ansible.builtin.yum_repository - https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/yum_repository_module.html
- Ansible documentation: ansible.builtin.systemd_service - https://docs.ansible.com/ansible/latest/collections/ansible/builtin/systemd_service_module.html
- Ansible documentation: delegation and run_once - https://docs.ansible.com/ansible/latest/playbook_guide/playbooks_delegation.html
- Ansible documentation: playbook strategies and run_once behavior - https://docs.ansible.com/ansible/latest/playbook_guide/playbooks_strategies.html
- Ansible documentation: ansible.posix.selinux - https://docs.ansible.com/ansible/latest/collections/ansible/posix/selinux_module.html

## Issues Found
- The post said Kubernetes moved to pkgs.k8s.io starting with version 1.28. Kubernetes documentation states the new repositories provide packages starting with v1.24.0, and that the legacy repositories were frozen on September 13, 2023. Updated the wording.
- The examples used Kubernetes 1.29.2, which is no longer a current supported minor release. Updated the examples to use the current v1.36 repository and verified package versions against pkgs.k8s.io metadata.
- The worker join playbook relied on a `set_fact` value from a different playbook run, which would not be available unless fact caching or a combined playbook run was used. Updated the worker playbook to generate the join command on the control plane with `delegate_to` and `run_once`.
- The upgrade workflow described upgrading the control plane but did not run `kubeadm upgrade apply`. Added an explicit control plane upgrade task and split kubeadm package upgrade from kubelet/kubectl package upgrades.

## Review Notes
- The containerd `SystemdCgroup = true` setting is correct for kubeadm-managed clusters on systemd hosts. Kubernetes now documents different config paths for containerd 1.x and 2.x, so future improvements could make the snippet version-aware.
- Production upgrades should also include draining and uncordoning nodes around kubelet upgrades, as described in the Kubernetes upgrade guide. The post's shorter upgrade snippet is directionally correct after the fix, but it is not a full production upgrade runbook.
