# How to Use Ansible to Disable Unnecessary Services

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, Security, Linux, Service Management, Hardening

Description: Reduce your attack surface by using Ansible to discover and disable unnecessary services running on your Linux servers.

---

Every running service on a server is a potential attack vector. If you are not using it, it should not be running. That is the basic principle of attack surface reduction, and it is something that gets overlooked surprisingly often. Servers ship with all kinds of services enabled by default, and without active management they just keep running.

I have seen production servers running Avahi, CUPS, and Bluetooth daemons for no reason other than nobody turned them off. Ansible makes it straightforward to identify and disable these services consistently across your entire fleet.

## Identifying Unnecessary Services

Before you disable anything, you need to know what is running. This playbook gathers information about all active services on your hosts.

This task lists all running services and saves the output for review:

```yaml
# discover_services.yml - Find all running services on target hosts
---
- name: Discover running services
  hosts: all
  become: true

  tasks:
    - name: Gather service facts
      ansible.builtin.service_facts:

    - name: List all running services
      ansible.builtin.debug:
        msg: "{{ item.key }}: {{ item.value.state }}"
      loop: "{{ ansible_facts.services | dict2items }}"
      when: item.value.state == "running"

    - name: Save running services to file
      ansible.builtin.copy:
        content: |
          {% for svc_name, svc_info in ansible_facts.services.items() %}
          {% if svc_info.state == "running" %}
          {{ svc_name }}: {{ svc_info.state }} ({{ svc_info.status | default('unknown') }})
          {% endif %}
          {% endfor %}
        dest: /tmp/running_services_{{ inventory_hostname }}.txt
        mode: '0644'

    - name: Fetch service lists to controller
      ansible.builtin.fetch:
        src: /tmp/running_services_{{ inventory_hostname }}.txt
        dest: "./service_reports/{{ inventory_hostname }}.txt"
        flat: true
```

## Common Services to Disable

Based on CIS benchmarks and general security best practices, here is a list of services that are typically safe to disable on servers.

This playbook disables common unnecessary services:

```yaml
# disable_unnecessary_services.yml - Disable services not needed on servers
---
- name: Disable unnecessary services
  hosts: all
  become: true

  vars:
    unnecessary_services:
      # Print services - servers rarely need printing
      - cups
      - cups-browsed

      # Desktop/GUI services
      - avahi-daemon        # mDNS/Bonjour - not needed on servers
      - ModemManager        # Modem support
      - bluetooth           # Bluetooth stack
      - colord              # Color management

      # Legacy network services
      - rpcbind             # Only needed for NFS
      - rpc-statd           # NFS file locking
      - nfs-server          # NFS server
      - ypbind              # NIS client
      - ypserv              # NIS server
      - telnet              # Use SSH instead
      - vsftpd              # Use SFTP instead
      - xinetd              # Legacy super-server

      # Other commonly unneeded services
      - postfix             # Unless server sends mail
      - sendmail            # Unless server sends mail
      - autofs              # Automatic mounting
      - nfs-utils           # NFS utilities
      - rsh                 # Remote shell (insecure)
      - talk                # Talk daemon (ancient)

  tasks:
    - name: Check if service exists
      ansible.builtin.service_facts:

    - name: Stop and disable unnecessary services
      ansible.builtin.systemd:
        name: "{{ item }}"
        state: stopped
        enabled: false
        masked: true
      loop: "{{ unnecessary_services }}"
      when: item in ansible_facts.services or (item + '.service') in ansible_facts.services
      failed_when: false
      register: service_results

    - name: Report disabled services
      ansible.builtin.debug:
        msg: "Disabled: {{ item.item }}"
      loop: "{{ service_results.results }}"
      when: item.changed | default(false)
```

## Role-Based Service Management

Different server roles need different services. A web server needs nginx but not a database. A database server needs PostgreSQL but not a web server. This approach lets you define what each role should have.

This playbook uses host groups to determine which services to keep:

```yaml
# role_based_services.yml - Manage services based on server role
---
- name: Role-based service management
  hosts: all
  become: true

  vars:
    # Base services every server needs
    required_services:
      - sshd
      - systemd-journald
      - systemd-resolved
      - cron
      - rsyslog

    # Services per role
    role_services:
      webserver:
        - nginx
        - php-fpm
      database:
        - postgresql
        - postgresql@14-main
      monitoring:
        - prometheus-node-exporter
        - telegraf
      mail:
        - postfix
        - dovecot

  tasks:
    - name: Gather service facts
      ansible.builtin.service_facts:

    - name: Build list of allowed services
      ansible.builtin.set_fact:
        allowed_services: >-
          {{
            required_services +
            (role_services[server_role] | default([]))
          }}

    - name: Find services that should be stopped
      ansible.builtin.set_fact:
        services_to_disable: >-
          {{
            ansible_facts.services | dict2items
            | selectattr('value.state', 'equalto', 'running')
            | map(attribute='key')
            | reject('match', '.*@.*')
            | reject('match', 'systemd-.*')
            | reject('match', 'dbus.*')
            | reject('match', 'user@.*')
            | difference(allowed_services)
            | list
          }}

    - name: Show services that will be reviewed
      ansible.builtin.debug:
        msg: "Services not in allowed list: {{ services_to_disable }}"
```

