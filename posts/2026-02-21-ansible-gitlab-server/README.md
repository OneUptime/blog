# How to Use Ansible to Set Up a GitLab Server

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, GitLab, Git, DevOps, CI/CD

Description: Automate the deployment of a self-hosted GitLab instance with HTTPS, email, backups, and runner configuration using Ansible playbooks.

---

Self-hosting GitLab gives your team a complete DevOps platform with source control, CI/CD pipelines, container registry, issue tracking, and more, all under your control. The trade-off is that you are responsible for installation, configuration, updates, and backups. This is exactly where Ansible shines. Instead of following a long manual installation guide and hoping you did not miss a step, you capture the entire setup in a playbook that can be run repeatedly.

This guide covers deploying GitLab Community Edition with Ansible, including HTTPS configuration, SMTP for email notifications, automated backups, and GitLab Runner setup.

## Prerequisites

GitLab is resource-hungry. For a team of 20-50 users, you need at minimum 4 CPU cores, 8 GB RAM, and 50 GB of disk space. The server needs a valid domain name for HTTPS to work properly with Let's Encrypt.

## Role Defaults

```yaml
# roles/gitlab/defaults/main.yml - GitLab configuration
gitlab_domain: gitlab.example.com
gitlab_edition: "gitlab-ce"
gitlab_external_url: "https://{{ gitlab_domain }}"

# SMTP configuration for email notifications
gitlab_smtp_enabled: true
gitlab_smtp_address: smtp.example.com
gitlab_smtp_port: 587
gitlab_smtp_user: "gitlab@example.com"
gitlab_smtp_password: "{{ vault_gitlab_smtp_password }}"
gitlab_smtp_domain: example.com

# Backup configuration
gitlab_backup_enabled: true
gitlab_backup_path: /var/opt/gitlab/backups
gitlab_backup_keep_days: 7
gitlab_backup_schedule: "0 2 * * *"

# GitLab Runner
gitlab_runner_enabled: true
gitlab_runner_token: "{{ vault_gitlab_runner_token }}"
gitlab_runner_executor: docker
gitlab_runner_docker_image: "alpine:latest"
```

## Main Tasks

```yaml
# roles/gitlab/tasks/main.yml - Install and configure GitLab
---
- name: Install prerequisite packages
  apt:
    name:
      - curl
      - openssh-server
      - ca-certificates
      - tzdata
      - perl
      - postfix
    state: present
    update_cache: yes
    env:
      DEBIAN_FRONTEND: noninteractive

- name: Add GitLab package repository
  shell: |
    curl -sS https://packages.gitlab.com/install/repositories/gitlab/{{ gitlab_edition }}/script.deb.sh | bash
  args:
    creates: /etc/apt/sources.list.d/gitlab_{{ gitlab_edition }}.list

- name: Install GitLab
  apt:
    name: "{{ gitlab_edition }}"
    state: present
    update_cache: yes
  environment:
    EXTERNAL_URL: "{{ gitlab_external_url }}"

- name: Deploy GitLab configuration
  template:
    src: gitlab.rb.j2
    dest: /etc/gitlab/gitlab.rb
    owner: root
    group: root
    mode: '0600'
  notify: reconfigure gitlab

- name: Configure automated backups
  cron:
    name: "GitLab backup"
    minute: "0"
    hour: "2"
    job: "/opt/gitlab/bin/gitlab-backup create CRON=1"
    user: root
  when: gitlab_backup_enabled

- name: Configure backup cleanup
  cron:
    name: "GitLab backup cleanup"
    minute: "0"
    hour: "4"
    job: "find {{ gitlab_backup_path }} -name '*.tar' -mtime +{{ gitlab_backup_keep_days }} -delete"
    user: root
  when: gitlab_backup_enabled

- name: Include GitLab Runner tasks
  include_tasks: runner.yml
  when: gitlab_runner_enabled
```

## GitLab Configuration Template

