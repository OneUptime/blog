# How to Fix Ansible Failed to lock apt Errors

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, apt, Ubuntu, Troubleshooting, Package Management

Description: Resolve Ansible apt lock errors caused by concurrent package operations, unattended upgrades, and stale lock files on Ubuntu and Debian.

---

The "Failed to lock apt for exclusive operation" error means another process is using the apt package manager. On Ubuntu and Debian systems, only one apt process can run at a time, and if something else is holding the lock, your Ansible task fails.

## The Error

```
fatal: [server1]: FAILED! => {
    "msg": "Failed to lock apt for exclusive operation"
}
```

## Common Causes and Fixes

### Cause 1: Unattended Upgrades Running

Ubuntu automatically runs security updates, which holds the apt lock:

```yaml
# Wait for any existing apt processes to finish
- name: Wait for automatic updates to complete
  shell: while fuser /var/lib/dpkg/lock-frontend >/dev/null 2>&1; do sleep 5; done
  changed_when: false

# Then run your apt task
- name: Install packages
  apt:
    name: nginx
    state: present
```

### Cause 2: Another Ansible Task Holding the Lock

```yaml
# If running multiple plays that use apt, serialize them
- hosts: all
  serial: 1  # One host at a time
  tasks:
    - name: Install packages
      apt:
        name: nginx
        state: present
```

### Cause 3: Stale Lock Files

```yaml
# Remove stale lock files (use with caution)
- name: Remove stale apt lock files
  file:
    path: "{{ item }}"
    state: absent
  loop:
    - /var/lib/dpkg/lock-frontend
    - /var/lib/dpkg/lock
    - /var/lib/apt/lists/lock
    - /var/cache/apt/archives/lock
  become: yes
  when: force_apt_unlock | default(false)

- name: Reconfigure dpkg if interrupted
  command: dpkg --configure -a
  become: yes
  when: force_apt_unlock | default(false)
```

### Robust Solution: Retry with Wait

```yaml
# Retry apt tasks with a delay
- name: Install packages with retry
  apt:
    name: nginx
    state: present
    update_cache: yes
  register: apt_result
  retries: 5
  delay: 30
  until: apt_result is success
  become: yes
```

### Prevention: Disable Unattended Upgrades During Deployment

```yaml
# Temporarily disable unattended upgrades
- name: Stop unattended-upgrades service
  systemd:
    name: unattended-upgrades
    state: stopped
  become: yes

# ... run your apt tasks ...

- name: Restart unattended-upgrades service
  systemd:
    name: unattended-upgrades
    state: started
  become: yes
```

## Summary

Apt lock errors are a concurrency issue. The most robust solution is using retries with a delay, which handles the common case of unattended upgrades running in the background. For deployment pipelines, temporarily stopping unattended-upgrades before running apt tasks eliminates the race condition entirely.

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

