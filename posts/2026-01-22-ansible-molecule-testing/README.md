# How to Test Ansible with Molecule

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, Molecule, Testing, DevOps, TDD, Quality Assurance

Description: Learn to test Ansible roles with Molecule using Docker containers, write verification tests with Testinfra, and integrate testing into your CI/CD pipeline.

---

Testing infrastructure code is just as important as testing application code. Molecule is the standard framework for testing Ansible roles. It creates isolated environments, runs your roles, and verifies the results meet expectations. With Molecule, you can catch bugs before they reach production and ensure your roles work across different platforms.

This guide covers setting up Molecule, writing tests, and integrating with CI/CD pipelines.

## Installing Molecule

Install Molecule with the Docker driver for container-based testing.

```bash
# Install Molecule with Docker support
pip install molecule molecule-plugins[docker]

# Verify installation
molecule --version

# Install additional testing tools
pip install pytest-testinfra ansible-lint yamllint
```

## Initializing Molecule for a Role

Set up Molecule in an existing role or create a new role with Molecule.

```bash
# Create new role with Molecule scaffolding
molecule init role my_role --driver-name docker

# Or add Molecule to existing role
cd roles/existing_role
molecule init scenario -d docker

# Molecule creates this structure:
# molecule/
# └── default/
#     ├── converge.yml       # Main playbook to test
#     ├── molecule.yml       # Molecule configuration
#     ├── prepare.yml        # Pre-test setup (optional)
#     ├── verify.yml         # Ansible verification
#     └── tests/
#         └── test_default.py  # Testinfra tests
```

## Molecule Configuration

Configure the test environment in molecule.yml.

```yaml
# molecule/default/molecule.yml
---
dependency:
  name: galaxy
  options:
    requirements-file: requirements.yml

driver:
  name: docker

platforms:
  # Test on multiple OS versions
  - name: instance-ubuntu-22
    image: geerlingguy/docker-ubuntu2204-ansible:latest
    pre_build_image: true
    privileged: true
    volumes:
      - /sys/fs/cgroup:/sys/fs/cgroup:rw
    cgroupns_mode: host
    command: /usr/sbin/init

  - name: instance-debian-12
    image: geerlingguy/docker-debian12-ansible:latest
    pre_build_image: true
    privileged: true
    volumes:
      - /sys/fs/cgroup:/sys/fs/cgroup:rw
    cgroupns_mode: host
    command: /usr/sbin/init

  - name: instance-rocky-9
    image: geerlingguy/docker-rockylinux9-ansible:latest
    pre_build_image: true
    privileged: true
    volumes:
      - /sys/fs/cgroup:/sys/fs/cgroup:rw
    cgroupns_mode: host
    command: /usr/sbin/init

provisioner:
  name: ansible
  playbooks:
    converge: converge.yml
    prepare: prepare.yml
    verify: verify.yml
  inventory:
    host_vars:
      instance-ubuntu-22:
        ansible_python_interpreter: /usr/bin/python3
      instance-debian-12:
        ansible_python_interpreter: /usr/bin/python3
      instance-rocky-9:
        ansible_python_interpreter: /usr/bin/python3
  config_options:
    defaults:
      callbacks_enabled: profile_tasks

verifier:
  name: ansible
  # Or use testinfra
  # name: testinfra
  # options:
  #   v: true

lint: |
  set -e
  yamllint .
  ansible-lint

scenario:
  name: default
  test_sequence:
    - dependency
    - lint
    - cleanup
    - destroy
    - syntax
    - create
    - prepare
    - converge
    - idempotence
    - verify
    - cleanup
    - destroy
```

## Writing the Converge Playbook

The converge playbook applies your role to test instances.

```yaml
# molecule/default/converge.yml
---
- name: Converge
  hosts: all
  become: yes

  vars:
    nginx_worker_processes: 2
    nginx_vhosts:
      - name: test-site
        server_name: test.example.com
        root: /var/www/test
        listen: 80

  pre_tasks:
    - name: Update apt cache (Debian)
      apt:
        update_cache: yes
        cache_valid_time: 3600
      when: ansible_os_family == 'Debian'

  roles:
    - role: "{{ lookup('env', 'MOLECULE_PROJECT_DIRECTORY') | basename }}"
```

