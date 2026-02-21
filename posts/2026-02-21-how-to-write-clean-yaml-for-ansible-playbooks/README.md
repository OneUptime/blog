# How to Write Clean YAML for Ansible Playbooks

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, YAML, Best Practices, Code Quality, DevOps

Description: Best practices for writing clean, readable, and maintainable YAML in Ansible playbooks including formatting, naming, and structural conventions.

---

YAML is the language of Ansible, and writing it poorly makes your playbooks hard to read, hard to debug, and hard to maintain. Clean YAML is not just about aesthetics. It reduces errors, makes code reviews productive, and lets new team members understand your automation quickly.

After years of maintaining Ansible codebases with multiple contributors, I have developed a set of conventions that consistently produce readable, maintainable YAML.

## Use Consistent Indentation

Always use 2 spaces for indentation. Never use tabs. Configure your editor to enforce this.

```yaml
# Good: consistent 2-space indentation
- name: Install packages
  ansible.builtin.apt:
    name:
      - nginx
      - curl
      - jq
    state: present
    update_cache: true
```

## Use Fully Qualified Collection Names (FQCN)

Always use the full module name. It eliminates ambiguity and makes it clear which collection a module comes from.

```yaml
# Bad: ambiguous module name
- name: Install nginx
  apt:
    name: nginx

# Good: fully qualified collection name
- name: Install nginx
  ansible.builtin.apt:
    name: nginx
    state: present
```

## Name Every Task

Every task should have a descriptive `name` that explains what it does, not how it does it.

```yaml
# Bad: no name
- ansible.builtin.file:
    path: /opt/app
    state: directory

# Bad: describes the how, not the what
- name: Run file module
  ansible.builtin.file:
    path: /opt/app
    state: directory

# Good: describes the purpose
- name: Create application directory
  ansible.builtin.file:
    path: /opt/app
    state: directory
    mode: '0755'
```

## Quote Strings That Look Like Other Types

YAML treats unquoted values as their apparent type. This causes problems with values like `yes`, `no`, `true`, `on`, version numbers, and octal-looking strings.

```yaml
# Bad: these will be interpreted as booleans or numbers
mode: 0755      # Interpreted as octal integer 493
enabled: yes    # Interpreted as boolean true
version: 1.0    # Interpreted as float

# Good: quote strings that could be misinterpreted
mode: '0755'
enabled: 'yes'
version: '1.0'
```

## Use Block Style for Complex Values

```yaml
# Bad: everything on one line
- name: Deploy config
  ansible.builtin.template:
    src: config.j2
    dest: /etc/app/config.yml
    owner: root
    group: root
    mode: '0644'
  notify: restart app
  when: app_config_changed and deploy_environment == 'production'
  tags: [config, deploy]

# Good: break long when conditions across lines
- name: Deploy config
  ansible.builtin.template:
    src: config.j2
    dest: /etc/app/config.yml
    owner: root
    group: root
    mode: '0644'
  notify: restart app
  when:
    - app_config_changed
    - deploy_environment == 'production'
  tags:
    - config
    - deploy
```

## Group Related Tasks with Comments

```yaml
# --- Package Installation ---
- name: Install system dependencies
  ansible.builtin.apt:
    name: "{{ system_packages }}"
    state: present

# --- User and Directory Setup ---
- name: Create application user
  ansible.builtin.user:
    name: "{{ app_user }}"
    system: true

- name: Create application directories
  ansible.builtin.file:
    path: "{{ item }}"
    state: directory
    owner: "{{ app_user }}"
  loop:
    - /opt/app
    - /opt/app/data
    - /var/log/app

# --- Configuration ---
- name: Deploy application configuration
  ansible.builtin.template:
    src: app.conf.j2
    dest: /etc/app/app.conf
  notify: restart app
```

## Use Variables for Repeated Values

```yaml
# Bad: repeated paths
- name: Create data directory
  ansible.builtin.file:
    path: /opt/myapp/data
    state: directory

- name: Create log directory
  ansible.builtin.file:
    path: /opt/myapp/logs
    state: directory

# Good: use a base variable
- name: Create application directories
  ansible.builtin.file:
    path: "{{ app_base_dir }}/{{ item }}"
    state: directory
  loop:
    - data
    - logs
    - config
```

## Keep Playbooks Short and Focused

A playbook should do one thing. If it is getting long, break it into roles or include files.

```yaml
# site.yml - orchestration only
- name: Configure base infrastructure
  hosts: all
  roles:
    - common
    - security

- name: Deploy web tier
  hosts: webservers
  roles:
    - nginx
    - ssl_certs

- name: Deploy application tier
  hosts: appservers
  roles:
    - app_deploy
```

## Use ansible-lint

Run ansible-lint on every commit. It catches style issues, deprecated syntax, and potential bugs.

```bash
# Install and run ansible-lint
pip install ansible-lint
ansible-lint playbooks/ roles/
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

Clean YAML is the foundation of maintainable Ansible automation. Use consistent indentation, fully qualified module names, descriptive task names, and proper quoting. Break complex conditions into lists, group related tasks with comments, and keep playbooks focused. These conventions may seem minor individually, but together they make the difference between a codebase that is pleasant to work with and one that everyone dreads touching.
