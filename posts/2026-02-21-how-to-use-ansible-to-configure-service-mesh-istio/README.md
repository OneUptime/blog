# How to Use Ansible to Configure Service Mesh (Istio)

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, Istio, Service Mesh, Kubernetes, DevOps

Description: Deploy and configure Istio service mesh using Ansible playbooks, including traffic management, security policies, and observability setup.

---

Istio is the most widely adopted service mesh for Kubernetes environments. It handles traffic management, security, and observability between microservices without requiring changes to application code. While Istio is typically installed with its own CLI (istioctl) or Helm, Ansible adds value by managing the overall orchestration, configuration customization, and integration with the rest of your infrastructure.

I have deployed Istio across multiple Kubernetes clusters using Ansible, and the approach I describe here handles everything from initial installation to ongoing traffic policy management.

## Why Use Ansible with Istio?

Istio has its own installation tools, so why add Ansible to the mix? The answer is consistency across environments. When you manage your Kubernetes clusters, monitoring stack, and application deployments with Ansible, having Istio configuration in the same workflow means one tool to rule them all. You also get the benefit of Ansible's variable management for customizing Istio settings per environment.

## Prerequisites

Your Ansible control node needs kubectl configured and access to the target Kubernetes cluster. Install the required collections:

```bash
# Install Kubernetes collection for Ansible
ansible-galaxy collection install kubernetes.core
pip install kubernetes openshift
```

## Installing Istio with Ansible

```yaml
# roles/istio/tasks/install.yml
# Install Istio on the Kubernetes cluster
- name: Create istio-system namespace
  kubernetes.core.k8s:
    kind: Namespace
    name: istio-system
    state: present

- name: Download istioctl
  ansible.builtin.get_url:
    url: "https://github.com/istio/istio/releases/download/{{ istio_version }}/istio-{{ istio_version }}-linux-amd64.tar.gz"
    dest: /tmp/istio.tar.gz

- name: Extract istio
  ansible.builtin.unarchive:
    src: /tmp/istio.tar.gz
    dest: /tmp/
    remote_src: true

- name: Install istioctl
  ansible.builtin.copy:
    src: "/tmp/istio-{{ istio_version }}/bin/istioctl"
    dest: /usr/local/bin/istioctl
    mode: '0755'
    remote_src: true

- name: Generate Istio manifest with custom profile
  ansible.builtin.command:
    cmd: >
      istioctl manifest generate
      --set profile={{ istio_profile }}
      --set values.global.proxy.resources.requests.cpu={{ istio_proxy_cpu_request }}
      --set values.global.proxy.resources.requests.memory={{ istio_proxy_memory_request }}
  register: istio_manifest
  changed_when: false

- name: Apply Istio manifest
  kubernetes.core.k8s:
    state: present
    definition: "{{ istio_manifest.stdout }}"
```

## Default Variables

```yaml
# roles/istio/defaults/main.yml
# Istio deployment configuration
istio_version: "1.20.2"
istio_profile: "default"  # minimal, default, demo, or custom
istio_proxy_cpu_request: "100m"
istio_proxy_memory_request: "128Mi"
istio_proxy_cpu_limit: "500m"
istio_proxy_memory_limit: "256Mi"
istio_mtls_mode: "STRICT"  # STRICT, PERMISSIVE, or DISABLE
istio_tracing_enabled: true
istio_tracing_sampling: 100
istio_namespaces_to_inject:
  - default
  - production
  - staging
```

## Enabling Sidecar Injection

```yaml
# roles/istio/tasks/sidecar_injection.yml
# Enable automatic sidecar injection for specified namespaces
- name: Enable Istio sidecar injection on namespaces
  kubernetes.core.k8s:
    kind: Namespace
    name: "{{ item }}"
    state: present
    definition:
      metadata:
        labels:
          istio-injection: enabled
  loop: "{{ istio_namespaces_to_inject }}"

- name: Restart deployments to inject sidecars
  ansible.builtin.command:
    cmd: "kubectl rollout restart deployment -n {{ item }}"
  loop: "{{ istio_namespaces_to_inject }}"
  changed_when: true
  when: istio_restart_deployments | default(false)
```

## Configuring mTLS

