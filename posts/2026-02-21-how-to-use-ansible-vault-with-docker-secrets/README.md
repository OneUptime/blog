# How to Use Ansible Vault with Docker Secrets

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, Ansible Vault, Docker, Docker Swarm, Secrets Management

Description: Learn how to combine Ansible Vault encrypted variables with Docker Secrets to manage sensitive data across container deployments securely.

---

If you are managing Docker Swarm clusters with Ansible, you have two secrets management systems at your disposal: Ansible Vault for encrypting variables in your automation code, and Docker Secrets for delivering sensitive data to containers at runtime. Using them together gives you encryption at every layer, from your Ansible repository all the way to the running container.

This post shows how to set up a workflow where Ansible Vault holds your secrets in encrypted form, and your playbooks create Docker Secrets from those values during deployment.

## How Docker Secrets Work

Docker Secrets is a feature of Docker Swarm mode. Secrets are stored encrypted in the Swarm's Raft log and only mounted into containers that explicitly need them. Inside the container, secrets appear as files under `/run/secrets/`.

Here is a quick manual example to set the stage:

```bash
# Create a Docker secret from the command line
echo -n "SuperSecretPassword" | docker secret create db_password -

# List existing secrets
docker secret ls

# Secrets are mounted as files inside containers
# Inside the container: cat /run/secrets/db_password
```

The limitation of doing this manually is that the secret values have to come from somewhere, and that somewhere is usually a file, a variable, or someone typing the value. Ansible Vault solves the "where do secrets come from" problem.

## Setting Up the Vault

Start by creating a vault file with the secrets your Docker services need:

```bash
# Create an encrypted vault file for Docker-related secrets
ansible-vault create group_vars/all/docker_vault.yml
```

Inside the vault file, define your secrets:

```yaml
# group_vars/all/docker_vault.yml - encrypted at rest
vault_db_password: "prod-database-xK9mP2"
vault_db_root_password: "root-secret-Lm4nQ7"
vault_redis_password: "redis-auth-Bz8wR1"
vault_app_secret_key: "django-secret-Yp3kH6vN9"
vault_registry_password: "registry-pass-Wq5tJ0"
```

Create the corresponding references in your regular variables file:

```yaml
# group_vars/all/vars.yml - references vault values
docker_secrets:
  db_password: "{{ vault_db_password }}"
  db_root_password: "{{ vault_db_root_password }}"
  redis_password: "{{ vault_redis_password }}"
  app_secret_key: "{{ vault_app_secret_key }}"
  registry_password: "{{ vault_registry_password }}"
```

## Creating Docker Secrets with Ansible

Ansible has the `community.docker.docker_secret` module for managing Docker Swarm secrets. Here is a playbook that creates secrets from vault-encrypted values:

```yaml
# create-docker-secrets.yml - creates Docker Swarm secrets from vault values
---
- name: Manage Docker Swarm secrets
  hosts: swarm_managers
  become: true

  tasks:
    # Create each Docker secret from the vault-encrypted values
    - name: Create Docker secrets
      community.docker.docker_secret:
        name: "{{ item.key }}"
        data: "{{ item.value }}"
        state: present
      loop: "{{ docker_secrets | dict2items }}"
      loop_control:
        label: "{{ item.key }}"
      no_log: true
```

The `loop_control` with `label` ensures that only the secret name (not the value) is shown in the output. Combined with `no_log: true`, this keeps things locked down.

## Deploying a Docker Stack with Secrets

Now let us put it all together with a Docker Compose file and an Ansible playbook that deploys it. Here is a compose file for a typical web application:

```yaml
# templates/docker-compose.yml.j2 - stack definition with secrets
version: "3.8"

services:
  app:
    image: myapp:latest
    secrets:
      - db_password
      - app_secret_key
    environment:
      - DB_HOST=db
      - DB_USER=appuser
      - DB_PASSWORD_FILE=/run/secrets/db_password
      - SECRET_KEY_FILE=/run/secrets/app_secret_key
    deploy:
      replicas: 3
    networks:
      - frontend
      - backend

  db:
    image: postgres:15
    secrets:
      - db_password
      - db_root_password
    environment:
      - POSTGRES_PASSWORD_FILE=/run/secrets/db_root_password
      - APP_DB_PASSWORD_FILE=/run/secrets/db_password
    volumes:
      - db_data:/var/lib/postgresql/data
    deploy:
      replicas: 1
    networks:
      - backend

  redis:
    image: redis:7-alpine
    secrets:
      - redis_password
    command: >
      sh -c 'redis-server --requirepass "$$(cat /run/secrets/redis_password)"'
    deploy:
      replicas: 1
    networks:
      - backend

secrets:
  db_password:
    external: true
  db_root_password:
    external: true
  app_secret_key:
    external: true
  redis_password:
    external: true

volumes:
  db_data:

networks:
  frontend:
  backend:
```

The playbook that handles everything:

