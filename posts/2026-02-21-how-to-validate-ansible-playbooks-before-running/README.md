# How to Validate Ansible Playbooks Before Running

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, Validation, Testing, CI/CD, DevOps

Description: Learn how to validate Ansible playbooks before execution using syntax checks, dry runs, linting, and integration testing tools like Molecule.

---

Running an untested playbook against production servers is one of those risks that seems acceptable until it bites you. A missing comma in YAML, an undefined variable, or a logic error in a conditional can cause real damage. Ansible provides multiple layers of validation that you should run before any playbook reaches a live system. In this post, I will walk through each validation method, from the fastest syntax checks to full integration testing with Molecule.

## Layer 1: YAML Syntax Check

The most basic validation ensures your playbook is valid YAML and valid Ansible syntax:

```bash
# Check playbook syntax without executing anything
ansible-playbook deploy.yml --syntax-check
```

This catches issues like:

- Invalid YAML formatting (bad indentation, missing colons)
- Unknown Ansible directives
- Malformed task structures

The output for a valid playbook is simply:

```
playbook: deploy.yml
```

For an invalid one, you get a clear error:

```
ERROR! Syntax Error while loading YAML.
  mapping values are not allowed in this context
  in "deploy.yml", line 15, column 10
```

You can check multiple playbooks at once:

```bash
# Validate all playbooks in the current directory
for pb in *.yml; do
    echo "Checking $pb..."
    ansible-playbook "$pb" --syntax-check
done
```

## Layer 2: Ansible Lint

ansible-lint goes beyond syntax checking. It analyzes your playbooks against a set of best-practice rules and catches common mistakes:

```bash
# Install ansible-lint
pip install ansible-lint

# Run linting on a playbook
ansible-lint deploy.yml

# Run linting on all playbooks in a directory
ansible-lint playbooks/
```

Ansible-lint catches things like:

- Using `command` or `shell` when a specific module exists
- Tasks without a `name`
- Using `git` module with `latest` instead of a pinned version
- Deprecated module usage
- Jinja2 spacing issues

Example output:

```
deploy.yml:15: command-instead-of-module: Use apt instead of command to install packages
deploy.yml:23: no-changed-when: Commands should not change things without a when clause
deploy.yml:31: name[missing]: All tasks should be named
```

### Configuring ansible-lint

Create a `.ansible-lint` configuration file in your project root:

```yaml
# .ansible-lint
# Configuration for ansible-lint

# Skip specific rules that do not apply to your project
skip_list:
  - yaml[line-length]     # Allow long lines in playbooks
  - no-changed-when        # We handle this differently

# Exclude auto-generated or third-party files
exclude_paths:
  - .cache/
  - vendor/
  - molecule/

# Warn-only rules (will not cause a non-zero exit code)
warn_list:
  - experimental

# Enable specific tags
enable_list:
  - no-same-owner
```

## Layer 3: Dry Run (Check Mode)

Check mode executes the playbook against real hosts but does not make any actual changes. It tells you what would change:

```bash
# Run the playbook in check mode (dry run)
ansible-playbook deploy.yml --check

# Check mode with diff output to see what would change in files
ansible-playbook deploy.yml --check --diff
```

The `--diff` flag is especially useful for template and file tasks because it shows you the exact content differences:

```
TASK [Deploy nginx configuration] ***
--- before: /etc/nginx/nginx.conf
+++ after: dynamically generated
@@ -12,7 +12,7 @@
     server {
         listen 80;
-        server_name old.example.com;
+        server_name new.example.com;
```

### Limitations of Check Mode

Not all modules support check mode. When a module does not support it, the task is skipped in check mode. You need to be aware of this when interpreting results.

Some tasks depend on previous tasks that modify the system. In check mode, those modifications do not happen, so dependent tasks might show misleading results.

```yaml
# This task chain works in real execution but check mode may report errors
# because the first task does not actually create the directory

- name: Create app directory
  file:
    path: /opt/myapp
    state: directory

# In check mode, this file will not exist because the directory was not created
- name: Deploy config
  template:
    src: app.conf.j2
    dest: /opt/myapp/app.conf
```

You can handle this by using `check_mode: no` on prerequisite tasks:

```yaml
# Force this task to run even in check mode
- name: Gather installed package list
  package_facts:
    manager: auto
  check_mode: no    # Always run this task, even in check mode
```

