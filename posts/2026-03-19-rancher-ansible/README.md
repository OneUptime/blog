# How to Install Rancher Using Ansible

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rancher, Kubernetes, Ansible, IaC, Installation

Description: Automate Rancher installation across multiple servers using Ansible playbooks.

Ansible is a powerful automation tool that uses simple YAML playbooks to configure systems and deploy software. Using Ansible to install Rancher gives you a repeatable deployment process for a K3s server. This guide walks you through creating Ansible playbooks to automate the entire Rancher installation.

## Prerequisites

- Ansible 2.14 or later installed on your control machine
- A target server running Ubuntu 22.04
- SSH access to the target server with a user that has sudo privileges
- Python 3 installed on the target server
- A domain name (optional but recommended)

## Step 1: Set Up the Project Structure

Create a directory structure for your Ansible project:

```bash
mkdir -p rancher-ansible/{roles/rancher/{tasks,templates,defaults,handlers},inventory}
cd rancher-ansible
```

## Step 2: Create the Inventory File

Define your target server in the inventory:

```ini
# inventory/hosts.ini

[rancher_servers]
rancher-server ansible_host=192.168.1.100 ansible_user=ubuntu ansible_ssh_private_key_file=~/.ssh/id_rsa

[rancher_servers:vars]
rancher_hostname=rancher.example.com
rancher_bootstrap_password=change-this-password
```

Replace the IP address, username, key path, hostname, and bootstrap password with your actual values.

## Step 3: Define Default Variables

```yaml
# roles/rancher/defaults/main.yml
---
rancher_hostname: "rancher.example.com"
rancher_bootstrap_password: "change-this-password"
rancher_version: "2.14.0"
rancher_replicas: 1
k3s_version: "v1.35.2+k3s1"
cert_manager_version: "v1.13.1"
helm_version: "3.18.0"
kubeconfig_path: "/etc/rancher/k3s/k3s.yaml"
```

## Step 4: Create the K3s Installation Task

```yaml
# roles/rancher/tasks/install_k3s.yml
---
- name: Check if K3s is already installed
  ansible.builtin.stat:
    path: /usr/local/bin/k3s
  register: k3s_binary

- name: Install K3s
  ansible.builtin.shell: |
    curl -sfL https://get.k3s.io | INSTALL_K3S_VERSION={{ k3s_version }} sh -s - server --cluster-init --write-kubeconfig-mode 644
  when: not k3s_binary.stat.exists
  register: k3s_install

- name: Wait for K3s to be ready
  ansible.builtin.shell: |
    k3s kubectl get nodes
  register: k3s_nodes
  retries: 10
  delay: 10
  until: k3s_nodes.rc == 0

- name: Ensure KUBECONFIG is set
  ansible.builtin.lineinfile:
    path: /root/.bashrc
    line: "export KUBECONFIG={{ kubeconfig_path }}"
    state: present
```

## Step 5: Create the Helm Installation Task

```yaml
# roles/rancher/tasks/install_helm.yml
---
- name: Check if Helm is installed
  ansible.builtin.command: helm version --short
  register: helm_check
  failed_when: false
  changed_when: false

- name: Install Helm
  ansible.builtin.shell: |
    curl -fsSL -o get_helm.sh https://raw.githubusercontent.com/helm/helm/main/scripts/get-helm-3
    chmod 700 get_helm.sh
    ./get_helm.sh
  environment:
    KUBECONFIG: "{{ kubeconfig_path }}"
  when: helm_check.rc != 0
```

## Step 6: Create the cert-manager Installation Task

