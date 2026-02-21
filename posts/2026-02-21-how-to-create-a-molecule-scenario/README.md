# How to Create a Molecule Scenario

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, Molecule, Testing, DevOps

Description: Learn how to create and configure Molecule scenarios for testing Ansible roles with different platforms, verifiers, and test configurations.

---

A Molecule scenario is a complete test configuration for your Ansible role. It defines what platform to test on, how to converge, and what to verify. Think of it as a test case definition. You can have multiple scenarios per role to test different configurations, operating systems, or deployment patterns. This post walks through creating scenarios from scratch and configuring them for practical use.

## What a Scenario Contains

A Molecule scenario is a directory under `molecule/` in your role. Each scenario contains configuration files that control the test lifecycle.

```
my_role/
  defaults/
  handlers/
  tasks/
  templates/
  molecule/
    default/           # the default scenario
      molecule.yml     # main configuration
      converge.yml     # playbook that applies the role
      verify.yml       # verification playbook
      prepare.yml      # optional: pre-test setup
      cleanup.yml      # optional: post-test cleanup
      side_effect.yml  # optional: simulate failures
      create.yml       # optional: custom instance creation
      destroy.yml      # optional: custom instance destruction
    centos/            # additional scenario
      molecule.yml
      converge.yml
      verify.yml
```

The `default` scenario is special. It is what Molecule runs when you do not specify a scenario name.

## Creating Your First Scenario

There are two ways to create a scenario: using the `molecule init` command or by hand.

### Using molecule init

For a new role with a Molecule scenario already set up:

```bash
# Create a new role with the default scenario
molecule init role my_webserver --driver-name docker

# The generated structure looks like this
tree my_webserver/molecule/
# molecule/
# └── default
#     ├── converge.yml
#     ├── molecule.yml
#     └── verify.yml
```

To add a scenario to an existing role:

```bash
# Navigate to your existing role directory
cd roles/my_webserver

# Add a new scenario
molecule init scenario centos --driver-name docker
```

### Creating a Scenario Manually

For more control, create the files yourself. Start with the directory.

```bash
mkdir -p molecule/default
```

Then create the configuration file.

```yaml
# molecule/default/molecule.yml - main scenario configuration
dependency:
  name: galaxy
  options:
    requirements-file: requirements.yml

driver:
  name: docker

platforms:
  - name: instance
    image: "geerlingguy/docker-ubuntu2204-ansible:latest"
    pre_build_image: true
    privileged: true
    volumes:
      - /sys/fs/cgroup:/sys/fs/cgroup:rw
    cgroupns_mode: host
    command: ""
    tmpfs:
      - /run
      - /tmp

provisioner:
  name: ansible
  playbooks:
    converge: converge.yml
    verify: verify.yml
  inventory:
    host_vars:
      instance:
        ansible_user: root

verifier:
  name: ansible

lint: |
  yamllint .
  ansible-lint .
```

Create the converge playbook that applies your role.

```yaml
# molecule/default/converge.yml - the playbook that tests your role
- name: Converge
  hosts: all
  become: true
  vars:
    webserver_port: 8080
    webserver_document_root: /var/www/html
    webserver_server_name: test.example.com
  roles:
    - role: my_webserver
```

Create the verify playbook that checks the result.

```yaml
# molecule/default/verify.yml - verify the role did what it should
- name: Verify
  hosts: all
  become: true
  tasks:
    - name: Check that nginx is installed
      ansible.builtin.package:
        name: nginx
        state: present
      check_mode: true
      register: nginx_installed
      failed_when: nginx_installed.changed

    - name: Check that nginx is running
      ansible.builtin.service:
        name: nginx
        state: started
      check_mode: true
      register: nginx_running
      failed_when: nginx_running.changed

    - name: Check that nginx is listening on the configured port
      ansible.builtin.wait_for:
        port: 8080
        timeout: 5

    - name: Verify the document root exists
      ansible.builtin.stat:
        path: /var/www/html
      register: docroot
      failed_when: not docroot.stat.exists or not docroot.stat.isdir
```

## Understanding molecule.yml Sections

Let me break down each section of the configuration file.

### The dependency Section

This handles installing collection dependencies before running the scenario.

```yaml
# Install collections from a requirements file
dependency:
  name: galaxy
  options:
    requirements-file: requirements.yml
    force: false
```

### The driver Section

This specifies which driver creates test instances.

```yaml
# Use Docker for container-based testing
driver:
  name: docker

# Or Podman for rootless containers
driver:
  name: podman

# Or Vagrant for full VMs
driver:
  name: vagrant
```

### The platforms Section

This defines the test instances. You can have multiple platforms to test across different operating systems.

```yaml
# Test on multiple operating systems
platforms:
  - name: ubuntu2204
    image: "geerlingguy/docker-ubuntu2204-ansible:latest"
    pre_build_image: true
    privileged: true
    volumes:
      - /sys/fs/cgroup:/sys/fs/cgroup:rw
    cgroupns_mode: host
    tmpfs:
      - /run
      - /tmp

  - name: rocky9
    image: "geerlingguy/docker-rockylinux9-ansible:latest"
    pre_build_image: true
    privileged: true
    volumes:
      - /sys/fs/cgroup:/sys/fs/cgroup:rw
    cgroupns_mode: host
    tmpfs:
      - /run
      - /tmp
```

