# How to Use Ansible with Chef for Migration

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, Chef, Migration, Configuration Management

Description: Migrate from Chef to Ansible by converting cookbooks to roles and gradually transitioning server management to Ansible playbooks.

---

Migrating from Chef to Ansible follows a similar pattern to any configuration management migration: run both in parallel, convert configurations incrementally, and remove the old tool once everything is migrated.

## Migration Mapping

Chef and Ansible concepts map directly:

| Chef Concept | Ansible Equivalent |
|---|---|
| Cookbook | Role |
| Recipe | Tasks file |
| Attribute | Variable |
| Template (ERB) | Template (Jinja2) |
| Resource | Module |
| Data Bag | Variable file / Vault |
| Chef Server | Ansible Controller |
| Knife | ansible-playbook CLI |

## Converting a Chef Cookbook

Chef recipe:

```ruby
# cookbooks/nginx/recipes/default.rb
package 'nginx' do
  action :install
end

template '/etc/nginx/nginx.conf' do
  source 'nginx.conf.erb'
  variables(
    worker_processes: node['nginx']['worker_processes'],
    worker_connections: node['nginx']['worker_connections']
  )
  notifies :reload, 'service[nginx]'
end

service 'nginx' do
  action [:enable, :start]
end
```

Equivalent Ansible role:

```yaml
# roles/nginx/tasks/main.yml
---
- name: Install nginx
  ansible.builtin.apt:
    name: nginx
    state: present

- name: Configure nginx
  ansible.builtin.template:
    src: nginx.conf.j2
    dest: /etc/nginx/nginx.conf
    mode: '0644'
  notify: reload nginx

- name: Ensure nginx is running
  ansible.builtin.service:
    name: nginx
    state: started
    enabled: true
```

## Converting ERB to Jinja2

ERB template:

```erb
worker_processes <%= @worker_processes %>;
events {
    worker_connections <%= @worker_connections %>;
}
```

Jinja2 template:

```jinja2
worker_processes {{ worker_processes }};
events {
    worker_connections {{ worker_connections }};
}
```

## Migration Playbook

```yaml
# playbooks/migrate-from-chef.yml
---
- name: Migrate server from Chef to Ansible
  hosts: "{{ target_hosts }}"
  become: true
  tasks:
    - name: Apply Ansible configuration
      ansible.builtin.include_role:
        name: "{{ item }}"
      loop:
        - common
        - nginx
        - app_deploy

    - name: Verify configuration matches
      ansible.builtin.command:
        cmd: "nginx -t"
      changed_when: false

    - name: Stop Chef client
      ansible.builtin.service:
        name: chef-client
        state: stopped
        enabled: false

    - name: Remove Chef
      ansible.builtin.apt:
        name: chef
        state: absent
        purge: true
```

## Key Takeaways

Chef to Ansible migration is straightforward because the concepts map directly. Cookbooks become roles. Recipes become task files. ERB templates become Jinja2 templates. Attributes become variables. Migrate one cookbook at a time, verify the Ansible configuration matches, then disable Chef management for that component.

## Common Use Cases

Here are several practical scenarios where this module proves essential in real-world playbooks.

### Infrastructure Provisioning Workflow

