# How to Use Ansible to Apply Kubernetes Manifests from Templates

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, Kubernetes, Jinja2, Templates, DevOps

Description: Use Ansible Jinja2 templates to generate dynamic Kubernetes manifests with environment-specific values, conditionals, and loops.

---

While applying static manifest files works for simple cases, real-world deployments need dynamic configuration. Different environments need different replica counts, resource limits, and feature flags. Ansible's Jinja2 templating engine lets you create parameterized Kubernetes manifests that adapt to any environment, and the `template` lookup makes it seamless.

This guide shows how to use Jinja2 templates to generate Kubernetes manifests dynamically, covering variable substitution, conditionals, loops, and advanced patterns for managing complex deployments.

## Prerequisites

- Ansible 2.12+ with `kubernetes.core` collection
- Familiarity with Jinja2 template syntax
- A valid kubeconfig

```bash
ansible-galaxy collection install kubernetes.core
pip install kubernetes
```

## Basic Template with Variable Substitution

Start with a Deployment template that uses variables for environment-specific values.

Create the template file:

```yaml
# templates/deployment.yml.j2
# Jinja2 template for a Kubernetes Deployment
apiVersion: apps/v1
kind: Deployment
metadata:
  name: {{ app_name }}
  namespace: {{ namespace }}
  labels:
    app: {{ app_name }}
    environment: {{ env }}
    version: "{{ app_version }}"
spec:
  replicas: {{ replicas }}
  selector:
    matchLabels:
      app: {{ app_name }}
  template:
    metadata:
      labels:
        app: {{ app_name }}
        version: "{{ app_version }}"
    spec:
      containers:
        - name: {{ app_name }}
          image: {{ image_registry }}/{{ app_name }}:{{ app_version }}
          ports:
            - containerPort: {{ container_port }}
          resources:
            requests:
              cpu: "{{ cpu_request }}"
              memory: "{{ memory_request }}"
            limits:
              cpu: "{{ cpu_limit }}"
              memory: "{{ memory_limit }}"
          env:
            - name: ENVIRONMENT
              value: "{{ env }}"
            - name: LOG_LEVEL
              value: "{{ log_level }}"
```

Apply it with the `template` lookup:

```yaml
# playbook: deploy-from-template.yml
# Generates and applies a Deployment from a Jinja2 template
---
- name: Deploy application from template
  hosts: localhost
  connection: local
  gather_facts: false

  vars:
    app_name: web-api
    namespace: production
    env: production
    app_version: "2.5.0"
    image_registry: "registry.company.com"
    container_port: 8080
    replicas: 5
    cpu_request: "200m"
    memory_request: "256Mi"
    cpu_limit: "1"
    memory_limit: "512Mi"
    log_level: "warn"

  tasks:
    - name: Apply deployment from template
      kubernetes.core.k8s:
        state: present
        definition: "{{ lookup('template', 'templates/deployment.yml.j2') | from_yaml }}"
```

The `lookup('template', ...)` renders the Jinja2 template with the current variable context, and `from_yaml` converts the resulting string into a dictionary that the `k8s` module can work with.

## Templates with Conditionals

Jinja2 conditionals let you include or exclude configuration blocks based on the target environment.

```yaml
# templates/deployment-advanced.yml.j2
# Template with conditional resource limits and probes
apiVersion: apps/v1
kind: Deployment
metadata:
  name: {{ app_name }}
  namespace: {{ namespace }}
spec:
  replicas: {{ replicas }}
  selector:
    matchLabels:
      app: {{ app_name }}
  template:
    metadata:
      labels:
        app: {{ app_name }}
{% if enable_prometheus_scraping | default(false) %}
      annotations:
        prometheus.io/scrape: "true"
        prometheus.io/port: "{{ metrics_port | default('9090') }}"
{% endif %}
    spec:
{% if image_pull_secret is defined %}
      imagePullSecrets:
        - name: {{ image_pull_secret }}
{% endif %}
      containers:
        - name: {{ app_name }}
          image: {{ image_registry }}/{{ app_name }}:{{ app_version }}
          ports:
            - containerPort: {{ container_port }}
{% if enable_health_checks | default(true) %}
          readinessProbe:
            httpGet:
              path: {{ health_path | default('/health') }}
              port: {{ container_port }}
            initialDelaySeconds: 10
            periodSeconds: 5
          livenessProbe:
            httpGet:
              path: {{ health_path | default('/health') }}
              port: {{ container_port }}
            initialDelaySeconds: 30
            periodSeconds: 10
{% endif %}
{% if env == 'production' %}
          resources:
            requests:
              cpu: "500m"
              memory: "512Mi"
            limits:
              cpu: "2"
              memory: "2Gi"
{% else %}
          resources:
            requests:
              cpu: "100m"
              memory: "128Mi"
            limits:
              cpu: "500m"
              memory: "256Mi"
{% endif %}
```

## Templates with Loops

Generate multiple similar resources from a single template.

```yaml
# templates/services.yml.j2
# Generates a Service for each microservice in the list
{% for svc in services %}
---
apiVersion: v1
kind: Service
metadata:
  name: {{ svc.name }}
  namespace: {{ namespace }}
  labels:
    app: {{ svc.name }}
spec:
  type: {{ svc.type | default('ClusterIP') }}
  selector:
    app: {{ svc.name }}
  ports:
{% for port in svc.ports %}
    - name: {{ port.name }}
      port: {{ port.port }}
      targetPort: {{ port.target_port }}
      protocol: {{ port.protocol | default('TCP') }}
{% endfor %}
{% endfor %}
```

