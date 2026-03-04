# How to Set Up Molecule for Ansible Role Testing on RHEL

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: RHEL, Molecule, Ansible, Testing, Automation, Linux

Description: Learn how to set up Molecule on RHEL for testing Ansible roles, including Docker and Podman drivers, test scenarios, linting, idempotence checks, and CI/CD integration.

---

Molecule is the standard testing framework for Ansible roles and collections. It creates ephemeral instances, runs your role against them, verifies the result, and tears everything down. This catches bugs in your Ansible code before they reach production. This guide covers setting up Molecule on RHEL with Podman and Docker drivers.

## How Molecule Works

A Molecule test scenario defines:

1. **Dependency** - install role dependencies from Galaxy or other sources
2. **Create** - spin up test instances (containers, VMs, or cloud resources)
3. **Converge** - apply the Ansible role to the instances
4. **Idempotence** - run the role again to verify no changes occur
5. **Verify** - run Ansible or Testinfra tests against the instances
6. **Destroy** - tear down the instances

## Prerequisites

- RHEL with root or sudo access
- Python 3.9 or newer
- Podman or Docker installed

## Installing Molecule

```bash
# Install Python pip
sudo dnf install -y python3-pip python3-devel gcc
```

```bash
# Install Molecule with the Podman driver
pip3 install --user molecule molecule-plugins[podman] ansible-lint yamllint
```

For Docker instead of Podman:

```bash
# Install Molecule with the Docker driver
pip3 install --user molecule molecule-plugins[docker]
```

Verify the installation:

```bash
# Check the version
molecule --version
```

## Creating an Ansible Role with Molecule

```bash
# Create a new role with Molecule scaffolding
molecule init role my_webserver --driver-name podman
cd my_webserver
```

This creates the standard Ansible role directory structure with a `molecule/default/` scenario.

## Understanding the Scenario Structure

```
molecule/
  default/
    converge.yml      # Playbook that applies the role
    molecule.yml      # Scenario configuration
    verify.yml        # Verification tests
```

## Configuring molecule.yml

```yaml
# molecule/default/molecule.yml
---
dependency:
  name: galaxy

driver:
  name: podman

platforms:
  - name: rhel9-instance
    image: registry.access.redhat.com/ubi9/ubi-init:latest
    command: /usr/sbin/init
    tmpfs:
      - /run
      - /tmp
    volumes:
      - /sys/fs/cgroup:/sys/fs/cgroup:ro
    privileged: true
    pre_build_image: true

provisioner:
  name: ansible
  lint:
    name: ansible-lint

verifier:
  name: ansible
```

## Writing the Ansible Role

Create the tasks for a web server role:

```yaml
# tasks/main.yml
---
- name: Install httpd
  ansible.builtin.dnf:
    name:
      - httpd
      - mod_ssl
    state: present

- name: Create index page
  ansible.builtin.copy:
    content: "<h1>Hello from {{ ansible_hostname }}</h1>"
    dest: /var/www/html/index.html
    owner: apache
    group: apache
    mode: '0644'

- name: Enable and start httpd
  ansible.builtin.systemd:
    name: httpd
    state: started
    enabled: true

- name: Open firewall for HTTP
  ansible.posix.firewalld:
    service: http
    permanent: true
    state: enabled
    immediate: true
  when: ansible_facts.services['firewalld.service'] is defined
```

## Writing the Converge Playbook

```yaml
# molecule/default/converge.yml
---
- name: Converge
  hosts: all
  become: true
  roles:
    - role: my_webserver
```

## Writing Verification Tests

Use Ansible for verification:

```yaml
# molecule/default/verify.yml
---
- name: Verify
  hosts: all
  become: true
  tasks:
    - name: Check httpd is installed
      ansible.builtin.package:
        name: httpd
        state: present
      check_mode: true
      register: httpd_installed
      failed_when: httpd_installed.changed

    - name: Check httpd is running
      ansible.builtin.service:
        name: httpd
        state: started
      check_mode: true
      register: httpd_running
      failed_when: httpd_running.changed

    - name: Check index page exists
      ansible.builtin.stat:
        path: /var/www/html/index.html
      register: index_page
      failed_when: not index_page.stat.exists

    - name: Check port 80 is listening
      ansible.builtin.wait_for:
        port: 80
        timeout: 5
```

## Running Molecule Tests

```bash
# Run the full test sequence
molecule test
```

Run individual steps:

```bash
# Create the instance
molecule create

# Apply the role
molecule converge

# Run the tests
molecule verify

# Log into the instance for debugging
molecule login

# Destroy the instance
molecule destroy
```

## Checking Idempotence

Molecule's `test` sequence includes an idempotence check by default. It runs the role twice and fails if the second run reports any changes:

```bash
# Run only the idempotence check
molecule idempotence
```

## Adding Linting

Configure linting in molecule.yml:

```yaml
lint: |
  set -e
  yamllint .
  ansible-lint
```

Create a yamllint configuration:

```yaml
# .yamllint
---
extends: default
rules:
  line-length:
    max: 120
    level: warning
  truthy:
    allowed-values: ['true', 'false', 'yes', 'no']
```

Create an ansible-lint configuration:

```yaml
# .ansible-lint
---
skip_list:
  - yaml[line-length]
warn_list:
  - experimental
```

## Multiple Test Scenarios

Create additional scenarios for different test cases:

```bash
# Create a new scenario
molecule init scenario --driver-name podman --scenario-name multi-os
```

Configure it to test on multiple platforms:

```yaml
# molecule/multi-os/molecule.yml
platforms:
  - name: rhel9
    image: registry.access.redhat.com/ubi9/ubi-init:latest
    command: /usr/sbin/init
    privileged: true
    pre_build_image: true
  - name: centos9
    image: quay.io/centos/centos:stream9
    command: /usr/sbin/init
    privileged: true
    pre_build_image: true
```

```bash
# Run a specific scenario
molecule test --scenario-name multi-os
```

## Using Testinfra for Verification

Install Testinfra for Python-based tests:

```bash
# Install Testinfra
pip3 install --user testinfra
```

Update the verifier:

```yaml
verifier:
  name: testinfra
```

Write Testinfra tests:

```python
# molecule/default/tests/test_default.py
import pytest

def test_httpd_installed(host):
    httpd = host.package("httpd")
    assert httpd.is_installed

def test_httpd_running(host):
    httpd = host.service("httpd")
    assert httpd.is_running
    assert httpd.is_enabled

def test_httpd_listening(host):
    socket = host.socket("tcp://0.0.0.0:80")
    assert socket.is_listening

def test_index_page(host):
    index = host.file("/var/www/html/index.html")
    assert index.exists
    assert index.contains("Hello from")
```

## CI/CD Integration

Add Molecule to your CI pipeline:

```yaml
# .github/workflows/molecule.yml
name: Molecule Test
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Set up Python
        uses: actions/setup-python@v5
        with:
          python-version: '3.11'
      - name: Install dependencies
        run: pip install molecule molecule-plugins[docker] ansible-lint
      - name: Run Molecule
        run: molecule test
```

## Conclusion

Molecule on RHEL provides automated testing for Ansible roles, catching configuration errors, missing dependencies, and idempotence issues before your roles reach production. With support for Podman and Docker drivers, multiple test scenarios, and integration with linters and verification frameworks, Molecule is an essential tool for anyone writing Ansible automation.
