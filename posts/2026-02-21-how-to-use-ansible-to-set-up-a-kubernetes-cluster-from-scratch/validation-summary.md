# Validation Summary: How to Use Ansible to Set Up a Kubernetes Cluster from Scratch

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
- metrics-server
- Ubuntu apt repositories

## Sources Consulted
- Kubernetes kubeadm installation documentation: https://kubernetes.io/docs/setup/production-environment/tools/kubeadm/install-kubeadm/
- Kubernetes kubeadm init reference: https://kubernetes.io/docs/reference/setup-tools/kubeadm/kubeadm-init/
- Kubernetes container runtime documentation: https://kubernetes.io/docs/setup/production-environment/container-runtimes/
- Kubernetes release support information: https://kubernetes.io/releases/
- Calico Kubernetes requirements: https://docs.tigera.io/calico/latest/getting-started/kubernetes/requirements
- Calico installation customization documentation: https://docs.tigera.io/calico/latest/getting-started/kubernetes/self-managed-onprem/config-options
- Ansible command module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/command_module.html
- Docker Engine Ubuntu installation documentation for the containerd.io apt repository: https://docs.docker.com/engine/install/ubuntu/

## Issues Found
- Kubernetes `1.29` was end-of-life as of 2025-02-28 and no longer receives upstream security fixes. Updated the example to use the currently supported `1.36` stable apt repository channel.
- The Calico manifest version was pinned to `v3.27.0`, which is not tested against current supported Kubernetes releases. Updated the example to `v3.32.0`, which Calico documents as tested against Kubernetes `1.34`, `1.35`, and `1.36`.
- The description called the example "production-ready" even though it shows a single control plane node and does not include high availability or operational hardening. Changed it to "repeatable" to avoid an overclaim.
- The apt keyring paths used `/usr/share/keyrings`; current Kubernetes and Docker installation documentation uses `/etc/apt/keyrings`. Updated the Docker and Kubernetes repository examples and added tasks to create the keyring directory.
- The containerd role notified a `restart containerd` handler but did not define the handler. Added the missing handler snippet so the role is complete.
- The control plane endpoint variable was defined but not used in `kubeadm init`. Added `--control-plane-endpoint={{ control_plane_endpoint }}` so worker join commands use the configured endpoint.
- The worker readiness check used `inventory_hostname`, which may not match the kubelet node name. Changed it to `ansible_hostname`, matching kubeadm's default node-name behavior more closely.
- The verification task claimed to assert all nodes were Ready but only checked the node count. Added a readiness status query and assertions for both expected node count and all `Ready=True` statuses.
- The namespace creation task used `ansible.builtin.command` with a shell pipeline. Ansible's command module does not process pipes, so changed it to `ansible.builtin.shell`.

## Review Notes
- The tutorial remains a concise single-control-plane kubeadm walkthrough. A future production-focused version should cover HA control planes, a load balancer or stable virtual IP, certificate renewal, etcd backup and restore, OS/firewall requirements, container runtime version pinning, and CNI-specific network prerequisites.
