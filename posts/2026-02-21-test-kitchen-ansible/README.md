# How to Use Test Kitchen with Ansible

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, Testing, Test Kitchen, Chef, Integration

Description: Use Test Kitchen with the Ansible provisioner to test playbooks and roles in disposable VM and container environments.

---

Test Kitchen is a testing framework originally from the Chef ecosystem that creates temporary instances, converges them, runs verification tests, and then destroys them before changes reach production. This guide covers practical approaches with working code examples.

## Why Testing Ansible Code Matters

Ansible playbooks are infrastructure code. Like any code, they can have bugs, regressions, and unexpected behaviors. Testing catches these issues before they affect production systems. A good testing strategy includes linting, unit tests, integration tests, and validation tests.

## Project Structure

Organize your tests alongside your Ansible code:

```text
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
  kitchen.yml
  tests/
    integration/
      default/
        default_test.rb
```

## Setting Up the Test Environment

Install Ruby, Vagrant, and a Vagrant provider such as VirtualBox on the workstation or runner, then install the required testing tools:

```bash
# Install testing tools

gem install test-kitchen kitchen-ansible kitchen-vagrant kitchen-inspec
pip install ansible-core ansible-lint yamllint
ansible-galaxy collection install community.general
```

## Writing Tests

### Test Kitchen Configuration

```yaml
# kitchen.yml
---
driver:
  name: vagrant

provisioner:
  name: ansible_playbook
  roles_path: roles
  playbook: playbooks/site.yml
  hosts: all
  require_ansible_repo: true
  require_chef_for_busser: false

verifier:
  name: inspec

platforms:
  - name: ubuntu-24.04
  - name: rockylinux-9

suites:
  - name: default
    verifier:
      inspec_tests:
        - tests/integration/default
```

### Converge Playbook

```yaml
# playbooks/site.yml
---
- name: Converge
  hosts: all
  become: true
  roles:
    - role: my_role
```

### Verification Tests

```ruby
# tests/integration/default/default_test.rb
describe service('my_service') do
  it { should be_installed }
  it { should be_enabled }
  it { should be_running }
end

describe file('/etc/my_service/config.yml') do
  it { should exist }
  its('mode') { should cmp '0644' }
end

describe port(8080) do
  it { should be_listening }
end

describe command('curl -fsS http://localhost:8080/health') do
  its('exit_status') { should eq 0 }
end
```

## Running Tests

```bash
# Run the full test lifecycle
kitchen test

# Run individual stages
kitchen create    # Create test instances
kitchen converge  # Run the playbook
kitchen verify    # Run verification tests
kitchen destroy   # Clean up

# Run with specific platform
kitchen test default-ubuntu-2404

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
  kitchen:
    runs-on: self-hosted
    strategy:
      matrix:
        instance: [default-ubuntu-2404, default-rockylinux-9]
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with:
          python-version: '3.11'
      - uses: ruby/setup-ruby@v1
        with:
          ruby-version: '3.3'
      - run: gem install test-kitchen kitchen-ansible kitchen-vagrant kitchen-inspec
      - run: pip install ansible-core ansible-lint yamllint
      - run: ansible-galaxy collection install community.general
      - run: kitchen test ${{ matrix.instance }}
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

kitchen:
  stage: test
  tags:
    - vagrant
  script:
    - gem install test-kitchen kitchen-ansible kitchen-vagrant kitchen-inspec
    - pip install ansible-core ansible-lint yamllint
    - ansible-galaxy collection install community.general
    - kitchen test
```

## Advanced Testing Patterns

### Testing Idempotency

```bash
# kitchen-ansible can run the playbook twice and fail on changes
# during the second run when idempotency_test is enabled
kitchen converge
```

```yaml
# kitchen.yml
provisioner:
  name: ansible_playbook
  idempotency_test: true
```

### Testing with Different Variables

```yaml
# kitchen.yml
provisioner:
  name: ansible_playbook
  extra_vars:
    custom_port: 9090
    enable_ssl: true
```

### InSpec Tests

```ruby
# tests/integration/default/default_test.rb
describe service('my_service') do
  it { should be_running }
  it { should be_enabled }
end

describe file('/etc/my_service/config.yml') do
  it { should exist }
  its('owner') { should eq 'root' }
  its('mode') { should cmp '0644' }
end

describe port(8080) do
  it { should be_listening }
end
```

## Summary

Testing Ansible code requires multiple layers: linting for style and best practices, unit tests for individual roles, integration tests for multi-role interactions, and validation tests for the final system state. Test Kitchen can test Ansible playbooks across multiple platforms and verification strategies through provisioner and verifier plugins. Integrate tests into your CI/CD pipeline so every change gets validated automatically. The investment in testing pays off quickly by catching issues before they reach production.

## Common Use Cases

Here are several practical scenarios where this workflow proves essential in real-world playbooks.

### Infrastructure Provisioning Workflow

```yaml
# Complete workflow incorporating this testing approach
- name: Infrastructure provisioning
  hosts: all
  become: true
  gather_facts: true
  vars:
    ssh_service_name: "{{ 'ssh' if ansible_os_family == 'Debian' else 'sshd' }}"
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
      community.general.timezone:
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
      notify: restart ssh

    - name: Configure firewall rules
      community.general.ufw:
        rule: allow
        port: "{{ item }}"
        proto: tcp
      loop:
        - "22"
        - "80"
        - "443"
      when: ansible_os_family == 'Debian'

    - name: Enable firewall
      community.general.ufw:
        state: enabled
        policy: deny
      when: ansible_os_family == 'Debian'

  handlers:
    - name: restart ssh
      ansible.builtin.service:
        name: "{{ ssh_service_name }}"
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
# Robust error handling with this testing approach
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
