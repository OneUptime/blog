# How to Use Ansible Azure Collection to Manage Azure Kubernetes Service Clusters

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, Azure, AKS, Kubernetes, Automation, IaC, DevOps

Description: Use the Ansible Azure Collection to provision, configure, and manage Azure Kubernetes Service clusters with playbooks and roles.

---

Ansible might not be the first tool that comes to mind for managing Kubernetes clusters on Azure. Terraform usually gets that spotlight. But Ansible has a mature Azure collection that handles AKS provisioning quite well, and it shines when you need to combine infrastructure provisioning with configuration management in the same workflow. If your team already uses Ansible for other tasks, extending it to manage AKS clusters keeps your tooling consistent.

The `azure.azcollection` collection provides modules for creating AKS clusters, managing node pools, configuring RBAC, and integrating with Azure AD. This post covers the practical steps to get an AKS cluster running with Ansible.

## Installing the Azure Collection

First, install the Azure collection and its Python dependencies.

```bash
# Install the Ansible Azure collection
ansible-galaxy collection install azure.azcollection

# Install the required Python packages
pip install -r ~/.ansible/collections/ansible_collections/azure/azcollection/requirements.txt
```

The Python dependencies include the Azure SDK libraries that Ansible uses under the hood. Without them, the modules will fail at runtime.

## Authentication

Ansible supports several authentication methods for Azure. The most common for automation is a service principal. Set these environment variables or use an Ansible vault.

```bash
# Export service principal credentials
export AZURE_SUBSCRIPTION_ID="your-subscription-id"
export AZURE_CLIENT_ID="your-client-id"
export AZURE_SECRET="your-client-secret"
export AZURE_TENANT="your-tenant-id"
```

For a more Ansible-native approach, store credentials in a file.

```yaml
# ~/.azure/credentials
[default]
subscription_id=your-subscription-id
client_id=your-client-id
secret=your-client-secret
tenant=your-tenant-id
```

## Creating a Basic AKS Cluster

Here is a playbook that creates a resource group and an AKS cluster.

```yaml
# playbooks/create-aks.yml
---
- name: Create AKS Cluster
  hosts: localhost
  connection: local
  gather_facts: false

  vars:
    resource_group: rg-aks-demo
    location: eastus
    cluster_name: aks-demo-cluster
    dns_prefix: aks-demo
    kubernetes_version: "1.29"
    node_count: 3
    node_vm_size: Standard_D4s_v3

  tasks:
    # Create the resource group first
    - name: Create resource group
      azure.azcollection.azure_rm_resourcegroup:
        name: "{{ resource_group }}"
        location: "{{ location }}"
        tags:
          environment: demo
          managed_by: ansible

    # Create the AKS cluster with a system node pool
    - name: Create AKS cluster
      azure.azcollection.azure_rm_aks:
        name: "{{ cluster_name }}"
        resource_group: "{{ resource_group }}"
        location: "{{ location }}"
        dns_prefix: "{{ dns_prefix }}"
        kubernetes_version: "{{ kubernetes_version }}"
        # Network profile configuration
        network_profile:
          network_plugin: azure
          network_policy: calico
          service_cidr: "172.16.0.0/16"
          dns_service_ip: "172.16.0.10"
        # Default node pool (system pool)
        agent_pool_profiles:
          - name: system
            count: "{{ node_count }}"
            vm_size: "{{ node_vm_size }}"
            os_type: Linux
            mode: System
            os_disk_size_gb: 128
            max_pods: 110
            enable_auto_scaling: true
            min_count: 2
            max_count: 5
            availability_zones:
              - 1
              - 2
              - 3
            type: VirtualMachineScaleSets
        # Enable managed identity
        identity:
          type: SystemAssigned
        # Enable RBAC
        enable_rbac: true
        tags:
          environment: demo
          managed_by: ansible
      register: aks_result

    # Print cluster details
    - name: Display cluster info
      ansible.builtin.debug:
        msg: |
          Cluster Name: {{ aks_result.name }}
          FQDN: {{ aks_result.fqdn }}
          Kubernetes Version: {{ aks_result.kubernetes_version }}
          Provisioning State: {{ aks_result.provisioning_state }}
```

Run the playbook with:

```bash
ansible-playbook playbooks/create-aks.yml
```

## Adding User Node Pools

In production, you separate system workloads from application workloads using different node pools. Ansible lets you add node pools to an existing cluster.

