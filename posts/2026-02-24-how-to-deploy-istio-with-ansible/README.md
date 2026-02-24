# How to Deploy Istio with Ansible

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Ansible, Kubernetes, Automation, DevOps

Description: Automate Istio service mesh deployment and configuration using Ansible playbooks with the Kubernetes and Helm collections.

---

Ansible might not be the first tool that comes to mind for Kubernetes management, but it works surprisingly well for deploying Istio. If your team already uses Ansible for infrastructure automation, adding Istio deployment to your existing playbooks keeps everything in one toolchain. The kubernetes.core and community.kubernetes Ansible collections give you everything you need.

This guide builds an Ansible playbook that installs Istio from scratch and manages its configuration.

## Prerequisites

Install the required Ansible collections:

```bash
ansible-galaxy collection install kubernetes.core
ansible-galaxy collection install community.kubernetes
```

Make sure you have the Python dependencies too:

```bash
pip install kubernetes openshift helm
```

Your control machine needs kubectl configured to access the target cluster, and Helm 3 needs to be installed.

## Project Structure

Organize your Ansible project like this:

```
istio-ansible/
  inventory/
    production.yml
    staging.yml
  roles/
    istio-base/
      tasks/main.yml
      defaults/main.yml
    istio-control-plane/
      tasks/main.yml
      defaults/main.yml
    istio-gateway/
      tasks/main.yml
      defaults/main.yml
    istio-config/
      tasks/main.yml
      defaults/main.yml
      templates/
  playbooks/
    deploy-istio.yml
    configure-mesh.yml
```

## Inventory Configuration

Define your clusters in the inventory:

```yaml
# inventory/production.yml
all:
  hosts:
    localhost:
      ansible_connection: local
  vars:
    kubeconfig: ~/.kube/config
    istio_version: "1.22.0"
    istio_namespace: istio-system
    environment_name: production
    ingress_gateway_type: LoadBalancer
    pilot_replicas: 2
    pilot_cpu_request: "500m"
    pilot_memory_request: "2Gi"
    enable_access_logging: true
    enable_auto_mtls: true
```

## Istio Base Role

Create the role that installs Istio CRDs:

```yaml
# roles/istio-base/defaults/main.yml
istio_version: "1.22.0"
istio_namespace: istio-system
istio_helm_repo: https://istio-release.storage.googleapis.com/charts
```

```yaml
# roles/istio-base/tasks/main.yml
- name: Add Istio Helm repository
  kubernetes.core.helm_repository:
    name: istio
    repo_url: "{{ istio_helm_repo }}"

- name: Create Istio namespace
  kubernetes.core.k8s:
    state: present
    definition:
      apiVersion: v1
      kind: Namespace
      metadata:
        name: "{{ istio_namespace }}"
        labels:
          istio-injection: disabled

- name: Install Istio base chart
  kubernetes.core.helm:
    name: istio-base
    chart_ref: istio/base
    chart_version: "{{ istio_version }}"
    release_namespace: "{{ istio_namespace }}"
    values:
      defaultRevision: default
    wait: true
    wait_timeout: "300s"

- name: Verify CRDs are installed
  kubernetes.core.k8s_info:
    api_version: apiextensions.k8s.io/v1
    kind: CustomResourceDefinition
    name: virtualservices.networking.istio.io
  register: vs_crd
  failed_when: vs_crd.resources | length == 0
```

## Istio Control Plane Role

```yaml
# roles/istio-control-plane/defaults/main.yml
istio_version: "1.22.0"
istio_namespace: istio-system
pilot_replicas: 2
pilot_cpu_request: "500m"
pilot_memory_request: "2Gi"
pilot_cpu_limit: "1000m"
pilot_memory_limit: "4Gi"
enable_access_logging: true
enable_auto_mtls: true
trace_sampling: 1.0
```

```yaml
# roles/istio-control-plane/tasks/main.yml
- name: Install istiod
  kubernetes.core.helm:
    name: istiod
    chart_ref: istio/istiod
    chart_version: "{{ istio_version }}"
    release_namespace: "{{ istio_namespace }}"
    values:
      pilot:
        replicaCount: "{{ pilot_replicas }}"
        autoscaleEnabled: true
        autoscaleMin: "{{ pilot_replicas }}"
        autoscaleMax: "{{ pilot_replicas * 3 }}"
        resources:
          requests:
            cpu: "{{ pilot_cpu_request }}"
            memory: "{{ pilot_memory_request }}"
          limits:
            cpu: "{{ pilot_cpu_limit }}"
            memory: "{{ pilot_memory_limit }}"
        traceSampling: "{{ trace_sampling }}"
      meshConfig:
        accessLogFile: "{{ '/dev/stdout' if enable_access_logging else '' }}"
        enableAutoMtls: "{{ enable_auto_mtls }}"
        defaultConfig:
          holdApplicationUntilProxyStarts: true
    wait: true
    wait_timeout: "600s"

- name: Wait for istiod to be ready
  kubernetes.core.k8s_info:
    api_version: apps/v1
    kind: Deployment
    name: istiod
    namespace: "{{ istio_namespace }}"
  register: istiod_deploy
  until: >
    istiod_deploy.resources[0].status.readyReplicas is defined and
    istiod_deploy.resources[0].status.readyReplicas >= pilot_replicas
  retries: 30
  delay: 10
```

## Istio Gateway Role

