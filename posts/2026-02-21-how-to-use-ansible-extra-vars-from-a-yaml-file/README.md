# How to Use Ansible Extra Vars from a YAML File

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, Variables, YAML, Automation

Description: How to pass extra variables to Ansible playbooks from YAML files using the extra-vars flag for clean, maintainable deployment configurations.

---

YAML is the natural language of Ansible. When you need to pass external configuration into a playbook with the highest priority, using a YAML file with `--extra-vars` (or `-e`) keeps everything consistent with the rest of your Ansible ecosystem. YAML files are more readable than JSON for complex configurations and support features like comments, multi-line strings, and anchors.

## Basic YAML Extra Vars

Pass a YAML file to a playbook using the `@` prefix.

```bash
# Pass variables from a YAML file
ansible-playbook deploy.yml -e @deploy-vars.yml
```

Here is the YAML variables file:

```yaml
# deploy-vars.yml
# Deployment configuration for the web application
app_version: "2.4.1"
deploy_env: production
worker_count: 8
enable_debug: false
log_level: warn
allowed_ips:
  - "10.0.1.0/24"
  - "10.0.2.0/24"
  - "192.168.1.0/24"
```

And the playbook:

```yaml
# deploy.yml
# Deploys the application using variables from the YAML file
---
- name: Deploy web application
  hosts: appservers
  become: yes
  tasks:
    - name: Display deployment parameters
      ansible.builtin.debug:
        msg:
          - "Deploying version {{ app_version }}"
          - "Environment: {{ deploy_env }}"
          - "Workers: {{ worker_count }}"
          - "Debug: {{ enable_debug }}"
          - "Allowed networks: {{ allowed_ips | join(', ') }}"

    - name: Deploy application configuration
      ansible.builtin.template:
        src: app-config.yml.j2
        dest: /etc/myapp/config.yml
        mode: '0640'
```

## YAML Advantages Over JSON for Extra Vars

YAML has several benefits when used as an extra vars source.

**Comments.** JSON does not support comments. YAML does. This is huge for documenting why variables have certain values.

```yaml
# production-vars.yml
# Last updated: 2026-02-21 by ops team
# Approved in change request CR-4521

# Application settings
app_version: "2.4.1"

# Worker count bumped from 4 to 8 after load test results
# See: https://wiki.internal/load-test-2026-02
worker_count: 8

# SSL certificate paths
# Certificates renewed on 2026-01-15, expires 2027-01-15
ssl_cert: /etc/ssl/certs/myapp.crt
ssl_key: /etc/ssl/private/myapp.key
```

**Multi-line strings.** YAML handles multi-line values cleanly.

```yaml
# vars-with-multiline.yml
motd_message: |
  Welcome to the production server.
  All access is logged and monitored.
  Contact ops@example.com for issues.

nginx_custom_config: |
  location /api {
      proxy_pass http://backend;
      proxy_set_header Host $host;
      proxy_set_header X-Real-IP $remote_addr;
  }
```

**Anchors and aliases.** YAML supports reusable blocks.

```yaml
# vars-with-anchors.yml
defaults: &defaults
  timeout: 30
  retries: 3
  backoff: 2

database:
  <<: *defaults
  host: db.internal.example.com
  port: 5432

cache:
  <<: *defaults
  host: redis.internal.example.com
  port: 6379
```

## Complex Variable Structures

YAML makes complex nested structures readable.

```yaml
# infrastructure-vars.yml
# Complete infrastructure configuration

application:
  name: mywebapp
  version: "2.4.1"
  port: 8080
  features:
    api_v2: true
    websockets: true
    rate_limiting: true
    max_requests_per_minute: 1000

services:
  web:
    replicas: 3
    memory_limit: 512m
    cpu_limit: 1.0
    health_check:
      path: /health
      interval: 10s
      timeout: 5s

  worker:
    replicas: 2
    memory_limit: 1g
    queues:
      - default
      - emails
      - reports

databases:
  primary:
    host: db-primary.internal
    port: 5432
    name: production
    pool_size: 20
  read_replica:
    host: db-replica.internal
    port: 5432
    name: production
    pool_size: 10

monitoring:
  prometheus:
    enabled: true
    port: 9090
    scrape_interval: 15s
  alerting:
    slack_webhook: "https://hooks.slack.com/services/xxx/yyy/zzz"
    pagerduty_key: "abc123def456"
```

```yaml
# use-complex-vars.yml
# Uses the complex YAML variables
---
- name: Configure infrastructure
  hosts: appservers
  become: yes
  tasks:
    - name: Show application details
      ansible.builtin.debug:
        msg:
          - "App: {{ application.name }} v{{ application.version }}"
          - "Web replicas: {{ services.web.replicas }}"
          - "Worker queues: {{ services.worker.queues | join(', ') }}"
          - "DB primary: {{ databases.primary.host }}"

    - name: Deploy web service config
      ansible.builtin.template:
        src: web-service.yml.j2
        dest: /etc/myapp/web-service.yml
        mode: '0644'
```

## Environment-Specific YAML Files

Maintain separate YAML files for each environment and pass the appropriate one at runtime.

```yaml
# environments/development.yml
# Development environment configuration
deploy_env: development
app_domain: dev.myapp.local
ssl_enabled: false
replicas: 1
worker_count: 2
log_level: debug
debug_mode: true
db_host: localhost
db_name: myapp_dev
cache_enabled: false
monitoring_enabled: false
```

