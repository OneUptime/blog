# How to Use Ansible to Configure System Limits (ulimits)

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, ulimits, Linux, Performance, System Administration

Description: Learn how to configure system resource limits (ulimits) across your Linux infrastructure using Ansible for file descriptors, processes, memory, and more.

---

If you have ever seen the error "Too many open files" on a production server, you know the pain of hitting ulimit boundaries. The default limits on most Linux distributions are designed for desktop use, not for servers running databases, web servers, or message brokers that need thousands of concurrent connections. Ansible lets you push proper limits to every server in your fleet so you never hit these walls in production.

## What ulimits Control

Resource limits in Linux are set at two levels:

- **Soft limit**: The current effective limit. Users can raise it up to the hard limit.
- **Hard limit**: The ceiling. Only root can raise it.

The key resources you can limit include:

- `nofile` - Maximum number of open file descriptors
- `nproc` - Maximum number of processes per user
- `memlock` - Maximum locked memory (important for databases)
- `core` - Maximum core dump size
- `stack` - Maximum stack size
- `as` - Maximum address space (virtual memory)

## Setting System-Wide Limits

The main configuration file is `/etc/security/limits.conf`, with additional files in `/etc/security/limits.d/`.

This playbook configures system-wide resource limits:

```yaml
# configure-ulimits.yml - Set system resource limits
---
- name: Configure System Resource Limits
  hosts: all
  become: true
  vars:
    system_limits:
      # Allow all users to open more files
      - domain: "*"
        limit_type: soft
        limit_item: nofile
        value: 65536
      - domain: "*"
        limit_type: hard
        limit_item: nofile
        value: 131072
      # Process limits
      - domain: "*"
        limit_type: soft
        limit_item: nproc
        value: 65536
      - domain: "*"
        limit_type: hard
        limit_item: nproc
        value: 131072
      # Core dump limits (disable for production)
      - domain: "*"
        limit_type: hard
        limit_item: core
        value: 0

  tasks:
    - name: Configure resource limits in limits.d
      community.general.pam_limits:
        domain: "{{ item.domain }}"
        limit_type: "{{ item.limit_type }}"
        limit_item: "{{ item.limit_item }}"
        value: "{{ item.value }}"
        dest: /etc/security/limits.d/90-ansible.conf
      loop: "{{ system_limits }}"
      loop_control:
        label: "{{ item.domain }} {{ item.limit_type }} {{ item.limit_item }}"

    - name: Ensure PAM limits module is enabled
      ansible.builtin.lineinfile:
        path: /etc/pam.d/common-session
        line: "session required pam_limits.so"
        state: present
      when: ansible_os_family == "Debian"

    - name: Ensure PAM limits module is enabled for non-interactive sessions
      ansible.builtin.lineinfile:
        path: /etc/pam.d/common-session-noninteractive
        line: "session required pam_limits.so"
        state: present
      when: ansible_os_family == "Debian"
```

## Application-Specific Limits

Different applications need different limits. Here is how to set them per service user.

This playbook configures limits for specific service accounts:

```yaml
# configure-app-limits.yml - Per-application resource limits
---
- name: Configure Application-Specific Limits
  hosts: all
  become: true
  vars:
    app_limits:
      # Nginx needs high file descriptor count for concurrent connections
      nginx:
        - { type: soft, item: nofile, value: 65536 }
        - { type: hard, item: nofile, value: 131072 }
      # PostgreSQL needs locked memory and open files
      postgres:
        - { type: soft, item: nofile, value: 65536 }
        - { type: hard, item: nofile, value: 131072 }
        - { type: soft, item: memlock, value: unlimited }
        - { type: hard, item: memlock, value: unlimited }
      # Elasticsearch is particularly demanding
      elasticsearch:
        - { type: soft, item: nofile, value: 65536 }
        - { type: hard, item: nofile, value: 131072 }
        - { type: soft, item: memlock, value: unlimited }
        - { type: hard, item: memlock, value: unlimited }
        - { type: soft, item: nproc, value: 4096 }
        - { type: hard, item: nproc, value: 4096 }
      # Redis needs high file limits for many connections
      redis:
        - { type: soft, item: nofile, value: 65536 }
        - { type: hard, item: nofile, value: 131072 }

  tasks:
    - name: Configure limits for each application user
      community.general.pam_limits:
        domain: "{{ item.0.key }}"
        limit_type: "{{ item.1.type }}"
        limit_item: "{{ item.1.item }}"
        value: "{{ item.1.value }}"
        dest: "/etc/security/limits.d/91-{{ item.0.key }}.conf"
      loop: "{{ app_limits | dict2items | subelements('value') }}"
      loop_control:
        label: "{{ item.0.key }} {{ item.1.type }} {{ item.1.item }}"
```

## Configuring Limits for systemd Services

Modern Linux systems use systemd, which has its own resource limit mechanism that overrides PAM limits. You need to set limits in both places.

This playbook configures limits via systemd service overrides:

```yaml
# configure-systemd-limits.yml - Set limits via systemd
---
- name: Configure systemd Service Limits
  hosts: all
  become: true
  vars:
    service_limits:
      - service: nginx
        limits:
          LimitNOFILE: 131072
          LimitNPROC: 65536
      - service: postgresql
        limits:
          LimitNOFILE: 131072
          LimitMEMLOCK: infinity
      - service: elasticsearch
        limits:
          LimitNOFILE: 131072
          LimitMEMLOCK: infinity
          LimitNPROC: 4096
          LimitAS: infinity
      - service: redis
        limits:
          LimitNOFILE: 131072

  tasks:
    - name: Create systemd override directories
      ansible.builtin.file:
        path: "/etc/systemd/system/{{ item.service }}.service.d"
        state: directory
        mode: '0755'
      loop: "{{ service_limits }}"
      loop_control:
        label: "{{ item.service }}"

    - name: Create systemd limit overrides
      ansible.builtin.copy:
        dest: "/etc/systemd/system/{{ item.service }}.service.d/limits.conf"
        mode: '0644'
        content: |
          # Resource limits for {{ item.service }} - managed by Ansible
          [Service]
          {% for key, value in item.limits.items() %}
          {{ key }}={{ value }}
          {% endfor %}
      loop: "{{ service_limits }}"
      loop_control:
        label: "{{ item.service }}"
      notify: Reload systemd

    - name: Set DefaultLimitNOFILE in system.conf
      ansible.builtin.lineinfile:
        path: /etc/systemd/system.conf
        regexp: '^#?DefaultLimitNOFILE='
        line: 'DefaultLimitNOFILE=65536:131072'
      notify: Reload systemd

    - name: Set DefaultLimitNPROC in system.conf
      ansible.builtin.lineinfile:
        path: /etc/systemd/system.conf
        regexp: '^#?DefaultLimitNPROC='
        line: 'DefaultLimitNPROC=65536:131072'
      notify: Reload systemd

  handlers:
    - name: Reload systemd
      ansible.builtin.systemd:
        daemon_reload: true
```

## System-Wide fs.file-max

Beyond per-process limits, there is a system-wide maximum for file descriptors controlled by a kernel parameter.

This task sets the kernel-level file descriptor maximum:

```yaml
    - name: Set system-wide maximum file descriptors
      ansible.posix.sysctl:
        name: fs.file-max
        value: "2097152"
        sysctl_set: true
        state: present
        sysctl_file: /etc/sysctl.d/60-file-max.conf

    - name: Set system-wide file-nr (for monitoring)
      ansible.builtin.command: "sysctl fs.file-nr"
      register: file_nr
      changed_when: false

    - name: Display current file descriptor usage
      ansible.builtin.debug:
        msg: "File descriptors (allocated/unused/max): {{ file_nr.stdout }}"
```

## Verification Playbook

After setting limits, verify they are applied correctly.

This playbook checks that ulimits are configured as expected:

```yaml
# verify-ulimits.yml - Validate resource limits
---
- name: Verify Resource Limits
  hosts: all
  become: true
  vars:
    expected_nofile_soft: 65536
    expected_nofile_hard: 131072

  tasks:
    - name: Check current soft nofile limit
      ansible.builtin.shell: |
        ulimit -Sn
      register: soft_nofile
      changed_when: false

    - name: Check current hard nofile limit
      ansible.builtin.shell: |
        ulimit -Hn
      register: hard_nofile
      changed_when: false

    - name: Verify soft nofile limit
      ansible.builtin.assert:
        that:
          - soft_nofile.stdout | int >= expected_nofile_soft
        fail_msg: "Soft nofile limit too low: {{ soft_nofile.stdout }} (expected >= {{ expected_nofile_soft }})"

    - name: Verify hard nofile limit
      ansible.builtin.assert:
        that:
          - hard_nofile.stdout | int >= expected_nofile_hard
        fail_msg: "Hard nofile limit too low: {{ hard_nofile.stdout }} (expected >= {{ expected_nofile_hard }})"

    - name: Check limits for specific running services
      ansible.builtin.shell: |
        # Get the PID of a service and check its limits
        PID=$(systemctl show {{ item }} --property=MainPID --value)
        if [ "$PID" != "0" ] && [ -f "/proc/$PID/limits" ]; then
          grep "Max open files" /proc/$PID/limits
        else
          echo "Service {{ item }} not running"
        fi
      register: service_limits
      changed_when: false
      failed_when: false
      loop:
        - nginx
        - postgresql
        - redis-server

    - name: Display service limit status
      ansible.builtin.debug:
        msg: "{{ item.item }}: {{ item.stdout }}"
      loop: "{{ service_limits.results }}"
      loop_control:
        label: "{{ item.item }}"
```

## How Limits Are Applied

```mermaid
graph TD
    A[Kernel: fs.file-max] --> B[System-Wide Maximum]
    C[/etc/systemd/system.conf] --> D[systemd Default Limits]
    E[/etc/security/limits.d/] --> F[PAM Session Limits]
    G[Service Override .conf] --> H[Per-Service Limits]
    D --> I[Process Inherits Limits]
    F --> I
    H --> I
    B --> J[Cannot Exceed System Max]
    I --> J
```

## Common Mistakes

**Forgetting systemd**: Setting limits in `/etc/security/limits.conf` does not affect services managed by systemd. You need both PAM limits (for SSH sessions) and systemd overrides (for services).

**Not reloading systemd**: After creating override files, you must run `systemctl daemon-reload` for changes to take effect. Ansible's handler approach takes care of this.

**PAM module not enabled**: On some minimal installations, `pam_limits.so` is not included in the PAM session configuration. Without it, limits.conf is completely ignored for login sessions.

**Checking limits as root**: The `root` user often has different limits than regular users. When verifying, check as the actual service user with `su - username -c 'ulimit -a'`.

Resource limits are foundational to server performance. Get them wrong and your application crashes under load. Get them right with Ansible and you have one less thing to worry about during traffic spikes.
