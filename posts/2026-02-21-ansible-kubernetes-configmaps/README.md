# How to Use Ansible to Create Kubernetes ConfigMaps

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, Kubernetes, ConfigMaps, Configuration Management

Description: A practical guide to creating and managing Kubernetes ConfigMaps with Ansible, covering inline data, file-based configs, and environment variable injection.

---

ConfigMaps are how Kubernetes decouples configuration from container images. Instead of baking environment-specific settings into your Docker images, you store them in ConfigMaps and mount them into pods at runtime. If you manage your infrastructure with Ansible, creating and updating ConfigMaps through playbooks keeps everything consistent and auditable.

This article shows you how to create ConfigMaps with Ansible's `kubernetes.core.k8s` module using several different approaches: inline key-value pairs, multi-line configuration files, and binary data. We will also cover how to update ConfigMaps safely and trigger rolling restarts when configuration changes.

## Prerequisites

You will need:

- Ansible 2.12+
- The `kubernetes.core` collection (`ansible-galaxy collection install kubernetes.core`)
- Python `kubernetes` library (`pip install kubernetes`)
- A valid kubeconfig file

## Creating a Simple ConfigMap with Key-Value Pairs

The most basic ConfigMap holds simple key-value pairs that your application reads as environment variables.

```yaml
# playbook: create-configmap-basic.yml
# Creates a ConfigMap with application settings as key-value pairs
---
- name: Create Kubernetes ConfigMap
  hosts: localhost
  connection: local
  gather_facts: false

  tasks:
    - name: Create application config map
      kubernetes.core.k8s:
        state: present
        definition:
          apiVersion: v1
          kind: ConfigMap
          metadata:
            name: app-config
            namespace: production
            labels:
              app: myapp
              managed-by: ansible
          data:
            DATABASE_HOST: "postgres.databases.svc.cluster.local"
            DATABASE_PORT: "5432"
            DATABASE_NAME: "myapp_production"
            LOG_LEVEL: "info"
            CACHE_TTL: "300"
            MAX_CONNECTIONS: "50"
```

Each key under `data` becomes available as an environment variable or file, depending on how you mount the ConfigMap in your pod spec.

## Creating a ConfigMap with Multi-line Configuration Files

Real applications often need full configuration files, not just individual variables. You can embed entire files in a ConfigMap using YAML's literal block scalar (`|`).

```yaml
# playbook: create-configmap-files.yml
# Embeds nginx.conf and app.properties as files in the ConfigMap
---
- name: Create ConfigMap with configuration files
  hosts: localhost
  connection: local
  gather_facts: false

  tasks:
    - name: Create nginx configuration ConfigMap
      kubernetes.core.k8s:
        state: present
        definition:
          apiVersion: v1
          kind: ConfigMap
          metadata:
            name: nginx-config
            namespace: production
          data:
            nginx.conf: |
              worker_processes auto;
              error_log /var/log/nginx/error.log warn;
              pid /var/run/nginx.pid;

              events {
                  worker_connections 1024;
              }

              http {
                  include /etc/nginx/mime.types;
                  default_type application/octet-stream;

                  upstream backend {
                      server app-service:8080;
                  }

                  server {
                      listen 80;
                      server_name _;

                      location / {
                          proxy_pass http://backend;
                          proxy_set_header Host $host;
                          proxy_set_header X-Real-IP $remote_addr;
                      }

                      location /health {
                          return 200 'healthy';
                          add_header Content-Type text/plain;
                      }
                  }
              }
```

When this ConfigMap is mounted as a volume in the nginx pod, it creates a file at the mount path with the name `nginx.conf` and the contents you specified.

## Using Ansible Variables for Dynamic ConfigMaps

Hardcoding values defeats the purpose of configuration management. Use Ansible variables to generate environment-specific ConfigMaps from the same playbook.

```yaml
# playbook: create-configmap-dynamic.yml
# Generates environment-specific ConfigMaps using Ansible variables
---
- name: Create environment-specific ConfigMap
  hosts: localhost
  connection: local
  gather_facts: false

  vars:
    env: production
    config:
      production:
        db_host: "prod-db.internal.company.com"
        db_name: "app_prod"
        log_level: "warn"
        replicas: "3"
      staging:
        db_host: "staging-db.internal.company.com"
        db_name: "app_staging"
        log_level: "debug"
        replicas: "1"

  tasks:
    - name: Create ConfigMap for the target environment
      kubernetes.core.k8s:
        state: present
        definition:
          apiVersion: v1
          kind: ConfigMap
          metadata:
            name: "app-config-{{ env }}"
            namespace: "{{ env }}"
            labels:
              app: myapp
              environment: "{{ env }}"
          data:
            DATABASE_HOST: "{{ config[env].db_host }}"
            DATABASE_NAME: "{{ config[env].db_name }}"
            LOG_LEVEL: "{{ config[env].log_level }}"
            REPLICA_COUNT: "{{ config[env].replicas }}"
```