```ruby
# roles/gitlab/templates/gitlab.rb.j2 - GitLab omnibus configuration
external_url '{{ gitlab_external_url }}'

# Let's Encrypt automatic HTTPS
letsencrypt['enable'] = true
letsencrypt['contact_emails'] = ['admin@{{ gitlab_domain }}']
letsencrypt['auto_renew'] = true
letsencrypt['auto_renew_hour'] = 3
letsencrypt['auto_renew_day_of_month'] = "*/7"

# Nginx configuration
nginx['redirect_http_to_https'] = true
nginx['ssl_protocols'] = "TLSv1.2 TLSv1.3"

{% if gitlab_smtp_enabled %}
# SMTP email configuration
gitlab_rails['smtp_enable'] = true
gitlab_rails['smtp_address'] = "{{ gitlab_smtp_address }}"
gitlab_rails['smtp_port'] = {{ gitlab_smtp_port }}
gitlab_rails['smtp_user_name'] = "{{ gitlab_smtp_user }}"
gitlab_rails['smtp_password'] = "{{ gitlab_smtp_password }}"
gitlab_rails['smtp_domain'] = "{{ gitlab_smtp_domain }}"
gitlab_rails['smtp_authentication'] = "login"
gitlab_rails['smtp_enable_starttls_auto'] = true
gitlab_rails['gitlab_email_from'] = '{{ gitlab_smtp_user }}'
{% endif %}

# Backup configuration
gitlab_rails['backup_path'] = "{{ gitlab_backup_path }}"
gitlab_rails['backup_keep_time'] = {{ gitlab_backup_keep_days * 86400 }}

# Performance tuning for moderate usage
postgresql['shared_buffers'] = "512MB"
postgresql['max_worker_processes'] = 4
puma['worker_processes'] = 3
sidekiq['max_concurrency'] = 10

# Container registry
registry_external_url 'https://registry.{{ gitlab_domain }}'

# Monitoring
prometheus_monitoring['enable'] = true
grafana['enable'] = false
```

## GitLab Runner Tasks

```yaml
# roles/gitlab/tasks/runner.yml - Install and register GitLab Runner
---
- name: Add GitLab Runner repository
  shell: |
    curl -L https://packages.gitlab.com/install/repositories/runner/gitlab-runner/script.deb.sh | bash
  args:
    creates: /etc/apt/sources.list.d/runner_gitlab-runner.list

- name: Install GitLab Runner
  apt:
    name: gitlab-runner
    state: present
    update_cache: yes

- name: Install Docker for Runner executor
  apt:
    name:
      - docker-ce
      - docker-ce-cli
    state: present

- name: Add gitlab-runner user to docker group
  user:
    name: gitlab-runner
    groups: docker
    append: yes

- name: Register GitLab Runner
  command: >
    gitlab-runner register
    --non-interactive
    --url "{{ gitlab_external_url }}"
    --token "{{ gitlab_runner_token }}"
    --executor "{{ gitlab_runner_executor }}"
    --docker-image "{{ gitlab_runner_docker_image }}"
    --description "ansible-managed-runner"
    --tag-list "docker,linux"
    --run-untagged="true"
  args:
    creates: /etc/gitlab-runner/config.toml
```

## Handlers

```yaml
# roles/gitlab/handlers/main.yml
---
- name: reconfigure gitlab
  command: gitlab-ctl reconfigure
```

## Running the Playbook

```bash
# Deploy GitLab
ansible-playbook -i inventory/hosts.ini playbook.yml --ask-vault-pass

# After deployment, access GitLab at https://gitlab.example.com
# The initial root password is in /etc/gitlab/initial_root_password
```

## Restoring from Backup

```yaml
# Restore playbook for disaster recovery
- name: Restore GitLab from backup
  hosts: gitlab
  become: yes
  tasks:
    - name: Stop GitLab services
      command: gitlab-ctl stop

    - name: Start database services only
      command: "gitlab-ctl start {{ item }}"
      loop:
        - postgresql
        - redis

    - name: Restore from latest backup
      command: >
        gitlab-backup restore BACKUP={{ gitlab_backup_timestamp }} force=yes
      environment:
        GITLAB_ASSUME_YES: "1"

    - name: Reconfigure GitLab
      command: gitlab-ctl reconfigure

    - name: Start all GitLab services
      command: gitlab-ctl start
```

## Summary

This Ansible playbook automates the entire GitLab deployment lifecycle, from initial installation through HTTPS configuration, email setup, backup scheduling, and runner registration. The most valuable part is that when you need to migrate to new hardware or recover from a failure, the playbook combined with a recent backup gets you back online quickly. Keep the playbook in a separate Git repository (not on the GitLab instance itself) so you always have access to it.
