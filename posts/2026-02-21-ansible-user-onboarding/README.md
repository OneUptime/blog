# How to Use Ansible to Automate User Onboarding

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, User Management, Automation, Security, Linux

Description: Automate new employee onboarding with Ansible including user creation, SSH keys, group membership, home directory setup, and access provisioning.

---

When a new team member joins, they need accounts on servers, SSH access, appropriate group memberships, email setup, and access to various internal tools. Doing this manually across dozens of servers is slow and mistakes happen: someone forgets to add the new user to the right group, or their SSH key gets deployed to the wrong server. Ansible automates the entire onboarding process so it takes minutes instead of hours and is consistent every time.

## Role Defaults

```yaml
# roles/onboarding/defaults/main.yml - User onboarding configuration
onboarding_shell: /bin/bash
onboarding_home_base: /home
onboarding_skeleton_dir: /etc/skel

# Default groups for all new users
onboarding_default_groups:
  - developers

# Team-specific group mappings
onboarding_team_groups:
  backend:
    - docker
    - backend-devs
  frontend:
    - frontend-devs
  devops:
    - docker
    - sudo
    - devops-team
  data:
    - docker
    - data-team

# New users to onboard
onboarding_users:
  - username: jsmith
    fullname: "John Smith"
    email: jsmith@example.com
    team: backend
    ssh_key: "ssh-rsa AAAAB3... jsmith@laptop"
    sudo: false
  - username: jdoe
    fullname: "Jane Doe"
    email: jdoe@example.com
    team: devops
    ssh_key: "ssh-rsa AAAAB3... jdoe@laptop"
    sudo: true
```

## Main Tasks

```yaml
# roles/onboarding/tasks/main.yml - User onboarding automation
---
- name: Ensure team groups exist
  group:
    name: "{{ item }}"
    state: present
  loop: "{{ onboarding_team_groups.values() | flatten | unique }}"

- name: Ensure default groups exist
  group:
    name: "{{ item }}"
    state: present
  loop: "{{ onboarding_default_groups }}"

- name: Create user accounts
  user:
    name: "{{ item.username }}"
    comment: "{{ item.fullname }}"
    shell: "{{ onboarding_shell }}"
    groups: "{{ onboarding_default_groups + onboarding_team_groups[item.team] | default([]) }}"
    append: yes
    create_home: yes
    state: present
  loop: "{{ onboarding_users }}"

- name: Deploy SSH authorized keys
  authorized_key:
    user: "{{ item.username }}"
    key: "{{ item.ssh_key }}"
    state: present
  loop: "{{ onboarding_users }}"

- name: Configure sudo access where needed
  copy:
    content: "{{ item.username }} ALL=(ALL) NOPASSWD:ALL\n"
    dest: "/etc/sudoers.d/{{ item.username }}"
    mode: '0440'
    validate: "visudo -cf %s"
  loop: "{{ onboarding_users }}"
  when: item.sudo | default(false)

- name: Create standard home directory structure
  file:
    path: "{{ onboarding_home_base }}/{{ item.0.username }}/{{ item.1 }}"
    state: directory
    owner: "{{ item.0.username }}"
    group: "{{ item.0.username }}"
    mode: '0755'
  loop: "{{ onboarding_users | product(['.ssh', 'projects', 'bin']) | list }}"

- name: Deploy Git configuration for new users
  template:
    src: gitconfig.j2
    dest: "{{ onboarding_home_base }}/{{ item.username }}/.gitconfig"
    owner: "{{ item.username }}"
    group: "{{ item.username }}"
    mode: '0644'
  loop: "{{ onboarding_users }}"

- name: Deploy bash profile customizations
  template:
    src: bash_profile.j2
    dest: "{{ onboarding_home_base }}/{{ item.username }}/.bash_profile"
    owner: "{{ item.username }}"
    group: "{{ item.username }}"
    mode: '0644'
  loop: "{{ onboarding_users }}"

- name: Log onboarding event
  debug:
    msg: "User {{ item.username }} ({{ item.fullname }}) onboarded to {{ inventory_hostname }}"
  loop: "{{ onboarding_users }}"
```

## Git Configuration Template

```
# roles/onboarding/templates/gitconfig.j2 - Per-user Git configuration
[user]
    name = {{ item.fullname }}
    email = {{ item.email }}
[core]
    autocrlf = input
    editor = vim
[pull]
    rebase = true
[init]
    defaultBranch = main
```

## Bash Profile Template

```bash
# roles/onboarding/templates/bash_profile.j2 - User shell customizations
# Load system profile
if [ -f /etc/bashrc ]; then
    . /etc/bashrc
fi

# Add local bin to PATH
export PATH="$HOME/bin:$PATH"

# Useful aliases
alias ll='ls -alF'
alias gs='git status'
alias gd='git diff'
```

## Database Access Provisioning

```yaml
# roles/onboarding/tasks/database_access.yml - Grant database access
---
- name: Create PostgreSQL user for developer
  become_user: postgres
  postgresql_user:
    name: "{{ item.username }}"
    password: "{{ lookup('password', '/dev/null length=20 chars=ascii_letters,digits') }}"
    role_attr_flags: LOGIN,NOSUPERUSER
    state: present
  loop: "{{ onboarding_users }}"
  when: "'backend' in item.team or 'data' in item.team"

- name: Grant read access to development database
  become_user: postgres
  postgresql_privs:
    database: app_development
    privs: SELECT
    type: table
    objs: ALL_IN_SCHEMA
    role: "{{ item.username }}"
  loop: "{{ onboarding_users }}"
  when: "'backend' in item.team"
```

## Main Playbook

```yaml
# onboard.yml - Run onboarding across all relevant servers
---
- hosts: all
  become: yes
  roles:
    - onboarding
```

## Running the Playbook

```bash
# Onboard new users across all servers
ansible-playbook -i inventory/hosts.ini onboard.yml

# Onboard to specific server groups only
ansible-playbook -i inventory/hosts.ini onboard.yml --limit "app_servers:db_servers"
```

## Summary

Automating user onboarding with Ansible ensures that every new team member gets consistent access across your infrastructure. The playbook handles account creation, SSH key deployment, group membership, sudo configuration, and even personalized Git settings. It runs across all your servers in parallel, completing in minutes what would take hours to do manually. When someone joins a new team, just update the team field and rerun the playbook to adjust their group memberships.

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

