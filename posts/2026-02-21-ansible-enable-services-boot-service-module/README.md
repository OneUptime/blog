# How to Enable Services at Boot with the Ansible service Module

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, Services, Boot, Linux, System Administration

Description: Learn how to enable and disable Linux services at boot using the Ansible service module, with practical patterns for production server provisioning.

---

Starting a service is one thing. Making sure it comes back after a reboot is another. I have seen servers that worked perfectly until someone rebooted them for a kernel update, only to discover that half the application stack was not set to start at boot. The Ansible `service` module's `enabled` parameter solves this by ensuring services are configured to start automatically when the system boots.

## Enabling a Service at Boot

The `enabled` parameter controls whether a service starts at boot time.

```yaml
# Enable nginx to start at boot
- name: Enable nginx at boot
  ansible.builtin.service:
    name: nginx
    enabled: true
```

This is separate from the service's current state. A service can be enabled (will start at boot) but currently stopped, or running but not enabled (will not start after reboot).

## Starting and Enabling in One Task

Most of the time, you want both: the service should be running now and should start at boot. You can do both in a single task.

```yaml
# Start nginx and enable it at boot
- name: Ensure nginx is running and enabled
  ansible.builtin.service:
    name: nginx
    state: started
    enabled: true
```

This is the most common pattern, and I recommend using it as your default for any service that should be persistent.

## Enabling Multiple Services

When provisioning a new server, you typically have a list of services that need to be enabled.

```yaml
# Enable all application stack services at boot
- name: Enable services at boot
  ansible.builtin.service:
    name: "{{ item }}"
    state: started
    enabled: true
  loop:
    - nginx
    - postgresql
    - redis-server
    - cron
    - rsyslog
    - fail2ban
```

## Disabling a Service at Boot

There are services you explicitly do not want starting at boot, either for security reasons or because they are managed by another process.

```yaml
# Disable unnecessary services
- name: Disable and stop unused services
  ansible.builtin.service:
    name: "{{ item }}"
    state: stopped
    enabled: false
  loop:
    - cups
    - avahi-daemon
    - bluetooth
    - ModemManager
```

## A Server Hardening Playbook

A common use case for enabling/disabling services at boot is server hardening. Here is a playbook that follows CIS benchmark recommendations.

```yaml
---
# playbook: harden-services.yml
# Enable required services and disable unnecessary ones per CIS benchmarks
- hosts: all
  become: true

  vars:
    required_services:
      - sshd
      - rsyslog
      - auditd
      - cron
      - firewalld
      - chronyd

    unwanted_services:
      - cups
      - avahi-daemon
      - bluetooth
      - rpcbind
      - nfs-server
      - vsftpd
      - xinetd
      - tftp
      - telnet

  tasks:
    - name: Enable and start required services
      ansible.builtin.service:
        name: "{{ item }}"
        state: started
        enabled: true
      loop: "{{ required_services }}"
      register: service_result
      failed_when: false

    - name: Report services that could not be enabled
      ansible.builtin.debug:
        msg: "Could not enable {{ item.item }} - it may not be installed"
      loop: "{{ service_result.results }}"
      when: item is failed

    - name: Disable and stop unwanted services
      ansible.builtin.service:
        name: "{{ item }}"
        state: stopped
        enabled: false
      loop: "{{ unwanted_services }}"
      register: disable_result
      failed_when: false

    - name: Report services that were not found (expected)
      ansible.builtin.debug:
        msg: "Service {{ item.item }} not installed - OK"
      loop: "{{ disable_result.results }}"
      when: item is failed
```

The `failed_when: false` is important here because some services in the lists might not be installed on every host. You do not want the playbook to fail just because a service you wanted to disable was never installed in the first place.

## Checking Boot-Enabled Status

You can verify which services are enabled at boot.