```yaml
# playbook: create-services-from-template.yml
# Creates multiple services from a single template
---
- name: Create services from template
  hosts: localhost
  connection: local
  gather_facts: false

  vars:
    namespace: production
    services:
      - name: user-api
        ports:
          - name: http
            port: 80
            target_port: 3000
      - name: order-api
        ports:
          - name: http
            port: 80
            target_port: 3001
          - name: grpc
            port: 9090
            target_port: 9090
      - name: payment-api
        type: ClusterIP
        ports:
          - name: http
            port: 80
            target_port: 3002

  tasks:
    - name: Apply services from template
      kubernetes.core.k8s:
        state: present
        definition: "{{ lookup('template', 'templates/services.yml.j2') | from_yaml_all }}"
```

Note the use of `from_yaml_all` instead of `from_yaml`. The template generates multiple YAML documents (separated by `---`), so `from_yaml_all` parses all of them into a list.

## Environment-Specific Variable Files

Pair templates with per-environment variable files for maximum flexibility.

```yaml
# vars/staging.yml
# Variable overrides for the staging environment
env: staging
namespace: staging
replicas: 1
image_registry: registry.company.com
app_version: "2.5.0-rc1"
log_level: debug
enable_prometheus_scraping: true
enable_health_checks: true
cpu_request: "100m"
memory_request: "128Mi"
cpu_limit: "500m"
memory_limit: "256Mi"
```

```yaml
# vars/production.yml
# Variable overrides for the production environment
env: production
namespace: production
replicas: 10
image_registry: registry.company.com
app_version: "2.4.0"
log_level: warn
enable_prometheus_scraping: true
enable_health_checks: true
image_pull_secret: registry-creds
cpu_request: "500m"
memory_request: "512Mi"
cpu_limit: "2"
memory_limit: "2Gi"
```

```yaml
# playbook: deploy.yml
# Deploys to any environment using the appropriate vars file
---
- name: Deploy application
  hosts: localhost
  connection: local
  gather_facts: false

  vars:
    target_env: "{{ env | default('staging') }}"
    app_name: web-api
    container_port: 8080

  vars_files:
    - "vars/{{ target_env }}.yml"

  tasks:
    - name: Apply deployment
      kubernetes.core.k8s:
        state: present
        definition: "{{ lookup('template', 'templates/deployment-advanced.yml.j2') | from_yaml }}"

    - name: Apply service
      kubernetes.core.k8s:
        state: present
        definition: "{{ lookup('template', 'templates/service.yml.j2') | from_yaml }}"
```

Deploy to staging or production:

```bash
# Deploy to staging (default)
ansible-playbook deploy.yml

# Deploy to production
ansible-playbook deploy.yml -e env=production
```

## Full Stack Template

For applications with multiple interdependent resources, a single template can generate everything.

```yaml
# templates/full-stack.yml.j2
# Complete application stack: ConfigMap, Deployment, Service, HPA
---
apiVersion: v1
kind: ConfigMap
metadata:
  name: {{ app_name }}-config
  namespace: {{ namespace }}
data:
  LOG_LEVEL: "{{ log_level }}"
  PORT: "{{ container_port }}"
{% for key, value in extra_config.items() %}
  {{ key }}: "{{ value }}"
{% endfor %}
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: {{ app_name }}
  namespace: {{ namespace }}
spec:
  replicas: {{ replicas }}
  selector:
    matchLabels:
      app: {{ app_name }}
  template:
    metadata:
      labels:
        app: {{ app_name }}
    spec:
      containers:
        - name: {{ app_name }}
          image: {{ image_registry }}/{{ app_name }}:{{ app_version }}
          ports:
            - containerPort: {{ container_port }}
          envFrom:
            - configMapRef:
                name: {{ app_name }}-config
---
apiVersion: v1
kind: Service
metadata:
  name: {{ app_name }}
  namespace: {{ namespace }}
spec:
  selector:
    app: {{ app_name }}
  ports:
    - port: 80
      targetPort: {{ container_port }}
{% if enable_hpa | default(false) %}
---
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: {{ app_name }}-hpa
  namespace: {{ namespace }}
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: {{ app_name }}
  minReplicas: {{ hpa_min | default(replicas) }}
  maxReplicas: {{ hpa_max | default(replicas * 5) }}
  metrics:
    - type: Resource
      resource:
        name: cpu
        target:
          type: Utilization
          averageUtilization: {{ hpa_cpu_target | default(70) }}
{% endif %}
```

```yaml
# playbook: deploy-full-stack.yml
---
- name: Deploy full application stack
  hosts: localhost
  connection: local
  gather_facts: false

  vars:
    app_name: web-api
    namespace: production
    env: production
    replicas: 5
    app_version: "2.5.0"
    image_registry: registry.company.com
    container_port: 8080
    log_level: warn
    enable_hpa: true
    hpa_min: 5
    hpa_max: 50
    extra_config:
      CACHE_TTL: "300"
      MAX_CONNECTIONS: "100"

  tasks:
    - name: Apply full stack from template
      kubernetes.core.k8s:
        state: present
        definition: "{{ item }}"
      loop: "{{ lookup('template', 'templates/full-stack.yml.j2') | from_yaml_all }}"
      loop_control:
        label: "{{ item.kind }}/{{ item.metadata.name }}"
```

## Summary

Jinja2 templates are the bridge between static Kubernetes manifests and fully dynamic, environment-aware deployments. They let you keep a single source of truth for your application definitions while generating environment-specific configurations at deploy time. Combine templates with per-environment variable files, and you have a system where deploying to staging versus production is just a variable switch. The `lookup('template', ...)` and `from_yaml` pipeline integrates cleanly with the `kubernetes.core.k8s` module, giving you the full power of Ansible's templating engine for Kubernetes resource management.
