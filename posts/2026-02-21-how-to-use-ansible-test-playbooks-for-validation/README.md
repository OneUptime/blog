# How to Use Ansible Test Playbooks for Validation

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, Testing, Validation, Playbooks, DevOps

Description: How to write dedicated test playbooks that validate your Ansible roles and configurations using assertions, checks, and verification tasks.

---

Test playbooks are standalone Ansible playbooks whose only job is to verify that your automation did what it was supposed to do. They sit alongside your regular playbooks and roles, running assertions against the target system to confirm services are running, files have the right content, and configurations match expectations. Think of them as integration tests for your infrastructure.

I started writing test playbooks after getting burned by a role that "succeeded" (every task returned ok) but left the application in a broken state because a config file had the wrong database connection string. The role tasks all passed, but the application could not connect to anything.

## The Structure of a Test Playbook

A test playbook typically follows this pattern:

```yaml
# tests/test_webserver.yml
# Test playbook that validates the webserver role deployment
- name: Validate webserver deployment
  hosts: webservers
  become: true
  gather_facts: true

  tasks:
    # Phase 1: Check that packages are installed
    - name: Verify nginx is installed
      ansible.builtin.package_facts:
        manager: auto

    - name: Assert nginx package is present
      ansible.builtin.assert:
        that:
          - "'nginx' in ansible_facts.packages"
        fail_msg: "nginx package is not installed"
        success_msg: "nginx package is installed"

    # Phase 2: Check that services are running
    - name: Gather service facts
      ansible.builtin.service_facts:

    - name: Assert nginx service is running
      ansible.builtin.assert:
        that:
          - ansible_facts.services['nginx.service'].state == 'running'
          - ansible_facts.services['nginx.service'].status == 'enabled'
        fail_msg: "nginx service is not running or not enabled"

    # Phase 3: Check configuration files
    - name: Read nginx main config
      ansible.builtin.slurp:
        src: /etc/nginx/nginx.conf
      register: nginx_conf

    - name: Decode and validate nginx config
      ansible.builtin.set_fact:
        nginx_config_content: "{{ nginx_conf.content | b64decode }}"

    - name: Assert worker processes configured
      ansible.builtin.assert:
        that:
          - "'worker_processes' in nginx_config_content"
        fail_msg: "worker_processes directive missing from nginx.conf"

    # Phase 4: Check network connectivity
    - name: Verify nginx is listening on port 80
      ansible.builtin.wait_for:
        port: 80
        host: 127.0.0.1
        timeout: 5

    - name: Test HTTP response
      ansible.builtin.uri:
        url: http://127.0.0.1/
        return_content: true
      register: http_response

    - name: Assert HTTP response is successful
      ansible.builtin.assert:
        that:
          - http_response.status == 200
        fail_msg: "HTTP request to localhost returned status {{ http_response.status }}"
```

## Organizing Test Playbooks

Keep test playbooks in a `tests/` directory at the same level as your roles:

```
project/
  roles/
    webserver/
    database/
    loadbalancer/
  tests/
    test_webserver.yml
    test_database.yml
    test_loadbalancer.yml
    test_full_stack.yml
    inventory/
      test_hosts.yml
  playbooks/
    deploy.yml
```

## Testing File Permissions and Ownership

Security-sensitive deployments need to verify file permissions:

```yaml
# tests/test_security.yml
# Validate file permissions and ownership for security compliance
- name: Validate security settings
  hosts: all
  become: true
  tasks:
    - name: Check SSH config permissions
      ansible.builtin.stat:
        path: /etc/ssh/sshd_config
      register: sshd_config

    - name: Assert SSH config permissions are restrictive
      ansible.builtin.assert:
        that:
          - sshd_config.stat.mode == '0600'
          - sshd_config.stat.pw_name == 'root'
          - sshd_config.stat.gr_name == 'root'
        fail_msg: "sshd_config has incorrect permissions: {{ sshd_config.stat.mode }}"

    - name: Check private key directory permissions
      ansible.builtin.stat:
        path: /etc/ssl/private
      register: ssl_private

    - name: Assert private key directory is secure
      ansible.builtin.assert:
        that:
          - ssl_private.stat.mode == '0700'
        fail_msg: "SSL private directory has mode {{ ssl_private.stat.mode }}, expected 0700"

    - name: Find world-readable files in /etc
      ansible.builtin.find:
        paths: /etc
        file_type: file
        recurse: false
      register: etc_files

    - name: Check no sensitive files are world-readable
      ansible.builtin.assert:
        that:
          - item.mode[-1] | int == 0 or item.path not in sensitive_files
        fail_msg: "{{ item.path }} is world-readable"
      loop: "{{ etc_files.files }}"
      loop_control:
        label: "{{ item.path }}"
      vars:
        sensitive_files:
          - /etc/shadow
          - /etc/gshadow
```

## Testing Database Connectivity

For roles that deploy database clients or connection configurations:

```yaml
# tests/test_database.yml
# Validate database deployment and connectivity
- name: Validate database setup
  hosts: databases
  become: true
  tasks:
    - name: Check PostgreSQL is running
      ansible.builtin.service_facts:

    - name: Assert PostgreSQL service is active
      ansible.builtin.assert:
        that:
          - ansible_facts.services['postgresql.service'].state == 'running'

    - name: Test PostgreSQL accepts connections
      ansible.builtin.command:
        cmd: pg_isready -h 127.0.0.1 -p 5432
      register: pg_ready
      changed_when: false

    - name: Assert PostgreSQL is accepting connections
      ansible.builtin.assert:
        that:
          - pg_ready.rc == 0
        fail_msg: "PostgreSQL is not accepting connections"

    - name: Verify application database exists
      ansible.builtin.command:
        cmd: psql -h 127.0.0.1 -U postgres -lqt
      register: db_list
      changed_when: false

    - name: Assert application database is present
      ansible.builtin.assert:
        that:
          - "'myapp_production' in db_list.stdout"
        fail_msg: "Application database myapp_production does not exist"

    - name: Verify database user has correct privileges
      ansible.builtin.command:
        cmd: psql -h 127.0.0.1 -U postgres -c "\du myapp_user"
      register: user_info
      changed_when: false

    - name: Assert database user exists
      ansible.builtin.assert:
        that:
          - "'myapp_user' in user_info.stdout"
```

## Running Test Playbooks with Tags

Use tags to run specific test categories:

```yaml
# tests/test_comprehensive.yml
# Comprehensive test playbook with tagged test categories
- name: Full system validation
  hosts: all
  become: true
  tasks:
    # Package tests
    - name: Verify required packages
      ansible.builtin.package_facts:
      tags: [packages]

    - name: Assert critical packages installed
      ansible.builtin.assert:
        that:
          - "'curl' in ansible_facts.packages"
          - "'openssl' in ansible_facts.packages"
          - "'rsync' in ansible_facts.packages"
      tags: [packages]

    # Service tests
    - name: Gather service facts
      ansible.builtin.service_facts:
      tags: [services]

    - name: Assert critical services running
      ansible.builtin.assert:
        that:
          - ansible_facts.services['sshd.service'].state == 'running'
      tags: [services]

    # Network tests
    - name: Test DNS resolution
      ansible.builtin.command: dig +short example.com
      register: dns_test
      changed_when: false
      tags: [network]

    - name: Assert DNS is working
      ansible.builtin.assert:
        that:
          - dns_test.stdout | length > 0
      tags: [network]

    # Disk tests
    - name: Check disk space
      ansible.builtin.command: df -h /
      register: disk_space
      changed_when: false
      tags: [disk]
```

Run specific categories:

```bash
# Run only network tests
ansible-playbook tests/test_comprehensive.yml --tags network -i tests/inventory/

# Run package and service tests together
ansible-playbook tests/test_comprehensive.yml --tags "packages,services" -i tests/inventory/
```

## Test Playbooks in Molecule

Molecule uses a verify step that is basically a test playbook:

```yaml
# molecule/default/verify.yml
# Molecule verification playbook
- name: Verify
  hosts: all
  become: true
  tasks:
    - name: Include role-specific tests
      ansible.builtin.include_tasks: "../../tests/tasks/{{ item }}.yml"
      loop:
        - test_packages
        - test_services
        - test_configs
        - test_connectivity
```

Break tests into includable task files for reuse:

```yaml
# tests/tasks/test_packages.yml
# Reusable package verification tasks
- name: Gather package facts
  ansible.builtin.package_facts:

- name: Assert required packages are installed
  ansible.builtin.assert:
    that:
      - "item in ansible_facts.packages"
    fail_msg: "Package {{ item }} is not installed"
  loop: "{{ required_packages | default(['curl', 'wget', 'vim']) }}"
```

## Generating Test Reports

Create a callback plugin or post-processing script that formats test results:

```yaml
# tests/test_with_reporting.yml
# Test playbook that collects results for reporting
- name: Validation with reporting
  hosts: all
  become: true
  vars:
    test_results: []
  tasks:
    - name: Test nginx status
      ansible.builtin.command: systemctl is-active nginx
      register: nginx_check
      changed_when: false
      failed_when: false

    - name: Record nginx test result
      ansible.builtin.set_fact:
        test_results: "{{ test_results + [{'test': 'nginx_running', 'passed': nginx_check.rc == 0, 'details': nginx_check.stdout}] }}"

    - name: Test port 80
      ansible.builtin.wait_for:
        port: 80
        timeout: 3
      register: port_check
      failed_when: false

    - name: Record port test result
      ansible.builtin.set_fact:
        test_results: "{{ test_results + [{'test': 'port_80_open', 'passed': port_check is not failed, 'details': 'port 80 check'}] }}"

    - name: Print test summary
      ansible.builtin.debug:
        msg: |
          Test Results Summary
          ====================
          {% for result in test_results %}
          {{ 'PASS' if result.passed else 'FAIL' }}: {{ result.test }} - {{ result.details }}
          {% endfor %}
          Total: {{ test_results | length }}
          Passed: {{ test_results | selectattr('passed') | list | length }}
          Failed: {{ test_results | rejectattr('passed') | list | length }}
```

## Conclusion

Test playbooks are the simplest and most effective way to validate your Ansible automation. They use the same YAML syntax you already know, run against real infrastructure, and can verify everything from package installation to network connectivity. Write them alongside your roles, organize them with tags, integrate them into Molecule, and run them in CI. The few minutes spent writing assertions after each role save hours of debugging when something breaks unexpectedly.