Run this with `-e env=staging` to create the staging version or `-e env=production` for production. Same playbook, different outputs.

## Loading ConfigMap Data from External Files

For large configuration files, embedding them inline gets messy. The `lookup` plugin lets you load file contents from disk.

```yaml
# playbook: create-configmap-from-file.yml
# Loads configuration file contents from local disk into a ConfigMap
---
- name: Create ConfigMap from local files
  hosts: localhost
  connection: local
  gather_facts: false

  tasks:
    - name: Create ConfigMap with contents from local files
      kubernetes.core.k8s:
        state: present
        definition:
          apiVersion: v1
          kind: ConfigMap
          metadata:
            name: app-configs
            namespace: production
          data:
            # Load each file from the local configs directory
            application.yml: "{{ lookup('file', 'configs/application.yml') }}"
            logback.xml: "{{ lookup('file', 'configs/logback.xml') }}"
            feature-flags.json: "{{ lookup('file', 'configs/feature-flags.json') }}"
```

This approach works well when your configuration files are version-controlled alongside your playbooks. The files are read at playbook execution time and injected into the ConfigMap.

## Creating ConfigMaps Across Multiple Namespaces

Shared configuration that needs to exist in multiple namespaces is a common pattern. A loop handles this cleanly.

```yaml
# playbook: create-configmap-multi-namespace.yml
# Deploys the same ConfigMap to multiple namespaces
---
- name: Create ConfigMap in multiple namespaces
  hosts: localhost
  connection: local
  gather_facts: false

  vars:
    namespaces:
      - development
      - staging
      - production
    shared_config:
      COMPANY_NAME: "Acme Corp"
      SUPPORT_EMAIL: "support@acme.com"
      API_VERSION: "v2"
      FEATURE_DARK_MODE: "true"

  tasks:
    - name: Deploy shared ConfigMap to all namespaces
      kubernetes.core.k8s:
        state: present
        definition:
          apiVersion: v1
          kind: ConfigMap
          metadata:
            name: shared-config
            namespace: "{{ item }}"
            labels:
              managed-by: ansible
          data: "{{ shared_config }}"
      loop: "{{ namespaces }}"
      loop_control:
        label: "{{ item }}"
```

## Updating ConfigMaps and Triggering Pod Restarts

A common pain point: you update a ConfigMap, but pods using it do not pick up the changes. Pods only read ConfigMap values at startup (for env vars) or on a kubelet sync cycle (for volume mounts). To force a restart after a ConfigMap change, you can use a checksum annotation pattern.

```yaml
# playbook: update-configmap-with-restart.yml
# Updates a ConfigMap and triggers a rolling restart of the deployment
---
- name: Update ConfigMap and restart pods
  hosts: localhost
  connection: local
  gather_facts: false

  vars:
    new_log_level: "debug"

  tasks:
    - name: Update the application ConfigMap
      kubernetes.core.k8s:
        state: present
        definition:
          apiVersion: v1
          kind: ConfigMap
          metadata:
            name: app-config
            namespace: production
          data:
            LOG_LEVEL: "{{ new_log_level }}"
            DATABASE_HOST: "postgres.databases.svc.cluster.local"
            DATABASE_PORT: "5432"
      register: configmap_result

    - name: Trigger rolling restart if ConfigMap changed
      kubernetes.core.k8s:
        state: present
        definition:
          apiVersion: apps/v1
          kind: Deployment
          metadata:
            name: myapp
            namespace: production
          spec:
            template:
              metadata:
                annotations:
                  # This annotation change forces a rolling restart
                  configmap-hash: "{{ configmap_result.result.metadata.resourceVersion }}"
      when: configmap_result.changed
```

The trick here is updating an annotation on the pod template inside the Deployment spec. Kubernetes sees the pod template changed and triggers a rolling update. The `resourceVersion` of the ConfigMap serves as a simple hash that changes whenever the ConfigMap is modified.

## Validating ConfigMap Contents

After creating a ConfigMap, it is good practice to verify the data is correct.

```yaml
# task: verify ConfigMap was created with expected keys
- name: Retrieve the ConfigMap
  kubernetes.core.k8s_info:
    kind: ConfigMap
    name: app-config
    namespace: production
  register: cm_info

- name: Validate required keys exist
  ansible.builtin.assert:
    that:
      - "'DATABASE_HOST' in cm_info.resources[0].data"
      - "'DATABASE_PORT' in cm_info.resources[0].data"
      - "'LOG_LEVEL' in cm_info.resources[0].data"
    fail_msg: "ConfigMap is missing required keys"
    success_msg: "All required keys present in ConfigMap"
```

## Summary

ConfigMaps are fundamental to running applications on Kubernetes, and managing them through Ansible gives you the same benefits as any other infrastructure-as-code approach: version control, repeatability, and consistency across environments. Whether you are storing simple key-value pairs or full configuration files, the `kubernetes.core.k8s` module handles it all. Combine it with Ansible variables, file lookups, and loops to build a flexible configuration management pipeline that scales with your cluster.
