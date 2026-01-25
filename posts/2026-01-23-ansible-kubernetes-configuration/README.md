# How to Configure Ansible for Kubernetes

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, Kubernetes, DevOps, Container Orchestration, Infrastructure Automation

Description: Learn to manage Kubernetes clusters with Ansible using the kubernetes.core collection for deploying applications, managing resources, and automating cluster operations.

---

While Kubernetes has its own declarative configuration through YAML manifests and tools like Helm, Ansible provides a powerful layer for orchestrating Kubernetes deployments alongside traditional infrastructure. You can manage cluster setup, application deployments, and integrate Kubernetes operations into broader automation workflows.

This guide covers using the kubernetes.core collection to interact with Kubernetes clusters from Ansible.

## Installing the Kubernetes Collection

The kubernetes.core collection provides modules for managing Kubernetes resources.

```bash
# Install the Kubernetes collection
ansible-galaxy collection install kubernetes.core

# Install required Python dependencies
pip install kubernetes openshift

# Verify installation
ansible-doc kubernetes.core.k8s
```

## Configuring Kubernetes Authentication

Ansible needs credentials to interact with your cluster.

### Using kubeconfig

```yaml
# inventory/group_vars/all.yml
---
# Path to kubeconfig file
k8s_kubeconfig: ~/.kube/config

# Or specify cluster details directly
k8s_host: https://kubernetes.example.com:6443
k8s_api_key: "{{ vault_k8s_api_token }}"
k8s_validate_certs: yes
```

### Using Service Account

```yaml
# Create a service account for Ansible
# k8s/ansible-sa.yml
---
apiVersion: v1
kind: ServiceAccount
metadata:
  name: ansible-automation
  namespace: kube-system
---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRoleBinding
metadata:
  name: ansible-automation
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: ClusterRole
  name: cluster-admin
subjects:
  - kind: ServiceAccount
    name: ansible-automation
    namespace: kube-system
```

Get the service account token:

```bash
# Create token for service account
kubectl create token ansible-automation -n kube-system --duration=8760h > ansible-token.txt

# Or get from secret (older Kubernetes versions)
kubectl get secret -n kube-system $(kubectl get sa ansible-automation -n kube-system -o jsonpath='{.secrets[0].name}') -o jsonpath='{.data.token}' | base64 -d
```

## Basic Kubernetes Operations

Deploy and manage resources with the k8s module.

```yaml
# playbooks/k8s-deploy.yml
---
- name: Deploy application to Kubernetes
  hosts: localhost
  connection: local
  gather_facts: no

  vars:
    k8s_kubeconfig: ~/.kube/config
    namespace: production
    app_name: myapp
    app_image: ghcr.io/company/myapp:v1.2.0
    replicas: 3

  tasks:
    - name: Create namespace
      kubernetes.core.k8s:
        kubeconfig: "{{ k8s_kubeconfig }}"
        state: present
        definition:
          apiVersion: v1
          kind: Namespace
          metadata:
            name: "{{ namespace }}"
            labels:
              environment: production

    - name: Deploy application
      kubernetes.core.k8s:
        kubeconfig: "{{ k8s_kubeconfig }}"
        state: present
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
              spec:
                containers:
                  - name: "{{ app_name }}"
                    image: "{{ app_image }}"
                    ports:
                      - containerPort: 8080
                    resources:
                      requests:
                        memory: "256Mi"
                        cpu: "250m"
                      limits:
                        memory: "512Mi"
                        cpu: "500m"
                    livenessProbe:
                      httpGet:
                        path: /health
                        port: 8080
                      initialDelaySeconds: 30
                      periodSeconds: 10
                    readinessProbe:
                      httpGet:
                        path: /ready
                        port: 8080
                      initialDelaySeconds: 5
                      periodSeconds: 5

    - name: Create service
      kubernetes.core.k8s:
        kubeconfig: "{{ k8s_kubeconfig }}"
        state: present
        definition:
          apiVersion: v1
          kind: Service
          metadata:
            name: "{{ app_name }}"
            namespace: "{{ namespace }}"
          spec:
            selector:
              app: "{{ app_name }}"
            ports:
              - port: 80
                targetPort: 8080
            type: ClusterIP
```

## Using Manifest Files

Apply existing YAML manifests from files.

```yaml
# playbooks/apply-manifests.yml
---
- name: Apply Kubernetes manifests
  hosts: localhost
  connection: local

  tasks:
    - name: Apply all manifests in directory
      kubernetes.core.k8s:
        kubeconfig: ~/.kube/config
        state: present
        src: "{{ item }}"
      with_fileglob:
        - "manifests/*.yml"

    - name: Apply manifest from URL
      kubernetes.core.k8s:
        kubeconfig: ~/.kube/config
        state: present
        src: https://raw.githubusercontent.com/kubernetes/ingress-nginx/main/deploy/static/provider/cloud/deploy.yaml

    - name: Apply Kustomize directory
      kubernetes.core.k8s:
        kubeconfig: ~/.kube/config
        state: present
        apply: yes
        src: kustomize/production/
```

