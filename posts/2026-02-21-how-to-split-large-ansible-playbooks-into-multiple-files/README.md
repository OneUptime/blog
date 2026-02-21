# How to Split Large Ansible Playbooks into Multiple Files

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, Playbooks, Organization, Includes, DevOps

Description: Break down large Ansible playbooks into manageable pieces using imports, includes, and roles for better maintainability and reusability.

---

Large playbooks become unmanageable fast. When your single playbook file exceeds a few hundred lines, finding tasks becomes tedious, merge conflicts become common, and testing individual components becomes impractical. Ansible provides several mechanisms for splitting playbooks into smaller, focused files.

## import_playbook for Top-Level Organization

```yaml
# site.yml - master playbook that imports sub-playbooks
- import_playbook: playbooks/infrastructure.yml
- import_playbook: playbooks/databases.yml
- import_playbook: playbooks/applications.yml
- import_playbook: playbooks/monitoring.yml
```

```yaml
# playbooks/infrastructure.yml
- name: Configure base infrastructure
  hosts: all
  become: true
  roles:
    - common
    - security
    - ntp
```

## import_tasks vs include_tasks

```yaml
# import_tasks - static, processed at parse time
- name: Static import
  ansible.builtin.import_tasks: tasks/install.yml

# include_tasks - dynamic, processed at runtime
- name: Dynamic include
  ansible.builtin.include_tasks: tasks/install.yml
  when: install_required
```

Use `import_tasks` when you always want those tasks. Use `include_tasks` when you need conditional or loop-based inclusion.

## Role-Based Splitting

```yaml
# Convert task groups into roles
# roles/nginx/tasks/main.yml
- name: Install nginx
  ansible.builtin.apt:
    name: nginx
    state: present

- name: Configure nginx
  ansible.builtin.template:
    src: nginx.conf.j2
    dest: /etc/nginx/nginx.conf
  notify: restart nginx

# roles/nginx/handlers/main.yml
- name: restart nginx
  ansible.builtin.service:
    name: nginx
    state: restarted
```

## Conditional Includes

```yaml
# Include platform-specific tasks
- name: Include OS-specific tasks
  ansible.builtin.include_tasks: "{{ ansible_os_family | lower }}.yml"

# Include feature-specific tasks
- name: Include monitoring setup
  ansible.builtin.include_tasks: monitoring.yml
  when: monitoring_enabled | default(false)
```

## Variable File Organization

```yaml
# Split variable files by concern
group_vars/
  all/
    network.yml
    packages.yml
    security.yml
    monitoring.yml
  webservers/
    nginx.yml
    ssl.yml
  databases/
    postgresql.yml
    backup.yml
```

## Task File Organization Within Roles

```yaml
# roles/app/tasks/main.yml
- name: Include installation tasks
  ansible.builtin.import_tasks: install.yml
  tags: [install]

- name: Include configuration tasks
  ansible.builtin.import_tasks: configure.yml
  tags: [configure]

- name: Include deployment tasks
  ansible.builtin.import_tasks: deploy.yml
  tags: [deploy]

- name: Include verification tasks
  ansible.builtin.import_tasks: verify.yml
  tags: [verify]
```

## Project Structure

```
project/
  site.yml
  playbooks/
    infrastructure.yml
    applications.yml
    monitoring.yml
  roles/
    common/
    nginx/
    postgresql/
    app/
  inventories/
    production/
    staging/
  group_vars/
    all/
    webservers/
    databases/
```


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


## Conclusion

Split playbooks at natural boundaries: separate plays into sub-playbooks with `import_playbook`, separate task groups into include files, and separate reusable components into roles. The goal is files small enough to understand at a glance, focused enough to test independently, and organized well enough that anyone can find what they need quickly.

