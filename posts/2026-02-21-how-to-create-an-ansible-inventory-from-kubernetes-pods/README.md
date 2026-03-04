# How to Create an Ansible Inventory from Kubernetes Pods

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, Kubernetes, Pods, Dynamic Inventory, DevOps

Description: Learn how to build Ansible dynamic inventory from Kubernetes pods to manage and configure workloads running in your cluster.

---

While Kubernetes has its own configuration mechanisms (ConfigMaps, Secrets, init containers), there are situations where you need Ansible to reach into running pods. Maybe you need to run database migrations, distribute certificates, or perform configuration that does not fit neatly into a Kubernetes manifest. This post covers how to build an Ansible inventory from Kubernetes pods so you can manage them with playbooks.

## Prerequisites

You need:
- A working Kubernetes cluster with `kubectl` access
- The `kubernetes.core` Ansible collection
- The Python `kubernetes` client library

```bash
# Install the Kubernetes collection
ansible-galaxy collection install kubernetes.core

# Install the Python client
pip install kubernetes
```

## Method 1: The kubernetes.core.k8s Inventory Plugin

The `kubernetes.core.k8s` inventory plugin discovers pods and creates inventory entries for them:

```yaml
# inventory/k8s_pods.yml
plugin: kubernetes.core.k8s
connections:
  - namespaces:
      - default
      - production
      - staging

# Only include running pods
# Exclude system pods
```

Enable the plugin:

```ini
# ansible.cfg
[inventory]
enable_plugins = kubernetes.core.k8s, ansible.builtin.yaml, ansible.builtin.ini
```

Test it:

```bash
# See what pods the plugin discovers
ansible-inventory -i inventory/k8s_pods.yml --graph

# List with full details
ansible-inventory -i inventory/k8s_pods.yml --list
```

## Method 2: Custom Dynamic Inventory Script

For more control, write a custom script that queries the Kubernetes API:

```python
#!/usr/bin/env python3
# k8s_pod_inventory.py
# Dynamic inventory that discovers Kubernetes pods

import json
import sys
import os
from kubernetes import client, config

# Namespaces to include (or empty for all)
TARGET_NAMESPACES = os.environ.get('K8S_NAMESPACES', 'default,production').split(',')

# Label selector to filter pods
LABEL_SELECTOR = os.environ.get('K8S_LABEL_SELECTOR', '')

def load_k8s_config():
    """Load Kubernetes configuration from kubeconfig or in-cluster."""
    try:
        config.load_incluster_config()
    except config.ConfigException:
        config.load_kube_config()

def get_pods():
    """Get running pods from Kubernetes."""
    v1 = client.CoreV1Api()
    all_pods = []

    for namespace in TARGET_NAMESPACES:
        namespace = namespace.strip()
        pods = v1.list_namespaced_pod(
            namespace=namespace,
            label_selector=LABEL_SELECTOR,
            field_selector='status.phase=Running'
        )
        all_pods.extend(pods.items)

    return all_pods

def build_inventory():
    """Build Ansible inventory from Kubernetes pods."""
    load_k8s_config()
    pods = get_pods()

    inventory = {}
    hostvars = {}

    for pod in pods:
        pod_name = pod.metadata.name
        namespace = pod.metadata.namespace
        labels = pod.metadata.labels or {}

        # Create a unique inventory hostname
        inv_name = f"{namespace}_{pod_name}"

        # Group by namespace
        ns_group = f"namespace_{namespace}"
        if ns_group not in inventory:
            inventory[ns_group] = {'hosts': [], 'vars': {}}
        inventory[ns_group]['hosts'].append(inv_name)

        # Group by app label
        app_label = labels.get('app', labels.get('app.kubernetes.io/name', ''))
        if app_label:
            app_group = f"app_{app_label}"
            if app_group not in inventory:
                inventory[app_group] = {'hosts': [], 'vars': {}}
            inventory[app_group]['hosts'].append(inv_name)

        # Group by custom ansible.group label
        ansible_group = labels.get('ansible-group', '')
        if ansible_group:
            if ansible_group not in inventory:
                inventory[ansible_group] = {'hosts': [], 'vars': {}}
            inventory[ansible_group]['hosts'].append(inv_name)

        # Set host variables
        hostvars[inv_name] = {
            'ansible_connection': 'kubernetes.core.kubectl',
            'ansible_kubectl_pod': pod_name,
            'ansible_kubectl_namespace': namespace,
            'ansible_kubectl_container': pod.spec.containers[0].name,
            'k8s_pod_ip': pod.status.pod_ip,
            'k8s_node_name': pod.spec.node_name,
            'k8s_labels': labels,
        }

        # If pod has multiple containers, add that info
        if len(pod.spec.containers) > 1:
            hostvars[inv_name]['k8s_containers'] = [
                c.name for c in pod.spec.containers
            ]

    inventory['_meta'] = {'hostvars': hostvars}
    return inventory

if __name__ == '__main__':
    if '--list' in sys.argv or len(sys.argv) == 1:
        print(json.dumps(build_inventory(), indent=2))
    elif '--host' in sys.argv:
        print(json.dumps({}))
```

Usage:

```bash
# Make executable
chmod +x k8s_pod_inventory.py

# Discover pods in default and production namespaces
export K8S_NAMESPACES="default,production"

# Optionally filter by labels
export K8S_LABEL_SELECTOR="app=myservice"

# Test
./k8s_pod_inventory.py --list | python3 -m json.tool

# Use with Ansible
ansible -i k8s_pod_inventory.py all -m ping
```

