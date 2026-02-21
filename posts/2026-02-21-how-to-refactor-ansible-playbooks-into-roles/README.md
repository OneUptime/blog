# How to Refactor Ansible Playbooks into Roles

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, Roles, Refactoring, Best Practices

Description: Step-by-step guide to refactoring monolithic Ansible playbooks into reusable roles with proper variable extraction and testing.

---

Every Ansible project starts the same way: a single playbook with a few tasks. Then it grows. Before you know it, you have a 500-line playbook that installs packages, configures services, manages users, sets up monitoring, and deploys an application. It works, but it is brittle, hard to read, and impossible to reuse across projects. The solution is to refactor it into roles. This post walks through the process step by step, with a real before-and-after example.

## The Monolithic Playbook Problem

Here is a typical playbook that has grown organically over time:

```yaml
# site.yml - the kitchen sink playbook
- hosts: webservers
  become: yes
  vars:
    app_name: myapp
    app_user: deploy
    app_port: 8080
    nginx_worker_connections: 2048
    db_host: 10.0.2.10
    db_name: myapp_production
    monitoring_server: 10.0.10.5

  tasks:
    # System setup
    - name: Update apt cache
      apt: update_cache=yes

    - name: Install base packages
      apt:
        name: [curl, vim, htop, git, unzip]
        state: present

    - name: Set timezone
      timezone: name=UTC

    - name: Create app user
      user:
        name: "{{ app_user }}"
        shell: /bin/bash
        groups: sudo

    # Nginx setup
    - name: Install nginx
      apt: name=nginx state=present

    - name: Copy nginx config
      template:
        src: nginx.conf.j2
        dest: /etc/nginx/nginx.conf
      notify: restart nginx

    - name: Copy virtual host
      template:
        src: vhost.conf.j2
        dest: /etc/nginx/sites-available/{{ app_name }}.conf
      notify: restart nginx

    - name: Enable virtual host
      file:
        src: /etc/nginx/sites-available/{{ app_name }}.conf
        dest: /etc/nginx/sites-enabled/{{ app_name }}.conf
        state: link
      notify: restart nginx

    # App deployment
    - name: Create app directory
      file:
        path: /opt/{{ app_name }}
        state: directory
        owner: "{{ app_user }}"

    - name: Deploy application
      git:
        repo: "https://github.com/myorg/{{ app_name }}.git"
        dest: /opt/{{ app_name }}
        version: "{{ app_version | default('main') }}"
      become_user: "{{ app_user }}"

    - name: Install app dependencies
      pip:
        requirements: /opt/{{ app_name }}/requirements.txt
        virtualenv: /opt/{{ app_name }}/venv

    - name: Copy systemd service
      template:
        src: app.service.j2
        dest: /etc/systemd/system/{{ app_name }}.service
      notify: restart app

    - name: Start application
      systemd:
        name: "{{ app_name }}"
        state: started
        enabled: yes
        daemon_reload: yes

    # Monitoring
    - name: Download node_exporter
      get_url:
        url: https://github.com/prometheus/node_exporter/releases/download/v1.7.0/node_exporter-1.7.0.linux-amd64.tar.gz
        dest: /tmp/node_exporter.tar.gz

    - name: Extract node_exporter
      unarchive:
        src: /tmp/node_exporter.tar.gz
        dest: /tmp
        remote_src: yes

    - name: Install node_exporter
      copy:
        src: /tmp/node_exporter-1.7.0.linux-amd64/node_exporter
        dest: /usr/local/bin/node_exporter
        mode: '0755'
        remote_src: yes

    # ... 50 more tasks

  handlers:
    - name: restart nginx
      systemd: name=nginx state=restarted

    - name: restart app
      systemd: name={{ app_name }} state=restarted
```

This playbook has several problems. It mixes unrelated concerns. You cannot reuse the Nginx configuration without the application deployment. The variables are all in one place with no separation between system config and app config. Testing individual parts is impossible.

## Step 1: Identify the Boundaries

Read through the playbook and group tasks by what they do. In our example, there are four clear groups:

1. **Base system setup** (packages, timezone, user)
2. **Nginx configuration** (install, config, vhost)
3. **Application deployment** (code, dependencies, service)
4. **Monitoring** (node_exporter)

Each group becomes a role.

## Step 2: Create the Role Skeletons

```bash
# Generate role directories with ansible-galaxy
ansible-galaxy role init --init-path roles/ common
ansible-galaxy role init --init-path roles/ nginx
ansible-galaxy role init --init-path roles/ app_deploy
ansible-galaxy role init --init-path roles/ node_exporter
```

## Step 3: Extract Variables into Defaults

For each role, identify which variables it needs and move them into `defaults/main.yml`. The key rule: defaults should work without any overrides for the most common case.

```yaml
# roles/common/defaults/main.yml
common_packages:
  - curl
  - vim
  - htop
  - git
  - unzip
common_timezone: UTC
```

```yaml
# roles/nginx/defaults/main.yml
nginx_worker_connections: 1024
nginx_vhosts: []
nginx_remove_default_site: true
```