## Layer 4: Variable Validation with assert

Use the `assert` module at the beginning of your playbook to validate that required variables are set and have acceptable values:

```yaml
---
# deploy.yml
# Validate all required variables before starting deployment

- hosts: webservers
  become: yes

  pre_tasks:
    - name: Validate required variables
      assert:
        that:
          - deploy_version is defined
          - deploy_version | length > 0
          - app_port is defined
          - app_port | int > 0
          - app_port | int < 65536
          - environment_name in ['development', 'staging', 'production']
        fail_msg: >
          Missing or invalid required variables.
          deploy_version: {{ deploy_version | default('NOT SET') }}
          app_port: {{ app_port | default('NOT SET') }}
          environment_name: {{ environment_name | default('NOT SET') }}
        success_msg: "All required variables are valid"

  tasks:
    - name: Deploy application version {{ deploy_version }}
      debug:
        msg: "Deploying..."
```

## Layer 5: Integration Testing with Molecule

Molecule creates actual test environments (Docker containers, Vagrant VMs, cloud instances) and runs your playbooks against them. This is the most thorough validation.

```bash
# Install Molecule with the Docker driver
pip install molecule molecule-docker
```

Initialize a Molecule scenario for a role:

```bash
# Create a new Molecule test scenario
cd roles/webserver
molecule init scenario default --driver-name docker
```

This creates the following structure:

```
roles/webserver/
  molecule/
    default/
      converge.yml      # The playbook Molecule will run
      molecule.yml       # Molecule configuration
      verify.yml         # Verification tests
```

Configure the test environment:

```yaml
# molecule/default/molecule.yml
---
dependency:
  name: galaxy

driver:
  name: docker

platforms:
  # Test against multiple OS versions
  - name: ubuntu2204
    image: ubuntu:22.04
    pre_build_image: true
    command: /sbin/init
    privileged: true

  - name: centos9
    image: quay.io/centos/centos:stream9
    pre_build_image: true
    command: /sbin/init
    privileged: true

provisioner:
  name: ansible
  playbooks:
    converge: converge.yml
    verify: verify.yml

verifier:
  name: ansible
```

The converge playbook applies your role:

```yaml
# molecule/default/converge.yml
---
- name: Converge
  hosts: all
  become: yes
  roles:
    - role: webserver
      vars:
        app_port: 8080
        app_name: testapp
```

The verify playbook checks the result:

```yaml
# molecule/default/verify.yml
---
- name: Verify
  hosts: all
  become: yes
  tasks:
    - name: Check nginx is installed
      command: nginx -v
      register: nginx_version
      changed_when: false

    - name: Verify nginx is running
      service:
        name: nginx
        state: started
      check_mode: yes
      register: nginx_status

    - name: Assert nginx is running
      assert:
        that:
          - not nginx_status.changed
        fail_msg: "Nginx is not running"

    - name: Check application port is listening
      wait_for:
        port: 8080
        timeout: 5
```

Run the full test cycle:

```bash
# Run the complete Molecule test sequence
molecule test

# Or run individual stages
molecule create      # Create test instances
molecule converge    # Run the playbook
molecule idempotence # Run again to verify idempotency
molecule verify      # Run verification tests
molecule destroy     # Clean up test instances
```

## CI/CD Pipeline Integration

Combine all validation layers in your CI pipeline:

```yaml
# .github/workflows/ansible-validate.yml
name: Validate Ansible Playbooks

on: [push, pull_request]

jobs:
  validate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Install dependencies
        run: |
          pip install ansible ansible-lint molecule molecule-docker

      - name: YAML syntax check
        run: |
          ansible-playbook playbooks/*.yml --syntax-check

      - name: Run ansible-lint
        run: |
          ansible-lint playbooks/

      - name: Run Molecule tests
        run: |
          cd roles/webserver
          molecule test
```

## Wrapping Up

Each validation layer catches different types of problems. Syntax checking catches YAML errors in seconds. Linting catches bad practices and style issues. Check mode shows you what would actually change on real hosts. Assert tasks validate that your variables are correct. And Molecule tests prove that your playbooks work end-to-end in a real environment. Use all five layers together, especially in your CI pipeline, and you will catch the vast majority of issues before they ever touch a production server.