## Prepare Playbook

Set up prerequisites before running the role.

```yaml
# molecule/default/prepare.yml
---
- name: Prepare
  hosts: all
  become: yes

  tasks:
    - name: Install Python (for older images)
      raw: |
        if command -v apt-get &> /dev/null; then
          apt-get update && apt-get install -y python3
        elif command -v dnf &> /dev/null; then
          dnf install -y python3
        fi
      changed_when: false

    - name: Gather facts after Python install
      setup:

    - name: Install prerequisites
      package:
        name:
          - curl
          - wget
        state: present
```

## Ansible Verification

Write verification tests using Ansible assertions.

```yaml
# molecule/default/verify.yml
---
- name: Verify
  hosts: all
  become: yes

  tasks:
    - name: Gather service facts
      service_facts:

    - name: Assert Nginx is installed
      package_facts:
        manager: auto

    - name: Verify Nginx package is installed
      assert:
        that:
          - "'nginx' in ansible_facts.packages"
        fail_msg: "Nginx package is not installed"
        success_msg: "Nginx package is installed"

    - name: Verify Nginx service is running
      assert:
        that:
          - ansible_facts.services['nginx.service'].state == 'running'
        fail_msg: "Nginx service is not running"
        success_msg: "Nginx service is running"

    - name: Check Nginx configuration syntax
      command: nginx -t
      register: nginx_test
      changed_when: false

    - name: Verify Nginx config is valid
      assert:
        that:
          - nginx_test.rc == 0
        fail_msg: "Nginx configuration is invalid"

    - name: Check if Nginx is listening on port 80
      wait_for:
        port: 80
        timeout: 10

    - name: Test HTTP response
      uri:
        url: http://localhost/
        return_content: yes
      register: http_response

    - name: Verify HTTP response
      assert:
        that:
          - http_response.status == 200
        fail_msg: "HTTP request failed"
```

## Testinfra Tests

Write Python tests for more complex verification.

```python
# molecule/default/tests/test_default.py
"""Testinfra tests for nginx role"""

import pytest


def test_nginx_package_installed(host):
    """Verify nginx package is installed"""
    nginx = host.package("nginx")
    assert nginx.is_installed


def test_nginx_service_running(host):
    """Verify nginx service is running and enabled"""
    nginx = host.service("nginx")
    assert nginx.is_running
    assert nginx.is_enabled


def test_nginx_config_valid(host):
    """Verify nginx configuration syntax is valid"""
    cmd = host.run("nginx -t")
    assert cmd.rc == 0


def test_nginx_listening_on_port_80(host):
    """Verify nginx is listening on port 80"""
    socket = host.socket("tcp://0.0.0.0:80")
    assert socket.is_listening


def test_nginx_config_file_exists(host):
    """Verify nginx configuration file exists with correct permissions"""
    config = host.file("/etc/nginx/nginx.conf")
    assert config.exists
    assert config.is_file
    assert config.user == "root"
    assert config.group == "root"
    assert config.mode == 0o644


def test_web_root_directory(host):
    """Verify web root directory exists"""
    webroot = host.file("/var/www/html")
    assert webroot.exists
    assert webroot.is_directory


def test_http_response(host):
    """Verify HTTP response from nginx"""
    cmd = host.run("curl -s -o /dev/null -w '%{http_code}' http://localhost/")
    assert cmd.stdout == "200"


@pytest.mark.parametrize("config_line", [
    "worker_processes 2",
    "worker_connections 1024",
])
def test_nginx_config_contains(host, config_line):
    """Verify nginx configuration contains expected values"""
    config = host.file("/etc/nginx/nginx.conf")
    assert config.contains(config_line)


def test_custom_vhost_exists(host):
    """Verify custom virtual host configuration exists"""
    vhost = host.file("/etc/nginx/sites-available/test-site.conf")
    # Only check if the role creates vhosts
    if vhost.exists:
        assert vhost.contains("server_name test.example.com")
```

## Running Molecule Tests

Execute the test sequence.

