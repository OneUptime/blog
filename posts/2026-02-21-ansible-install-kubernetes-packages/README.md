# How to Use Ansible to Install Kubernetes Packages

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, Kubernetes, DevOps, Linux, Container Orchestration

Description: Step-by-step guide to installing kubeadm, kubelet, and kubectl on Ubuntu and RHEL systems using Ansible, including prerequisite configuration and cluster bootstrapping.

---

Setting up Kubernetes nodes requires installing several packages (kubeadm, kubelet, kubectl), configuring system prerequisites, and making sure everything is version-matched across your cluster. Doing this manually on every node is not practical. Ansible lets you codify the entire process, so you can spin up new nodes consistently and confidently.

This post covers the full Kubernetes package installation process for both Ubuntu and RHEL-based systems, including the system-level prerequisites that are easy to forget.

## System Prerequisites

Before installing Kubernetes packages, several system-level configurations need to be in place. These are requirements for kubelet to function correctly.

```yaml
---
# playbook: k8s-prerequisites.yml
# Configure system prerequisites for Kubernetes
- hosts: k8s_nodes
  become: true

  tasks:
    - name: Disable swap (required for kubelet)
      ansible.builtin.command:
        cmd: swapoff -a
      changed_when: true

    - name: Remove swap entries from fstab
      ansible.builtin.lineinfile:
        path: /etc/fstab
        regexp: '^\S+\s+\S+\s+swap\s+'
        state: absent

    - name: Load required kernel modules
      ansible.builtin.modprobe:
        name: "{{ item }}"
        state: present
      loop:
        - overlay
        - br_netfilter

    - name: Ensure kernel modules load on boot
      ansible.builtin.copy:
        dest: /etc/modules-load.d/k8s.conf
        content: |
          overlay
          br_netfilter
        mode: '0644'

    - name: Set required sysctl parameters
      ansible.builtin.sysctl:
        name: "{{ item.key }}"
        value: "{{ item.value }}"
        sysctl_file: /etc/sysctl.d/k8s.conf
        reload: true
      loop:
        - { key: "net.bridge.bridge-nf-call-iptables", value: "1" }
        - { key: "net.bridge.bridge-nf-call-ip6tables", value: "1" }
        - { key: "net.ipv4.ip_forward", value: "1" }
```

## Installing Kubernetes Packages on Ubuntu

The Kubernetes project moved to a new package repository structure (pkgs.k8s.io) starting with version 1.28. Here is how to set it up.

```yaml
---
# playbook: install-k8s-ubuntu.yml
# Install Kubernetes packages on Ubuntu
- hosts: k8s_nodes
  become: true

  vars:
    k8s_version: "1.29"
    k8s_package_version: "1.29.2-1.1"

  tasks:
    - name: Install prerequisite packages
      ansible.builtin.apt:
        name:
          - apt-transport-https
          - ca-certificates
          - curl
          - gpg
        state: present
        update_cache: true

    - name: Create keyrings directory
      ansible.builtin.file:
        path: /etc/apt/keyrings
        state: directory
        mode: '0755'

    - name: Download Kubernetes GPG key
      ansible.builtin.get_url:
        url: "https://pkgs.k8s.io/core:/stable:/v{{ k8s_version }}/deb/Release.key"
        dest: /tmp/kubernetes-release.key
        mode: '0644'

    - name: Dearmor and install Kubernetes GPG key
      ansible.builtin.command:
        cmd: gpg --dearmor -o /etc/apt/keyrings/kubernetes-apt-keyring.gpg /tmp/kubernetes-release.key
        creates: /etc/apt/keyrings/kubernetes-apt-keyring.gpg

    - name: Add Kubernetes APT repository
      ansible.builtin.apt_repository:
        repo: "deb [signed-by=/etc/apt/keyrings/kubernetes-apt-keyring.gpg] https://pkgs.k8s.io/core:/stable:/v{{ k8s_version }}/deb/ /"
        filename: kubernetes
        state: present

    - name: Install Kubernetes packages
      ansible.builtin.apt:
        name:
          - "kubelet={{ k8s_package_version }}"
          - "kubeadm={{ k8s_package_version }}"
          - "kubectl={{ k8s_package_version }}"
        state: present
        update_cache: true

    - name: Hold Kubernetes packages to prevent auto-upgrade
      ansible.builtin.dpkg_selections:
        name: "{{ item }}"
        selection: hold
      loop:
        - kubelet
        - kubeadm
        - kubectl

    - name: Enable and start kubelet
      ansible.builtin.systemd:
        name: kubelet
        state: started
        enabled: true
```

## Installing Kubernetes Packages on RHEL/CentOS

The RHEL installation follows a similar pattern but uses YUM/DNF.

```yaml
---
# playbook: install-k8s-rhel.yml
# Install Kubernetes packages on RHEL/CentOS
- hosts: k8s_nodes
  become: true

  vars:
    k8s_version: "1.29"
    k8s_package_version: "1.29.2"

  tasks:
    - name: Set SELinux to permissive mode
      ansible.posix.selinux:
        policy: targeted
        state: permissive

    - name: Import Kubernetes GPG key
      ansible.builtin.rpm_key:
        key: "https://pkgs.k8s.io/core:/stable:/v{{ k8s_version }}/rpm/repodata/repomd.xml.key"
        state: present

    - name: Add Kubernetes YUM repository
      ansible.builtin.yum_repository:
        name: kubernetes
        description: Kubernetes Repository
        baseurl: "https://pkgs.k8s.io/core:/stable:/v{{ k8s_version }}/rpm/"
        gpgcheck: true
        gpgkey: "https://pkgs.k8s.io/core:/stable:/v{{ k8s_version }}/rpm/repodata/repomd.xml.key"
        enabled: true
        exclude: "kubelet kubeadm kubectl cri-tools kubernetes-cni"

    - name: Install Kubernetes packages
      ansible.builtin.dnf:
        name:
          - "kubelet-{{ k8s_package_version }}"
          - "kubeadm-{{ k8s_package_version }}"
          - "kubectl-{{ k8s_package_version }}"
        state: present
        disable_excludes: kubernetes

    - name: Enable and start kubelet
      ansible.builtin.systemd:
        name: kubelet
        state: started
        enabled: true
```

