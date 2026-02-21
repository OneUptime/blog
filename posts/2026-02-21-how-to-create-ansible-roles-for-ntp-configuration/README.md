# How to Create Ansible Roles for NTP Configuration

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, NTP, Chrony, Time Synchronization, DevOps

Description: Build an Ansible role for consistent NTP time synchronization using Chrony across your entire server fleet with proper monitoring and alerting.

---

Time synchronization might seem like a boring detail, but it matters a lot more than most people think. When server clocks drift, log correlation breaks, TLS certificates fail validation, distributed databases get confused, and Kerberos authentication stops working. Every server in your infrastructure needs accurate, consistent time. An Ansible role for NTP makes sure that happens without anyone having to think about it.

This post uses Chrony, which has replaced the older ntpd as the default NTP implementation on most modern Linux distributions. Chrony handles clock synchronization faster, works better with intermittent network connections, and uses fewer resources.

## Role Structure

```
roles/ntp/
  defaults/main.yml
  handlers/main.yml
  tasks/
    main.yml
    install.yml
    configure.yml
    verify.yml
  templates/
    chrony.conf.j2
  meta/main.yml
```

## Default Variables

```yaml
# roles/ntp/defaults/main.yml
# Chrony package and service
ntp_package: chrony
ntp_service: chronyd
ntp_config_file: /etc/chrony/chrony.conf

# NTP servers to sync from
ntp_servers:
  - server: 0.pool.ntp.org
    options: iburst
  - server: 1.pool.ntp.org
    options: iburst
  - server: 2.pool.ntp.org
    options: iburst
  - server: 3.pool.ntp.org
    options: iburst

# NTP pools (alternative to individual servers)
ntp_pools: []
# Example:
#   - pool: pool.ntp.org
#     options: iburst maxsources 4

# Allow NTP clients from these networks (for NTP servers)
ntp_allow_networks: []
# Example: ["10.0.0.0/8", "192.168.0.0/16"]

# Timezone
ntp_timezone: UTC
ntp_set_timezone: true

# Chrony settings
ntp_makestep_threshold: 1.0
ntp_makestep_limit: 3
ntp_rtcsync: true
ntp_log_measurements: true
ntp_log_statistics: true
ntp_log_tracking: true
ntp_log_dir: /var/log/chrony

# Hardware timestamping (for high-precision environments)
ntp_hwclock_enabled: false
ntp_hwclock_interface: ""

# Drift file
ntp_driftfile: /var/lib/chrony/drift

# Key file for authenticated NTP
ntp_keyfile: /etc/chrony/chrony.keys

# Max allowed offset before alerting (in seconds)
ntp_max_offset_warning: 0.5
ntp_verify_sync: true
```

## Installation Tasks

```yaml
# roles/ntp/tasks/install.yml
# Install Chrony and remove conflicting NTP packages
- name: Remove legacy ntpd if present
  ansible.builtin.apt:
    name:
      - ntp
      - ntpdate
    state: absent
  when: ansible_os_family == "Debian"

- name: Install Chrony
  ansible.builtin.apt:
    name: "{{ ntp_package }}"
    state: present
    update_cache: yes
  when: ansible_os_family == "Debian"

- name: Install Chrony on RedHat
  ansible.builtin.yum:
    name: "{{ ntp_package }}"
    state: present
  when: ansible_os_family == "RedHat"

- name: Ensure Chrony is started and enabled
  ansible.builtin.systemd:
    name: "{{ ntp_service }}"
    state: started
    enabled: yes
```

## Configuration Tasks

```yaml
# roles/ntp/tasks/configure.yml
# Set timezone and deploy Chrony configuration
- name: Set system timezone
  ansible.builtin.timezone:
    name: "{{ ntp_timezone }}"
  when: ntp_set_timezone

- name: Create Chrony log directory
  ansible.builtin.file:
    path: "{{ ntp_log_dir }}"
    state: directory
    owner: _chrony
    group: _chrony
    mode: '0755'
  when: ntp_log_measurements or ntp_log_statistics or ntp_log_tracking

- name: Deploy Chrony configuration
  ansible.builtin.template:
    src: chrony.conf.j2
    dest: "{{ ntp_config_file }}"
    owner: root
    group: root
    mode: '0644'
  notify: restart chrony

- name: Ensure Chrony is running after configuration change
  ansible.builtin.systemd:
    name: "{{ ntp_service }}"
    state: started
```

## Chrony Configuration Template

