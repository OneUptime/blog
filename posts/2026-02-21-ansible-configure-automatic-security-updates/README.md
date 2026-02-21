# How to Use Ansible to Configure Automatic Security Updates

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, Security, Linux, Automatic Updates, Patch Management

Description: Configure automatic security updates on Ubuntu and RHEL-based systems using Ansible, covering unattended-upgrades, dnf-automatic, and custom scheduling.

---

Keeping servers patched with the latest security updates is one of those tasks that is absolutely critical but often falls through the cracks. Manual patching does not scale, and it only takes one missed vulnerability to create a serious problem. Automatic security updates solve this by applying critical patches as soon as they are available, without requiring human intervention.

In this post, I will walk through how to set up automatic security updates on both Debian/Ubuntu and RHEL/CentOS systems using Ansible. We will cover the configuration options that matter most in production environments.

## Automatic Security Updates on Ubuntu/Debian

Ubuntu uses the `unattended-upgrades` package to handle automatic updates. It is installed by default on most Ubuntu server installations, but the configuration often needs tuning.

### Installing and Enabling unattended-upgrades

```yaml
---
# playbook: setup-auto-updates-ubuntu.yml
# Configure automatic security updates on Ubuntu/Debian systems
- hosts: ubuntu_servers
  become: true

  tasks:
    - name: Install unattended-upgrades package
      ansible.builtin.apt:
        name:
          - unattended-upgrades
          - apt-listchanges
        state: present

    - name: Enable unattended-upgrades
      ansible.builtin.debconf:
        name: unattended-upgrades
        question: unattended-upgrades/enable_auto_updates
        value: "true"
        vtype: boolean
```

### Configuring unattended-upgrades

The main configuration file is `/etc/apt/apt.conf.d/50unattended-upgrades`. Here is how to template it with Ansible.

```yaml
# Configure which updates to apply automatically
- name: Configure unattended-upgrades
  ansible.builtin.copy:
    dest: /etc/apt/apt.conf.d/50unattended-upgrades
    content: |
      // Automatically install security updates only
      Unattended-Upgrade::Allowed-Origins {
          "${distro_id}:${distro_codename}-security";
          "${distro_id}ESMApps:${distro_codename}-apps-security";
          "${distro_id}ESM:${distro_codename}-infra-security";
      };

      // Packages to never update automatically
      Unattended-Upgrade::Package-Blacklist {
          "linux-image*";
          "linux-headers*";
      };

      // Send email notifications about updates
      Unattended-Upgrade::Mail "admin@company.com";
      Unattended-Upgrade::MailReport "on-change";

      // Automatically remove unused dependencies
      Unattended-Upgrade::Remove-Unused-Dependencies "true";
      Unattended-Upgrade::Remove-New-Unused-Dependencies "true";

      // Automatically reboot if required (set time for maintenance window)
      Unattended-Upgrade::Automatic-Reboot "true";
      Unattended-Upgrade::Automatic-Reboot-Time "03:00";

      // Limit download bandwidth (in kb/sec, 0 = unlimited)
      Acquire::http::Dl-Limit "500";
    mode: '0644'
    owner: root
    group: root
  notify: restart unattended-upgrades
```

### Setting the Update Schedule

The update frequency is controlled by a separate configuration file.

```yaml
# Configure how often updates are checked and applied
- name: Configure auto-update schedule
  ansible.builtin.copy:
    dest: /etc/apt/apt.conf.d/20auto-upgrades
    content: |
      APT::Periodic::Update-Package-Lists "1";
      APT::Periodic::Download-Upgradeable-Packages "1";
      APT::Periodic::AutocleanInterval "7";
      APT::Periodic::Unattended-Upgrade "1";
    mode: '0644'
    owner: root
    group: root
```

The numbers represent days. So `"1"` means daily, `"7"` means weekly.

### Handler for Restarting the Service

```yaml
# handlers/main.yml
- name: restart unattended-upgrades
  ansible.builtin.systemd:
    name: unattended-upgrades
    state: restarted
```

## Automatic Security Updates on RHEL/CentOS

On RHEL-based systems, the equivalent tool is `dnf-automatic` (or `yum-cron` on older systems).

### Setting Up dnf-automatic

```yaml
---
# playbook: setup-auto-updates-rhel.yml
# Configure automatic security updates on RHEL/CentOS 8+ systems
- hosts: rhel_servers
  become: true

  tasks:
    - name: Install dnf-automatic
      ansible.builtin.dnf:
        name: dnf-automatic
        state: present

    - name: Configure dnf-automatic for security updates only
      ansible.builtin.template:
        src: automatic.conf.j2
        dest: /etc/dnf/automatic.conf
        mode: '0644'
        owner: root
        group: root

    - name: Enable and start dnf-automatic timer
      ansible.builtin.systemd:
        name: dnf-automatic-install.timer
        state: started
        enabled: true
```

### The dnf-automatic Configuration Template

