# How to Store Ansible Variables in Environment Variables

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, Environment Variables, Variables, DevOps

Description: Learn how to use operating system environment variables to pass configuration and secrets into Ansible playbooks without storing them in files.

---

Environment variables are a universal way to pass configuration to programs without putting sensitive data in files. Ansible can both read environment variables from the control node and set them on remote hosts during task execution. This is particularly useful for secrets management, CI/CD integration, and following the twelve-factor app methodology.

## Reading Environment Variables on the Control Node

The `lookup` plugin lets you read environment variables from the machine running Ansible (the control node).

```yaml
# read-env-vars.yml
# Reads environment variables from the control node
---
- name: Use environment variables from control node
  hosts: all
  vars:
    # Read environment variables into Ansible variables
    deploy_token: "{{ lookup('env', 'DEPLOY_TOKEN') }}"
    aws_region: "{{ lookup('env', 'AWS_REGION') | default('us-east-1', true) }}"
    db_password: "{{ lookup('env', 'DB_PASSWORD') }}"
    app_env: "{{ lookup('env', 'APP_ENV') | default('development', true) }}"

  tasks:
    - name: Show environment-derived variables
      ansible.builtin.debug:
        msg:
          - "AWS Region: {{ aws_region }}"
          - "App Environment: {{ app_env }}"
          - "Deploy token is {{ 'set' if deploy_token else 'NOT set' }}"
```

The `default` filter with `true` as the second argument tells Ansible to use the default even when the variable is defined but empty.

## Setting Environment Variables Before Running Ansible

Set environment variables in your shell before running the playbook.

```bash
# Set environment variables
export DB_PASSWORD="s3cret_p@ss"
export DEPLOY_TOKEN="ghp_abc123def456"
export APP_ENV="production"
export AWS_REGION="us-west-2"

# Run the playbook - it will pick up these variables
ansible-playbook deploy.yml
```

For CI/CD pipelines, environment variables are typically set in the pipeline configuration.

```yaml
# GitLab CI example
deploy_production:
  stage: deploy
  variables:
    APP_ENV: production
    AWS_REGION: us-west-2
  script:
    - ansible-playbook deploy.yml
  environment:
    name: production
```

```yaml
# GitHub Actions example
jobs:
  deploy:
    runs-on: ubuntu-latest
    env:
      APP_ENV: production
      AWS_REGION: us-west-2
    steps:
      - name: Deploy
        env:
          DB_PASSWORD: ${{ secrets.DB_PASSWORD }}
          DEPLOY_TOKEN: ${{ secrets.DEPLOY_TOKEN }}
        run: ansible-playbook deploy.yml
```

## Setting Environment Variables on Remote Hosts

Use the `environment` keyword to set environment variables for tasks on remote hosts.

```yaml
# set-remote-env.yml
# Sets environment variables on remote hosts during task execution
---
- name: Run tasks with environment variables
  hosts: appservers
  become: yes
  tasks:
    - name: Run application with environment variables
      ansible.builtin.command: /opt/myapp/bin/migrate
      environment:
        DATABASE_URL: "postgresql://{{ db_user }}:{{ db_password }}@{{ db_host }}:5432/{{ db_name }}"
        RAILS_ENV: production
        SECRET_KEY_BASE: "{{ secret_key }}"
        REDIS_URL: "redis://{{ redis_host }}:6379/0"

    - name: Install Python packages with proxy
      ansible.builtin.pip:
        name: requests
        state: present
      environment:
        HTTP_PROXY: "http://proxy.internal:3128"
        HTTPS_PROXY: "http://proxy.internal:3128"
        NO_PROXY: "localhost,127.0.0.1,.internal"
```

## Play-Level Environment Variables

Set environment variables for all tasks in a play.

```yaml
# play-level-env.yml
# Sets environment variables for the entire play
---
- name: Deploy behind corporate proxy
  hosts: all
  become: yes
  environment:
    HTTP_PROXY: "http://proxy.internal:3128"
    HTTPS_PROXY: "http://proxy.internal:3128"
    NO_PROXY: "localhost,127.0.0.1,.internal"
  tasks:
    - name: Install packages (uses proxy)
      ansible.builtin.apt:
        name:
          - curl
          - wget
          - git
        state: present
        update_cache: yes

    - name: Download application
      ansible.builtin.get_url:
        url: https://releases.example.com/myapp-latest.tar.gz
        dest: /tmp/myapp-latest.tar.gz
```

## Persistent Environment Variables on Remote Hosts

To make environment variables persist on remote hosts (not just during task execution), write them to profile files or systemd service units.

```yaml
# persistent-env-vars.yml
# Creates persistent environment variables on remote hosts
---
- name: Set persistent environment variables
  hosts: all
  become: yes
  vars:
    app_env_vars:
      APP_ENV: production
      APP_PORT: "8080"
      LOG_LEVEL: warn
      DATABASE_URL: "postgresql://appuser:{{ db_pass }}@db.internal:5432/myapp"
  tasks:
    - name: Create environment file for the application
      ansible.builtin.template:
        src: app-env.j2
        dest: /etc/myapp/environment
        owner: root
        group: myapp
        mode: '0640'

    - name: Add system-wide environment variables
      ansible.builtin.lineinfile:
        path: /etc/environment
        regexp: "^{{ item.key }}="
        line: "{{ item.key }}={{ item.value }}"
      loop: "{{ app_env_vars | dict2items }}"
      loop_control:
        label: "{{ item.key }}"

    - name: Create systemd service with environment file
      ansible.builtin.template:
        src: myapp.service.j2
        dest: /etc/systemd/system/myapp.service
        mode: '0644'
      notify:
        - reload systemd
        - restart myapp

  handlers:
    - name: reload systemd
      ansible.builtin.systemd:
        daemon_reload: yes

    - name: restart myapp
      ansible.builtin.service:
        name: myapp
        state: restarted
```