```bash
# Run full test sequence
molecule test

# Run specific steps
molecule create     # Create test instances
molecule converge   # Apply the role
molecule verify     # Run verification tests
molecule destroy    # Remove test instances

# Run converge repeatedly (for development)
molecule converge

# Login to test instance for debugging
molecule login -h instance-ubuntu-22

# Run lint only
molecule lint

# Run idempotence check only
molecule idempotence

# Run tests without destroying instances
molecule test --destroy=never

# Test specific scenario
molecule test -s alternative_scenario
```

## Multiple Test Scenarios

Create different scenarios for different test cases.

```bash
# Create additional scenario
molecule init scenario --scenario-name with_ssl -d docker
```

```yaml
# molecule/with_ssl/molecule.yml
---
driver:
  name: docker

platforms:
  - name: ssl-instance
    image: geerlingguy/docker-ubuntu2204-ansible:latest
    pre_build_image: true
    privileged: true
    volumes:
      - /sys/fs/cgroup:/sys/fs/cgroup:rw
    cgroupns_mode: host
    command: /usr/sbin/init

provisioner:
  name: ansible
  inventory:
    group_vars:
      all:
        nginx_ssl_enabled: true
        nginx_ssl_certificate: /etc/ssl/certs/test.crt
        nginx_ssl_certificate_key: /etc/ssl/private/test.key
```

```yaml
# molecule/with_ssl/converge.yml
---
- name: Converge
  hosts: all
  become: yes

  pre_tasks:
    - name: Generate self-signed SSL certificate
      command: >
        openssl req -x509 -nodes -days 365
        -newkey rsa:2048
        -keyout /etc/ssl/private/test.key
        -out /etc/ssl/certs/test.crt
        -subj "/CN=test.example.com"
      args:
        creates: /etc/ssl/certs/test.crt

  roles:
    - role: "{{ lookup('env', 'MOLECULE_PROJECT_DIRECTORY') | basename }}"
```

## CI/CD Integration

Run Molecule tests in your CI pipeline.

```yaml
# .github/workflows/molecule.yml
name: Molecule Tests

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  molecule:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        scenario:
          - default
          - with_ssl
      fail-fast: false

    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Set up Python
        uses: actions/setup-python@v5
        with:
          python-version: '3.11'

      - name: Install dependencies
        run: |
          pip install molecule molecule-plugins[docker] ansible-lint yamllint pytest-testinfra

      - name: Run Molecule tests
        run: molecule test -s ${{ matrix.scenario }}
        env:
          PY_COLORS: 1
          ANSIBLE_FORCE_COLOR: 1
```

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
    - yamllint .
    - ansible-lint

molecule:
  stage: test
  image: docker:24
  services:
    - docker:24-dind
  variables:
    DOCKER_HOST: tcp://docker:2375
  before_script:
    - apk add --no-cache python3 py3-pip
    - pip install molecule molecule-plugins[docker] ansible pytest-testinfra
  script:
    - molecule test
  parallel:
    matrix:
      - SCENARIO: [default, with_ssl]
```

## Testing Best Practices

1. **Test idempotence**: Ensure running the role twice produces no changes
2. **Test multiple platforms**: Use matrix testing for Ubuntu, Debian, RHEL
3. **Test different configurations**: Create scenarios for various role variables
4. **Keep tests fast**: Use pre-built images with Ansible already installed
5. **Test failure cases**: Verify the role handles errors gracefully
6. **Run tests in CI**: Catch issues before merging

```yaml
# Example: Testing edge cases
# molecule/edge_cases/converge.yml
---
- name: Test edge cases
  hosts: all
  become: yes

  tasks:
    - name: Test with minimal configuration
      include_role:
        name: "{{ lookup('env', 'MOLECULE_PROJECT_DIRECTORY') | basename }}"

    - name: Test role is idempotent
      include_role:
        name: "{{ lookup('env', 'MOLECULE_PROJECT_DIRECTORY') | basename }}"
      register: second_run

    - name: Verify idempotence
      assert:
        that:
          - not second_run.changed
        fail_msg: "Role is not idempotent"
```

---

Molecule transforms Ansible role development from "works on my machine" to verifiable, repeatable testing. Start with basic tests that verify services are running, then add more specific tests for configuration and behavior. The upfront investment in testing pays off every time you refactor a role or upgrade Ansible versions without breaking production.