```yaml
# Complete workflow incorporating this module
- name: Infrastructure provisioning
  hosts: all
  become: true
  gather_facts: true
  tasks:
    - name: Gather system information
      ansible.builtin.setup:
        gather_subset:
          - hardware
          - network

    - name: Display system summary
      ansible.builtin.debug:
        msg: >-
          Host {{ inventory_hostname }} has
          {{ ansible_memtotal_mb }}MB RAM,
          {{ ansible_processor_vcpus }} vCPUs,
          running {{ ansible_distribution }} {{ ansible_distribution_version }}

    - name: Install required packages
      ansible.builtin.package:
        name:
          - curl
          - wget
          - git
          - vim
          - htop
          - jq
        state: present

    - name: Configure system timezone
      ansible.builtin.timezone:
        name: "{{ system_timezone | default('UTC') }}"

    - name: Configure hostname
      ansible.builtin.hostname:
        name: "{{ inventory_hostname }}"

    - name: Update /etc/hosts
      ansible.builtin.lineinfile:
        path: /etc/hosts
        regexp: '^127\.0\.1\.1'
        line: "127.0.1.1 {{ inventory_hostname }}"

    - name: Configure SSH hardening
      ansible.builtin.lineinfile:
        path: /etc/ssh/sshd_config
        regexp: "{{ item.regexp }}"
        line: "{{ item.line }}"
      loop:
        - { regexp: '^PermitRootLogin', line: 'PermitRootLogin no' }
        - { regexp: '^PasswordAuthentication', line: 'PasswordAuthentication no' }
      notify: restart sshd

    - name: Configure firewall rules
      community.general.ufw:
        rule: allow
        port: "{{ item }}"
        proto: tcp
      loop:
        - "22"
        - "80"
        - "443"

    - name: Enable firewall
      community.general.ufw:
        state: enabled
        policy: deny

  handlers:
    - name: restart sshd
      ansible.builtin.service:
        name: sshd
        state: restarted
```

### Integration with Monitoring

```yaml
# Using gathered facts to configure monitoring thresholds
- name: Configure monitoring based on system specs
  hosts: all
  become: true
  tasks:
    - name: Set monitoring thresholds based on hardware
      ansible.builtin.template:
        src: monitoring_config.yml.j2
        dest: /etc/monitoring/config.yml
      vars:
        memory_warning_threshold: "{{ (ansible_memtotal_mb * 0.8) | int }}"
        memory_critical_threshold: "{{ (ansible_memtotal_mb * 0.95) | int }}"
        cpu_warning_threshold: 80
        cpu_critical_threshold: 95

    - name: Register host with monitoring system
      ansible.builtin.uri:
        url: "https://monitoring.example.com/api/hosts"
        method: POST
        body_format: json
        body:
          hostname: "{{ inventory_hostname }}"
          ip_address: "{{ ansible_default_ipv4.address }}"
          os: "{{ ansible_distribution }}"
          memory_mb: "{{ ansible_memtotal_mb }}"
          cpus: "{{ ansible_processor_vcpus }}"
        headers:
          Authorization: "Bearer {{ monitoring_api_token }}"
        status_code: [200, 201, 409]
```

### Error Handling Patterns

```yaml
# Robust error handling with this module
- name: Robust task execution
  hosts: all
  tasks:
    - name: Attempt primary operation
      ansible.builtin.command: /opt/app/primary-task.sh
      register: primary_result
      failed_when: false

    - name: Handle primary failure with fallback
      ansible.builtin.command: /opt/app/fallback-task.sh
      when: primary_result.rc != 0
      register: fallback_result

    - name: Report final status
      ansible.builtin.debug:
        msg: >-
          Task completed via {{ 'primary' if primary_result.rc == 0 else 'fallback' }} path.
          Return code: {{ primary_result.rc if primary_result.rc == 0 else fallback_result.rc }}

    - name: Fail if both paths failed
      ansible.builtin.fail:
        msg: "Both primary and fallback operations failed"
      when:
        - primary_result.rc != 0
        - fallback_result is defined
        - fallback_result.rc != 0
```

### Scheduling and Automation

```yaml
# Set up scheduled compliance scans using cron
- name: Configure automated scans
  hosts: all
  become: true
  tasks:
    - name: Create scan script
      ansible.builtin.copy:
        dest: /opt/scripts/compliance_scan.sh
        mode: '0755'
        content: |
          #!/bin/bash
          cd /opt/ansible
          ansible-playbook playbooks/validate.yml -i inventory/ > /var/log/compliance_scan.log 2>&1
          EXIT_CODE=$?
          if [ $EXIT_CODE -ne 0 ]; then
            curl -X POST https://hooks.example.com/alert \
              -H "Content-Type: application/json" \
              -d "{\"text\":\"Compliance scan failed on $(hostname)\"}"
          fi
          exit $EXIT_CODE

    - name: Schedule weekly compliance scan
      ansible.builtin.cron:
        name: "Weekly compliance scan"
        minute: "0"
        hour: "3"
        weekday: "1"
        job: "/opt/scripts/compliance_scan.sh"
        user: ansible
```

