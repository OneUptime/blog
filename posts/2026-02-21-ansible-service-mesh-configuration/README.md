# How to Use Ansible for Service Mesh Configuration

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, Service Mesh, Istio, Kubernetes

Description: Automate service mesh installation and configuration using Ansible to manage traffic routing, mTLS, and observability across your microservices.

---

Service meshes add a layer of infrastructure between your microservices to handle traffic management, security, and observability. Setting up a service mesh like Istio or Linkerd involves many moving parts, and Ansible can automate the installation, configuration, and ongoing management of these components.

This guide shows how to use Ansible to deploy and configure a service mesh in a Kubernetes environment.

## Why Automate Service Mesh Configuration

A service mesh involves installing control plane components, configuring sidecar injection, setting up traffic policies, managing certificates, and tuning performance. Doing this manually is error-prone and hard to reproduce. With Ansible, you codify every configuration decision and can replicate it across clusters.

## Installing Istio with Ansible

Here is a role that installs Istio on a Kubernetes cluster:

```yaml
# roles/istio_install/tasks/main.yml
# Install Istio service mesh on Kubernetes
---
- name: Download Istio release
  ansible.builtin.get_url:
    url: "https://github.com/istio/istio/releases/download/{{ istio_version }}/istio-{{ istio_version }}-linux-amd64.tar.gz"
    dest: "/tmp/istio-{{ istio_version }}.tar.gz"
    mode: '0644'

- name: Extract Istio
  ansible.builtin.unarchive:
    src: "/tmp/istio-{{ istio_version }}.tar.gz"
    dest: /opt/
    remote_src: true
    creates: "/opt/istio-{{ istio_version }}"

- name: Create symlink for istioctl
  ansible.builtin.file:
    src: "/opt/istio-{{ istio_version }}/bin/istioctl"
    dest: /usr/local/bin/istioctl
    state: link

- name: Install Istio with custom profile
  ansible.builtin.command:
    cmd: >
      istioctl install
      --set profile={{ istio_profile }}
      --set meshConfig.accessLogFile=/dev/stdout
      --set meshConfig.enableTracing=true
      --set values.pilot.resources.requests.memory=256Mi
      --set values.pilot.resources.requests.cpu=200m
      -y
  environment:
    KUBECONFIG: "{{ kubeconfig_path }}"
  register: istio_install
  changed_when: "'installed' in istio_install.stdout"

- name: Wait for Istio control plane to be ready
  kubernetes.core.k8s_info:
    kind: Deployment
    namespace: istio-system
    name: istiod
    wait: true
    wait_timeout: 300
    wait_condition:
      type: Available
      status: "True"
```

## Configuring Namespace Injection

Enable automatic sidecar injection for specific namespaces:

```yaml
# roles/istio_config/tasks/namespaces.yml
# Configure sidecar injection per namespace
---
- name: Label namespaces for sidecar injection
  kubernetes.core.k8s:
    state: present
    definition:
      apiVersion: v1
      kind: Namespace
      metadata:
        name: "{{ item }}"
        labels:
          istio-injection: enabled
  loop: "{{ istio_injected_namespaces }}"

- name: Label namespaces to skip injection
  kubernetes.core.k8s:
    state: present
    definition:
      apiVersion: v1
      kind: Namespace
      metadata:
        name: "{{ item }}"
        labels:
          istio-injection: disabled
  loop: "{{ istio_excluded_namespaces | default(['kube-system', 'monitoring']) }}"
```

## Traffic Management

One of the most valuable features of a service mesh is traffic management. Here is how to set up traffic splitting for canary deployments:

```yaml
# roles/istio_config/tasks/traffic.yml
# Configure traffic routing rules
---
- name: Create VirtualService for canary deployment
  kubernetes.core.k8s:
    state: present
    definition:
      apiVersion: networking.istio.io/v1beta1
      kind: VirtualService
      metadata:
        name: "{{ app_name }}"
        namespace: "{{ app_namespace }}"
      spec:
        hosts:
          - "{{ app_name }}"
        http:
          - match:
              - headers:
                  x-canary:
                    exact: "true"
            route:
              - destination:
                  host: "{{ app_name }}"
                  subset: canary
          - route:
              - destination:
                  host: "{{ app_name }}"
                  subset: stable
                weight: "{{ stable_weight | default(90) }}"
              - destination:
                  host: "{{ app_name }}"
                  subset: canary
                weight: "{{ canary_weight | default(10) }}"

- name: Create DestinationRule with subsets
  kubernetes.core.k8s:
    state: present
    definition:
      apiVersion: networking.istio.io/v1beta1
      kind: DestinationRule
      metadata:
        name: "{{ app_name }}"
        namespace: "{{ app_namespace }}"
      spec:
        host: "{{ app_name }}"
        trafficPolicy:
          connectionPool:
            tcp:
              maxConnections: 100
            http:
              h2UpgradePolicy: DEFAULT
              http1MaxPendingRequests: 100
              http2MaxRequests: 1000
          outlierDetection:
            consecutive5xxErrors: 3
            interval: 30s
            baseEjectionTime: 30s
        subsets:
          - name: stable
            labels:
              version: "{{ stable_version }}"
          - name: canary
            labels:
              version: "{{ canary_version }}"
```