## Masking Services to Prevent Reactivation

Stopping and disabling is not always enough. Some services get re-enabled by package updates or dependencies. Masking prevents them from starting under any circumstances.

This task masks services so they cannot be started even manually:

```yaml
# mask_services.yml - Mask services to prevent reactivation
---
- name: Mask dangerous services
  hosts: all
  become: true

  vars:
    services_to_mask:
      - telnet
      - rsh
      - rlogin
      - rexec
      - tftp
      - talk
      - ntalk
      - xinetd
      - chargen-dgram
      - chargen-stream
      - daytime-dgram
      - daytime-stream
      - echo-dgram
      - echo-stream

  tasks:
    - name: Mask insecure services
      ansible.builtin.systemd:
        name: "{{ item }}"
        masked: true
      loop: "{{ services_to_mask }}"
      failed_when: false

    - name: Verify services are masked
      ansible.builtin.command: systemctl is-enabled {{ item }}
      loop: "{{ services_to_mask }}"
      register: mask_check
      changed_when: false
      failed_when: false

    - name: Report masking results
      ansible.builtin.debug:
        msg: "{{ item.item }}: {{ item.stdout | default('not found') }}"
      loop: "{{ mask_check.results }}"
```

## Disabling Socket-Activated Services

Some services in systemd are socket-activated, meaning they start on demand when something connects to their socket. You need to disable the socket unit too.

This playbook handles both the service and its socket:

```yaml
# disable_socket_services.yml - Disable socket-activated services
---
- name: Disable socket-activated services
  hosts: all
  become: true

  vars:
    socket_services_to_disable:
      - rpcbind
      - avahi-daemon
      - cups

  tasks:
    - name: Stop and disable service units
      ansible.builtin.systemd:
        name: "{{ item }}.service"
        state: stopped
        enabled: false
      loop: "{{ socket_services_to_disable }}"
      failed_when: false

    - name: Stop and disable socket units
      ansible.builtin.systemd:
        name: "{{ item }}.socket"
        state: stopped
        enabled: false
      loop: "{{ socket_services_to_disable }}"
      failed_when: false

    - name: Mask both service and socket
      ansible.builtin.systemd:
        name: "{{ item }}"
        masked: true
      loop: "{{ socket_services_to_disable | product(['.service', '.socket']) | map('join') | list }}"
      failed_when: false
```

## Compliance Auditing

After disabling services, you need to verify compliance. This playbook checks that specific services are not running.

This audit task checks against a known-bad service list:

```yaml
# audit_services.yml - Verify unnecessary services are disabled
---
- name: Audit service compliance
  hosts: all
  become: true

  vars:
    prohibited_services:
      - telnet
      - rsh
      - rlogin
      - tftp
      - vsftpd
      - xinetd
      - avahi-daemon
      - cups

  tasks:
    - name: Gather service facts
      ansible.builtin.service_facts:

    - name: Check for prohibited running services
      ansible.builtin.set_fact:
        violations: >-
          {{
            prohibited_services
            | select('in', ansible_facts.services)
            | select('in', ansible_facts.services | dict2items
              | selectattr('value.state', 'equalto', 'running')
              | map(attribute='key') | list)
            | list
          }}

    - name: Report violations
      ansible.builtin.debug:
        msg: "VIOLATION on {{ inventory_hostname }}: {{ violations }}"
      when: violations | length > 0

    - name: Fail if violations found
      ansible.builtin.fail:
        msg: "Found {{ violations | length }} prohibited services running"
      when: violations | length > 0
```

## Practical Tips

Some lessons from years of managing services at scale:

1. **Do not disable what you do not understand.** Before disabling a service, check what depends on it with `systemctl list-dependencies --reverse`.
2. **Test in staging first.** Disabling the wrong service can break your application in non-obvious ways.
3. **Keep a record of changes.** Ansible's output is your audit trail, but also log what was changed and when.
4. **Mask instead of just disabling.** Masked services cannot be accidentally restarted.
5. **Review after OS upgrades.** Major version upgrades often re-enable services or add new ones.

Keeping your server fleet lean by disabling unnecessary services is foundational security hygiene. With Ansible, you can do it once, codify it, and enforce it continuously.