```jinja2
# roles/ntp/templates/chrony.conf.j2
# Chrony NTP configuration - managed by Ansible
# Do not edit manually

# NTP servers
{% for server in ntp_servers %}
server {{ server.server }} {{ server.options | default('iburst') }}
{% endfor %}

# NTP pools
{% for pool in ntp_pools %}
pool {{ pool.pool }} {{ pool.options | default('iburst') }}
{% endfor %}

# Record the rate at which the system clock gains/losses time
driftfile {{ ntp_driftfile }}

# Allow stepping the clock on startup if offset is larger than threshold
# First value: threshold in seconds
# Second value: number of clock updates to allow stepping (-1 for unlimited)
makestep {{ ntp_makestep_threshold }} {{ ntp_makestep_limit }}

{% if ntp_rtcsync %}
# Enable kernel synchronization of the real-time clock (RTC)
rtcsync
{% endif %}

{% if ntp_allow_networks | length > 0 %}
# Allow NTP clients from these networks
{% for network in ntp_allow_networks %}
allow {{ network }}
{% endfor %}
{% endif %}

# Key file for NTP authentication
keyfile {{ ntp_keyfile }}

{% if ntp_log_measurements or ntp_log_statistics or ntp_log_tracking %}
# Logging
logdir {{ ntp_log_dir }}
log{% if ntp_log_measurements %} measurements{% endif %}{% if ntp_log_statistics %} statistics{% endif %}{% if ntp_log_tracking %} tracking{% endif %}

{% endif %}

{% if ntp_hwclock_enabled and ntp_hwclock_interface %}
# Hardware timestamping
hwtimestamp {{ ntp_hwclock_interface }}
{% endif %}

# Serve time even if not synchronized to a time source
# (useful for isolated networks)
local stratum 10
```

## Verification Tasks

```yaml
# roles/ntp/tasks/verify.yml
# Verify NTP synchronization is working
- name: Wait for Chrony to synchronize
  ansible.builtin.command:
    cmd: chronyc waitsync 10 {{ ntp_max_offset_warning }} 0 0
  changed_when: false
  failed_when: false
  register: sync_result
  when: ntp_verify_sync

- name: Check Chrony tracking status
  ansible.builtin.command:
    cmd: chronyc tracking
  changed_when: false
  register: tracking_output

- name: Display Chrony tracking status
  ansible.builtin.debug:
    msg: "{{ tracking_output.stdout_lines }}"

- name: Check Chrony sources
  ansible.builtin.command:
    cmd: chronyc sources -v
  changed_when: false
  register: sources_output

- name: Display Chrony sources
  ansible.builtin.debug:
    msg: "{{ sources_output.stdout_lines }}"

- name: Warn if synchronization failed
  ansible.builtin.debug:
    msg: "WARNING: Chrony synchronization check did not pass within the expected time. Current status may still be converging."
  when:
    - ntp_verify_sync
    - sync_result.rc != 0
```

## Main Task File

```yaml
# roles/ntp/tasks/main.yml
- name: Include installation tasks
  ansible.builtin.include_tasks: install.yml

- name: Include configuration tasks
  ansible.builtin.include_tasks: configure.yml

- name: Include verification tasks
  ansible.builtin.include_tasks: verify.yml
```

## Handlers

```yaml
# roles/ntp/handlers/main.yml
- name: restart chrony
  ansible.builtin.systemd:
    name: "{{ ntp_service }}"
    state: restarted
```

## Using the Role

For most servers, the defaults work well:

```yaml
# setup-ntp.yml
- hosts: all
  become: yes
  roles:
    - role: ntp
      vars:
        ntp_timezone: "America/New_York"
```

For servers that should also act as NTP servers for your internal network:

```yaml
# setup-ntp-servers.yml
- hosts: ntp_servers
  become: yes
  roles:
    - role: ntp
      vars:
        ntp_servers:
          - server: time1.google.com
            options: iburst prefer
          - server: time2.google.com
            options: iburst
          - server: time3.google.com
            options: iburst
          - server: time4.google.com
            options: iburst
        ntp_allow_networks:
          - "10.0.0.0/8"
          - "172.16.0.0/12"
```

Then point all other servers to your internal NTP servers:

```yaml
# setup-ntp-clients.yml
- hosts: all:!ntp_servers
  become: yes
  roles:
    - role: ntp
      vars:
        ntp_servers:
          - server: ntp1.internal.example.com
            options: iburst prefer
          - server: ntp2.internal.example.com
            options: iburst
        ntp_pools: []
```

## Monitoring NTP Health

Add a simple check to your monitoring playbook:

```yaml
# check-ntp.yml
- hosts: all
  become: yes
  tasks:
    - name: Get clock offset
      ansible.builtin.command:
        cmd: chronyc tracking
      register: ntp_tracking
      changed_when: false

    - name: Parse system time offset
      ansible.builtin.set_fact:
        ntp_offset: "{{ ntp_tracking.stdout | regex_search('System time\\s+:\\s+([\\d.]+)', '\\1') | first }}"

    - name: Alert on large clock offset
      ansible.builtin.debug:
        msg: "ALERT: {{ inventory_hostname }} clock offset is {{ ntp_offset }} seconds"
      when: ntp_offset | float > ntp_max_offset_warning
```

Time synchronization is one of those foundational pieces that you set up once and then forget about. This role makes sure every server in your fleet gets it right from day one, and the verification tasks give you confidence that synchronization is actually working.
