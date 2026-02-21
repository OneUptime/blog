# How to Use the to_yaml Filter in Ansible Templates

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, Jinja2, Filters, YAML

Description: Learn how to use the to_yaml filter in Ansible templates to serialize data structures into YAML format for configuration files.

---

YAML is the native language of Ansible, and many tools in the DevOps ecosystem use YAML for configuration: Kubernetes manifests, Docker Compose files, CI/CD pipelines, and more. The `to_yaml` filter converts any Ansible data structure into a YAML-formatted string. This is essential when you need to dynamically generate YAML configuration files from your playbook variables.

## Basic Usage

The `to_yaml` filter serializes a dictionary, list, or any other data type into YAML:

```jinja2
{# Convert a dictionary to YAML #}
{{ {"name": "myapp", "version": "2.1.0", "replicas": 3} | to_yaml }}
```

Output:

```yaml
name: myapp
replicas: 3
version: 2.1.0
```

Notice that `to_yaml` produces block-style YAML by default and sorts the keys alphabetically. This is a reasonable default for configuration files.

## Lists Get Proper YAML Formatting

```jinja2
{# Convert a list to YAML #}
{{ ["nginx", "postgresql", "redis"] | to_yaml }}
```

Output:

```yaml
- nginx
- postgresql
- redis
```

## Generating Kubernetes Manifests

One of the most practical uses of `to_yaml` is generating Kubernetes resource definitions:

```yaml
# k8s_deploy.yml - Generate Kubernetes deployment manifest
- name: Generate Kubernetes deployment
  hosts: localhost
  vars:
    app_name: "web-api"
    app_image: "myregistry.io/web-api:v2.1.0"
    app_replicas: 3
    app_port: 8080
    app_env:
      DATABASE_URL: "postgresql://db.internal:5432/myapp"
      REDIS_URL: "redis://cache.internal:6379/0"
      LOG_LEVEL: "info"
    resource_limits:
      cpu: "500m"
      memory: "512Mi"
    resource_requests:
      cpu: "100m"
      memory: "128Mi"
  tasks:
    - name: Generate deployment manifest
      ansible.builtin.template:
        src: deployment.yml.j2
        dest: "/tmp/{{ app_name }}-deployment.yml"
```

```jinja2
{# deployment.yml.j2 - Kubernetes deployment template #}
apiVersion: apps/v1
kind: Deployment
metadata:
  name: {{ app_name }}
  labels:
    app: {{ app_name }}
spec:
  replicas: {{ app_replicas }}
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
          image: {{ app_image }}
          ports:
            - containerPort: {{ app_port }}
          env:
{% for key, value in app_env.items() %}
            - name: {{ key }}
              value: "{{ value }}"
{% endfor %}
          resources:
            limits:
{{ resource_limits | to_yaml | indent(14, first=true) }}
            requests:
{{ resource_requests | to_yaml | indent(14, first=true) }}
```

The key technique here is using `to_yaml` combined with `indent` to properly nest the YAML output within the larger document.

## The indent Filter and to_yaml

When embedding `to_yaml` output inside a larger YAML document, indentation is critical. The `indent` filter controls how many spaces to prepend:

```jinja2
{# Indent the YAML output by 4 spaces #}
{{ my_dict | to_yaml | indent(4) }}

{# Indent and also indent the first line #}
{{ my_dict | to_yaml | indent(4, first=true) }}
```

Here is the difference:

```jinja2
{# Without first=true, first line is not indented #}
config:
{{ {"key1": "value1", "key2": "value2"} | to_yaml | indent(4) }}
```

Output:

```yaml
config:
key1: value1
    key2: value2
```

That is broken. With `first=true`:

```jinja2
config:
{{ {"key1": "value1", "key2": "value2"} | to_yaml | indent(4, first=true) }}
```

Output:

```yaml
config:
    key1: value1
    key2: value2
```

Much better. Always use `indent(N, first=true)` when the `to_yaml` output needs to be nested.

## Generating Docker Compose Files

```yaml
# docker_compose.yml - Generate Docker Compose configuration
- name: Generate Docker Compose file
  hosts: localhost
  vars:
    compose_services:
      web:
        image: "nginx:latest"
        ports:
          - "80:80"
          - "443:443"
        volumes:
          - "./nginx.conf:/etc/nginx/nginx.conf:ro"
        depends_on:
          - app
      app:
        image: "myapp:latest"
        environment:
          NODE_ENV: "production"
          PORT: "3000"
        deploy:
          replicas: 3
      redis:
        image: "redis:7-alpine"
        ports:
          - "6379:6379"
  tasks:
    - name: Write docker-compose.yml
      ansible.builtin.template:
        src: docker-compose.yml.j2
        dest: /opt/myapp/docker-compose.yml
```

