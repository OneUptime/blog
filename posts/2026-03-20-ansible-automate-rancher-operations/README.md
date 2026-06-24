# How to Use Ansible to Automate Rancher Operations

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rancher, Ansible, Automation, Infrastructure as Code, DevOps, Kubernetes

Description: Automate Rancher cluster management, user provisioning, and application deployments using Ansible playbooks with the Rancher API.

## Introduction

Ansible is an agentless automation tool that works well for orchestrating Rancher operations through Rancher and Kubernetes APIs. Unlike Terraform, Ansible is better suited for procedural tasks: running health checks, rotating credentials, deploying applications in sequence, and performing pre/post migration steps.

## Prerequisites

- Ansible 2.16+
- Python 3.9+ with the Kubernetes Python client, `PyYAML`, and `jsonpatch` installed on the control node
- A valid kubeconfig
- Rancher project ID

## Step 1: Install Required Ansible Dependencies

```bash
# Install the Kubernetes collection and Python dependencies used by the playbooks

ansible-galaxy collection install kubernetes.core
python3 -m pip install kubernetes PyYAML jsonpatch
```

## Step 2: Configure Inventory and Variables

```yaml
# inventory/group_vars/all.yml
kubeconfig_path: "~/.kube/rancher.yaml"
project_id: "c-m-abc123:p-12345"

clusters:
  - name: production
    id: c-m-abc123
  - name: staging
    id: c-m-def456
```

## Step 3: Create a Namespace Provisioning Playbook

```yaml
# playbooks/provision-namespace.yml
---
- name: Provision application namespaces in Rancher
  hosts: localhost
  gather_facts: false

  vars:
    app_name: "myapp"
    environment: "production"

  tasks:
    - name: Create namespace in a Rancher project
      kubernetes.core.k8s:
        kubeconfig: "{{ kubeconfig_path }}"
        state: present
        definition:
          apiVersion: v1
          kind: Namespace
          metadata:
            name: "{{ app_name }}-{{ environment }}"
            annotations:
              field.cattle.io/projectId: "{{ project_id }}"
            labels:
              environment: "{{ environment }}"
              app: "{{ app_name }}"
      register: namespace_result

    - name: Display namespace creation result
      debug:
        msg: "Created namespace: {{ namespace_result.result.metadata.name }}"
```

## Step 4: Deploy an Application with Ansible

```yaml
# playbooks/deploy-app.yml
---
- name: Deploy application to Rancher cluster
  hosts: localhost
  gather_facts: false

  tasks:
    - name: Apply Kubernetes manifests
      kubernetes.core.k8s:
        kubeconfig: "{{ kubeconfig_path }}"
        state: present
        template: templates/deployment.yaml.j2

    - name: Wait for deployment to be ready
      kubernetes.core.k8s_info:
        kubeconfig: "{{ kubeconfig_path }}"
        api_version: apps/v1
        kind: Deployment
        name: "{{ app_name }}"
        namespace: "{{ app_namespace }}"
        wait: true
        wait_condition:
          type: Available
          status: "True"
        wait_timeout: 300

    - name: Verify pods are running
      kubernetes.core.k8s_info:
        kubeconfig: "{{ kubeconfig_path }}"
        kind: Pod
        namespace: "{{ app_namespace }}"
        label_selectors:
          - "app = {{ app_name }}"
      register: pod_info

    - name: Print pod status
      debug:
        msg: "Pod {{ item.metadata.name }} is {{ item.status.phase }}"
      loop: "{{ pod_info.resources }}"
```

## Step 5: Run the Playbook

```bash
# Set the kubeconfig used by the playbooks
export KUBECONFIG="$HOME/.kube/rancher.yaml"

# Run the provisioning playbook
ansible-playbook playbooks/provision-namespace.yml \
  -e "kubeconfig_path=$KUBECONFIG" \
  -e "project_id=c-m-abc123:p-12345"

# Deploy the application
ansible-playbook playbooks/deploy-app.yml \
  -e "kubeconfig_path=$KUBECONFIG" \
  -e "app_name=myapp" \
  -e "app_namespace=myapp-production"
```

## Conclusion

Ansible complements Terraform for Rancher automation by handling procedural workflows that don't fit the declarative model. Use Terraform for cluster provisioning and Ansible for post-provisioning configuration, health verification, and ongoing operational tasks like rolling updates and credential rotation.
