# How to Automate Calico eBPF Installation

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, Kubernetes, Networking, EBPF, Installation, Automation

Description: Automate the full Calico eBPF installation process including cluster bootstrapping, kube-proxy disablement, and operator configuration using Terraform and Ansible.

---

## Introduction

Automating a Calico eBPF installation ensures that every new cluster comes up with eBPF properly configured from day one, without manual steps. The automation must handle node preparation (kernel version, BPF filesystem), Kubernetes bootstrapping (skipping kube-proxy), and Calico operator configuration (eBPF Installation resource) as an integrated pipeline.

## Prerequisites

- Terraform for infrastructure
- Ansible for node configuration
- kubectl and Helm for Kubernetes resources

## Terraform for eBPF-Ready Nodes

```hcl
# main.tf
module "kubernetes_cluster" {
  source = "./modules/k8s-cluster"

  # Use Ubuntu 22.04 LTS with kernel 5.15 (eBPF compatible)
  node_ami_id = data.aws_ami.ubuntu_22_04.id

  # User data script to prepare nodes for eBPF
  node_user_data = templatefile("${path.module}/node-init.sh.tpl", {
    skip_kube_proxy = true
    calico_version  = var.calico_version
  })
}

# node-init.sh.tpl
# #!/bin/bash
# # Mount BPF filesystem persistently
# echo 'bpffs /sys/fs/bpf bpf defaults 0 0' >> /etc/fstab
# mount -t bpf bpffs /sys/fs/bpf
#
# # Install bpftool for debugging
# apt-get install -y linux-tools-$(uname -r)
```

## Cluster Bootstrap with No kube-proxy

```yaml
# kubeadm-config.yaml
apiVersion: kubeadm.k8s.io/v1beta3
kind: ClusterConfiguration
networking:
  podSubnet: "192.168.0.0/16"
---
apiVersion: kubeadm.k8s.io/v1beta3
kind: InitConfiguration
skipPhases:
  - addon/kube-proxy
```

```bash
# kubeadm init with eBPF config
kubeadm init --config kubeadm-config.yaml
```

## Ansible Role for Calico eBPF Install

```yaml
# roles/calico-ebpf/tasks/main.yaml
---
- name: Get control plane IP
  command: kubectl get endpoints kubernetes -n default \
    -o jsonpath='{.subsets[0].addresses[0].ip}'
  register: api_server_ip
  changed_when: false

- name: Install Tigera Operator
  command: kubectl create -f \
    https://raw.githubusercontent.com/projectcalico/calico/{{ calico_version }}/manifests/tigera-operator.yaml
  failed_when: false

- name: Wait for Tigera Operator
  command: kubectl rollout status deploy/tigera-operator -n tigera-operator --timeout=120s

- name: Create eBPF ConfigMap
  kubernetes.core.k8s:
    state: present
    definition:
      apiVersion: v1
      kind: ConfigMap
      metadata:
        name: kubernetes-services-endpoint
        namespace: tigera-operator
      data:
        KUBERNETES_SERVICE_HOST: "{{ api_server_ip.stdout }}"
        KUBERNETES_SERVICE_PORT: "6443"

- name: Apply eBPF Installation
  kubernetes.core.k8s:
    state: present
    definition:
      apiVersion: operator.tigera.io/v1
      kind: Installation
      metadata:
        name: default
      spec:
        calicoNetwork:
          linuxDataplane: BPF
          hostPorts: Disabled
          ipPools:
            - cidr: "{{ pod_cidr }}"
              encapsulation: VXLAN
              natOutgoing: Enabled
              nodeSelector: "all()"

- name: Wait for Calico to be ready
  command: kubectl wait --for=condition=Available tigerastatus/calico --timeout=300s
  retries: 3
  delay: 30

- name: Validate eBPF is active
  command: >
    kubectl exec -n calico-system ds/calico-node -c calico-node --
    bpftool prog list
  register: bpf_programs
  failed_when: bpf_programs.stdout_lines | length < 5
```

## GitHub Actions Workflow

```yaml
# .github/workflows/deploy-cluster-ebpf.yaml
name: Deploy Kubernetes Cluster with Calico eBPF

on:
  workflow_dispatch:
    inputs:
      environment:
        type: choice
        options: [dev, staging, production]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Terraform Apply
        run: |
          terraform init && terraform apply -auto-approve
        env:
          AWS_ACCESS_KEY_ID: ${{ secrets.AWS_ACCESS_KEY_ID }}

      - name: Run Ansible
        run: |
          ansible-playbook -i inventory.ini playbooks/calico-ebpf.yaml \
            -e calico_version=v3.27.0 \
            -e environment=${{ github.event.inputs.environment }}

      - name: Validate eBPF Installation
        run: ./scripts/validate-ebpf-installation.sh
```

## Conclusion

Automating Calico eBPF installation through Terraform, Ansible, and CI/CD ensures every cluster in your fleet starts with eBPF correctly configured. The automation handles the three critical prerequisites - compatible kernel, no kube-proxy, real API server IP in the ConfigMap - as integrated steps rather than manual checklists. By adding automated validation as the final step, you get immediate confirmation that eBPF is actually active, not just configured.