```jinja2
{# templates/app-env.j2 #}
{# Environment file for the application #}
{% for key, value in app_env_vars.items() %}
{{ key }}={{ value }}
{% endfor %}
```

```jinja2
{# templates/myapp.service.j2 #}
{# Systemd service unit with environment file #}
[Unit]
Description=My Web Application
After=network.target

[Service]
Type=simple
User=myapp
Group=myapp
EnvironmentFile=/etc/myapp/environment
ExecStart=/opt/myapp/bin/server
Restart=always

[Install]
WantedBy=multi-user.target
```

## Using ANSIBLE_ Environment Variables

Ansible itself reads many environment variables prefixed with `ANSIBLE_`. These control Ansible's behavior without needing `ansible.cfg` changes.

```bash
# Control Ansible behavior through environment variables
export ANSIBLE_CONFIG=/path/to/ansible.cfg
export ANSIBLE_INVENTORY=/path/to/inventory
export ANSIBLE_ROLES_PATH=/path/to/roles
export ANSIBLE_FORKS=20
export ANSIBLE_TIMEOUT=30
export ANSIBLE_VAULT_PASSWORD_FILE=~/.vault_pass
export ANSIBLE_LOG_PATH=/var/log/ansible.log
export ANSIBLE_HOST_KEY_CHECKING=False
export ANSIBLE_PIPELINING=True
export ANSIBLE_GATHERING=smart
export ANSIBLE_FACT_CACHING=jsonfile
export ANSIBLE_FACT_CACHING_CONNECTION=/tmp/ansible_cache

# Run Ansible - all settings are picked up from environment
ansible-playbook site.yml
```

## Environment Variables for Secrets

Environment variables are a common way to handle secrets without putting them in files.

```yaml
# secrets-from-env.yml
# Pulls all secrets from environment variables
---
- name: Deploy with secrets from environment
  hosts: appservers
  become: yes
  vars:
    db_password: "{{ lookup('env', 'DB_PASSWORD') }}"
    api_key: "{{ lookup('env', 'API_KEY') }}"
    jwt_secret: "{{ lookup('env', 'JWT_SECRET') }}"
    smtp_password: "{{ lookup('env', 'SMTP_PASSWORD') }}"
  tasks:
    - name: Validate all secrets are set
      ansible.builtin.assert:
        that:
          - db_password | length > 0
          - api_key | length > 0
          - jwt_secret | length > 0
        fail_msg: |
          Missing required environment variables.
          Set these before running the playbook:
            export DB_PASSWORD=xxx
            export API_KEY=xxx
            export JWT_SECRET=xxx

    - name: Deploy application secrets
      ansible.builtin.template:
        src: secrets.yml.j2
        dest: /etc/myapp/secrets.yml
        owner: myapp
        group: myapp
        mode: '0600'
```

## Environment Variable Wrapper Script

Create a wrapper script that loads environment variables from a secure source before running Ansible.

```bash
#!/bin/bash
# run-ansible.sh
# Loads secrets from a secure source and runs Ansible

# Load secrets from a password manager or vault
eval $(op signin --account myteam)
export DB_PASSWORD=$(op read "op://Infrastructure/Database/password")
export API_KEY=$(op read "op://Infrastructure/API/key")
export JWT_SECRET=$(op read "op://Infrastructure/App/jwt_secret")

# Or from AWS Secrets Manager
export DB_PASSWORD=$(aws secretsmanager get-secret-value \
  --secret-id prod/db/password \
  --query SecretString --output text)

# Run Ansible with the secrets available as environment variables
ansible-playbook "$@"

# Clear sensitive variables
unset DB_PASSWORD API_KEY JWT_SECRET
```

```bash
# Use the wrapper
./run-ansible.sh deploy.yml -e deploy_env=production
```

## Block-Level Environment Variables

Set environment variables for a specific block of tasks.

```yaml
# block-env.yml
# Sets environment for a block of related tasks
---
- name: Deploy with block-level environment
  hosts: appservers
  become: yes
  tasks:
    - name: Database migration tasks
      environment:
        DATABASE_URL: "postgresql://{{ db_user }}:{{ db_password }}@{{ db_host }}:5432/{{ db_name }}"
        PGPASSWORD: "{{ db_password }}"
      block:
        - name: Run database migrations
          ansible.builtin.command: /opt/myapp/bin/migrate

        - name: Seed initial data
          ansible.builtin.command: /opt/myapp/bin/seed
          when: fresh_install | default(false)

        - name: Verify database schema
          ansible.builtin.command: /opt/myapp/bin/verify-schema
```

## Summary

Environment variables provide a flexible, file-free way to pass configuration into Ansible. Use `lookup('env', 'VAR')` to read control node environment variables, the `environment` keyword to set variables on remote hosts, and `ANSIBLE_*` prefixed variables to configure Ansible itself. For secrets, environment variables keep sensitive data out of files and version control while integrating smoothly with CI/CD pipelines and secret management tools. The key is to always validate that required environment variables are set before proceeding with tasks that depend on them.