```yaml
# roles/istio-gateway/defaults/main.yml
istio_version: "1.22.0"
ingress_namespace: istio-ingress
ingress_gateway_type: LoadBalancer
ingress_min_replicas: 2
ingress_max_replicas: 10
```

```yaml
# roles/istio-gateway/tasks/main.yml
- name: Create ingress gateway namespace
  kubernetes.core.k8s:
    state: present
    definition:
      apiVersion: v1
      kind: Namespace
      metadata:
        name: "{{ ingress_namespace }}"
        labels:
          istio-injection: enabled

- name: Install Istio ingress gateway
  kubernetes.core.helm:
    name: istio-ingress
    chart_ref: istio/gateway
    chart_version: "{{ istio_version }}"
    release_namespace: "{{ ingress_namespace }}"
    values:
      service:
        type: "{{ ingress_gateway_type }}"
      autoscaling:
        enabled: true
        minReplicas: "{{ ingress_min_replicas }}"
        maxReplicas: "{{ ingress_max_replicas }}"
    wait: true
    wait_timeout: "300s"

- name: Get ingress gateway service info
  kubernetes.core.k8s_info:
    api_version: v1
    kind: Service
    name: istio-ingress
    namespace: "{{ ingress_namespace }}"
  register: ingress_svc

- name: Display ingress gateway endpoint
  ansible.builtin.debug:
    msg: "Ingress gateway: {{ ingress_svc.resources[0].status.loadBalancer.ingress[0].hostname | default(ingress_svc.resources[0].status.loadBalancer.ingress[0].ip | default('pending')) }}"
  when: ingress_svc.resources | length > 0
```

## Istio Configuration Role

Use Jinja2 templates for Istio custom resources:

```yaml
# roles/istio-config/defaults/main.yml
services: []
gateway_hosts: []
tls_secret_name: ""
```

```yaml
# roles/istio-config/templates/gateway.yaml.j2
apiVersion: networking.istio.io/v1
kind: Gateway
metadata:
  name: main-gateway
  namespace: {{ ingress_namespace }}
spec:
  selector:
    istio: ingress
  servers:
{% if tls_secret_name %}
  - port:
      number: 443
      name: https
      protocol: HTTPS
    hosts:
{% for host in gateway_hosts %}
    - {{ host }}
{% endfor %}
    tls:
      mode: SIMPLE
      credentialName: {{ tls_secret_name }}
{% endif %}
  - port:
      number: 80
      name: http
      protocol: HTTP
    hosts:
{% for host in gateway_hosts %}
    - {{ host }}
{% endfor %}
{% if tls_secret_name %}
    tls:
      httpsRedirect: true
{% endif %}
```

```yaml
# roles/istio-config/tasks/main.yml
- name: Apply Gateway configuration
  kubernetes.core.k8s:
    state: present
    definition: "{{ lookup('template', 'gateway.yaml.j2') | from_yaml }}"
  when: gateway_hosts | length > 0

- name: Apply VirtualService for each service
  kubernetes.core.k8s:
    state: present
    definition:
      apiVersion: networking.istio.io/v1
      kind: VirtualService
      metadata:
        name: "{{ item.name }}"
        namespace: "{{ item.namespace | default('production') }}"
      spec:
        hosts:
          - "{{ item.host | default(item.name + '.' + (item.namespace | default('production')) + '.svc.cluster.local') }}"
        http:
          - route:
              - destination:
                  host: "{{ item.name }}.{{ item.namespace | default('production') }}.svc.cluster.local"
                  port:
                    number: "{{ item.port | default(8080) }}"
            timeout: "{{ item.timeout | default('30s') }}"
  loop: "{{ services }}"
  loop_control:
    label: "{{ item.name }}"
```

## Main Deployment Playbook

Tie the roles together:

```yaml
# playbooks/deploy-istio.yml
- name: Deploy Istio Service Mesh
  hosts: localhost
  connection: local
  gather_facts: false

  pre_tasks:
    - name: Verify cluster connectivity
      kubernetes.core.k8s_cluster_info:
      register: cluster_info

    - name: Display cluster info
      ansible.builtin.debug:
        msg: "Connected to cluster: {{ cluster_info.connection.host }}"

  roles:
    - role: istio-base
    - role: istio-control-plane
    - role: istio-gateway
    - role: istio-config

  post_tasks:
    - name: Run Istio validation
      ansible.builtin.command: istioctl verify-install
      register: verify_result
      changed_when: false

    - name: Display verification result
      ansible.builtin.debug:
        msg: "{{ verify_result.stdout }}"
```

## Running the Playbook

Execute the deployment:

```bash
ansible-playbook playbooks/deploy-istio.yml \
  -i inventory/production.yml
```

For a dry run:

```bash
ansible-playbook playbooks/deploy-istio.yml \
  -i inventory/production.yml \
  --check --diff
```

## Idempotency

One of Ansible's strengths is idempotency. Running the playbook multiple times produces the same result. The kubernetes.core modules check the current state before making changes, so nothing happens if the resources are already in the desired state.

This makes Ansible playbooks safe to run on a schedule or as part of a reconciliation loop.

Ansible brings a familiar automation framework to Istio management. If you are already running Ansible for other parts of your infrastructure, adding Istio deployment keeps your team working with tools they know. The Kubernetes and Helm collections handle the heavy lifting, and Ansible's role-based structure keeps the playbooks organized and reusable across environments.