```yaml
# deploy-stack.yml - full deployment with secrets
---
- name: Deploy Docker stack with secrets
  hosts: swarm_managers[0]
  become: true

  tasks:
    # First, make sure all required Docker secrets exist
    - name: Create Docker secrets from vault
      community.docker.docker_secret:
        name: "{{ item.key }}"
        data: "{{ item.value }}"
        state: present
      loop: "{{ docker_secrets | dict2items }}"
      loop_control:
        label: "{{ item.key }}"
      no_log: true

    # Deploy the compose file to the Swarm manager
    - name: Copy docker-compose file
      ansible.builtin.template:
        src: templates/docker-compose.yml.j2
        dest: /opt/stacks/myapp/docker-compose.yml
        owner: root
        group: root
        mode: "0644"

    # Deploy or update the stack
    - name: Deploy Docker stack
      community.docker.docker_stack:
        name: myapp
        compose:
          - /opt/stacks/myapp/docker-compose.yml
        state: present
      register: stack_result

    - name: Show deployment result
      ansible.builtin.debug:
        msg: "Stack deployment status: {{ stack_result.changed | ternary('updated', 'unchanged') }}"
```

## Rotating Docker Secrets

Docker Secrets are immutable. You cannot update a secret in place. To rotate a secret, you need to create a new secret with a different name, update the services to use the new secret, and then remove the old one. Here is a playbook that handles rotation:

```yaml
# rotate-secret.yml - rotate a Docker secret
---
- name: Rotate a Docker secret
  hosts: swarm_managers[0]
  become: true
  vars:
    secret_name: db_password
    # The new value comes from the vault
    new_value: "{{ vault_db_password }}"

  tasks:
    # Create the new secret with a versioned name
    - name: Create new versioned secret
      community.docker.docker_secret:
        name: "{{ secret_name }}_v{{ ansible_date_time.epoch }}"
        data: "{{ new_value }}"
        state: present
      no_log: true
      register: new_secret

    # Update the service to use the new secret
    - name: Update service to use new secret
      ansible.builtin.shell: |
        docker service update \
          --secret-rm {{ secret_name }} \
          --secret-add source={{ secret_name }}_v{{ ansible_date_time.epoch }},target={{ secret_name }} \
          myapp_app
      when: new_secret.changed

    # Remove the old secret after services are updated
    - name: Remove old secret
      community.docker.docker_secret:
        name: "{{ secret_name }}"
        state: absent
      when: new_secret.changed
```

## Reading Secrets in Your Application

Your application code needs to read secrets from files instead of environment variables. Here is a pattern that works well in Python:

```python
# config.py - read secrets from Docker secret files with a fallback
import os

def read_secret(secret_name, default=None):
    """Read a Docker secret from /run/secrets/ or fall back to env var."""
    secret_path = f"/run/secrets/{secret_name}"
    if os.path.exists(secret_path):
        with open(secret_path, "r") as f:
            return f.read().strip()
    # Fall back to environment variable for non-Swarm environments
    return os.environ.get(secret_name.upper(), default)

# Usage in your application
DB_PASSWORD = read_secret("db_password")
SECRET_KEY = read_secret("app_secret_key")
REDIS_PASSWORD = read_secret("redis_password")
```

## Handling Initial Swarm Setup

If you are bootstrapping a fresh Docker Swarm cluster, you need the secrets to exist before any services start. Here is a role that handles the full sequence:

```yaml
# roles/docker-swarm/tasks/main.yml - full Swarm setup with secrets
---
- name: Initialize Docker Swarm
  community.docker.docker_swarm:
    state: present
    advertise_addr: "{{ ansible_default_ipv4.address }}"
  when: inventory_hostname == groups['swarm_managers'][0]

- name: Join worker nodes to swarm
  community.docker.docker_swarm:
    state: join
    join_token: "{{ hostvars[groups['swarm_managers'][0]]['swarm_worker_token'] }}"
    remote_addrs:
      - "{{ hostvars[groups['swarm_managers'][0]]['ansible_default_ipv4']['address'] }}:2377"
  when: inventory_hostname in groups['swarm_workers']

- name: Create all Docker secrets
  community.docker.docker_secret:
    name: "{{ item.key }}"
    data: "{{ item.value }}"
    state: present
  loop: "{{ docker_secrets | dict2items }}"
  loop_control:
    label: "{{ item.key }}"
  no_log: true
  when: inventory_hostname == groups['swarm_managers'][0]
```

## Security Flow

Here is how the security model works end to end:

```mermaid
graph LR
    A[Developer] -->|edits| B[Vault File]
    B -->|encrypted in| C[Git Repository]
    C -->|cloned to| D[Ansible Controller]
    D -->|decrypts and creates| E[Docker Secrets]
    E -->|mounted as files in| F[Running Containers]
    F -->|reads from /run/secrets/| G[Application]
```

At every stage, the secret is either encrypted or access-controlled. The vault file is encrypted in git. Docker Secrets are encrypted in the Swarm Raft log. Inside containers, secrets are mounted as tmpfs files that only the service can access.

## Summary

Combining Ansible Vault with Docker Secrets gives you a complete secrets pipeline. Vault handles the "where do secrets live in my code" problem, and Docker Secrets handles the "how do secrets get to my containers" problem. The key practices are: store all secret values in Ansible Vault, use the `community.docker.docker_secret` module to create Swarm secrets, always use `no_log: true` on tasks that handle secrets, version your secrets for rotation, and make sure your application reads from `/run/secrets/` files rather than environment variables.
