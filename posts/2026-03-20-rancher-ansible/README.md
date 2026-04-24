# How to Use Ansible to Automate Rancher Operations - A Practical Guide

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rancher, Kubernetes, Ansible, Automation, Infrastructure as Code

Description: Automate Rancher installation, configuration, and cluster management using Ansible playbooks for repeatable, idempotent infrastructure operations.

## Introduction

Ansible complements Terraform for Rancher automation-while Terraform manages cloud resources and Rancher objects, Ansible excels at configuring the underlying Linux nodes, installing Rancher, and performing operational tasks like backups and upgrades. This guide covers using Ansible for Rancher node preparation, installation, and cluster management.

## Prerequisites

- Ansible 2.14+ installed on control node
- `ansible.posix`, `community.general`, and `kubernetes.core` collections installed on the control node
- SSH access to target nodes
- RHEL-compatible Linux nodes for the example playbooks below
- Python 3.9+ available on target nodes
- Rancher API key/token access for cluster management tasks

## Step 1: Node Preparation Playbook

```yaml
# prepare-nodes.yml - Prepare RHEL-compatible Linux nodes for RKE2/Rancher

---
- name: Prepare Rancher nodes
  hosts: rancher_nodes
  become: true
  vars:
    disable_swap: true
    configure_firewall: true
    required_packages:
      - curl
      - wget
      - jq
      - firewalld
      - python3-firewall
      - python3-pip
      - nfs-utils
      - iptables

  tasks:
    - name: Update package cache
      ansible.builtin.yum:
        update_cache: true
      when: ansible_os_family == 'RedHat'

    - name: Install required packages
      ansible.builtin.package:
        name: "{{ required_packages }}"
        state: present

    - name: Disable swap
      ansible.builtin.command: swapoff -a
      when:
        - disable_swap
        - ansible_swaptotal_mb | int > 0

    - name: Remove swap from fstab
      ansible.builtin.lineinfile:
        path: /etc/fstab
        regexp: '^\s*[^#].*\sswap\s'
        state: absent
      when: disable_swap

    - name: Configure kernel modules
      ansible.builtin.copy:
        dest: /etc/modules-load.d/containerd.conf
        content: |
          overlay
          br_netfilter
        mode: '0644'

    - name: Load kernel modules
      community.general.modprobe:
        name: "{{ item }}"
        state: present
      loop:
        - overlay
        - br_netfilter

    - name: Configure sysctl for Kubernetes
      ansible.posix.sysctl:
        name: "{{ item.name }}"
        value: "{{ item.value }}"
        sysctl_file: /etc/sysctl.d/99-kubernetes.conf
        reload: true
      loop:
        - { name: net.bridge.bridge-nf-call-iptables, value: "1" }
        - { name: net.bridge.bridge-nf-call-ip6tables, value: "1" }
        - { name: net.ipv4.ip_forward, value: "1" }
        - { name: vm.swappiness, value: "10" }

    - name: Enable and start firewalld
      ansible.builtin.systemd:
        name: firewalld
        enabled: true
        state: started
      when: configure_firewall

    - name: Configure firewalld for RKE2 server nodes with Cilium
      ansible.posix.firewalld:
        port: "{{ item }}"
        permanent: true
        state: enabled
        immediate: true
      loop:
        - 6443/tcp    # Kubernetes API
        - 9345/tcp    # RKE2 supervisor API
        - 10250/tcp   # Kubelet
        - 2379-2381/tcp  # etcd client, peer, and metrics
        - 30000-32767/tcp  # NodePort range
        - 4240/tcp    # Cilium health checks
        - 8472/udp    # Cilium VXLAN
        - 51871/udp   # Cilium WireGuard
      when: configure_firewall
```

## Step 2: Install RKE2 Playbook