## The kubectl Connection Plugin

The key to managing Kubernetes pods with Ansible is the `kubectl` connection plugin. It runs commands inside pods using `kubectl exec`, similar to how the Docker connection plugin uses `docker exec`:

```mermaid
graph LR
    A[Ansible Control Node] --> B[kubectl exec]
    B --> C[Kubernetes API Server]
    C --> D[Target Pod]
```

The connection is set through inventory variables:

```yaml
# These variables configure the kubectl connection for each pod
ansible_connection: kubernetes.core.kubectl
ansible_kubectl_pod: my-pod-name
ansible_kubectl_namespace: production
ansible_kubectl_container: app-container  # needed for multi-container pods
```

## Labeling Pods for Ansible

Add labels to your Kubernetes deployments that help the inventory script organize pods:

```yaml
# k8s/deployment.yml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: web-frontend
  namespace: production
spec:
  replicas: 3
  selector:
    matchLabels:
      app: web-frontend
  template:
    metadata:
      labels:
        app: web-frontend
        tier: frontend
        # Custom label for Ansible inventory grouping
        ansible-group: webservers
    spec:
      containers:
        - name: nginx
          image: nginx:1.25
          ports:
            - containerPort: 80
```

## Running Playbooks Against Pods

Here is a playbook that configures pods discovered through the inventory:

```yaml
# playbooks/configure-pods.yml
- hosts: app_web-frontend
  gather_facts: false
  tasks:
    - name: Copy custom nginx config into pod
      ansible.builtin.copy:
        content: |
          server {
              listen 80;
              location /health {
                  return 200 'ok';
              }
              location / {
                  proxy_pass http://backend:8080;
              }
          }
        dest: /etc/nginx/conf.d/default.conf

    - name: Reload nginx inside the pod
      ansible.builtin.command: nginx -s reload

- hosts: app_api-backend
  gather_facts: false
  tasks:
    - name: Run database migrations
      ansible.builtin.command: python manage.py migrate
      args:
        chdir: /app
```

Run it:

```bash
# Configure pods using the dynamic inventory
ansible-playbook -i k8s_pod_inventory.py playbooks/configure-pods.yml

# Target a specific namespace
ansible-playbook -i k8s_pod_inventory.py playbooks/configure-pods.yml --limit 'namespace_production'
```

## Handling Pod Restarts

Kubernetes pods are ephemeral. They restart, get rescheduled, and their names change (especially with Deployments where pod names include a random suffix). Your inventory needs to handle this:

```python
def build_stable_inventory():
    """Build inventory with stable group names despite pod name changes."""
    load_k8s_config()
    pods = get_pods()

    inventory = {}
    hostvars = {}

    for pod in pods:
        labels = pod.metadata.labels or {}
        app_name = labels.get('app', 'unknown')
        namespace = pod.metadata.namespace

        # Use app name + index for stable naming
        app_group = f"app_{app_name}"
        if app_group not in inventory:
            inventory[app_group] = {'hosts': [], 'vars': {}}

        # Count existing hosts in this group to create an index
        idx = len(inventory[app_group]['hosts'])
        inv_name = f"{app_name}-{idx}"

        inventory[app_group]['hosts'].append(inv_name)

        hostvars[inv_name] = {
            'ansible_connection': 'kubernetes.core.kubectl',
            'ansible_kubectl_pod': pod.metadata.name,
            'ansible_kubectl_namespace': namespace,
            'ansible_kubectl_container': pod.spec.containers[0].name,
            'k8s_actual_pod_name': pod.metadata.name,
        }

    inventory['_meta'] = {'hostvars': hostvars}
    return inventory
```

## Targeting Specific Containers in Multi-Container Pods

If a pod has sidecar containers (like Istio's envoy proxy), you need to specify which container to run commands in:

```yaml
# inventory/k8s_specific.yml
all:
  children:
    api_pods:
      hosts:
        api-pod-1:
          ansible_connection: kubernetes.core.kubectl
          ansible_kubectl_pod: api-deployment-abc123
          ansible_kubectl_namespace: production
          # Target the main app container, not the sidecar
          ansible_kubectl_container: api-app
```

In the dynamic script, you can default to the first container or use a label:

```python
# Determine the target container
target_container = labels.get('ansible-container', pod.spec.containers[0].name)
hostvars[inv_name]['ansible_kubectl_container'] = target_container
```

## Combining with Static Inventory

You can manage both Kubernetes pods and traditional servers in the same Ansible run:

```bash
# Use multiple inventory sources
ansible-playbook \
    -i inventory/servers.yml \
    -i k8s_pod_inventory.py \
    site.yml
```

Your playbook can target different host groups from different sources:

```yaml
# site.yml
- hosts: physical_servers
  tasks:
    - name: Update server packages
      ansible.builtin.apt:
        upgrade: dist

- hosts: app_web-frontend
  tasks:
    - name: Update app config in pods
      ansible.builtin.template:
        src: app-config.j2
        dest: /app/config.yml
```

## Practical Considerations

Keep in mind that pods are supposed to be immutable. Using Ansible to modify running pods is generally a code smell in production, as those changes get lost when the pod restarts. The more appropriate use cases for this pattern are:

- Running one-time operations like database migrations
- Debugging and troubleshooting in development/staging
- Managing stateful workloads where in-place updates are necessary
- Certificate distribution to pods that do not support volume mounts

For permanent configuration changes, update the container image or Kubernetes manifests instead. Ansible's role in Kubernetes is best as a complement for tasks that do not fit the declarative model, not as a replacement for it.
