# How to Use Ansible wait_for Module for Condition Waiting

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, wait_for, Conditions, Networking, DevOps

Description: Use the Ansible wait_for module to wait for ports, files, and conditions before proceeding with playbook execution.

---

The `ansible.builtin.wait_for` module pauses playbook execution until a specific condition is met. Unlike the `pause` module which waits for a fixed duration, `wait_for` actively polls for a condition like a port becoming available, a file appearing on disk, or a string appearing in a file.

## Waiting for a Port

The most common use case is waiting for a service to start listening on a port:

```yaml
# Wait for PostgreSQL to be ready
- name: Start PostgreSQL
  ansible.builtin.service:
    name: postgresql
    state: started

- name: Wait for PostgreSQL to accept connections
  ansible.builtin.wait_for:
    port: 5432
    host: 127.0.0.1
    delay: 5
    timeout: 60
    state: started
```

## Waiting for a File

```yaml
# Wait for an application to create its PID file
- name: Start application
  ansible.builtin.command: /opt/app/bin/start
  async: 60
  poll: 0

- name: Wait for PID file to appear
  ansible.builtin.wait_for:
    path: /var/run/myapp.pid
    state: present
    timeout: 30

# Wait for a log message indicating successful startup
- name: Wait for application startup message
  ansible.builtin.wait_for:
    path: /var/log/myapp/startup.log
    search_regex: "Application started successfully"
    timeout: 120
```

## Waiting for a Port to Close

```yaml
# Wait for a service to stop
- name: Stop the old service
  ansible.builtin.service:
    name: myapp
    state: stopped

- name: Wait for port to be released
  ansible.builtin.wait_for:
    port: 8080
    state: stopped
    timeout: 30
```

## Waiting for Remote Hosts

```yaml
# Wait for a remote host to become reachable
- name: Reboot the server
  ansible.builtin.reboot:
    reboot_timeout: 300

# Or manually wait for SSH
- name: Wait for SSH to come back
  ansible.builtin.wait_for:
    host: "{{ ansible_host }}"
    port: 22
    delay: 30
    timeout: 300
    state: started
  delegate_to: localhost
```

## Waiting with Patterns

```yaml
# Wait for specific content in a file
- name: Wait for database migration to complete
  ansible.builtin.wait_for:
    path: /var/log/migration.log
    search_regex: "Migration completed|All migrations applied"
    timeout: 300

# Wait for a file to be removed (lock file pattern)
- name: Wait for lock file to be removed
  ansible.builtin.wait_for:
    path: /tmp/deploy.lock
    state: absent
    timeout: 600
```

## Combining with Other Tasks

```yaml
# Common pattern: start service, wait for port, verify health
- name: Deploy and verify service
  hosts: appservers
  tasks:
    - name: Deploy new version
      community.docker.docker_container:
        name: myapp
        image: "myapp:{{ version }}"
        state: started
        ports:
          - "8080:8080"

    - name: Wait for application port
      ansible.builtin.wait_for:
        port: 8080
        host: 127.0.0.1
        delay: 5
        timeout: 60

    - name: Verify application health
      ansible.builtin.uri:
        url: http://127.0.0.1:8080/health
        status_code: 200
      register: health
      until: health.status == 200
      retries: 5
      delay: 10
```

## Connection Draining

```yaml
# Wait for active connections to drain
- name: Wait for connections to drain
  ansible.builtin.wait_for:
    host: "{{ ansible_host }}"
    port: 8080
    state: drained
    delay: 5
    timeout: 120
    exclude_hosts: "{{ monitoring_servers }}"
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

The `wait_for` module is essential for orchestrating service dependencies. Use it to wait for ports after starting services, for files after triggering asynchronous processes, and for patterns in log files during migrations. The combination of `delay`, `timeout`, and `state` parameters gives you precise control over how long to wait and what to wait for.

