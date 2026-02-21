# How to Use the to_nice_yaml Filter in Ansible Templates

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, Jinja2, Filters, YAML

Description: Learn how to use the to_nice_yaml filter in Ansible to generate well-formatted, human-readable YAML configuration files.

---

The `to_nice_yaml` filter is the human-friendly version of `to_yaml`. While `to_yaml` gives you functional YAML output, `to_nice_yaml` lets you control indentation, line width, and other formatting options to produce YAML that looks clean and is easy to read. This matters a lot when the generated files will be reviewed by team members, stored in version control, or inspected during troubleshooting.

## Basic Usage

```jinja2
{# Convert a data structure to nicely formatted YAML #}
{{ {"server": {"host": "0.0.0.0", "port": 8080}, "database": {"host": "db.internal", "port": 5432}} | to_nice_yaml }}
```

Output:

```yaml
database:
    host: db.internal
    port: 5432
server:
    host: 0.0.0.0
    port: 8080
```

## Controlling Indentation

The `indent` parameter sets how many spaces are used for each level of nesting:

```jinja2
{# 2-space indentation (common in Kubernetes/Helm) #}
{{ my_data | to_nice_yaml(indent=2) }}

{# 4-space indentation (common in Python projects) #}
{{ my_data | to_nice_yaml(indent=4) }}
```

With `indent=2`:

```yaml
server:
  host: 0.0.0.0
  port: 8080
  features:
    - auth
    - logging
```

With `indent=4`:

```yaml
server:
    host: 0.0.0.0
    port: 8080
    features:
        - auth
        - logging
```

## Controlling Line Width

Long values might wrap awkwardly. Use the `width` parameter to control when line wrapping occurs:

```jinja2
{# Allow lines up to 200 characters before wrapping #}
{{ my_data | to_nice_yaml(indent=2, width=200) }}
```

This is useful when you have long strings (like URLs or connection strings) that should stay on a single line.

## Practical Example: Kubernetes ConfigMap

Here is a realistic example generating a Kubernetes ConfigMap with properly formatted YAML:

```yaml
# k8s_configmap.yml - Generate Kubernetes ConfigMap
- name: Generate application ConfigMap
  hosts: localhost
  vars:
    configmap_data:
      apiVersion: v1
      kind: ConfigMap
      metadata:
        name: "app-config"
        namespace: "production"
        labels:
          app: "web-api"
          environment: "production"
      data:
        DATABASE_HOST: "db-primary.internal"
        DATABASE_PORT: "5432"
        REDIS_HOST: "cache.internal"
        REDIS_PORT: "6379"
        LOG_LEVEL: "info"
  tasks:
    - name: Write ConfigMap manifest
      ansible.builtin.copy:
        content: "{{ configmap_data | to_nice_yaml(indent=2, width=200) }}"
        dest: /opt/k8s/manifests/app-configmap.yml
```

Output:

```yaml
apiVersion: v1
data:
  DATABASE_HOST: db-primary.internal
  DATABASE_PORT: '5432'
  LOG_LEVEL: info
  REDIS_HOST: cache.internal
  REDIS_PORT: '6379'
kind: ConfigMap
metadata:
  labels:
    app: web-api
    environment: production
  name: app-config
  namespace: production
```

## Generating Ansible Inventory Files

You can generate dynamic YAML inventory files using `to_nice_yaml`:

```yaml
# generate_inventory.yml - Build dynamic inventory file
- name: Generate YAML inventory
  hosts: localhost
  vars:
    dynamic_inventory:
      all:
        children:
          web_servers:
            hosts:
              web-01:
                ansible_host: "10.0.1.10"
                http_port: 8080
              web-02:
                ansible_host: "10.0.1.11"
                http_port: 8080
            vars:
              ansible_user: deploy
              ansible_become: true
          db_servers:
            hosts:
              db-01:
                ansible_host: "10.0.2.10"
                pg_port: 5432
              db-02:
                ansible_host: "10.0.2.11"
                pg_port: 5432
            vars:
              ansible_user: dbadmin
  tasks:
    - name: Write inventory file
      ansible.builtin.copy:
        content: "{{ dynamic_inventory | to_nice_yaml(indent=2) }}"
        dest: /opt/ansible/inventories/production.yml
```

## Embedding to_nice_yaml in Templates

When embedding `to_nice_yaml` output inside a Jinja2 template, you need to handle indentation carefully. The `indent` Jinja2 filter is your friend here:

```jinja2
{# docker-compose.yml.j2 - Embed YAML inside a larger document #}
version: "3.8"

services:
{% for service_name, service_config in services.items() %}
  {{ service_name }}:
{{ service_config | to_nice_yaml(indent=2) | indent(4, first=true) }}
{% endfor %}

{% if volumes is defined %}
volumes:
{{ volumes | to_nice_yaml(indent=2) | indent(2, first=true) }}
{% endif %}
```

The pattern is: use `to_nice_yaml` to serialize the data, then use `indent(N, first=true)` to shift the entire block to the right position in the document.

## Generating Prometheus Configuration

