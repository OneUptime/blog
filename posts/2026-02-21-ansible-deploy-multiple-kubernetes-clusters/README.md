# How to Use Ansible to Deploy Applications to Multiple Kubernetes Clusters

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, Kubernetes, Multi-Cluster, Deployment, DevOps

Description: Deploy applications across multiple Kubernetes clusters using Ansible inventory groups, kubeconfig contexts, and parallel execution strategies.

---

Running applications across multiple Kubernetes clusters is common for high availability, disaster recovery, regional deployments, and separating production from staging. The challenge is deploying consistently to all of them without maintaining separate playbooks for each cluster. Ansible's inventory system and variable hierarchy make this manageable.

This guide covers strategies for targeting multiple clusters from a single playbook, using kubeconfig contexts, Ansible inventory groups, and handling cluster-specific configurations.

## Prerequisites

- Ansible 2.12+ with `kubernetes.core` collection
- kubeconfig files for each cluster
- Python `kubernetes` library

```bash
ansible-galaxy collection install kubernetes.core
pip install kubernetes
```

## Strategy 1: Multiple kubeconfig Contexts

If all your cluster credentials are in a single kubeconfig file with multiple contexts, you can loop over contexts.

```yaml
# playbook: deploy-multi-context.yml
# Deploys to multiple clusters using kubeconfig contexts
---
- name: Deploy to multiple Kubernetes clusters
  hosts: localhost
  connection: local
  gather_facts: false

  vars:
    app_name: web-api
    app_image: "registry.company.com/web-api:v2.5.0"
    clusters:
      - name: us-east-prod
        context: arn:aws:eks:us-east-1:123456789:cluster/prod-east
        namespace: production
        replicas: 5
      - name: us-west-prod
        context: arn:aws:eks:us-west-2:123456789:cluster/prod-west
        namespace: production
        replicas: 3
      - name: eu-west-prod
        context: arn:aws:eks:eu-west-1:123456789:cluster/prod-eu
        namespace: production
        replicas: 3

  tasks:
    - name: Deploy application to each cluster
      kubernetes.core.k8s:
        state: present
        context: "{{ item.context }}"
        definition:
          apiVersion: apps/v1
          kind: Deployment
          metadata:
            name: "{{ app_name }}"
            namespace: "{{ item.namespace }}"
            labels:
              app: "{{ app_name }}"
              cluster: "{{ item.name }}"
          spec:
            replicas: "{{ item.replicas }}"
            selector:
              matchLabels:
                app: "{{ app_name }}"
            template:
              metadata:
                labels:
                  app: "{{ app_name }}"
              spec:
                containers:
                  - name: "{{ app_name }}"
                    image: "{{ app_image }}"
                    ports:
                      - containerPort: 8080
                    resources:
                      requests:
                        cpu: "200m"
                        memory: "256Mi"
      loop: "{{ clusters }}"
      loop_control:
        label: "{{ item.name }}"
```

The `context` parameter in the `k8s` module tells it which kubeconfig context to use for each operation. This is the simplest approach when you already have all contexts in your default kubeconfig.

## Strategy 2: Separate kubeconfig Files

In some environments, each cluster has its own kubeconfig file. Use the `kubeconfig` parameter.

```yaml
# playbook: deploy-multi-kubeconfig.yml
# Deploys to clusters using separate kubeconfig files
---
- name: Deploy using separate kubeconfig files
  hosts: localhost
  connection: local
  gather_facts: false

  vars:
    app_name: web-api
    app_image: "registry.company.com/web-api:v2.5.0"
    clusters:
      - name: production-us
        kubeconfig: "~/.kube/config-prod-us"
        namespace: production
        replicas: 5
      - name: production-eu
        kubeconfig: "~/.kube/config-prod-eu"
        namespace: production
        replicas: 3
      - name: staging
        kubeconfig: "~/.kube/config-staging"
        namespace: staging
        replicas: 1

  tasks:
    - name: Create namespace in each cluster
      kubernetes.core.k8s:
        state: present
        kubeconfig: "{{ item.kubeconfig }}"
        definition:
          apiVersion: v1
          kind: Namespace
          metadata:
            name: "{{ item.namespace }}"
      loop: "{{ clusters }}"
      loop_control:
        label: "{{ item.name }}"

    - name: Deploy application to each cluster
      kubernetes.core.k8s:
        state: present
        kubeconfig: "{{ item.kubeconfig }}"
        definition:
          apiVersion: apps/v1
          kind: Deployment
          metadata:
            name: "{{ app_name }}"
            namespace: "{{ item.namespace }}"
          spec:
            replicas: "{{ item.replicas }}"
            selector:
              matchLabels:
                app: "{{ app_name }}"
            template:
              metadata:
                labels:
                  app: "{{ app_name }}"
              spec:
                containers:
                  - name: "{{ app_name }}"
                    image: "{{ app_image }}"
                    ports:
                      - containerPort: 8080
      loop: "{{ clusters }}"
      loop_control:
        label: "{{ item.name }}"
```