```yaml
# playbooks/add-node-pools.yml
---
- name: Add Node Pools to AKS
  hosts: localhost
  connection: local
  gather_facts: false

  vars:
    resource_group: rg-aks-demo
    cluster_name: aks-demo-cluster

  tasks:
    # Add a node pool for general application workloads
    - name: Add application node pool
      azure.azcollection.azure_rm_aks_agentpool:
        name: apppool
        resource_group: "{{ resource_group }}"
        cluster_name: "{{ cluster_name }}"
        vm_size: Standard_D8s_v3
        count: 3
        min_count: 2
        max_count: 10
        enable_auto_scaling: true
        mode: User
        os_type: Linux
        os_disk_size_gb: 256
        max_pods: 60
        availability_zones:
          - 1
          - 2
          - 3
        node_labels:
          workload-type: application
        node_taints:
          - "workload=application:NoSchedule"

    # Add a spot instance node pool for batch jobs
    - name: Add spot node pool for batch workloads
      azure.azcollection.azure_rm_aks_agentpool:
        name: spotpool
        resource_group: "{{ resource_group }}"
        cluster_name: "{{ cluster_name }}"
        vm_size: Standard_D8s_v3
        count: 0
        min_count: 0
        max_count: 20
        enable_auto_scaling: true
        mode: User
        os_type: Linux
        os_disk_size_gb: 128
        priority: Spot
        spot_max_price: -1
        eviction_policy: Delete
        node_labels:
          workload-type: batch
          kubernetes.azure.com/scalesetpriority: spot
        node_taints:
          - "kubernetes.azure.com/scalesetpriority=spot:NoSchedule"
```

## Getting Cluster Credentials

After creating the cluster, you need the kubeconfig to interact with it. Ansible can fetch this for you.

```yaml
# playbooks/get-credentials.yml
---
- name: Get AKS Credentials
  hosts: localhost
  connection: local
  gather_facts: false

  vars:
    resource_group: rg-aks-demo
    cluster_name: aks-demo-cluster

  tasks:
    # Fetch the cluster's kubeconfig
    - name: Get AKS credentials
      azure.azcollection.azure_rm_aks_info:
        name: "{{ cluster_name }}"
        resource_group: "{{ resource_group }}"
        show_kubeconfig: admin
      register: aks_info

    # Write kubeconfig to a local file
    - name: Save kubeconfig
      ansible.builtin.copy:
        content: "{{ aks_info.aks[0].kube_config }}"
        dest: "~/.kube/config-{{ cluster_name }}"
        mode: '0600'

    - name: Confirm kubeconfig saved
      ansible.builtin.debug:
        msg: "Kubeconfig saved to ~/.kube/config-{{ cluster_name }}"
```

## Using Variables for Multiple Environments

Structure your variables to support dev, staging, and production clusters.

```yaml
# vars/dev.yml
resource_group: rg-aks-dev
cluster_name: aks-dev
location: eastus
kubernetes_version: "1.29"
node_vm_size: Standard_D2s_v3
node_count: 2
min_count: 1
max_count: 3
```

```yaml
# vars/prod.yml
resource_group: rg-aks-prod
cluster_name: aks-prod
location: eastus
kubernetes_version: "1.28"
node_vm_size: Standard_D8s_v3
node_count: 5
min_count: 3
max_count: 15
```

Run the playbook for a specific environment:

```bash
ansible-playbook playbooks/create-aks.yml -e "@vars/prod.yml"
```

## Upgrading the Cluster

Kubernetes version upgrades are a regular maintenance task. Ansible handles this by updating the cluster version.

```yaml
# playbooks/upgrade-aks.yml
---
- name: Upgrade AKS Cluster
  hosts: localhost
  connection: local
  gather_facts: false

  vars:
    resource_group: rg-aks-demo
    cluster_name: aks-demo-cluster
    target_version: "1.30"

  tasks:
    # Check available versions first
    - name: Get available versions
      azure.azcollection.azure_rm_aksversion_info:
        location: eastus
      register: versions

    - name: Display available versions
      ansible.builtin.debug:
        msg: "{{ versions.azure_aks_versions }}"

    # Upgrade the control plane
    - name: Upgrade AKS cluster
      azure.azcollection.azure_rm_aks:
        name: "{{ cluster_name }}"
        resource_group: "{{ resource_group }}"
        kubernetes_version: "{{ target_version }}"
```

## Deleting the Cluster

Cleanup is straightforward.

```yaml
# playbooks/delete-aks.yml
---
- name: Delete AKS Cluster
  hosts: localhost
  connection: local
  gather_facts: false

  tasks:
    - name: Delete AKS cluster
      azure.azcollection.azure_rm_aks:
        name: aks-demo-cluster
        resource_group: rg-aks-demo
        state: absent

    - name: Delete resource group
      azure.azcollection.azure_rm_resourcegroup:
        name: rg-aks-demo
        state: absent
        force_delete_nonempty: true
```

## Idempotency and State

One of the advantages of using Ansible for AKS management is idempotency. Running the creation playbook multiple times will not create duplicate clusters - it will update the existing one to match the desired state. This makes it safe to run the same playbook in CI/CD without worrying about duplicates.

Unlike Terraform, Ansible does not maintain a state file. It queries Azure directly each time to determine the current state. This means there is no state drift between your state file and reality, but it also means that Ansible cannot track resources it did not create.

## Conclusion

The Ansible Azure Collection provides a solid path for managing AKS clusters, especially if Ansible is already part of your automation toolkit. The modules cover cluster creation, node pool management, version upgrades, and credential retrieval. Combined with Ansible's variable system and role structure, you can build a clean, environment-aware AKS management workflow that scales across multiple clusters and teams.