## Mutual TLS Configuration

Service meshes enforce encrypted communication between services. Configure mTLS policies:

```yaml
# roles/istio_config/tasks/security.yml
# Configure mTLS and authorization policies
---
- name: Enable strict mTLS mesh-wide
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
          mode: STRICT

- name: Create authorization policy for frontend
  kubernetes.core.k8s:
    state: present
    definition:
      apiVersion: security.istio.io/v1beta1
      kind: AuthorizationPolicy
      metadata:
        name: "{{ app_name }}-policy"
        namespace: "{{ app_namespace }}"
      spec:
        selector:
          matchLabels:
            app: "{{ app_name }}"
        action: ALLOW
        rules:
          - from:
              - source:
                  principals:
                    - "cluster.local/ns/{{ app_namespace }}/sa/{{ item }}"
            to:
              - operation:
                  methods: ["GET", "POST"]
                  paths: ["/api/*"]
          loop: "{{ allowed_service_accounts }}"
```

## Rate Limiting with EnvoyFilter

Apply rate limiting through Envoy configuration:

```yaml
# roles/istio_config/tasks/rate-limit.yml
# Configure rate limiting for services
---
- name: Apply rate limit EnvoyFilter
  kubernetes.core.k8s:
    state: present
    definition:
      apiVersion: networking.istio.io/v1alpha3
      kind: EnvoyFilter
      metadata:
        name: "{{ app_name }}-ratelimit"
        namespace: "{{ app_namespace }}"
      spec:
        workloadSelector:
          labels:
            app: "{{ app_name }}"
        configPatches:
          - applyTo: HTTP_FILTER
            match:
              context: SIDECAR_INBOUND
              listener:
                filterChain:
                  filter:
                    name: envoy.filters.network.http_connection_manager
            patch:
              operation: INSERT_BEFORE
              value:
                name: envoy.filters.http.local_ratelimit
                typed_config:
                  "@type": type.googleapis.com/udpa.type.v1.TypedStruct
                  type_url: type.googleapis.com/envoy.extensions.filters.http.local_ratelimit.v3.LocalRateLimit
                  value:
                    stat_prefix: http_local_rate_limiter
                    token_bucket:
                      max_tokens: "{{ rate_limit_max_tokens | default(100) }}"
                      tokens_per_fill: "{{ rate_limit_refill | default(50) }}"
                      fill_interval: 60s
```

## Observability Setup

Configure the mesh to export telemetry data:

```yaml
# roles/istio_config/tasks/observability.yml
# Set up mesh observability components
---
- name: Configure Istio telemetry
  kubernetes.core.k8s:
    state: present
    definition:
      apiVersion: telemetry.istio.io/v1alpha1
      kind: Telemetry
      metadata:
        name: mesh-default
        namespace: istio-system
      spec:
        metrics:
          - providers:
              - name: prometheus
        tracing:
          - providers:
              - name: zipkin
            randomSamplingPercentage: "{{ tracing_sample_rate | default(1.0) }}"

- name: Deploy Kiali dashboard
  ansible.builtin.command:
    cmd: kubectl apply -f https://raw.githubusercontent.com/istio/istio/release-{{ istio_major_version }}/samples/addons/kiali.yaml
  environment:
    KUBECONFIG: "{{ kubeconfig_path }}"
  register: kiali_result
  changed_when: "'created' in kiali_result.stdout or 'configured' in kiali_result.stdout"
```

## Playbook to Tie It All Together

```yaml
# playbooks/setup-service-mesh.yml
# Complete service mesh setup
---
- name: Configure service mesh
  hosts: k8s_control_plane
  become: true
  vars:
    istio_version: "1.20.0"
    istio_profile: default
    istio_injected_namespaces:
      - production
      - staging
      - default

  roles:
    - istio_install
    - istio_config
```

## Key Takeaways

Using Ansible to manage service mesh configuration gives you version-controlled, repeatable mesh setups. You can define traffic policies, mTLS rules, rate limits, and observability settings as code, apply them consistently across environments, and review changes through pull requests before they go live. This approach works especially well when you manage multiple Kubernetes clusters that all need the same mesh configuration.