```yaml
# roles/istio/tasks/mtls.yml
# Configure mutual TLS across the mesh
- name: Apply mesh-wide mTLS policy
  kubernetes.core.k8s:
    state: present
    definition:
      apiVersion: security.istio.io/v1beta1
      kind: PeerAuthentication
      metadata:
        name: default
        namespace: istio-system
      spec:
        mtls:
          mode: "{{ istio_mtls_mode }}"

- name: Apply destination rule for mTLS
  kubernetes.core.k8s:
    state: present
    definition:
      apiVersion: networking.istio.io/v1beta1
      kind: DestinationRule
      metadata:
        name: default
        namespace: istio-system
      spec:
        host: "*.local"
        trafficPolicy:
          tls:
            mode: ISTIO_MUTUAL
```

## Traffic Management

```yaml
# roles/istio/tasks/traffic_management.yml
# Configure traffic routing rules
- name: Deploy virtual services
  kubernetes.core.k8s:
    state: present
    definition:
      apiVersion: networking.istio.io/v1beta1
      kind: VirtualService
      metadata:
        name: "{{ item.name }}"
        namespace: "{{ item.namespace }}"
      spec:
        hosts:
          - "{{ item.host }}"
        http:
          - match:
              - headers:
                  x-canary:
                    exact: "true"
            route:
              - destination:
                  host: "{{ item.host }}"
                  subset: canary
                weight: 100
          - route:
              - destination:
                  host: "{{ item.host }}"
                  subset: stable
                weight: "{{ item.stable_weight | default(90) }}"
              - destination:
                  host: "{{ item.host }}"
                  subset: canary
                weight: "{{ item.canary_weight | default(10) }}"
  loop: "{{ istio_virtual_services }}"

- name: Deploy destination rules with subsets
  kubernetes.core.k8s:
    state: present
    definition:
      apiVersion: networking.istio.io/v1beta1
      kind: DestinationRule
      metadata:
        name: "{{ item.name }}"
        namespace: "{{ item.namespace }}"
      spec:
        host: "{{ item.host }}"
        subsets:
          - name: stable
            labels:
              version: "{{ item.stable_version }}"
          - name: canary
            labels:
              version: "{{ item.canary_version }}"
  loop: "{{ istio_virtual_services }}"
```

## Configuring the Istio Gateway

```yaml
# roles/istio/tasks/gateway.yml
# Set up Istio ingress gateway
- name: Deploy Istio Gateway
  kubernetes.core.k8s:
    state: present
    definition:
      apiVersion: networking.istio.io/v1beta1
      kind: Gateway
      metadata:
        name: main-gateway
        namespace: istio-system
      spec:
        selector:
          istio: ingressgateway
        servers:
          - port:
              number: 80
              name: http
              protocol: HTTP
            hosts:
              - "*.example.com"
            tls:
              httpsRedirect: true
          - port:
              number: 443
              name: https
              protocol: HTTPS
            hosts:
              - "*.example.com"
            tls:
              mode: SIMPLE
              credentialName: example-com-tls
```

## Verification

```yaml
# roles/istio/tasks/verify.yml
# Verify Istio installation and health
- name: Check Istio control plane pods
  kubernetes.core.k8s_info:
    kind: Pod
    namespace: istio-system
    label_selectors:
      - "app=istiod"
  register: istiod_pods

- name: Assert istiod is running
  ansible.builtin.assert:
    that:
      - istiod_pods.resources | length > 0
      - istiod_pods.resources[0].status.phase == 'Running'
    fail_msg: "Istiod is not running"

- name: Verify Istio injection webhook
  kubernetes.core.k8s_info:
    kind: MutatingWebhookConfiguration
    name: istio-sidecar-injector
  register: webhook

- name: Assert injection webhook exists
  ansible.builtin.assert:
    that:
      - webhook.resources | length == 1
```

## Conclusion

Using Ansible to manage Istio gives you reproducible, version-controlled service mesh configurations. The key benefits are consistent installation across clusters, automated mTLS policy management, and traffic routing rules defined as variables that can differ per environment. While Istio has its own tooling, wrapping it in Ansible roles means your service mesh configuration lives alongside the rest of your infrastructure code and follows the same review and deployment processes.