### The provisioner Section

This configures how Ansible runs during the test.

```yaml
provisioner:
  name: ansible
  config_options:
    defaults:
      callbacks_enabled: profile_tasks  # show task timing
      gathering: smart
    ssh_connection:
      pipelining: true
  playbooks:
    converge: converge.yml
    prepare: prepare.yml
    verify: verify.yml
  inventory:
    group_vars:
      all:
        my_role_var: "test_value"
    host_vars:
      ubuntu2204:
        ansible_python_interpreter: /usr/bin/python3
  env:
    ANSIBLE_FORCE_COLOR: "true"
```

### The verifier Section

This chooses how verification is done.

```yaml
# Use Ansible playbook for verification
verifier:
  name: ansible

# Or use Testinfra for Python-based testing
verifier:
  name: testinfra
  options:
    v: true
    sudo: true
```

## Creating a Scenario with Preparation Steps

Sometimes your role has prerequisites that need to be set up before converging. The `prepare.yml` playbook handles this.

```yaml
# molecule/default/prepare.yml - set up prerequisites
- name: Prepare
  hosts: all
  become: true
  tasks:
    - name: Update apt cache
      ansible.builtin.apt:
        update_cache: true
      when: ansible_os_family == "Debian"

    - name: Install prerequisite packages
      ansible.builtin.package:
        name:
          - curl
          - gnupg
        state: present

    - name: Add required repository
      ansible.builtin.apt_repository:
        repo: "deb http://ppa.launchpad.net/example/ppa/ubuntu jammy main"
        state: present
      when: ansible_os_family == "Debian"
```

## Creating Multiple Scenarios

Different scenarios let you test different configurations of the same role.

```bash
# Create scenarios for different use cases
mkdir -p molecule/default molecule/tls molecule/cluster
```

Example: a default scenario for basic testing and a TLS scenario for testing with SSL enabled.

```yaml
# molecule/tls/molecule.yml - test with TLS configuration
dependency:
  name: galaxy
driver:
  name: docker
platforms:
  - name: tls-instance
    image: "geerlingguy/docker-ubuntu2204-ansible:latest"
    pre_build_image: true
    privileged: true
    volumes:
      - /sys/fs/cgroup:/sys/fs/cgroup:rw
    cgroupns_mode: host
    tmpfs:
      - /run
      - /tmp
provisioner:
  name: ansible
  inventory:
    host_vars:
      tls-instance:
        webserver_tls_enabled: true
        webserver_tls_cert_path: /etc/ssl/certs/test.crt
        webserver_tls_key_path: /etc/ssl/private/test.key
verifier:
  name: ansible
```

```yaml
# molecule/tls/converge.yml - converge with TLS variables
- name: Converge
  hosts: all
  become: true
  pre_tasks:
    - name: Generate a self-signed certificate for testing
      ansible.builtin.command:
        cmd: >
          openssl req -x509 -nodes -days 365
          -newkey rsa:2048
          -keyout /etc/ssl/private/test.key
          -out /etc/ssl/certs/test.crt
          -subj "/CN=test.example.com"
        creates: /etc/ssl/certs/test.crt
  roles:
    - role: my_webserver
```

```yaml
# molecule/tls/verify.yml - verify TLS is configured
- name: Verify TLS
  hosts: all
  become: true
  tasks:
    - name: Check that nginx is listening on port 443
      ansible.builtin.wait_for:
        port: 443
        timeout: 10

    - name: Verify TLS certificate is in place
      ansible.builtin.stat:
        path: /etc/ssl/certs/test.crt
      register: cert_file
      failed_when: not cert_file.stat.exists

    - name: Test HTTPS endpoint responds
      ansible.builtin.uri:
        url: "https://localhost:443"
        validate_certs: false
        status_code: 200
```

## Running Specific Scenarios

```bash
# Run the default scenario
molecule test

# Run a specific scenario
molecule test --scenario-name tls

# Run all scenarios
molecule test --all
```

## Practical Advice

1. **Start with one scenario.** Get the default scenario working before adding more. It is easier to debug one thing at a time.

2. **Use pre-built images.** Images like `geerlingguy/docker-ubuntu2204-ansible` come with systemd and Python pre-installed, saving significant setup time.

3. **Keep converge.yml simple.** It should just apply the role with variables. Complex setup goes in `prepare.yml`.

4. **Name scenarios after what they test.** Names like `tls`, `cluster`, `minimal`, or `centos` are more useful than `scenario1`, `scenario2`.

5. **Commit your molecule directory.** All scenario files should be in version control alongside the role. They are part of the role's test suite.

Creating good Molecule scenarios takes some upfront effort, but it pays for itself the first time you catch a bug before it hits production. Get the default scenario working, then expand from there.
