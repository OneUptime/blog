# How to Use the Ansible service_facts Module

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, Service Management, Linux, Automation

Description: Learn how to gather and use service information with the Ansible service_facts module to build dynamic, conditional playbooks.

---

When you are writing Ansible playbooks that need to interact with services, you often need to know the current state of things before making changes. Is PostgreSQL already running? Is firewalld active or was it replaced by iptables? The `ansible.builtin.service_facts` module collects information about all services on a target host, letting you make decisions based on what is actually happening on the system rather than guessing.

## What Does service_facts Do?

The `service_facts` module queries the service manager on the target host and populates the `ansible_facts.services` dictionary with details about every service it finds. It works across init systems, pulling data from systemd, SysV init, and other service managers.

Each service entry includes:
- The service name
- Its current state (running, stopped, etc.)
- Whether it is enabled at boot
- The service manager type (systemd, sysv, etc.)

## Basic Usage

Collecting service facts is straightforward. The module takes no required parameters.

Gather all service facts from the target host:

```yaml
---
- name: Gather service information
  hosts: all
  become: yes
  tasks:
    - name: Collect service facts
      ansible.builtin.service_facts:

    - name: Display all services
      ansible.builtin.debug:
        var: ansible_facts.services
```

The output is a dictionary where each key is a service name and the value contains its metadata. On a systemd host, the keys include the `.service` suffix.

## Understanding the Output Structure

The data structure returned by `service_facts` looks like this for systemd-based systems:

```json
{
  "nginx.service": {
    "name": "nginx.service",
    "source": "systemd",
    "state": "running",
    "status": "enabled"
  },
  "postgresql.service": {
    "name": "postgresql.service",
    "source": "systemd",
    "state": "stopped",
    "status": "disabled"
  },
  "cron.service": {
    "name": "cron.service",
    "source": "systemd",
    "state": "running",
    "status": "enabled"
  }
}
```

For SysV init services, the `source` field will be `sysv` instead of `systemd`, and the service name will not have the `.service` suffix.

## Conditional Logic Based on Service State

The real power of `service_facts` is making playbook decisions based on the current state of services.

Only configure Nginx if it is installed and running:

```yaml
---
- name: Conditionally configure services
  hosts: web_servers
  become: yes
  tasks:
    - name: Gather service facts
      ansible.builtin.service_facts:

    - name: Deploy Nginx configuration
      ansible.builtin.template:
        src: nginx.conf.j2
        dest: /etc/nginx/nginx.conf
      when: "'nginx.service' in ansible_facts.services"
      notify: Restart Nginx

    - name: Install Nginx if not present
      ansible.builtin.apt:
        name: nginx
        state: present
      when: "'nginx.service' not in ansible_facts.services"

  handlers:
    - name: Restart Nginx
      ansible.builtin.systemd:
        name: nginx
        state: restarted
```

## Checking Specific Service Properties

You can drill into the properties of individual services.

Check if a specific service is running and enabled:

```yaml
- name: Gather service facts
  ansible.builtin.service_facts:

- name: Check PostgreSQL state
  ansible.builtin.debug:
    msg: "PostgreSQL is {{ ansible_facts.services['postgresql.service']['state'] }}"
  when: "'postgresql.service' in ansible_facts.services"

- name: Fail if PostgreSQL is not running
  ansible.builtin.fail:
    msg: "PostgreSQL must be running before we proceed!"
  when: >
    'postgresql.service' not in ansible_facts.services or
    ansible_facts.services['postgresql.service']['state'] != 'running'
```

## Filtering Services by State

You can use Jinja2 filters to find services in a particular state.

List all running services on the host:

```yaml
- name: Gather service facts
  ansible.builtin.service_facts:

- name: Get list of running services
  ansible.builtin.set_fact:
    running_services: >-
      {{ ansible_facts.services | dict2items
         | selectattr('value.state', 'equalto', 'running')
         | map(attribute='key')
         | list }}

- name: Display running services
  ansible.builtin.debug:
    var: running_services
```

Find all disabled services that might need cleanup:

```yaml
- name: Find disabled services
  ansible.builtin.set_fact:
    disabled_services: >-
      {{ ansible_facts.services | dict2items
         | selectattr('value.status', 'equalto', 'disabled')
         | map(attribute='key')
         | list }}

- name: Show disabled services count
  ansible.builtin.debug:
    msg: "Found {{ disabled_services | length }} disabled services"
```

