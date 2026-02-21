# How to Use Ansible to Configure SELinux

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, SELinux, Security, RHEL, Linux

Description: Manage SELinux policies, booleans, contexts, and ports across RHEL and CentOS servers using Ansible for consistent mandatory access control.

---

SELinux (Security-Enhanced Linux) is the mandatory access control system that ships with RHEL, CentOS, Fedora, and their derivatives. It provides an additional layer of security beyond standard file permissions by restricting what processes can do, even if they run as root. Many administrators disable SELinux because it can be frustrating when it blocks something unexpectedly. But disabling it throws away one of the strongest security features available on Linux.

The right approach is to manage SELinux properly, and Ansible makes this practical at scale. Instead of running ad-hoc `setsebool` and `semanage` commands, you define the desired SELinux state in playbooks. In this guide, I will cover enforcing SELinux mode, managing booleans, setting file contexts, configuring custom ports, and creating policy modules, all through Ansible.

## SELinux Concepts

```mermaid
graph TD
    A[SELinux Policy] --> B[Booleans]
    A --> C[File Contexts]
    A --> D[Port Labels]
    A --> E[Process Domains]
    B --> B1[httpd_can_network_connect]
    B --> B2[httpd_can_sendmail]
    C --> C1[/var/www -> httpd_sys_content_t]
    C --> C2[/app/data -> httpd_sys_rw_content_t]
    D --> D1[Port 8080 -> http_port_t]
    E --> E1[httpd_t can read httpd_sys_content_t]
```

## Variables

```yaml
# group_vars/all.yml
# SELinux mode: enforcing, permissive, or disabled
selinux_state: enforcing
selinux_policy: targeted

# SELinux booleans to enable/disable
selinux_booleans:
  # Allow HTTP daemon to connect to network (needed for reverse proxy)
  - name: httpd_can_network_connect
    state: true
    persistent: yes

  # Allow HTTP daemon to connect to databases
  - name: httpd_can_network_connect_db
    state: true
    persistent: yes

  # Allow HTTP daemon to send mail
  - name: httpd_can_sendmail
    state: true
    persistent: yes

# Custom file contexts
selinux_fcontexts:
  - target: "/app/data(/.*)?"
    setype: httpd_sys_rw_content_t
    state: present

  - target: "/app/static(/.*)?"
    setype: httpd_sys_content_t
    state: present

  - target: "/app/logs(/.*)?"
    setype: httpd_log_t
    state: present

  - target: "/opt/myapp(/.*)?"
    setype: bin_t
    state: present

# Custom port labels
selinux_ports:
  - port: 8080
    proto: tcp
    setype: http_port_t
    state: present

  - port: 8443
    proto: tcp
    setype: http_port_t
    state: present

  - port: 9090
    proto: tcp
    setype: http_port_t
    state: present

  - port: 3100
    proto: tcp
    setype: http_port_t
    state: present
```

Web server specific SELinux settings.

```yaml
# group_vars/webservers.yml
selinux_booleans_role:
  - name: httpd_can_network_relay
    state: true
    persistent: yes
  - name: httpd_graceful_shutdown
    state: true
    persistent: yes
  - name: httpd_enable_homedirs
    state: false
    persistent: yes
```

## SELinux Role

```yaml
# roles/selinux/tasks/main.yml
---
- name: Install SELinux management packages
  ansible.builtin.package:
    name:
      - policycoreutils
      - policycoreutils-python-utils
      - selinux-policy
      - selinux-policy-targeted
      - libselinux-python3
      - setroubleshoot-server
    state: present
  when: ansible_os_family == "RedHat"

- name: Set SELinux state
  ansible.posix.selinux:
    state: "{{ selinux_state }}"
    policy: "{{ selinux_policy }}"
  register: selinux_result

- name: Reboot if SELinux state changed and reboot is needed
  ansible.builtin.reboot:
    reboot_timeout: 300
  when: selinux_result.reboot_required | default(false)

- name: Configure SELinux booleans
  ansible.posix.seboolean:
    name: "{{ item.name }}"
    state: "{{ item.state }}"
    persistent: "{{ item.persistent | default('yes') }}"
  loop: "{{ selinux_booleans + (selinux_booleans_role | default([])) }}"

- name: Set custom file contexts
  community.general.sefcontext:
    target: "{{ item.target }}"
    setype: "{{ item.setype }}"
    state: "{{ item.state }}"
  loop: "{{ selinux_fcontexts }}"
  notify: Restore file contexts

- name: Configure custom port labels
  community.general.seport:
    ports: "{{ item.port }}"
    proto: "{{ item.proto }}"
    setype: "{{ item.setype }}"
    state: "{{ item.state }}"
  loop: "{{ selinux_ports }}"
```

## Apply File Contexts

After defining contexts, apply them to the filesystem.

```yaml
# roles/selinux/tasks/restore-contexts.yml
---
- name: Restore file contexts on custom paths
  ansible.builtin.command:
    cmd: "restorecon -Rv {{ item.target | regex_replace('\\(.*', '') }}"
  loop: "{{ selinux_fcontexts }}"
  register: restorecon_result
  changed_when: restorecon_result.stdout | length > 0
```

## Custom Policy Modules

When you need to allow something that the default policy blocks, create custom policy modules.