```yaml
# install-rke2.yml - Install and configure RKE2
---
- name: Install RKE2 server nodes
  hosts: rke2_servers
  become: true
  vars:
    rke2_channel: "stable"
    rke2_token: "{{ lookup('env', 'RKE2_TOKEN') }}"
    first_server: "{{ groups['rke2_servers'][0] }}"

  tasks:
    - name: Download RKE2 install script
      ansible.builtin.get_url:
        url: https://get.rke2.io
        dest: /tmp/install-rke2.sh
        mode: '0755'

    - name: Install RKE2
      ansible.builtin.command:
        cmd: /tmp/install-rke2.sh
        creates: /usr/local/bin/rke2
      environment:
        INSTALL_RKE2_CHANNEL: "{{ rke2_channel }}"

    - name: Create RKE2 config directory
      ansible.builtin.file:
        path: /etc/rancher/rke2
        state: directory
        mode: '0755'

    - name: Create Kubernetes audit log directory
      ansible.builtin.file:
        path: /var/log/kubernetes
        state: directory
        mode: '0750'

    - name: Configure first server node
      ansible.builtin.copy:
        dest: /etc/rancher/rke2/config.yaml
        content: |
          token: {{ rke2_token }}
          tls-san:
            - {{ ansible_default_ipv4.address }}
            - {{ ansible_hostname }}
          cni: cilium
          cluster-cidr: 10.42.0.0/16
          service-cidr: 10.43.0.0/16
          # Enable audit logging
          kube-apiserver-arg:
            - "audit-log-path=/var/log/kubernetes/audit.log"
            - "audit-log-maxage=30"
        mode: '0640'
      when: inventory_hostname == first_server

    - name: Configure additional server nodes
      ansible.builtin.copy:
        dest: /etc/rancher/rke2/config.yaml
        content: |
          server: https://{{ hostvars[first_server]['ansible_default_ipv4']['address'] }}:9345
          token: {{ rke2_token }}
          tls-san:
            - {{ ansible_default_ipv4.address }}
        mode: '0640'
      when: inventory_hostname != first_server

    - name: Enable and start RKE2 server
      ansible.builtin.systemd:
        name: rke2-server
        enabled: true
        state: started
```

## Step 3: Install Rancher Playbook

```yaml
# install-rancher.yml - Install Rancher with Helm
---
- name: Install Rancher
  hosts: rke2_servers[0]
  become: true
  vars:
    rancher_version: "2.14.0"
    rancher_hostname: "rancher.example.com"
    rancher_bootstrap_password: "{{ lookup('env', 'RANCHER_BOOTSTRAP_PASSWORD') }}"

  tasks:
    - name: Install kubectl
      ansible.builtin.copy:
        src: /var/lib/rancher/rke2/bin/kubectl
        dest: /usr/local/bin/kubectl
        remote_src: true
        mode: '0755'

    - name: Install Helm
      ansible.builtin.shell:
        cmd: curl -fsSL https://raw.githubusercontent.com/helm/helm/main/scripts/get-helm-3 | bash
        creates: /usr/local/bin/helm

    - name: Install Python dependencies for kubernetes.core modules
      ansible.builtin.pip:
        executable: pip3
        name:
          - kubernetes>=24.2.0
          - PyYAML>=3.11
          - jsonpatch

    - name: Add cert-manager Helm repo
      kubernetes.core.helm_repository:
        name: jetstack
        repo_url: https://charts.jetstack.io
        kubeconfig: /etc/rancher/rke2/rke2.yaml

    - name: Install cert-manager
      kubernetes.core.helm:
        name: cert-manager
        chart_ref: jetstack/cert-manager
        release_namespace: cert-manager
        create_namespace: true
        kubeconfig: /etc/rancher/rke2/rke2.yaml
        update_repo_cache: true
        values:
          crds:
            enabled: true
        wait: true
        timeout: 10m0s

    - name: Add Rancher Helm repo
      kubernetes.core.helm_repository:
        name: rancher-latest
        repo_url: https://releases.rancher.com/server-charts/latest
        kubeconfig: /etc/rancher/rke2/rke2.yaml

    - name: Install Rancher
      kubernetes.core.helm:
        name: rancher
        chart_ref: rancher-latest/rancher
        chart_version: "{{ rancher_version }}"
        release_namespace: cattle-system
        create_namespace: true
        kubeconfig: /etc/rancher/rke2/rke2.yaml
        update_repo_cache: true
        values:
          hostname: "{{ rancher_hostname }}"
          bootstrapPassword: "{{ rancher_bootstrap_password }}"
          replicas: 3
        wait: true
        timeout: 10m0s
```