```ini
# templates/automatic.conf.j2
# Configuration for dnf-automatic security updates
[commands]
# What type of updates to apply:
# default = all, security = security only
upgrade_type = security
random_sleep = 3600

# Whether to actually apply updates (yes) or just download them (no)
apply_updates = yes
download_updates = yes

[emitters]
# How to notify about updates
emit_via = email,stdio

[email]
email_from = dnf-automatic@{{ ansible_fqdn }}
email_to = {{ admin_email | default('admin@company.com') }}
email_host = {{ smtp_host | default('localhost') }}

[command]
# Custom command to run after updates (optional)
# command_format = cat

[command_email]
email_from = dnf-automatic@{{ ansible_fqdn }}
email_to = {{ admin_email | default('admin@company.com') }}

[base]
debuglevel = 1
```

## A Cross-Platform Role

In mixed environments, you want a single role that works on both distribution families. Here is how to structure that.

```yaml
---
# roles/auto_security_updates/tasks/main.yml
# Cross-platform automatic security updates configuration

- name: Include Debian/Ubuntu tasks
  ansible.builtin.include_tasks: debian.yml
  when: ansible_os_family == "Debian"

- name: Include RedHat/CentOS tasks
  ansible.builtin.include_tasks: redhat.yml
  when: ansible_os_family == "RedHat"
```

```yaml
# roles/auto_security_updates/defaults/main.yml
# Default variables for automatic security updates
auto_updates_enabled: true
auto_updates_reboot: false
auto_updates_reboot_time: "03:00"
auto_updates_email: "admin@company.com"
auto_updates_blacklist: []
auto_updates_schedule: "daily"
```

## Handling Automatic Reboots

Some security updates (particularly kernel updates) require a reboot. You need a strategy for this. Here are three approaches.

### Approach 1: Automatic Reboot During Maintenance Window

This was shown above in the unattended-upgrades configuration. The system reboots automatically at the specified time if a reboot is pending.

### Approach 2: Notify but Do Not Reboot

```yaml
# Check if a reboot is required and notify (but do not reboot)
- name: Check if reboot is required (Debian)
  ansible.builtin.stat:
    path: /var/run/reboot-required
  register: reboot_required
  when: ansible_os_family == "Debian"

- name: Check if reboot is required (RHEL)
  ansible.builtin.command:
    cmd: needs-restarting -r
  register: reboot_required_rhel
  changed_when: false
  failed_when: false
  when: ansible_os_family == "RedHat"

- name: Send notification if reboot is needed
  ansible.builtin.debug:
    msg: "HOST {{ inventory_hostname }} requires a reboot for security updates"
  when: >
    (reboot_required.stat.exists | default(false)) or
    (reboot_required_rhel.rc | default(0) == 1)
```

### Approach 3: Rolling Reboots with Ansible

```yaml
# Perform rolling reboots across a cluster (one at a time)
- name: Reboot hosts that need it
  ansible.builtin.reboot:
    reboot_timeout: 600
    msg: "Rebooting for security updates"
  when: reboot_required.stat.exists | default(false)
  serial: 1
  throttle: 1
```

## Verifying Auto-Update Configuration

After deploying your configuration, verify it is working.

```yaml
# Verify auto-update configuration is active
- name: Verify unattended-upgrades is running (Debian)
  ansible.builtin.command:
    cmd: systemctl is-active unattended-upgrades
  register: ua_status
  changed_when: false
  when: ansible_os_family == "Debian"

- name: Verify dnf-automatic timer is active (RHEL)
  ansible.builtin.command:
    cmd: systemctl is-active dnf-automatic-install.timer
  register: dnf_auto_status
  changed_when: false
  when: ansible_os_family == "RedHat"

- name: Run a dry-run of unattended-upgrades (Debian)
  ansible.builtin.command:
    cmd: unattended-upgrades --dry-run --debug
  register: ua_dry_run
  changed_when: false
  when: ansible_os_family == "Debian"

- name: Show dry-run results
  ansible.builtin.debug:
    var: ua_dry_run.stdout_lines
  when: ansible_os_family == "Debian"
```

## Excluding Packages from Auto-Updates

There are packages you might not want to update automatically. Database servers, for example, might need a planned upgrade path.

```yaml
# Exclude specific packages from automatic updates (RHEL)
- name: Configure package exclusions for dnf-automatic
  ansible.builtin.lineinfile:
    path: /etc/dnf/automatic.conf
    regexp: '^exclude'
    line: "exclude = postgresql* mysql* redis*"
    insertafter: '^\[commands\]'
```

For Ubuntu, this is handled through the `Package-Blacklist` section in the unattended-upgrades configuration shown earlier.

## Wrapping Up

Automatic security updates are a fundamental part of any server hardening strategy. With Ansible, you can deploy a consistent update policy across your entire fleet in minutes. The key decisions you need to make are: which updates to apply automatically (security-only is the safest default), whether to allow automatic reboots, and which packages to exclude. Start with security-only updates and no automatic reboots, monitor the results for a few weeks, and then adjust based on your operational needs.