## Installing a Container Runtime

Kubernetes needs a container runtime. containerd is the most common choice. Here is how to install and configure it.

```yaml
# Install and configure containerd as the Kubernetes container runtime
- name: Install containerd
  ansible.builtin.package:
    name: containerd
    state: present

- name: Create containerd configuration directory
  ansible.builtin.file:
    path: /etc/containerd
    state: directory
    mode: '0755'

- name: Generate default containerd configuration
  ansible.builtin.command:
    cmd: containerd config default
  register: containerd_config
  changed_when: false

- name: Write containerd configuration
  ansible.builtin.copy:
    content: "{{ containerd_config.stdout }}"
    dest: /etc/containerd/config.toml
    mode: '0644'
  notify: restart containerd

- name: Enable SystemdCgroup in containerd config
  ansible.builtin.lineinfile:
    path: /etc/containerd/config.toml
    regexp: '^\s*SystemdCgroup\s*='
    line: '            SystemdCgroup = true'
  notify: restart containerd

- name: Start and enable containerd
  ansible.builtin.systemd:
    name: containerd
    state: started
    enabled: true
```

```yaml
# Handler for restarting containerd
- name: restart containerd
  ansible.builtin.systemd:
    name: containerd
    state: restarted
```

## Bootstrapping the Control Plane

After installing packages on all nodes, you can initialize the control plane.

```yaml
---
# playbook: init-control-plane.yml
# Initialize the Kubernetes control plane on the first master node
- hosts: k8s_masters[0]
  become: true

  vars:
    pod_network_cidr: "10.244.0.0/16"
    service_cidr: "10.96.0.0/12"
    k8s_version: "1.29.2"

  tasks:
    - name: Check if cluster is already initialized
      ansible.builtin.stat:
        path: /etc/kubernetes/admin.conf
      register: k8s_admin_conf

    - name: Initialize Kubernetes control plane
      ansible.builtin.command:
        cmd: >
          kubeadm init
          --pod-network-cidr={{ pod_network_cidr }}
          --service-cidr={{ service_cidr }}
          --kubernetes-version={{ k8s_version }}
      register: kubeadm_init
      when: not k8s_admin_conf.stat.exists

    - name: Create .kube directory for root
      ansible.builtin.file:
        path: /root/.kube
        state: directory
        mode: '0700'

    - name: Copy admin.conf to root user
      ansible.builtin.copy:
        src: /etc/kubernetes/admin.conf
        dest: /root/.kube/config
        remote_src: true
        mode: '0600'

    - name: Generate join command
      ansible.builtin.command:
        cmd: kubeadm token create --print-join-command
      register: join_command
      changed_when: false

    - name: Store join command as fact
      ansible.builtin.set_fact:
        k8s_join_command: "{{ join_command.stdout }}"
```

## Joining Worker Nodes

```yaml
---
# playbook: join-workers.yml
# Join worker nodes to the Kubernetes cluster
- hosts: k8s_workers
  become: true

  tasks:
    - name: Check if node is already joined
      ansible.builtin.stat:
        path: /etc/kubernetes/kubelet.conf
      register: kubelet_conf

    - name: Join the Kubernetes cluster
      ansible.builtin.command:
        cmd: "{{ hostvars[groups['k8s_masters'][0]].k8s_join_command }}"
      when: not kubelet_conf.stat.exists
```

## Version Upgrade Workflow

Upgrading Kubernetes requires careful sequencing. Here is the pattern for upgrading kubeadm first, then the control plane, then kubelet.

```yaml
# Upgrade Kubernetes packages on Ubuntu (one version at a time)
- name: Unhold Kubernetes packages for upgrade
  ansible.builtin.dpkg_selections:
    name: "{{ item }}"
    selection: install
  loop:
    - kubeadm
    - kubelet
    - kubectl

- name: Upgrade kubeadm
  ansible.builtin.apt:
    name: "kubeadm={{ target_k8s_version }}"
    state: present
    update_cache: true

- name: Verify kubeadm version
  ansible.builtin.command:
    cmd: kubeadm version -o short
  register: kubeadm_ver
  changed_when: false

- name: Upgrade kubelet and kubectl
  ansible.builtin.apt:
    name:
      - "kubelet={{ target_k8s_version }}"
      - "kubectl={{ target_k8s_version }}"
    state: present

- name: Hold Kubernetes packages again
  ansible.builtin.dpkg_selections:
    name: "{{ item }}"
    selection: hold
  loop:
    - kubeadm
    - kubelet
    - kubectl

- name: Restart kubelet after upgrade
  ansible.builtin.systemd:
    name: kubelet
    state: restarted
    daemon_reload: true
```

## Wrapping Up

Installing Kubernetes packages with Ansible takes what would be a tedious, error-prone manual process and turns it into something repeatable and version-controlled. The critical points are: always match package versions across all nodes, hold packages to prevent accidental upgrades, do not forget the system prerequisites (swap, kernel modules, sysctl), and include the container runtime setup. With these playbooks as a foundation, you can scale from a three-node lab cluster to a multi-hundred-node production environment without changing your approach.