## Managing ConfigMaps and Secrets

Create and update configuration resources.

```yaml
# playbooks/config-management.yml
---
- name: Manage Kubernetes configuration
  hosts: localhost
  connection: local

  vars:
    namespace: production
    k8s_kubeconfig: ~/.kube/config

  tasks:
    - name: Create ConfigMap from variables
      kubernetes.core.k8s:
        kubeconfig: "{{ k8s_kubeconfig }}"
        state: present
        definition:
          apiVersion: v1
          kind: ConfigMap
          metadata:
            name: app-config
            namespace: "{{ namespace }}"
          data:
            DATABASE_HOST: db.internal
            DATABASE_PORT: "5432"
            LOG_LEVEL: info
            FEATURE_FLAGS: |
              enable_new_ui=true
              enable_beta_features=false

    - name: Create ConfigMap from file
      kubernetes.core.k8s:
        kubeconfig: "{{ k8s_kubeconfig }}"
        state: present
        definition:
          apiVersion: v1
          kind: ConfigMap
          metadata:
            name: nginx-config
            namespace: "{{ namespace }}"
          data:
            nginx.conf: "{{ lookup('file', 'files/nginx.conf') }}"

    - name: Create Secret
      kubernetes.core.k8s:
        kubeconfig: "{{ k8s_kubeconfig }}"
        state: present
        definition:
          apiVersion: v1
          kind: Secret
          metadata:
            name: app-secrets
            namespace: "{{ namespace }}"
          type: Opaque
          stringData:
            DATABASE_PASSWORD: "{{ vault_db_password }}"
            API_KEY: "{{ vault_api_key }}"
```

## Deployment Strategies

Implement rolling updates and blue-green deployments.

```yaml
# playbooks/rolling-update.yml
---
- name: Rolling update deployment
  hosts: localhost
  connection: local

  vars:
    app_name: myapp
    namespace: production
    new_image: ghcr.io/company/myapp:v1.3.0

  tasks:
    - name: Update deployment image
      kubernetes.core.k8s:
        kubeconfig: ~/.kube/config
        state: present
        definition:
          apiVersion: apps/v1
          kind: Deployment
          metadata:
            name: "{{ app_name }}"
            namespace: "{{ namespace }}"
          spec:
            strategy:
              type: RollingUpdate
              rollingUpdate:
                maxSurge: 1
                maxUnavailable: 0
            template:
              spec:
                containers:
                  - name: "{{ app_name }}"
                    image: "{{ new_image }}"

    - name: Wait for rollout to complete
      kubernetes.core.k8s_info:
        kubeconfig: ~/.kube/config
        api_version: apps/v1
        kind: Deployment
        name: "{{ app_name }}"
        namespace: "{{ namespace }}"
      register: deployment_status
      until: >
        deployment_status.resources[0].status.readyReplicas is defined and
        deployment_status.resources[0].status.readyReplicas == deployment_status.resources[0].spec.replicas
      retries: 30
      delay: 10

    - name: Display deployment status
      debug:
        msg: "Deployment complete. Ready replicas: {{ deployment_status.resources[0].status.readyReplicas }}"
```

## Querying Kubernetes Resources

Retrieve information about cluster resources.

```yaml
# playbooks/k8s-info.yml
---
- name: Query Kubernetes resources
  hosts: localhost
  connection: local

  tasks:
    - name: Get all pods in namespace
      kubernetes.core.k8s_info:
        kubeconfig: ~/.kube/config
        kind: Pod
        namespace: production
      register: pod_list

    - name: Display running pods
      debug:
        msg: "{{ item.metadata.name }} - {{ item.status.phase }}"
      loop: "{{ pod_list.resources }}"
      when: item.status.phase == 'Running'

    - name: Get deployment details
      kubernetes.core.k8s_info:
        kubeconfig: ~/.kube/config
        api_version: apps/v1
        kind: Deployment
        name: myapp
        namespace: production
      register: deployment_info

    - name: Check deployment health
      assert:
        that:
          - deployment_info.resources[0].status.availableReplicas >= 2
        fail_msg: "Deployment has insufficient replicas"
        success_msg: "Deployment is healthy"

    - name: Get all services
      kubernetes.core.k8s_info:
        kubeconfig: ~/.kube/config
        kind: Service
        namespace: production
        label_selectors:
          - app=myapp
      register: services

    - name: Display service endpoints
      debug:
        msg: "Service {{ item.metadata.name }} - ClusterIP: {{ item.spec.clusterIP }}"
      loop: "{{ services.resources }}"
```