## Security Auditing with service_facts

One practical use case is auditing servers for services that should not be running.

Check for and report unauthorized services:

```yaml
---
- name: Security audit - check for unauthorized services
  hosts: all
  become: yes

  vars:
    prohibited_services:
      - telnet.service
      - rsh.service
      - rlogin.service
      - rexec.service
      - tftp.service
      - vsftpd.service

  tasks:
    - name: Gather service facts
      ansible.builtin.service_facts:

    - name: Check for prohibited services
      ansible.builtin.set_fact:
        found_prohibited: >-
          {{ prohibited_services
             | select('in', ansible_facts.services.keys())
             | list }}

    - name: Report prohibited services
      ansible.builtin.debug:
        msg: "WARNING: Found prohibited services on {{ inventory_hostname }}: {{ found_prohibited }}"
      when: found_prohibited | length > 0

    - name: Stop prohibited services
      ansible.builtin.systemd:
        name: "{{ item }}"
        state: stopped
        enabled: no
      loop: "{{ found_prohibited }}"
      when: found_prohibited | length > 0
```

## Comparing Services Across Hosts

You can gather service facts from multiple hosts and compare them in a report.

Generate a service comparison report:

```yaml
---
- name: Compare services across web server fleet
  hosts: web_servers
  become: yes
  tasks:
    - name: Gather service facts
      ansible.builtin.service_facts:

    - name: Check required services
      ansible.builtin.set_fact:
        missing_services: >-
          {{ required_services
             | reject('in', ansible_facts.services.keys())
             | list }}
      vars:
        required_services:
          - nginx.service
          - node_exporter.service
          - filebeat.service

    - name: Report missing services
      ansible.builtin.debug:
        msg: "{{ inventory_hostname }} is missing: {{ missing_services | join(', ') }}"
      when: missing_services | length > 0
```

## Combining with Other Facts

Service facts work alongside other Ansible facts for richer logic.

Choose firewall management based on which service is present:

```yaml
- name: Gather all facts
  ansible.builtin.setup:

- name: Gather service facts
  ansible.builtin.service_facts:

- name: Configure firewalld
  ansible.builtin.firewalld:
    port: "8080/tcp"
    permanent: yes
    state: enabled
  when:
    - "'firewalld.service' in ansible_facts.services"
    - "ansible_facts.services['firewalld.service']['state'] == 'running'"

- name: Configure iptables instead
  ansible.builtin.iptables:
    chain: INPUT
    protocol: tcp
    destination_port: 8080
    jump: ACCEPT
  when:
    - "'firewalld.service' not in ansible_facts.services or
       ansible_facts.services['firewalld.service']['state'] != 'running'"
    - "'iptables.service' in ansible_facts.services"
```

## Performance Considerations

On hosts with many services, `service_facts` can take a few seconds to gather all the data. If you only care about a specific service, you might be tempted to skip fact gathering and just check the service directly. But in practice, the overhead is minimal and having the complete picture is usually worth it.

If you only need to check one service and want to skip the full scan, use the `command` module instead:

```yaml
- name: Quick check for a specific service
  ansible.builtin.command:
    cmd: systemctl is-active nginx
  register: nginx_check
  changed_when: false
  failed_when: false

- name: Do something if Nginx is running
  ansible.builtin.debug:
    msg: "Nginx is active"
  when: nginx_check.rc == 0
```

## Refreshing Service Facts

If your playbook installs a new service and then needs to check for it, you need to refresh the facts.

Re-gather service facts after installing a package:

```yaml
- name: Install Redis
  ansible.builtin.apt:
    name: redis-server
    state: present

- name: Refresh service facts after install
  ansible.builtin.service_facts:

- name: Verify Redis is now known
  ansible.builtin.debug:
    msg: "Redis service state: {{ ansible_facts.services['redis-server.service']['state'] }}"
  when: "'redis-server.service' in ansible_facts.services"
```

## Summary

The `service_facts` module is an essential tool for writing intelligent playbooks. Instead of assuming a service exists or is in a certain state, you can query the host and branch your logic accordingly. This is especially valuable in heterogeneous environments where different hosts might have different services installed, or when you need to audit and enforce compliance across your fleet. Pair it with Jinja2 filters and conditional tasks to build playbooks that adapt to whatever they find on the target system.
