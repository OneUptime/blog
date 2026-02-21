# How to Write Molecule Verify Tests with Ansible

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, Molecule, Testing, Verification, DevOps

Description: Write effective Molecule verify tests using Ansible playbooks to validate that your roles produce the expected system state after convergence.

---

The verify step in Molecule is where you confirm that your Ansible role actually did what it was supposed to do. Using Ansible itself as the verifier is the most natural approach because you already know the language. You write a playbook that checks the expected system state and fails if anything is wrong. This post shows you how to write thorough, maintainable verify tests that catch real problems.

## How the Ansible Verifier Works

When you set `verifier: name: ansible` in your `molecule.yml`, Molecule runs a playbook called `verify.yml` against your test instances after the converge step. This playbook should not make any changes to the system. Instead, it should only check that the expected state exists and fail if it does not.

```yaml
# molecule/default/molecule.yml - using the Ansible verifier
verifier:
  name: ansible
```

## Basic Verify Patterns

The fundamental pattern is: check a condition in check mode and fail if the module reports it would need to make a change.

### Verify a Package is Installed

```yaml
# molecule/default/verify.yml - verify package installation
- name: Verify
  hosts: all
  become: true
  tasks:
    - name: Verify nginx is installed
      ansible.builtin.package:
        name: nginx
        state: present
      check_mode: true
      register: pkg_check
      failed_when: pkg_check.changed
```

The logic here is: if the package module says it would change something (install the package), then the package is not installed, which means our role failed. If the module reports no change needed, the package is already there.

### Verify a Service is Running and Enabled

```yaml
    - name: Verify nginx service is running
      ansible.builtin.service:
        name: nginx
        state: started
        enabled: true
      check_mode: true
      register: svc_check
      failed_when: svc_check.changed
```

### Verify a File Exists with Correct Properties

```yaml
    - name: Verify nginx config exists
      ansible.builtin.stat:
        path: /etc/nginx/nginx.conf
      register: nginx_conf
      failed_when:
        - not nginx_conf.stat.exists
        - nginx_conf.stat.pw_name != 'root'

    - name: Verify config file permissions
      ansible.builtin.stat:
        path: /etc/nginx/nginx.conf
      register: conf_perms
      failed_when: conf_perms.stat.mode != '0644'
```

## A Complete Verify Playbook

Here is a full verify playbook for a web server role.

```yaml
# molecule/default/verify.yml - comprehensive web server verification
- name: Verify web server role
  hosts: all
  become: true
  gather_facts: true
  tasks:
    # Package verification
    - name: Verify nginx is installed
      ansible.builtin.package:
        name: nginx
        state: present
      check_mode: true
      register: pkg_result
      failed_when: pkg_result.changed

    - name: Verify supporting packages are installed
      ansible.builtin.package:
        name: "{{ item }}"
        state: present
      check_mode: true
      register: support_pkg
      failed_when: support_pkg.changed
      loop:
        - openssl
        - curl

    # Service verification
    - name: Verify nginx service is running and enabled
      ansible.builtin.service:
        name: nginx
        state: started
        enabled: true
      check_mode: true
      register: svc_result
      failed_when: svc_result.changed

    # Configuration file verification
    - name: Verify main nginx config exists
      ansible.builtin.stat:
        path: /etc/nginx/nginx.conf
      register: main_conf
      failed_when: not main_conf.stat.exists

    - name: Verify virtual host config exists
      ansible.builtin.stat:
        path: /etc/nginx/sites-enabled/myapp.conf
      register: vhost_conf
      failed_when: not vhost_conf.stat.exists

    - name: Verify config file ownership
      ansible.builtin.stat:
        path: /etc/nginx/nginx.conf
      register: conf_owner
      failed_when:
        - conf_owner.stat.pw_name != 'root'
        - conf_owner.stat.gr_name != 'root'

    # Configuration content verification
    - name: Read nginx config content
      ansible.builtin.slurp:
        src: /etc/nginx/nginx.conf
      register: nginx_config_content

    - name: Verify config contains expected settings
      ansible.builtin.assert:
        that:
          - "'worker_processes' in nginx_config_content.content | b64decode"
          - "'worker_connections 1024' in nginx_config_content.content | b64decode"
        fail_msg: "nginx.conf is missing expected configuration directives"

    # Directory verification
    - name: Verify document root exists
      ansible.builtin.stat:
        path: /var/www/html
      register: docroot
      failed_when:
        - not docroot.stat.exists
        - not docroot.stat.isdir

    # Port verification
    - name: Verify nginx is listening on port 80
      ansible.builtin.wait_for:
        port: 80
        timeout: 5
        msg: "nginx is not listening on port 80"

    # HTTP response verification
    - name: Verify nginx responds to HTTP requests
      ansible.builtin.uri:
        url: "http://localhost:80"
        return_content: true
        status_code: 200
      register: http_response

    - name: Verify response contains expected content
      ansible.builtin.assert:
        that:
          - http_response.status == 200
        fail_msg: "Expected HTTP 200, got {{ http_response.status }}"

    # Log file verification
    - name: Verify log directory exists
      ansible.builtin.stat:
        path: /var/log/nginx
      register: logdir
      failed_when: not logdir.stat.exists

    # Firewall verification (if applicable)
    - name: Verify firewall allows port 80
      ansible.builtin.command:
        cmd: iptables -L INPUT -n
      register: iptables_output
      changed_when: false
      failed_when: "'80' not in iptables_output.stdout"
      when: ansible_os_family == "RedHat"
```

