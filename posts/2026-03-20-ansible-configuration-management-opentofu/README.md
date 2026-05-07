# How to Use Ansible for Configuration Management After OpenTofu Apply

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Ansible, Configuration Management, Post-Apply, Automation

Description: Learn how to structure a workflow where OpenTofu provisions infrastructure and Ansible takes over for idempotent configuration management, with proper handoff between the two tools.

## Introduction

OpenTofu creates the infrastructure; Ansible configures what runs on it. The key to a clean workflow is a well-defined handoff: OpenTofu outputs the connection details, Ansible reads them and configures the servers. This separation keeps each tool in its domain and makes the pipeline maintainable.

## OpenTofu Side: Outputting What Ansible Needs

```hcl
# outputs.tf

output "ansible_vars" {
  description = "Variables to pass to Ansible"
  value = {
    # Infrastructure connection details
    web_server_ips  = aws_instance.web[*].public_ip
    app_server_ips  = aws_instance.app[*].private_ip
    bastion_ip      = aws_instance.bastion.public_ip

    # Service endpoints
    db_endpoint     = aws_db_instance.main.endpoint
    db_name         = var.db_name
    redis_endpoint  = aws_elasticache_replication_group.main.primary_endpoint_address
    s3_bucket       = aws_s3_bucket.app_assets.id

    # Configuration values
    environment     = var.environment
    region          = var.aws_region
    domain_name     = var.domain_name
  }
}
```

## Ansible Playbook Reading OpenTofu Outputs

```yaml
# playbooks/configure-app.yml
---
- name: Configure Application Servers
  hosts: app_servers
  become: yes

  pre_tasks:
    - name: Load OpenTofu outputs
      include_vars:
        file: "{{ playbook_dir }}/../vars/opentofu-outputs.json"

  roles:
    - common
    - app-server
    - monitoring

  vars:
    database_url: "postgresql://{{ db_user }}:{{ db_password }}@{{ db_endpoint }}/{{ db_name }}"
    redis_url: "redis://{{ redis_endpoint }}:6379/0"
```

## Bridge Script: OpenTofu Outputs to Ansible Vars

```bash
#!/bin/bash
# scripts/sync-tofu-to-ansible.sh

set -euo pipefail

TOFU_DIR="${1:-./infrastructure}"
ANSIBLE_VARS_DIR="${2:-./ansible/vars}"

mkdir -p "$ANSIBLE_VARS_DIR"

# Get OpenTofu outputs as JSON and flatten them into Ansible vars
tofu -chdir="$TOFU_DIR" output -json | python3 -c '
import json, sys

outputs = json.load(sys.stdin)
ansible_vars = {}

for key, output in outputs.items():
    if output.get("sensitive", False):
        continue

    value = output["value"]
    if key == "ansible_vars" and isinstance(value, dict):
        ansible_vars.update(value)
    else:
        ansible_vars[key] = value

json.dump(ansible_vars, sys.stdout, indent=2)
sys.stdout.write("\n")
' > "${ANSIBLE_VARS_DIR}/opentofu-outputs.json"

echo "Ansible vars written to ${ANSIBLE_VARS_DIR}/opentofu-outputs.json"
```

## Ansible Role for App Server Configuration

```yaml
# roles/app-server/tasks/main.yml
---
- name: Install application dependencies
  apt:
    name:
      - python3
      - python3-pip
      - nginx
    state: present
    update_cache: yes

- name: Configure application environment
  template:
    src: app.env.j2
    dest: /etc/app/environment
    owner: app
    group: app
    mode: '0640'
  notify: Restart app service

- name: Configure nginx reverse proxy
  template:
    src: nginx.conf.j2
    dest: /etc/nginx/sites-available/app
    owner: root
    group: root
    mode: '0644'
  notify: Reload nginx
```

```jinja2
# roles/app-server/templates/app.env.j2
DATABASE_URL=postgresql://{{ db_user }}:{{ db_password }}@{{ db_endpoint }}/{{ db_name }}
REDIS_URL=redis://{{ redis_endpoint }}:6379/0
S3_BUCKET={{ s3_bucket }}
ENVIRONMENT={{ environment }}
AWS_REGION={{ region }}
```

## Idempotent Configuration Management

```yaml
# playbooks/configure-web.yml
---
- name: Configure Web Servers
  hosts: web_servers
  become: yes

  tasks:
    - name: Install nginx
      apt:
        name: nginx
        state: present

    - name: Deploy nginx config
      template:
        src: nginx.conf.j2
        dest: /etc/nginx/nginx.conf
      register: nginx_config

    - name: Reload nginx if config changed
      service:
        name: nginx
        state: reloaded
      when: nginx_config.changed

    - name: Ensure nginx is started and enabled
      service:
        name: nginx
        state: started
        enabled: yes
```

## CI/CD Pipeline with Clean Handoff

```yaml
# .github/workflows/full-deploy.yml
jobs:
  infrastructure:
    runs-on: ubuntu-latest
    outputs:
      tofu-applied: ${{ steps.apply.outputs.applied }}
    steps:
      - uses: actions/checkout@v5
      - uses: opentofu/setup-opentofu@v1

      - name: OpenTofu Apply
        id: apply
        run: |
          tofu -chdir=infrastructure init
          tofu -chdir=infrastructure apply -auto-approve
          echo "applied=true" >> "$GITHUB_OUTPUT"

      - name: Generate Ansible vars
        run: |
          bash scripts/sync-tofu-to-ansible.sh infrastructure ansible/vars

      - name: Upload vars as artifact
        uses: actions/upload-artifact@v4
        with:
          name: ansible-vars
          path: ansible/vars/opentofu-outputs.json

  configure:
    needs: infrastructure
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v5
      - uses: actions/download-artifact@v5
        with:
          name: ansible-vars
          path: ansible/vars/

      - name: Run Ansible
        run: ansible-playbook -i inventory/hosts.py playbooks/site.yml --extra-vars "@ansible/vars/opentofu-outputs.json"
```

## Conclusion

The clean separation between OpenTofu and Ansible requires a well-defined interface: OpenTofu outputs a structured set of values, and a bridge script or artifact transforms them into Ansible variables. Ansible playbooks are written to be idempotent - running them multiple times produces the same result - which means they can be safely re-run after any infrastructure change without risk.