```yaml
# roles/app_deploy/defaults/main.yml
app_name: myapp
app_user: deploy
app_port: 8080
app_repo: ""
app_version: main
app_virtualenv: true
```

## Step 4: Move Tasks into Roles

Take each group of tasks and move them into the appropriate role's `tasks/main.yml`:

```yaml
# roles/common/tasks/main.yml
- name: Update apt cache
  ansible.builtin.apt:
    update_cache: yes
    cache_valid_time: 3600

- name: Install base packages
  ansible.builtin.apt:
    name: "{{ common_packages }}"
    state: present

- name: Set timezone
  ansible.builtin.timezone:
    name: "{{ common_timezone }}"
```

```yaml
# roles/nginx/tasks/main.yml
- name: Install nginx
  ansible.builtin.apt:
    name: nginx
    state: present

- name: Deploy nginx main configuration
  ansible.builtin.template:
    src: nginx.conf.j2
    dest: /etc/nginx/nginx.conf
  notify: restart nginx

- name: Deploy virtual host configurations
  ansible.builtin.template:
    src: vhost.conf.j2
    dest: "/etc/nginx/sites-available/{{ item.name }}.conf"
  loop: "{{ nginx_vhosts }}"
  notify: restart nginx

- name: Enable virtual hosts
  ansible.builtin.file:
    src: "/etc/nginx/sites-available/{{ item.name }}.conf"
    dest: "/etc/nginx/sites-enabled/{{ item.name }}.conf"
    state: link
  loop: "{{ nginx_vhosts }}"
  notify: restart nginx

- name: Remove default site
  ansible.builtin.file:
    path: /etc/nginx/sites-enabled/default
    state: absent
  when: nginx_remove_default_site
  notify: restart nginx
```

## Step 5: Move Templates and Files

Templates go from the playbook's `templates/` directory into each role's `templates/` directory. Update any variable references to use the role's variable names.

```
# Before (flat structure)
templates/
  nginx.conf.j2
  vhost.conf.j2
  app.service.j2

# After (organized by role)
roles/
  nginx/
    templates/
      nginx.conf.j2
      vhost.conf.j2
  app_deploy/
    templates/
      app.service.j2
```

## Step 6: Move Handlers into Roles

Each role gets its own handlers file:

```yaml
# roles/nginx/handlers/main.yml
- name: restart nginx
  ansible.builtin.systemd:
    name: nginx
    state: restarted

- name: reload nginx
  ansible.builtin.systemd:
    name: nginx
    state: reloaded
```

```yaml
# roles/app_deploy/handlers/main.yml
- name: restart app
  ansible.builtin.systemd:
    name: "{{ app_name }}"
    state: restarted
```

## Step 7: Write the Refactored Playbook

```yaml
# site.yml - clean and readable
- hosts: webservers
  become: yes
  roles:
    - common
    - role: nginx
      vars:
        nginx_worker_connections: 2048
        nginx_vhosts:
          - name: myapp
            server_name: myapp.example.com
            upstream_port: 8080
    - role: app_deploy
      vars:
        app_name: myapp
        app_repo: "https://github.com/myorg/myapp.git"
        app_version: "v2.1.0"
    - node_exporter
```

Compare this to the original 100+ line playbook. It is immediately clear what this playbook does, and each piece can be tested and reused independently.

## Step 8: Test Each Role

Create a simple test playbook for each role:

```yaml
# tests/test_nginx.yml
- hosts: test_servers
  become: yes
  roles:
    - role: nginx
      vars:
        nginx_vhosts:
          - name: test
            server_name: test.example.com
            root: /var/www/test

  tasks:
    - name: Verify nginx is running
      ansible.builtin.systemd:
        name: nginx
        state: started
      check_mode: yes
      register: nginx_status

    - name: Assert nginx is running
      ansible.builtin.assert:
        that: not nginx_status.changed
```

## Common Pitfalls to Avoid

**Do not over-extract.** If a set of tasks is only used in one place and is unlikely to be reused, keeping it in the playbook is fine. Not everything needs to be a role.

**Do not create roles with side effects on each other.** Each role should be self-contained. If role B fails, role A should not leave the system in a broken state.

**Do not hardcode values in tasks.** Anything that might vary between environments should be a variable in `defaults/main.yml`.

**Do not forget to move the notify references.** When you move tasks into a role, make sure the handler names match. Handlers in a role are scoped differently than handlers in a playbook.

## Refactoring Checklist

Before you start:
- Read the entire playbook and identify logical groups
- List all variables and which group they belong to
- Identify shared templates and files

During refactoring:
- Create role skeletons
- Move tasks, keeping the original order within each group
- Extract variables into defaults
- Move templates into role directories
- Move handlers into role directories
- Update the main playbook to use roles

After refactoring:
- Run the refactored playbook against a test environment
- Verify the output matches the original
- Check for any missing variable references or broken template paths
- Test each role individually

The refactoring process is mechanical once you get the hang of it. The payoff is immediate: cleaner playbooks, reusable components, and the ability to test pieces of your infrastructure independently.