## Strategy 3: Ansible Inventory Groups

For a more Ansible-native approach, define clusters as inventory hosts and use host variables.

```ini
# inventory/clusters.ini
# Each "host" represents a Kubernetes cluster
[production]
prod-us kubeconfig=~/.kube/config-prod-us cluster_region=us-east-1 replicas=5
prod-eu kubeconfig=~/.kube/config-prod-eu cluster_region=eu-west-1 replicas=3

[staging]
staging-us kubeconfig=~/.kube/config-staging cluster_region=us-east-1 replicas=1

[all_clusters:children]
production
staging
```

```yaml
# playbook: deploy-inventory.yml
# Uses Ansible inventory to target different clusters
---
- name: Deploy to clusters from inventory
  hosts: all_clusters
  connection: local
  gather_facts: false

  vars:
    app_name: web-api
    app_image: "registry.company.com/web-api:v2.5.0"
    namespace: "{{ 'production' if inventory_hostname in groups['production'] else 'staging' }}"

  tasks:
    - name: Deploy to cluster {{ inventory_hostname }}
      kubernetes.core.k8s:
        state: present
        kubeconfig: "{{ kubeconfig }}"
        definition:
          apiVersion: apps/v1
          kind: Deployment
          metadata:
            name: "{{ app_name }}"
            namespace: "{{ namespace }}"
          spec:
            replicas: "{{ replicas }}"
            selector:
              matchLabels:
                app: "{{ app_name }}"
            template:
              metadata:
                labels:
                  app: "{{ app_name }}"
                  region: "{{ cluster_region }}"
              spec:
                containers:
                  - name: "{{ app_name }}"
                    image: "{{ app_image }}"
                    ports:
                      - containerPort: 8080
```

Run it with:

```bash
# Deploy to all clusters
ansible-playbook -i inventory/clusters.ini deploy-inventory.yml

# Deploy only to production clusters
ansible-playbook -i inventory/clusters.ini deploy-inventory.yml --limit production

# Deploy to a single cluster
ansible-playbook -i inventory/clusters.ini deploy-inventory.yml --limit prod-us
```

## Strategy 4: Rolling Deployment Across Clusters

For zero-downtime multi-cluster deployments, update one cluster at a time and verify health between each.

```yaml
# playbook: rolling-multi-cluster.yml
# Deploys to clusters one at a time with health verification
---
- name: Rolling deployment across clusters
  hosts: localhost
  connection: local
  gather_facts: false
  serial: 1

  vars:
    app_name: web-api
    app_image: "registry.company.com/web-api:v2.5.0"
    clusters:
      - name: us-east
        context: prod-us-east
        replicas: 5
      - name: us-west
        context: prod-us-west
        replicas: 3
      - name: eu-west
        context: prod-eu-west
        replicas: 3

  tasks:
    - name: Deploy to cluster {{ item.name }}
      kubernetes.core.k8s:
        state: present
        context: "{{ item.context }}"
        definition:
          apiVersion: apps/v1
          kind: Deployment
          metadata:
            name: "{{ app_name }}"
            namespace: production
          spec:
            replicas: "{{ item.replicas }}"
            selector:
              matchLabels:
                app: "{{ app_name }}"
            template:
              metadata:
                labels:
                  app: "{{ app_name }}"
              spec:
                containers:
                  - name: "{{ app_name }}"
                    image: "{{ app_image }}"
      loop: "{{ clusters }}"
      loop_control:
        label: "{{ item.name }}"

    - name: Wait for readiness on cluster {{ item.name }}
      kubernetes.core.k8s_info:
        kind: Deployment
        name: "{{ app_name }}"
        namespace: production
        context: "{{ item.context }}"
      register: deploy_status
      until:
        - deploy_status.resources[0].status.readyReplicas is defined
        - deploy_status.resources[0].status.readyReplicas == item.replicas
      retries: 30
      delay: 10
      loop: "{{ clusters }}"
      loop_control:
        label: "{{ item.name }}"
```

