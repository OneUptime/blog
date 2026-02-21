# How to Use Ansible pause Module for Interactive Prompts

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, pause Module, Interactive, Prompts, Automation

Description: Use the Ansible pause module for interactive prompts, timed delays, and user confirmations during playbook execution.

---

The `ansible.builtin.pause` module stops playbook execution and waits for a specified duration or user input. It is useful for adding delays between tasks, getting confirmation before destructive operations, and prompting for runtime input.

## Basic Timed Pause

```yaml
# Wait for a specified number of seconds
- name: Wait for service to initialize
  ansible.builtin.pause:
    seconds: 30
    prompt: "Waiting 30 seconds for the service to start..."
```

## Timed Pause with Minutes

```yaml
# Wait for a longer duration
- name: Wait for DNS propagation
  ansible.builtin.pause:
    minutes: 5
    prompt: "Waiting 5 minutes for DNS changes to propagate"
```

## Interactive Confirmation

```yaml
# Pause and wait for user to press Enter
- name: Confirm before proceeding
  ansible.builtin.pause:
    prompt: "This will restart all production services. Press Enter to continue or Ctrl+C to abort"
```

## Capturing User Input

```yaml
# Prompt for a value from the user
- name: Get deployment version
  ansible.builtin.pause:
    prompt: "Enter the version to deploy (e.g., v2.1.0)"
  register: version_input

- name: Display captured version
  ansible.builtin.debug:
    msg: "Deploying version: {{ version_input.user_input }}"

- name: Deploy the specified version
  ansible.builtin.include_role:
    name: deploy
  vars:
    app_version: "{{ version_input.user_input }}"
```

## Confirmation Before Destructive Actions

```yaml
# playbooks/destroy_environment.yml
# Require explicit confirmation before destroying resources
- name: Destroy staging environment
  hosts: staging
  become: true
  tasks:
    - name: Display warning
      ansible.builtin.debug:
        msg: |
          WARNING: This will destroy the following resources:
          - All containers on {{ inventory_hostname }}
          - All Docker volumes
          - Application data in /opt/app

    - name: Confirm destruction
      ansible.builtin.pause:
        prompt: "Type 'DESTROY' to confirm (anything else aborts)"
      register: confirm

    - name: Abort if not confirmed
      ansible.builtin.fail:
        msg: "Aborted by user"
      when: confirm.user_input != 'DESTROY'

    - name: Proceed with destruction
      ansible.builtin.command: docker compose down -v
      args:
        chdir: /opt/app
      when: confirm.user_input == 'DESTROY'
```

## Pause Between Rolling Updates

```yaml
# Pause between each host in a rolling update
- name: Rolling service restart
  hosts: webservers
  serial: 1
  tasks:
    - name: Restart nginx
      ansible.builtin.service:
        name: nginx
        state: restarted

    - name: Wait for service health
      ansible.builtin.uri:
        url: "http://{{ ansible_host }}/health"
        status_code: 200
      register: health
      until: health.status == 200
      retries: 10
      delay: 5

    - name: Pause before next host
      ansible.builtin.pause:
        seconds: 10
        prompt: "{{ inventory_hostname }} is healthy. Moving to next host in 10 seconds..."
      when: ansible_play_hosts_all.index(inventory_hostname) < (ansible_play_hosts_all | length - 1)
```

## Echo Mode for Sensitive Input

```yaml
# Hide input for sensitive data (echo is off by default for prompts)
- name: Enter database password
  ansible.builtin.pause:
    prompt: "Enter the database password"
    echo: false
  register: db_pass
  no_log: true

- name: Use the password
  ansible.builtin.command: psql -h db.example.com -U admin -c "SELECT 1"
  environment:
    PGPASSWORD: "{{ db_pass.user_input }}"
  no_log: true
```

## Skipping Pause in Automation

In CI/CD pipelines, you do not want interactive pauses. Use conditions to skip them:

```yaml
- name: Confirm deployment
  ansible.builtin.pause:
    prompt: "Press Enter to deploy to production"
  when:
    - not (ci_mode | default(false))
    - not (auto_approve | default(false))
```

```bash
# Skip pauses in CI
ansible-playbook deploy.yml -e ci_mode=true
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

The pause module serves three purposes: adding timed delays between tasks, getting user confirmation for critical operations, and capturing runtime input. Use it sparingly in production playbooks since interactive prompts break automation. Always provide a way to skip pauses in CI environments using conditional variables.

