# Validation Summary: How to Automate Kubernetes Cluster Setup with Ansible

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ansible
- Kubernetes
- kubeadm
- kubelet
- kubectl
- containerd
- Calico CNI
- Debian/Ubuntu APT repositories

## Sources Consulted
- Kubernetes: Installing kubeadm, kubelet and kubectl: https://kubernetes.io/docs/setup/production-environment/tools/kubeadm/install-kubeadm/
- Kubernetes: Container runtimes: https://kubernetes.io/docs/setup/production-environment/container-runtimes/
- Kubernetes: kubeadm init reference: https://kubernetes.io/docs/reference/setup-tools/kubeadm/generated/kubeadm_init/
- Kubernetes: kubeadm init workflow: https://kubernetes.io/docs/reference/setup-tools/kubeadm/kubeadm-init/
- Ansible: ansible.builtin.apt_key module: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/apt_key_module.html
- Ansible: ansible.builtin.deb822_repository module: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/deb822_repository_module.html
- Ansible: ansible.builtin.systemd_service module: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/systemd_service_module.html
- Ansible: ansible.builtin.dpkg_selections module: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/dpkg_selections_module.html
- Calico: Quickstart guide: https://docs.tigera.io/calico/latest/getting-started/kubernetes/quickstart
- Calico: Stand up Kubernetes: https://docs.tigera.io/calico/latest/getting-started/kubernetes/hardway/standing-up-kubernetes

## Issues Found
- The Kubernetes APT repository example used `ansible.builtin.apt_key`, which relies on the deprecated `apt-key` utility. Replaced it with `ansible.builtin.deb822_repository` and added `python3-debian`, which the module requires.
- The Kubernetes version and Calico manifest were stale. Updated the Kubernetes package repository version to `1.36` and the Calico manifest URL to `v3.32.0`, matching current upstream documentation reviewed on 2026-05-27.
- The Calico pod CIDR was set to `10.244.0.0/16`, but the unmodified Calico manifest guidance uses `192.168.0.0/16`. Updated `pod_network_cidr` to `192.168.0.0/16`.
- The containerd role notified `restart containerd`, but the role did not include a handler for it. Added `roles/container-runtime/handlers/main.yml` to the project structure and included the handler snippet.
- The post showed three control plane hosts but only initialized `control_plane[0]` and never joined the other control plane nodes. Reduced the sample inventory to a single control plane node and removed the unused `--upload-certs` flag.
- The verification command specified `--become-user=ubuntu` without enabling privilege escalation. Added `--become`.
- Updated `ansible.builtin.systemd` examples to `ansible.builtin.systemd_service`, the current module name. `ansible.builtin.systemd` remains a compatibility alias.

## Review Notes
The local environment did not have `ansible`, `kubeadm`, or `kubectl` installed, so examples were validated against official documentation rather than executed locally. The guide remains a basic single-control-plane kubeadm setup; a production high-availability control plane would need additional control-plane join steps and load balancer configuration.