## Multi-Cluster Configuration Differences

Different clusters often need different configurations. Use a cluster-specific variable structure.

```yaml
# vars/cluster-configs.yml
# Cluster-specific configuration overrides
cluster_configs:
  us-east:
    context: prod-us-east
    replicas: 5
    env_vars:
      REGION: "us-east-1"
      CDN_ENDPOINT: "cdn-east.company.com"
      DB_HOST: "prod-db-east.company.com"
  us-west:
    context: prod-us-west
    replicas: 3
    env_vars:
      REGION: "us-west-2"
      CDN_ENDPOINT: "cdn-west.company.com"
      DB_HOST: "prod-db-west.company.com"
  eu-west:
    context: prod-eu-west
    replicas: 3
    env_vars:
      REGION: "eu-west-1"
      CDN_ENDPOINT: "cdn-eu.company.com"
      DB_HOST: "prod-db-eu.company.com"
```

```yaml
# playbook: deploy-with-cluster-config.yml
---
- name: Deploy with cluster-specific configuration
  hosts: localhost
  connection: local
  gather_facts: false
  vars_files:
    - vars/cluster-configs.yml

  tasks:
    - name: Create cluster-specific ConfigMap
      kubernetes.core.k8s:
        state: present
        context: "{{ item.value.context }}"
        definition:
          apiVersion: v1
          kind: ConfigMap
          metadata:
            name: app-config
            namespace: production
          data: "{{ item.value.env_vars }}"
      loop: "{{ cluster_configs | dict2items }}"
      loop_control:
        label: "{{ item.key }}"

    - name: Deploy with cluster-specific settings
      kubernetes.core.k8s:
        state: present
        context: "{{ item.value.context }}"
        definition:
          apiVersion: apps/v1
          kind: Deployment
          metadata:
            name: web-api
            namespace: production
          spec:
            replicas: "{{ item.value.replicas }}"
            selector:
              matchLabels:
                app: web-api
            template:
              metadata:
                labels:
                  app: web-api
              spec:
                containers:
                  - name: web-api
                    image: "registry.company.com/web-api:v2.5.0"
                    envFrom:
                      - configMapRef:
                          name: app-config
      loop: "{{ cluster_configs | dict2items }}"
      loop_control:
        label: "{{ item.key }}"
```

## Verifying Multi-Cluster Deployments

After deploying, check all clusters to confirm the rollout succeeded everywhere.

```yaml
# task: verify deployment across all clusters
- name: Check deployment status across all clusters
  kubernetes.core.k8s_info:
    kind: Deployment
    name: web-api
    namespace: production
    context: "{{ item.value.context }}"
  register: multi_status
  loop: "{{ cluster_configs | dict2items }}"
  loop_control:
    label: "{{ item.key }}"

- name: Report multi-cluster status
  ansible.builtin.debug:
    msg: "{{ item.item.key }}: {{ item.resources[0].status.readyReplicas | default(0) }}/{{ item.resources[0].spec.replicas }} ready"
  loop: "{{ multi_status.results }}"
  loop_control:
    label: "{{ item.item.key }}"
```

## Summary

Deploying to multiple Kubernetes clusters with Ansible is a matter of choosing the right abstraction. kubeconfig contexts and the `context` parameter work for simple setups. Separate kubeconfig files suit environments with strict credential separation. Ansible inventory groups give you the most flexibility, especially with `--limit` for targeting specific clusters. Whichever approach you pick, the key practices remain the same: verify readiness after each deployment, handle cluster-specific configuration through variables, and consider rolling deployments across clusters for true zero-downtime updates.