```yaml
# roles/rancher/tasks/install_cert_manager.yml
---
- name: Add jetstack Helm repository
  ansible.builtin.shell: |
    helm repo add jetstack https://charts.jetstack.io --force-update
    helm repo update
  environment:
    KUBECONFIG: "{{ kubeconfig_path }}"

- name: Check if cert-manager is installed
  ansible.builtin.shell: |
    helm status cert-manager -n cert-manager
  environment:
    KUBECONFIG: "{{ kubeconfig_path }}"
  register: cert_manager_check
  failed_when: false
  changed_when: false

- name: Install cert-manager
  ansible.builtin.shell: |
    helm install cert-manager jetstack/cert-manager \
      --namespace cert-manager \
      --create-namespace \
      --version {{ cert_manager_version }} \
      --set crds.enabled=true
  environment:
    KUBECONFIG: "{{ kubeconfig_path }}"
  when: cert_manager_check.rc != 0

- name: Wait for cert-manager to be ready
  ansible.builtin.shell: |
    kubectl -n cert-manager rollout status deploy/cert-manager --timeout=120s
    kubectl -n cert-manager rollout status deploy/cert-manager-webhook --timeout=120s
    kubectl -n cert-manager rollout status deploy/cert-manager-cainjector --timeout=120s
  environment:
    KUBECONFIG: "{{ kubeconfig_path }}"
```

## Step 7: Create the Rancher Installation Task

```yaml
# roles/rancher/tasks/install_rancher.yml
---
- name: Add Rancher Helm repository
  ansible.builtin.shell: |
    helm repo add rancher-stable https://releases.rancher.com/server-charts/stable --force-update
    helm repo update
  environment:
    KUBECONFIG: "{{ kubeconfig_path }}"

- name: Create cattle-system namespace
  ansible.builtin.shell: |
    kubectl create namespace cattle-system --dry-run=client -o yaml | kubectl apply -f -
  environment:
    KUBECONFIG: "{{ kubeconfig_path }}"

- name: Check if Rancher is installed
  ansible.builtin.shell: |
    helm status rancher -n cattle-system
  environment:
    KUBECONFIG: "{{ kubeconfig_path }}"
  register: rancher_check
  failed_when: false
  changed_when: false

- name: Install Rancher
  ansible.builtin.shell: |
    helm install rancher rancher-stable/rancher \
      --namespace cattle-system \
      --version {{ rancher_version }} \
      --set hostname={{ rancher_hostname }} \
      --set bootstrapPassword={{ rancher_bootstrap_password }} \
      --set replicas={{ rancher_replicas }}
  environment:
    KUBECONFIG: "{{ kubeconfig_path }}"
  when: rancher_check.rc != 0

- name: Wait for Rancher deployment to be ready
  ansible.builtin.shell: |
    kubectl -n cattle-system rollout status deploy/rancher --timeout=300s
  environment:
    KUBECONFIG: "{{ kubeconfig_path }}"
```

## Step 8: Create the Main Task File

```yaml
# roles/rancher/tasks/main.yml
---
- name: Update apt cache
  ansible.builtin.apt:
    update_cache: yes
    cache_valid_time: 3600

- name: Install required packages
  ansible.builtin.apt:
    name:
      - curl
      - apt-transport-https
      - ca-certificates
    state: present

- name: Install K3s
  ansible.builtin.include_tasks: install_k3s.yml

- name: Install Helm
  ansible.builtin.include_tasks: install_helm.yml

- name: Install cert-manager
  ansible.builtin.include_tasks: install_cert_manager.yml

- name: Install Rancher
  ansible.builtin.include_tasks: install_rancher.yml
```

## Step 9: Create the Playbook

```yaml
# site.yml
---
- name: Install Rancher on the target server
  hosts: rancher_servers
  become: yes
  roles:
    - rancher
```

## Step 10: Run the Playbook

Execute the playbook:

```bash
ansible-playbook -i inventory/hosts.ini site.yml
```

To run with verbose output:

```bash
ansible-playbook -i inventory/hosts.ini site.yml -v
```

## Step 11: Verify the Installation

After the playbook completes, SSH into the server and check the deployment:

```bash
ssh ubuntu@192.168.1.100
export KUBECONFIG=/etc/rancher/k3s/k3s.yaml
kubectl -n cattle-system get pods
```

Access `https://rancher.example.com` in your browser and log in.

## Running Against Multiple Servers

Do not add more hosts to this inventory to create a single Rancher installation. That would create separate single-node K3s clusters and separate Rancher instances. If you want Rancher to run across multiple machines, first build a multi-node K3s or RKE2 cluster, then run the Rancher Helm steps against that cluster.

## Summary

You have automated the Rancher installation using Ansible. This approach provides a repeatable deployment process that can be version-controlled, shared across teams, and extended to include additional configuration steps like setting up monitoring, backup, or custom Rancher settings.