```yaml
# roles/selinux/tasks/custom-modules.yml
---
- name: Create custom policy module directory
  ansible.builtin.file:
    path: /etc/selinux/custom-modules
    state: directory
    owner: root
    group: root
    mode: '0700'

- name: Deploy custom policy module source
  ansible.builtin.template:
    src: "{{ item.name }}.te.j2"
    dest: "/etc/selinux/custom-modules/{{ item.name }}.te"
    owner: root
    group: root
    mode: '0600'
  loop: "{{ selinux_custom_modules | default([]) }}"
  register: module_source

- name: Compile and install custom modules
  ansible.builtin.shell:
    cmd: |
      cd /etc/selinux/custom-modules
      checkmodule -M -m -o {{ item.item.name }}.mod {{ item.item.name }}.te
      semodule_package -o {{ item.item.name }}.pp -m {{ item.item.name }}.mod
      semodule -i {{ item.item.name }}.pp
  loop: "{{ module_source.results }}"
  when: item.changed
```

Example custom module template that allows a Node.js app to bind to port 8080 and connect to Redis.

```jinja2
# roles/selinux/templates/myapp.te.j2
module myapp 1.0;

require {
    type node_t;
    type redis_port_t;
    type http_port_t;
    class tcp_socket { name_bind name_connect };
}

# Allow the application to bind to HTTP ports
allow node_t http_port_t:tcp_socket name_bind;

# Allow the application to connect to Redis
allow node_t redis_port_t:tcp_socket name_connect;
```

## Generating Policy from Audit Logs

When an application is being blocked, you can generate a policy module from the audit log.

```yaml
# roles/selinux/tasks/audit-to-policy.yml
---
- name: Set SELinux to permissive temporarily to collect denials
  ansible.posix.selinux:
    state: permissive
    policy: "{{ selinux_policy }}"
  when: selinux_generate_policy | default(false) | bool

- name: Wait for application to exercise all code paths
  ansible.builtin.pause:
    minutes: 5
    prompt: "Let the application run for a few minutes to generate audit entries"
  when: selinux_generate_policy | default(false) | bool

- name: Generate policy module from audit log
  ansible.builtin.shell:
    cmd: |
      ausearch -m avc --start recent | audit2allow -M custom_app_policy
      semodule -i custom_app_policy.pp
    chdir: /etc/selinux/custom-modules
  when: selinux_generate_policy | default(false) | bool
  register: policy_gen

- name: Restore enforcing mode
  ansible.posix.selinux:
    state: enforcing
    policy: "{{ selinux_policy }}"
  when: selinux_generate_policy | default(false) | bool
```

## Handlers

```yaml
# roles/selinux/handlers/main.yml
---
- name: Restore file contexts
  ansible.builtin.command:
    cmd: "restorecon -Rv {{ item.target | regex_replace('\\(.*', '') }}"
  loop: "{{ selinux_fcontexts }}"
```

## Troubleshooting Playbook

When SELinux blocks something, this playbook helps diagnose the issue.

```yaml
# troubleshoot-selinux.yml
---
- name: Troubleshoot SELinux issues
  hosts: "{{ target_host }}"
  become: yes
  tasks:
    - name: Get current SELinux status
      ansible.builtin.command:
        cmd: sestatus
      register: sestatus
      changed_when: false

    - name: Display SELinux status
      ansible.builtin.debug:
        msg: "{{ sestatus.stdout_lines }}"

    - name: Get recent SELinux denials
      ansible.builtin.command:
        cmd: ausearch -m avc --start recent -i
      register: denials
      changed_when: false
      ignore_errors: yes

    - name: Display recent denials
      ansible.builtin.debug:
        msg: "{{ denials.stdout_lines | default(['No recent denials found']) }}"

    - name: Get suggested fixes
      ansible.builtin.shell:
        cmd: "ausearch -m avc --start recent | audit2why"
      register: suggestions
      changed_when: false
      ignore_errors: yes

    - name: Display suggested fixes
      ansible.builtin.debug:
        msg: "{{ suggestions.stdout_lines | default(['No suggestions available']) }}"

    - name: List all active booleans
      ansible.builtin.command:
        cmd: getsebool -a
      register: booleans
      changed_when: false

    - name: Display non-default booleans
      ansible.builtin.debug:
        msg: "{{ booleans.stdout_lines | select('search', ' on$') | list }}"
```

## Main Playbook

```yaml
# site.yml
---
- name: Configure SELinux
  hosts: all
  become: yes
  roles:
    - selinux
```

## Running the Playbook

```bash
# Apply SELinux configuration
ansible-playbook -i inventory/hosts.ini site.yml

# Troubleshoot SELinux on a specific host
ansible-playbook -i inventory/hosts.ini troubleshoot-selinux.yml -e "target_host=web-01"

# Set to permissive mode for testing (not recommended for production)
ansible-playbook -i inventory/hosts.ini site.yml -e "selinux_state=permissive"
```

## Wrapping Up

SELinux is worth the effort to manage properly. With Ansible, you can maintain enforcing mode across your fleet without the usual headaches of manual policy management. The key workflow is: define your booleans, file contexts, and port labels in variables, let Ansible apply them consistently, and use the troubleshooting playbook when something gets blocked. Over time, you build up a complete policy definition that covers all your application requirements, and new servers get the correct SELinux configuration automatically from their first playbook run.