## Managing Helm Releases

Deploy applications using Helm charts.

```yaml
# playbooks/helm-deploy.yml
---
- name: Deploy Helm charts
  hosts: localhost
  connection: local

  tasks:
    - name: Add Helm repository
      kubernetes.core.helm_repository:
        name: ingress-nginx
        repo_url: https://kubernetes.github.io/ingress-nginx

    - name: Deploy Nginx Ingress Controller
      kubernetes.core.helm:
        kubeconfig: ~/.kube/config
        name: ingress-nginx
        chart_ref: ingress-nginx/ingress-nginx
        release_namespace: ingress-nginx
        create_namespace: yes
        values:
          controller:
            replicaCount: 2
            resources:
              requests:
                cpu: 100m
                memory: 128Mi
            service:
              type: LoadBalancer
          defaultBackend:
            enabled: true

    - name: Deploy application with Helm
      kubernetes.core.helm:
        kubeconfig: ~/.kube/config
        name: myapp
        chart_ref: ./charts/myapp
        release_namespace: production
        values:
          image:
            repository: ghcr.io/company/myapp
            tag: v1.2.0
          replicaCount: 3
          ingress:
            enabled: true
            hosts:
              - host: app.example.com
                paths:
                  - path: /
                    pathType: Prefix
```

## Cluster Setup with Ansible

Provision Kubernetes clusters using Kubespray.

```yaml
# playbooks/cluster-setup.yml
---
- name: Prepare nodes for Kubernetes
  hosts: k8s_nodes
  become: yes

  tasks:
    - name: Disable swap
      command: swapoff -a
      when: ansible_swaptotal_mb > 0

    - name: Remove swap from fstab
      lineinfile:
        path: /etc/fstab
        regexp: '.*swap.*'
        state: absent

    - name: Load required kernel modules
      modprobe:
        name: "{{ item }}"
        state: present
      loop:
        - overlay
        - br_netfilter

    - name: Set sysctl parameters
      sysctl:
        name: "{{ item.key }}"
        value: "{{ item.value }}"
        state: present
        reload: yes
      loop:
        - { key: 'net.bridge.bridge-nf-call-iptables', value: '1' }
        - { key: 'net.bridge.bridge-nf-call-ip6tables', value: '1' }
        - { key: 'net.ipv4.ip_forward', value: '1' }

    - name: Install containerd
      apt:
        name: containerd
        state: present

    - name: Configure containerd
      template:
        src: containerd-config.toml.j2
        dest: /etc/containerd/config.toml
      notify: restart containerd

  handlers:
    - name: restart containerd
      service:
        name: containerd
        state: restarted
```

## Ansible Role for Kubernetes Deployments

Create a reusable role for application deployments.

```yaml
# roles/k8s-app/defaults/main.yml
---
k8s_namespace: default
k8s_replicas: 2
k8s_port: 8080
k8s_resources:
  requests:
    memory: "256Mi"
    cpu: "250m"
  limits:
    memory: "512Mi"
    cpu: "500m"
```

```yaml
# roles/k8s-app/tasks/main.yml
---
- name: Ensure namespace exists
  kubernetes.core.k8s:
    kubeconfig: "{{ k8s_kubeconfig }}"
    state: present
    definition:
      apiVersion: v1
      kind: Namespace
      metadata:
        name: "{{ k8s_namespace }}"

- name: Deploy application
  kubernetes.core.k8s:
    kubeconfig: "{{ k8s_kubeconfig }}"
    state: present
    definition: "{{ lookup('template', 'deployment.yml.j2') | from_yaml }}"

- name: Create service
  kubernetes.core.k8s:
    kubeconfig: "{{ k8s_kubeconfig }}"
    state: present
    definition: "{{ lookup('template', 'service.yml.j2') | from_yaml }}"

- name: Create ingress
  kubernetes.core.k8s:
    kubeconfig: "{{ k8s_kubeconfig }}"
    state: present
    definition: "{{ lookup('template', 'ingress.yml.j2') | from_yaml }}"
  when: k8s_ingress_enabled | default(false)
```

---

Ansible bridges the gap between traditional infrastructure automation and Kubernetes-native tools. Use it to orchestrate multi-step deployments that span both servers and containers, maintain consistent environments across clusters, and integrate Kubernetes operations into existing automation workflows. The kubernetes.core collection provides comprehensive coverage of Kubernetes APIs while maintaining Ansible's familiar patterns.