```yaml
# Check if a service is enabled at boot
- name: Check if nginx is enabled
  ansible.builtin.command:
    cmd: systemctl is-enabled nginx
  register: nginx_enabled
  changed_when: false
  failed_when: false

- name: Report nginx boot status
  ansible.builtin.debug:
    msg: "nginx is {{ nginx_enabled.stdout }} at boot"
```

### Auditing All Enabled Services

```yaml
# List all services enabled at boot
- name: Get list of enabled services
  ansible.builtin.command:
    cmd: systemctl list-unit-files --type=service --state=enabled --no-pager --no-legend
  register: enabled_services
  changed_when: false

- name: Display enabled services
  ansible.builtin.debug:
    var: enabled_services.stdout_lines
```

## Runlevel-Specific Enabling (SysV Init)

On older systems using SysV init (before systemd), the `service` module handles runlevel configuration automatically. However, if you need explicit control, you can use the `runlevel` parameter.

```yaml
# Enable a service for specific runlevels (SysV init systems)
- name: Enable service for runlevels 3 and 5
  ansible.builtin.service:
    name: httpd
    enabled: true
    runlevel: 5
```

On systemd systems, this parameter is ignored because systemd uses targets instead of runlevels.

## Role Pattern: Install, Configure, Enable

The standard role pattern is to install the package, deploy configuration, and then ensure the service is started and enabled.

```yaml
# roles/redis/tasks/main.yml
# Standard pattern: install, configure, enable
- name: Install Redis
  ansible.builtin.apt:
    name: redis-server
    state: present

- name: Deploy Redis configuration
  ansible.builtin.template:
    src: redis.conf.j2
    dest: /etc/redis/redis.conf
    mode: '0640'
    owner: redis
    group: redis
  notify: restart redis

- name: Ensure Redis is started and enabled at boot
  ansible.builtin.service:
    name: redis-server
    state: started
    enabled: true
```

```yaml
# roles/redis/handlers/main.yml
- name: restart redis
  ansible.builtin.service:
    name: redis-server
    state: restarted
```

## Conditional Enabling Based on Environment

In some environments, you might want a service enabled in production but disabled in development.

```yaml
# Enable services based on the environment
- name: Manage monitoring agent
  ansible.builtin.service:
    name: datadog-agent
    state: "{{ 'started' if env == 'production' else 'stopped' }}"
    enabled: "{{ env == 'production' }}"

- name: Manage debug tools service
  ansible.builtin.service:
    name: debug-profiler
    state: "{{ 'started' if env == 'development' else 'stopped' }}"
    enabled: "{{ env == 'development' }}"
```

## Verifying Boot Configuration After Provisioning

After provisioning a server, run a verification check to make sure everything is set correctly.

```yaml
# Verify service boot configuration matches expectations
- name: Gather service facts
  ansible.builtin.service_facts:

- name: Verify critical services are enabled
  ansible.builtin.assert:
    that:
      - "ansible_facts.services['{{ item }}.service'].status == 'enabled'"
    fail_msg: "Service {{ item }} is NOT enabled at boot"
    success_msg: "Service {{ item }} is enabled at boot"
  loop:
    - sshd
    - rsyslog
    - cron
    - nginx

- name: Verify unwanted services are disabled
  ansible.builtin.assert:
    that:
      - "ansible_facts.services[item + '.service'].status != 'enabled'"
    fail_msg: "Service {{ item }} should be disabled but is enabled"
    success_msg: "Service {{ item }} is correctly disabled"
  loop:
    - cups
    - bluetooth
  when: "(item + '.service') in ansible_facts.services"
```

The `service_facts` module gathers information about all services, which you can then validate with assertions.

## Wrapping Up

Enabling services at boot is one of those tasks that seems trivial until you forget to do it and a server comes back from a reboot with half its services missing. Making it a standard part of your Ansible roles (always pair `state: started` with `enabled: true`) ensures your servers are resilient to reboots. Use the patterns from the hardening section to audit and enforce which services should and should not be starting at boot, and verify the configuration after provisioning to catch any gaps. It is a small investment that prevents a common and frustrating operational problem.
