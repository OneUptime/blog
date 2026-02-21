# How to Use Ansible Roles with Multiple Playbooks

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, Roles, Playbooks, Configuration Management

Description: Learn how to share and reuse Ansible roles across multiple playbooks for cleaner infrastructure automation and better code organization.

---

One of the biggest advantages of Ansible roles is that you write them once and use them everywhere. But when you have five, ten, or fifty playbooks that all need a common set of roles, things get interesting fast. How do you structure your project so that roles are shared cleanly? How do you avoid duplication? This post covers the practical patterns for using Ansible roles across multiple playbooks.

## Why Share Roles Across Playbooks?

In any real infrastructure setup, you will have different playbooks for different purposes. You might have a playbook for provisioning new servers, another for deploying applications, and a third for hardening security. Many of these playbooks need overlapping functionality. For example, both your provisioning playbook and your security playbook probably need to configure firewall rules. Without roles, you end up copy-pasting tasks between playbooks, which leads to drift and bugs.

Roles solve this by packaging related tasks, variables, handlers, and templates into a single reusable unit. The key is understanding how Ansible resolves role paths so that multiple playbooks can reference the same role without any tricks.

## Project Directory Structure

The simplest approach is to keep all your roles in a single `roles/` directory at the project root, with your playbooks either at the root level or in a `playbooks/` subdirectory.

Here is a typical layout:

```
project/
  roles/
    common/
      tasks/
        main.yml
      defaults/
        main.yml
    nginx/
      tasks/
        main.yml
      templates/
        nginx.conf.j2
    postgresql/
      tasks/
        main.yml
  site.yml
  deploy.yml
  security.yml
```

When your playbooks live at the same level as the `roles/` directory, Ansible automatically finds the roles. No extra configuration needed.

## Referencing Roles from Playbooks in Subdirectories

If you organize playbooks into subdirectories, Ansible will not automatically find your roles. You need to tell it where to look using `ansible.cfg`.

Create or update your `ansible.cfg` at the project root:

```ini
# ansible.cfg - Tell Ansible where to find shared roles
[defaults]
roles_path = ./roles
```

Now your playbooks can live anywhere in the project and still find the roles.

Here is an example with playbooks in a subdirectory:

```
project/
  ansible.cfg
  roles/
    common/
    nginx/
    postgresql/
  playbooks/
    provisioning/
      setup.yml
    deployment/
      deploy.yml
    security/
      harden.yml
```

## Using a Role in Multiple Playbooks

Let's say you have a `common` role that installs base packages, sets the timezone, and configures the hostname. Here is the role's task file:

```yaml
# roles/common/tasks/main.yml
# Base configuration applied to every server
- name: Install essential packages
  ansible.builtin.apt:
    name:
      - curl
      - vim
      - htop
      - net-tools
    state: present
    update_cache: yes

- name: Set timezone
  ansible.builtin.timezone:
    name: "{{ server_timezone }}"

- name: Set hostname
  ansible.builtin.hostname:
    name: "{{ inventory_hostname }}"
```

And the defaults file:

```yaml
# roles/common/defaults/main.yml
server_timezone: "UTC"
```

Now you reference this role from your provisioning playbook:

```yaml
# playbooks/provisioning/setup.yml
# Initial server setup - runs common + specific provisioning tasks
- hosts: all
  become: yes
  roles:
    - common
    - nginx
```

And from your security playbook:

```yaml
# playbooks/security/harden.yml
# Security hardening - needs common baseline first
- hosts: all
  become: yes
  roles:
    - common
    - security_baseline
```

Both playbooks use the same `common` role. Any changes you make to the role automatically apply everywhere.

## Passing Different Variables to the Same Role

Sometimes you want to use the same role in multiple playbooks but with different settings. The `roles` directive lets you pass variables inline:

```yaml
# deploy-staging.yml
# Deploy to staging with staging-specific database config
- hosts: staging_db
  become: yes
  roles:
    - role: postgresql
      vars:
        pg_max_connections: 50
        pg_shared_buffers: "256MB"
        pg_listen_addresses: "localhost"

# deploy-production.yml
# Deploy to production with production-tuned database config
- hosts: production_db
  become: yes
  roles:
    - role: postgresql
      vars:
        pg_max_connections: 500
        pg_shared_buffers: "4GB"
        pg_listen_addresses: "*"
```

This pattern is extremely common. The role stays generic, and each playbook supplies the context.

## Using include_role for Conditional Role Usage

If you need to conditionally include a role based on some runtime fact, use `include_role` inside a tasks block instead of the `roles` directive:

```yaml
# mixed-environment.yml
# Apply monitoring only on production, common everywhere
- hosts: all
  become: yes
  roles:
    - common

  tasks:
    - name: Apply monitoring role only on production hosts
      ansible.builtin.include_role:
        name: monitoring
      when: env_type == "production"

    - name: Apply dev tools on staging hosts
      ansible.builtin.include_role:
        name: dev_tools
      when: env_type == "staging"
```

The `include_role` module is also useful when you want to use a role inside a loop:

```yaml
# Apply database role for each database instance defined in the inventory
- name: Configure multiple database instances
  ansible.builtin.include_role:
    name: postgresql
  vars:
    pg_port: "{{ item.port }}"
    pg_data_dir: "{{ item.data_dir }}"
  loop:
    - { port: 5432, data_dir: "/var/lib/postgresql/14/main" }
    - { port: 5433, data_dir: "/var/lib/postgresql/14/replica" }
```

## Role Dependencies for Automatic Chaining

If a role always requires another role to run first, declare that in `meta/main.yml`:

```yaml
# roles/nginx/meta/main.yml
# Nginx always needs the common role applied first
dependencies:
  - role: common
  - role: ssl_certificates
    vars:
      cert_domain: "{{ nginx_server_name }}"
```

When any playbook includes the `nginx` role, Ansible will automatically run `common` and `ssl_certificates` first. This means your playbooks stay simple:

```yaml
# Just including nginx is enough - dependencies are handled automatically
- hosts: webservers
  become: yes
  roles:
    - nginx
```

## Using roles_path for External Role Collections

For larger organizations, you might keep roles in separate Git repositories. You can specify multiple paths in `ansible.cfg`:

```ini
# ansible.cfg - Search multiple directories for roles
[defaults]
roles_path = ./roles:./vendor_roles:/etc/ansible/roles
```

Ansible searches these paths in order. This lets you have project-specific roles alongside shared organizational roles and community roles installed via `ansible-galaxy`.

## A Complete Multi-Playbook Example

Here is a realistic project with three playbooks sharing a pool of roles:

```yaml
# infrastructure.yml - Full infrastructure setup
- hosts: all
  become: yes
  roles:
    - common
    - firewall

- hosts: webservers
  become: yes
  roles:
    - nginx
    - app_deploy

- hosts: databases
  become: yes
  roles:
    - postgresql

# monitoring.yml - Just monitoring stack
- hosts: all
  become: yes
  roles:
    - common
    - monitoring_agent

- hosts: monitoring_servers
  become: yes
  roles:
    - prometheus
    - grafana

# rollback.yml - Emergency rollback
- hosts: webservers
  become: yes
  roles:
    - role: app_deploy
      vars:
        app_version: "{{ rollback_version }}"
```

All three playbooks draw from the same set of roles. The `common` role appears in two of them. The `app_deploy` role is used in both `infrastructure.yml` and `rollback.yml` with different variable contexts.

## Tips for Managing Shared Roles

First, keep role defaults generic. Put environment-specific values in group_vars or host_vars, not in the role itself. Second, document what variables each role expects. A `README.md` inside each role directory goes a long way. Third, version your roles using Git tags if they live in separate repositories. Fourth, test roles independently using Molecule before integrating them into playbooks.

The pattern of writing small, focused roles and combining them in different playbooks is what makes Ansible scale from a handful of servers to thousands. Start with this structure and you will save yourself a lot of headaches down the road.