## Using the assert Module

The `assert` module is your best friend for complex verification logic.

```yaml
    # Verify multiple conditions at once
    - name: Gather service facts
      ansible.builtin.service_facts:

    - name: Assert critical services are running
      ansible.builtin.assert:
        that:
          - "'nginx.service' in ansible_facts.services"
          - "ansible_facts.services['nginx.service'].state == 'running'"
          - "ansible_facts.services['nginx.service'].status == 'enabled'"
        fail_msg: "nginx service is not running or not enabled"
        success_msg: "nginx service is running and enabled"
```

## Verifying Configuration File Content

Use `slurp` to read file content and then assert on it.

```yaml
    - name: Read the application config
      ansible.builtin.slurp:
        src: /etc/myapp/config.yml
      register: app_config_raw

    - name: Parse the config as YAML
      ansible.builtin.set_fact:
        app_config: "{{ app_config_raw.content | b64decode | from_yaml }}"

    - name: Verify application configuration values
      ansible.builtin.assert:
        that:
          - app_config.database.host == 'localhost'
          - app_config.database.port == 5432
          - app_config.logging.level == 'info'
          - app_config.server.workers >= 2
        fail_msg: "Application configuration does not match expected values"
```

## Verifying User and Group Setup

```yaml
    - name: Verify application user exists
      ansible.builtin.getent:
        database: passwd
        key: appuser
      register: user_check

    - name: Assert user properties
      ansible.builtin.assert:
        that:
          - "'appuser' in user_check.ansible_facts.getent_passwd"
        fail_msg: "Application user 'appuser' does not exist"

    - name: Verify user is in the correct group
      ansible.builtin.command:
        cmd: id -nG appuser
      register: user_groups
      changed_when: false

    - name: Assert group membership
      ansible.builtin.assert:
        that:
          - "'www-data' in user_groups.stdout"
        fail_msg: "User 'appuser' is not in the 'www-data' group"
```

## Verifying Idempotency in Verify

You can re-run the converge playbook in check mode to verify idempotency.

```yaml
    - name: Re-run the role in check mode to verify idempotency
      ansible.builtin.include_role:
        name: my_webserver
      check_mode: true
      register: idempotency_check

    - name: Assert the role is idempotent
      ansible.builtin.assert:
        that:
          - not idempotency_check.changed
        fail_msg: "Role is not idempotent - it would make changes on a second run"
```

## Organizing Large Verify Playbooks

For roles with many things to verify, split the checks into separate files.

```yaml
# molecule/default/verify.yml - organized verification
- name: Verify
  hosts: all
  become: true
  tasks:
    - name: Run package verification
      ansible.builtin.include_tasks: verify/packages.yml

    - name: Run service verification
      ansible.builtin.include_tasks: verify/services.yml

    - name: Run configuration verification
      ansible.builtin.include_tasks: verify/configuration.yml

    - name: Run security verification
      ansible.builtin.include_tasks: verify/security.yml

    - name: Run connectivity verification
      ansible.builtin.include_tasks: verify/connectivity.yml
```

```yaml
# molecule/default/verify/packages.yml - package checks
- name: Verify all required packages are installed
  ansible.builtin.package:
    name: "{{ item }}"
    state: present
  check_mode: true
  register: pkg_check
  failed_when: pkg_check.changed
  loop:
    - nginx
    - openssl
    - curl
    - logrotate
```

## Common Pitfalls

1. **Do not make changes in verify.yml.** The verify playbook should only read state, not modify it. Use `check_mode: true` and `changed_when: false` on commands.

2. **Gather facts if you need them.** If your verify playbook uses `ansible_facts`, make sure `gather_facts: true` is set.

3. **Use meaningful failure messages.** When a test fails, you want to know why immediately. Always provide a `fail_msg` with context.

4. **Test from the outside when possible.** Instead of checking if a config file exists, check if the service actually works by making an HTTP request or connecting to a port.

5. **Keep tests independent.** Each test task should be self-contained. Do not rely on variables set by earlier test tasks unless absolutely necessary.

Writing good verify tests is the most important part of Molecule testing. A role without verification is like a function without assertions. You are running code but never checking if it worked. Take the time to write thorough checks, and your roles will be reliable enough to trust in production.
