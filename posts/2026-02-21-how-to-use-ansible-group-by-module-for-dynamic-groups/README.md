# How to Use Ansible group_by Module for Dynamic Groups

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, group_by, Dynamic Groups, Inventory, DevOps

Description: Create dynamic host groups at runtime with the Ansible group_by module based on facts, variables, and host attributes.

---

The `ansible.builtin.group_by` module creates host groups dynamically during playbook execution. This lets you organize hosts based on gathered facts like operating system, kernel version, or any other variable, and then target those groups in subsequent plays.

## Basic Usage

```yaml
# Create groups based on OS family
- name: Group hosts by OS
  hosts: all
  tasks:
    - name: Create OS family groups
      ansible.builtin.group_by:
        key: "os_{{ ansible_os_family | lower }}"

- name: Configure Debian-based hosts
  hosts: os_debian
  tasks:
    - name: Update apt cache
      ansible.builtin.apt:
        update_cache: true

- name: Configure RedHat-based hosts
  hosts: os_redhat
  tasks:
    - name: Update yum cache
      ansible.builtin.dnf:
        update_cache: true
```

## Grouping by Distribution

```yaml
- name: Group by distribution and version
  hosts: all
  tasks:
    - name: Create distribution groups
      ansible.builtin.group_by:
        key: "distro_{{ ansible_distribution | lower }}_{{ ansible_distribution_major_version }}"

- name: Ubuntu 22 specific tasks
  hosts: distro_ubuntu_22
  tasks:
    - name: Install Ubuntu 22 specific packages
      ansible.builtin.apt:
        name: ubuntu-22-specific-package
        state: present

- name: Rocky Linux 9 specific tasks
  hosts: distro_rocky_9
  tasks:
    - name: Install Rocky 9 specific packages
      ansible.builtin.dnf:
        name: rocky-9-specific-package
        state: present
```

## Grouping by Custom Variables

```yaml
# Group by application tier
- name: Group hosts by role
  hosts: all
  tasks:
    - name: Create role-based groups
      ansible.builtin.group_by:
        key: "role_{{ host_role | default('unknown') }}"

# Then target specific roles
- name: Configure database servers
  hosts: role_database
  roles:
    - postgresql

- name: Configure web servers
  hosts: role_web
  roles:
    - nginx
```

## Grouping by Hardware

```yaml
# Group by memory size for resource allocation
- name: Group by memory tier
  hosts: all
  tasks:
    - name: Create memory tier groups
      ansible.builtin.group_by:
        key: >-
          memory_{{ 'large' if ansible_memtotal_mb > 8000
          else 'medium' if ansible_memtotal_mb > 4000
          else 'small' }}

- name: Configure large memory hosts
  hosts: memory_large
  vars:
    worker_count: 8
    cache_size: 4096m
  tasks:
    - name: Apply large host configuration
      ansible.builtin.include_role:
        name: app_config
```

## Practical Example: Multi-OS Package Management

```yaml
# playbooks/install_packages.yml
- name: Categorize hosts
  hosts: all
  gather_facts: true
  tasks:
    - name: Group by package manager
      ansible.builtin.group_by:
        key: "pkg_{{ ansible_pkg_mgr }}"

- name: Install on apt-based systems
  hosts: pkg_apt
  become: true
  tasks:
    - name: Install packages with apt
      ansible.builtin.apt:
        name: "{{ common_packages }}"
        state: present
        update_cache: true

- name: Install on dnf-based systems
  hosts: pkg_dnf
  become: true
  tasks:
    - name: Install packages with dnf
      ansible.builtin.dnf:
        name: "{{ common_packages }}"
        state: present
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

The `group_by` module enables runtime host organization based on any variable or fact. This is particularly valuable when managing heterogeneous environments where you need different task sets for different operating systems, hardware configurations, or deployment roles. Create the groups in an early play, then target them in subsequent plays.