```yaml
# environments/staging.yml
# Staging environment configuration
deploy_env: staging
app_domain: staging.myapp.example.com
ssl_enabled: true
replicas: 2
worker_count: 4
log_level: info
debug_mode: false
db_host: db-staging.internal
db_name: myapp_staging
cache_enabled: true
monitoring_enabled: true
```

```yaml
# environments/production.yml
# Production environment configuration
deploy_env: production
app_domain: myapp.example.com
ssl_enabled: true
replicas: 6
worker_count: 16
log_level: warn
debug_mode: false
db_host: db-primary.internal
db_name: myapp_production
cache_enabled: true
monitoring_enabled: true
```

```bash
# Deploy to different environments
ansible-playbook deploy.yml -e @environments/development.yml
ansible-playbook deploy.yml -e @environments/staging.yml
ansible-playbook deploy.yml -e @environments/production.yml
```

## Combining Multiple YAML Files

Layer configurations by passing multiple files. Later files override earlier ones.

```bash
# Base config + environment + secrets
ansible-playbook deploy.yml \
  -e @vars/base.yml \
  -e @vars/environments/production.yml \
  -e @vars/secrets/production.yml
```

```yaml
# vars/base.yml
# Base configuration for all environments
app_name: mywebapp
health_check_path: /health
log_format: json
max_upload_size: 10m

# vars/environments/production.yml
# Production overrides
worker_count: 16
ssl_enabled: true
log_level: warn

# vars/secrets/production.yml (ansible-vault encrypted)
db_password: "s3cret_pr0d_p@ss"
api_key: "pk_live_abc123"
jwt_secret: "super_secret_jwt_key"
```

The precedence is left to right, so `secrets/production.yml` overrides `environments/production.yml` which overrides `base.yml`.

## CI/CD Pipeline Integration

YAML extra vars files integrate well with CI/CD pipelines.

```yaml
# .github/workflows/deploy.yml
# GitHub Actions workflow using YAML extra vars
name: Deploy
on:
  workflow_dispatch:
    inputs:
      environment:
        description: 'Target environment'
        required: true
        type: choice
        options:
          - staging
          - production
      version:
        description: 'Application version'
        required: true

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Generate deployment vars
        run: |
          cat > deploy-vars.yml <<'EOF'
          app_version: "${{ github.event.inputs.version }}"
          deploy_env: "${{ github.event.inputs.environment }}"
          git_commit: "${{ github.sha }}"
          git_ref: "${{ github.ref_name }}"
          pipeline_id: "${{ github.run_id }}"
          deployed_by: "${{ github.actor }}"
          EOF

      - name: Deploy
        run: |
          ansible-playbook deploy.yml \
            -e @environments/${{ github.event.inputs.environment }}.yml \
            -e @deploy-vars.yml
```

## Generating YAML from Scripts

Python makes it easy to generate valid YAML files programmatically.

```python
#!/usr/bin/env python3
# generate-deploy-vars.py
# Generates deployment variables from various sources
import yaml
import subprocess
import requests
from datetime import datetime, timezone

def generate_vars(environment):
    """Generate deployment variables."""
    # Get latest version from release API
    resp = requests.get('https://api.example.com/releases/latest')
    latest = resp.json()

    # Get git info
    git_commit = subprocess.check_output(
        ['git', 'rev-parse', '--short', 'HEAD']
    ).decode().strip()

    config = {
        'app_version': latest['version'],
        'git_commit': git_commit,
        'deploy_env': environment,
        'deploy_timestamp': datetime.now(timezone.utc).isoformat(),
        'release_notes': latest.get('notes', 'No release notes'),
    }

    # Write YAML file
    with open('deploy-vars.yml', 'w') as f:
        yaml.dump(config, f, default_flow_style=False)

    print(f"Generated deploy-vars.yml for {environment}")

if __name__ == '__main__':
    import sys
    env = sys.argv[1] if len(sys.argv) > 1 else 'staging'
    generate_vars(env)
```

```bash
# Generate and use
python3 generate-deploy-vars.py production
ansible-playbook deploy.yml -e @deploy-vars.yml
```

## Validating YAML Extra Vars

Validate that the YAML file contains all required variables.

```yaml
# validate-and-deploy.yml
# Validates YAML extra vars before deployment
---
- name: Validate deployment configuration
  hosts: localhost
  gather_facts: no
  tasks:
    - name: Check required variables
      ansible.builtin.assert:
        that:
          - app_version is defined
          - deploy_env is defined
          - deploy_env in ['development', 'staging', 'production']
        fail_msg: |
          Missing or invalid deployment variables.
          Make sure to pass a YAML file with:
            ansible-playbook deploy.yml -e @deploy-vars.yml

          Required variables:
            app_version: "X.Y.Z"
            deploy_env: development|staging|production

- name: Deploy application
  hosts: appservers
  become: yes
  tasks:
    - name: Proceed with deployment
      ansible.builtin.debug:
        msg: "Deploying {{ app_version }} to {{ deploy_env }}"
```

## Summary

YAML extra vars files are the most Ansible-native way to pass external configuration into playbooks. They support comments for documentation, multi-line strings for embedded configs, complex nested structures for rich data, and anchors for reusable blocks. Pass them with `-e @file.yml`, layer multiple files for configuration inheritance, and generate them from CI/CD pipelines for automated deployments. Since extra vars have the highest precedence in Ansible, they reliably control playbook behavior regardless of other variable sources.