## Step 4: Cluster Management Playbook

```yaml
# manage-clusters.yml - Day 2 operations via Rancher API
---
- name: Manage Rancher clusters
  hosts: localhost
  vars:
    rancher_url: "{{ lookup('env', 'RANCHER_URL') }}"
    rancher_token: "{{ lookup('env', 'RANCHER_TOKEN') }}"
    target_cluster_id: "c-m-abcde"

  tasks:
    - name: Get cluster list
      ansible.builtin.uri:
        url: "{{ rancher_url }}/apis/management.cattle.io/v3/clusters"
        method: GET
        headers:
          Authorization: "Bearer {{ rancher_token }}"
        validate_certs: true
      register: clusters_response

    - name: Display cluster names
      ansible.builtin.debug:
        msg: "Cluster ID: {{ item.metadata.name }} - Name: {{ item.spec.displayName | default(item.metadata.name) }}"
      loop: "{{ clusters_response.json.items }}"
      loop_control:
        label: "{{ item.metadata.name }}"

    - name: Create a new project
      ansible.builtin.uri:
        url: "{{ rancher_url }}/apis/management.cattle.io/v3/namespaces/{{ target_cluster_id }}/projects"
        method: POST
        headers:
          Authorization: "Bearer {{ rancher_token }}"
          Content-Type: "application/json"
        body_format: json
        body:
          apiVersion: management.cattle.io/v3
          kind: Project
          metadata:
            generateName: p-
            namespace: "{{ target_cluster_id }}"
          spec:
            clusterName: "{{ target_cluster_id }}"
            displayName: "new-project"
        status_code: 201
      register: project_response
```

## Step 5: Backup Playbook

```yaml
# backup-rancher.yml - Backup Rancher state
---
- name: Backup Rancher
  hosts: rke2_servers[0]
  become: true
  vars:
    backup_dir: "/opt/rancher-backups"
    s3_bucket: "my-rancher-backups"
    date_stamp: "{{ ansible_date_time.date }}"

  tasks:
    - name: Create backup directory
      ansible.builtin.file:
        path: "{{ backup_dir }}"
        state: directory

    - name: Add Rancher charts Helm repo
      kubernetes.core.helm_repository:
        name: rancher-charts
        repo_url: https://charts.rancher.io
        kubeconfig: /etc/rancher/rke2/rke2.yaml

    - name: Install Rancher Backup Operator
      kubernetes.core.helm:
        name: rancher-backup
        chart_ref: rancher-charts/rancher-backup
        release_namespace: cattle-resources-system
        create_namespace: true
        kubeconfig: /etc/rancher/rke2/rke2.yaml
        update_repo_cache: true

    - name: Create Rancher backup
      kubernetes.core.k8s:
        kubeconfig: /etc/rancher/rke2/rke2.yaml
        state: present
        definition:
          apiVersion: resources.cattle.io/v1
          kind: Backup
          metadata:
            name: "backup-{{ date_stamp }}"
          spec:
            resourceSetName: rancher-resource-set-full
            storageLocation:
              s3:
                bucketName: "{{ s3_bucket }}"
                folder: rancher
                region: us-east-1
                credentialSecretName: s3-credentials
                credentialSecretNamespace: cattle-resources-system
```

## Conclusion

Ansible provides excellent complementary automation for Rancher environments. Use it for OS-level configuration, Rancher installation, and operational tasks like backups and upgrades. Combine Ansible with Terraform for a complete automation stack: Terraform for cloud resources and Rancher API objects, Ansible for OS configuration and application deployment. Use Ansible Galaxy roles to avoid reinventing common tasks and maintain playbooks in version control with proper secret management through Ansible Vault.
