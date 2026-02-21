# How to Use Test Kitchen with Ansible

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, Testing, Test Kitchen, Chef, Integration

Description: Use Test Kitchen with the Ansible provisioner to test playbooks and roles in disposable VM and container environments.

---

Test Kitchen is a testing framework originally from the Chef ecosystem before changes reach production. This guide covers practical approaches with working code examples.

## Why Testing Ansible Code Matters

Ansible playbooks are infrastructure code. Like any code, they can have bugs, regressions, and unexpected behaviors. Testing catches these issues before they affect production systems. A good testing strategy includes linting, unit tests, integration tests, and validation tests.

## Project Structure

Organize your tests alongside your Ansible code:

```
project/
  roles/
    my_role/
      tasks/
        main.yml
      defaults/
        main.yml
      handlers/
        main.yml
      tests/
        test_default.yml
  playbooks/
    site.yml
  tests/
    integration/
      test_deployment.yml
    validation/
      test_services.yml
  molecule/
    default/
      molecule.yml
      converge.yml
      verify.yml
```

## Setting Up the Test Environment

Install the required testing tools:

```bash
# Install testing tools
pip install ansible-core molecule molecule-docker ansible-lint yamllint pytest testinfra
```

## Writing Tests

### Molecule Configuration

```yaml
# molecule/default/molecule.yml
dependency:
  name: galaxy
driver:
  name: docker
platforms:
  - name: ubuntu2404
    image: ubuntu:24.04
    pre_build_image: true
    command: /bin/systemd
    privileged: true
    volumes:
      - /sys/fs/cgroup:/sys/fs/cgroup:rw
  - name: rocky9
    image: rockylinux:9
    pre_build_image: true
    command: /usr/sbin/init
    privileged: true
    volumes:
      - /sys/fs/cgroup:/sys/fs/cgroup:rw
provisioner:
  name: ansible
verifier:
  name: ansible
```

### Converge Playbook

```yaml
# molecule/default/converge.yml
---
- name: Converge
  hosts: all
  become: true
  roles:
    - role: my_role
```

### Verification Playbook

```yaml
# molecule/default/verify.yml
---
- name: Verify
  hosts: all
  become: true
  tasks:
    - name: Check that the service is running
      ansible.builtin.service_facts:

    - name: Assert service is active
      ansible.builtin.assert:
        that:
          - "'my_service' in ansible_facts.services"
          - "ansible_facts.services['my_service'].state == 'running'"
        fail_msg: "Service my_service is not running"

    - name: Check configuration file exists
      ansible.builtin.stat:
        path: /etc/my_service/config.yml
      register: config_file

    - name: Assert config file exists
      ansible.builtin.assert:
        that:
          - config_file.stat.exists
          - config_file.stat.mode == '0644'

    - name: Test service responds on expected port
      ansible.builtin.wait_for:
        port: 8080
        timeout: 10

    - name: Verify HTTP response
      ansible.builtin.uri:
        url: http://localhost:8080/health
        status_code: 200
      register: health_check

    - name: Assert healthy response
      ansible.builtin.assert:
        that:
          - health_check.status == 200
```

## Running Tests

```bash
# Run the full test lifecycle
molecule test

# Run individual stages
molecule create    # Create test instances
molecule converge  # Run the playbook
molecule verify    # Run verification tests
molecule destroy   # Clean up

# Run with specific platform
molecule test -- --limit ubuntu2404

# Run linting
ansible-lint roles/my_role/
yamllint roles/my_role/
```

## CI/CD Integration

### GitHub Actions

```yaml
# .github/workflows/test.yml
name: Test Ansible Role
on: [push, pull_request]

jobs:
  molecule:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        distro: [ubuntu2404, rocky9, debian12]
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with:
          python-version: '3.11'
      - run: pip install ansible molecule molecule-docker
      - run: molecule test
        env:
          MOLECULE_DISTRO: ${{ matrix.distro }}
```

### GitLab CI

```yaml
# .gitlab-ci.yml
stages:
  - lint
  - test

lint:
  stage: lint
  image: python:3.11
  script:
    - pip install ansible-lint yamllint
    - ansible-lint .
    - yamllint .

molecule:
  stage: test
  image: docker:latest
  services:
    - docker:dind
  script:
    - pip install ansible molecule molecule-docker
    - molecule test
```

## Advanced Testing Patterns

### Testing Idempotency

```bash
# Molecule automatically tests idempotency by running converge twice
# The second run should have zero changes
molecule converge
molecule idempotence
```

### Testing with Different Variables

```yaml
# molecule/custom-vars/molecule.yml
provisioner:
  name: ansible
  inventory:
    group_vars:
      all:
        custom_port: 9090
        enable_ssl: true
```

### Testinfra Tests (Python-Based)

```python
# tests/test_default.py
def test_service_is_running(host):
    service = host.service("my_service")
    assert service.is_running
    assert service.is_enabled

def test_config_file(host):
    config = host.file("/etc/my_service/config.yml")
    assert config.exists
    assert config.user == "root"
    assert config.mode == 0o644

def test_port_is_listening(host):
    socket = host.socket("tcp://0.0.0.0:8080")
    assert socket.is_listening
```

## Summary

Testing Ansible code requires multiple layers: linting for style and best practices, unit tests for individual roles, integration tests for multi-role interactions, and validation tests for the final system state. Molecule is the standard testing tool for Ansible roles, supporting multiple platforms and verification strategies. Integrate tests into your CI/CD pipeline so every change gets validated automatically. The investment in testing pays off quickly by catching issues before they reach production.

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