```jinja2
{# docker-compose.yml.j2 - Docker Compose from variables #}
version: "3.8"

services:
{{ compose_services | to_yaml | indent(2, first=true) }}
```

## Handling YAML Formatting Quirks

The `to_yaml` filter uses PyYAML for serialization, which has some behaviors you should know about:

**Long strings may get folded.** PyYAML sometimes wraps long strings with YAML folded or literal block scalars. If you need to control this behavior, use `to_nice_yaml` with the `width` parameter.

**Booleans are serialized as Python booleans.** In PyYAML, `true`/`false` are the default:

```jinja2
{{ {"enabled": true, "debug": false} | to_yaml }}
{# Output: {debug: false, enabled: true} #}
```

**Numbers stay as numbers:**

```jinja2
{{ {"port": 8080, "ratio": 0.75} | to_yaml }}
{# Output: {port: 8080, ratio: 0.75} #}
```

## Using to_yaml in Task Parameters

You can use `to_yaml` directly in tasks, not just templates:

```yaml
# write_yaml.yml - Write YAML files using to_yaml
- name: Write application config
  ansible.builtin.copy:
    content: |
      # Application Configuration
      # Generated by Ansible
      {{ app_config | to_yaml | indent(6) }}
    dest: /etc/myapp/config.yml

- name: Append to existing YAML file
  ansible.builtin.blockinfile:
    path: /etc/myapp/config.yml
    block: |
      {{ extra_config | to_yaml | indent(6) }}
    marker: "# {mark} ANSIBLE MANAGED EXTRA CONFIG"
```

## Building Dynamic YAML Structures

A common pattern is building up a data structure dynamically and then serializing it:

```yaml
# dynamic_yaml.yml - Build YAML config dynamically
- name: Build dynamic config
  hosts: app_servers
  tasks:
    - name: Start with base configuration
      ansible.builtin.set_fact:
        final_config:
          app:
            name: "{{ app_name }}"
            port: "{{ app_port }}"

    - name: Add logging config for production
      ansible.builtin.set_fact:
        final_config: >-
          {{ final_config | combine({
            'logging': {
              'level': 'warn',
              'format': 'json',
              'file': '/var/log/' + app_name + '/app.log'
            }
          }, recursive=true) }}
      when: deploy_env == 'production'

    - name: Add logging config for development
      ansible.builtin.set_fact:
        final_config: >-
          {{ final_config | combine({
            'logging': {
              'level': 'debug',
              'format': 'text',
              'file': 'stdout'
            }
          }, recursive=true) }}
      when: deploy_env == 'development'

    - name: Write final configuration
      ansible.builtin.copy:
        content: "{{ final_config | to_yaml }}"
        dest: /etc/myapp/config.yml
```

## Generating CI/CD Pipeline Configs

Here is an example that generates a GitLab CI configuration based on project settings:

```yaml
# generate_ci.yml - Generate CI pipeline config
- name: Generate CI configuration
  hosts: localhost
  vars:
    project_stages:
      - build
      - test
      - deploy
    build_image: "golang:1.21"
    test_commands:
      - "go test ./..."
      - "go vet ./..."
    deploy_environments:
      - name: staging
        url: "https://staging.example.com"
        auto: true
      - name: production
        url: "https://example.com"
        auto: false
  tasks:
    - name: Build CI config object
      ansible.builtin.set_fact:
        ci_config:
          stages: "{{ project_stages }}"
          build:
            stage: build
            image: "{{ build_image }}"
            script:
              - "go build -o app ."
            artifacts:
              paths:
                - app
          test:
            stage: test
            image: "{{ build_image }}"
            script: "{{ test_commands }}"

    - name: Write CI config
      ansible.builtin.copy:
        content: "{{ ci_config | to_yaml }}"
        dest: .gitlab-ci.yml
```

## to_yaml vs to_nice_yaml

| Feature | to_yaml | to_nice_yaml |
|---------|---------|--------------|
| Indentation | Default (2 spaces) | Configurable |
| Line width | Default | Configurable |
| Readability | Functional | Optimized for reading |
| Use case | Machine consumption | Human editing |

For files that humans will read and potentially edit, prefer `to_nice_yaml`. For files that are purely machine-consumed or intermediate artifacts, `to_yaml` is fine.

## Wrapping Up

The `to_yaml` filter bridges the gap between Ansible's internal data structures and the YAML files that so many tools depend on. Whether you are generating Kubernetes manifests, Docker Compose files, CI/CD configurations, or application config files, `to_yaml` handles the serialization for you. The main thing to remember is to combine it with the `indent` filter when embedding the output within a larger YAML document, and to use `to_nice_yaml` when human readability matters.