```yaml
# prometheus_config.yml - Generate Prometheus config
- name: Configure Prometheus
  hosts: monitoring
  vars:
    prometheus_config:
      global:
        scrape_interval: "15s"
        evaluation_interval: "15s"
      alerting:
        alertmanagers:
          - static_configs:
              - targets:
                  - "alertmanager:9093"
      rule_files:
        - "/etc/prometheus/rules/*.yml"
      scrape_configs:
        - job_name: "node_exporter"
          static_configs:
            - targets: "{{ groups['all'] | map('regex_replace', '$', ':9100') | list }}"
        - job_name: "application"
          metrics_path: "/metrics"
          static_configs:
            - targets: "{{ groups['app_servers'] | map('regex_replace', '$', ':8080') | list }}"
  tasks:
    - name: Write Prometheus config
      ansible.builtin.copy:
        content: "{{ prometheus_config | to_nice_yaml(indent=2, width=200) }}"
        dest: /etc/prometheus/prometheus.yml
        owner: prometheus
        group: prometheus
        mode: "0644"
      notify: Reload Prometheus
```

## Handling the Trailing Newline

`to_nice_yaml` adds a trailing newline by default. This is usually what you want for files, but if you are embedding the output inline, you might want to strip it:

```jinja2
{# Strip trailing newline with the trim filter #}
config: {{ my_data | to_nice_yaml(indent=2) | trim }}
```

## to_nice_yaml vs to_yaml

| Feature | to_yaml | to_nice_yaml |
|---------|---------|--------------|
| Indentation | Fixed 2 spaces | Configurable via indent= |
| Line width | Default PyYAML | Configurable via width= |
| Output style | Compact | Expanded, readable |
| Best for | Machine processing | Human reading |

## Generating Helm Values Files

Helm charts use YAML values files that benefit from clean formatting:

```yaml
# helm_values.yml - Generate Helm values file
- name: Generate Helm values
  hosts: localhost
  vars:
    helm_values:
      replicaCount: 3
      image:
        repository: "myregistry.io/web-api"
        tag: "v2.1.0"
        pullPolicy: "IfNotPresent"
      service:
        type: "ClusterIP"
        port: 80
      ingress:
        enabled: true
        className: "nginx"
        annotations:
          cert-manager.io/cluster-issuer: "letsencrypt-prod"
        hosts:
          - host: "api.example.com"
            paths:
              - path: "/"
                pathType: "Prefix"
        tls:
          - secretName: "api-tls"
            hosts:
              - "api.example.com"
      resources:
        limits:
          cpu: "500m"
          memory: "512Mi"
        requests:
          cpu: "100m"
          memory: "128Mi"
      autoscaling:
        enabled: true
        minReplicas: 3
        maxReplicas: 10
        targetCPUUtilizationPercentage: 75
  tasks:
    - name: Write Helm values
      ansible.builtin.copy:
        content: "{{ helm_values | to_nice_yaml(indent=2, width=200) }}"
        dest: /opt/helm/web-api/values-production.yaml
```

## Generating Ansible Role Defaults

You can even use `to_nice_yaml` to generate default variable files for Ansible roles:

```yaml
# generate_defaults.yml - Build role defaults from a template
- name: Generate role defaults
  hosts: localhost
  vars:
    role_defaults:
      myapp_port: 8080
      myapp_user: "myapp"
      myapp_group: "myapp"
      myapp_install_dir: "/opt/myapp"
      myapp_log_dir: "/var/log/myapp"
      myapp_config_dir: "/etc/myapp"
      myapp_packages:
        - "python3"
        - "python3-pip"
        - "python3-venv"
      myapp_environment:
        PYTHONPATH: "/opt/myapp/lib"
        LC_ALL: "en_US.UTF-8"
  tasks:
    - name: Write role defaults
      ansible.builtin.copy:
        content: |
          ---
          # Default variables for the myapp role
          # Override these in group_vars or host_vars as needed
          {{ role_defaults | to_nice_yaml(indent=2) }}
        dest: roles/myapp/defaults/main.yml
```

## Dealing with Strings That Look Like Other Types

PyYAML can sometimes serialize strings in unexpected ways. Values like "yes", "no", "true", "false", "null", "1.0" might get treated as booleans, nulls, or floats:

```jinja2
{# This might render "on" as a boolean true #}
{{ {"feature_flag": "on"} | to_nice_yaml }}
```

To force string output, you may need to quote the value explicitly in your variables or use a workaround:

```yaml
# Force string types where needed
vars:
  config:
    feature_flag: "on"  # PyYAML might still interpret this
    version: "1.0"      # Could become float 1.0
```

If this is a concern, consider using `to_nice_json` instead, which has unambiguous string handling, or post-process the YAML output.

## Wrapping Up

The `to_nice_yaml` filter is essential for generating YAML files that humans will read and work with. The `indent` parameter lets you match whatever convention your project uses, and the `width` parameter prevents awkward line wrapping. Combined with the `indent` Jinja2 filter for embedding within larger documents, `to_nice_yaml` gives you full control over YAML generation in your Ansible automation. Use it for Kubernetes manifests, Helm values, Docker Compose files, CI/CD configs, and any other YAML-based configuration your infrastructure needs.
