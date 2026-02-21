# How to Use Ansible to Manage System Motd (Message of the Day)

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, MOTD, Linux, System Administration

Description: Automate the management of Linux Message of the Day (MOTD) banners using Ansible for login warnings, system info, and compliance requirements.

---

The Message of the Day (MOTD) is the first thing users see when they log into a server. Most people ignore it, but it serves real purposes beyond decoration. Legal teams want login banners warning about authorized access. Operations teams want system information displayed at login. Compliance frameworks require specific warning text. Ansible makes it easy to deploy consistent, dynamic MOTD content across your entire fleet.

## MOTD on Modern Linux

On systemd-based systems, the MOTD system is more complex than just editing `/etc/motd`. There are several pieces:

- `/etc/motd` - Static MOTD text
- `/etc/update-motd.d/` - Scripts that generate dynamic MOTD content (Debian/Ubuntu)
- `/etc/profile.d/` - Scripts that run at login and can display messages
- `/run/motd.dynamic` - Generated dynamic content

## Simple Static MOTD

Let us start with the basic case: deploying a static MOTD.

This playbook deploys a static MOTD with a legal banner:

```yaml
# configure-motd-static.yml - Deploy static MOTD
---
- name: Configure Static MOTD
  hosts: all
  become: true
  vars:
    motd_banner: |
      ============================================================
      WARNING: This system is for authorized use only.

      All activity on this system is monitored and logged.
      Unauthorized access or use is prohibited and may result
      in disciplinary action and/or civil and criminal penalties.

      By continuing to use this system, you indicate your
      awareness of and consent to these terms.
      ============================================================

  tasks:
    - name: Deploy static MOTD banner
      ansible.builtin.copy:
        content: "{{ motd_banner }}"
        dest: /etc/motd
        owner: root
        group: root
        mode: '0644'

    - name: Deploy pre-login banner (for SSH)
      ansible.builtin.copy:
        content: "{{ motd_banner }}"
        dest: /etc/issue.net
        owner: root
        group: root
        mode: '0644'

    - name: Configure SSH to show pre-login banner
      ansible.builtin.lineinfile:
        path: /etc/ssh/sshd_config
        regexp: '^#?Banner'
        line: 'Banner /etc/issue.net'
      notify: Restart sshd

    - name: Configure SSH to show MOTD after login
      ansible.builtin.lineinfile:
        path: /etc/ssh/sshd_config
        regexp: '^#?PrintMotd'
        line: 'PrintMotd yes'
      notify: Restart sshd

  handlers:
    - name: Restart sshd
      ansible.builtin.systemd:
        name: sshd
        state: restarted
```

## Dynamic MOTD with System Information

A dynamic MOTD that shows system stats is far more useful than a static text file.

This playbook creates a dynamic MOTD script that shows system information:

```yaml
# configure-motd-dynamic.yml - Dynamic MOTD with system info
---
- name: Configure Dynamic MOTD
  hosts: all
  become: true
  tasks:
    - name: Disable default Ubuntu MOTD scripts
      ansible.builtin.file:
        path: "/etc/update-motd.d/{{ item }}"
        mode: '0644'
      loop:
        - 10-help-text
        - 50-motd-news
        - 91-release-upgrade
      failed_when: false
      when: ansible_os_family == "Debian"

    - name: Create custom MOTD header script
      ansible.builtin.copy:
        dest: /etc/update-motd.d/00-header
        mode: '0755'
        content: |
          #!/bin/bash
          # Custom MOTD header - managed by Ansible
          echo ""
          echo "============================================="
          echo "  WARNING: Authorized access only"
          echo "  All sessions are monitored and logged"
          echo "============================================="
          echo ""
      when: ansible_os_family == "Debian"

    - name: Create system info MOTD script
      ansible.builtin.copy:
        dest: /etc/update-motd.d/20-sysinfo
        mode: '0755'
        content: |
          #!/bin/bash
          # System information display - managed by Ansible

          # Gather system info
          HOSTNAME=$(hostname -f 2>/dev/null || hostname)
          UPTIME=$(uptime -p 2>/dev/null || uptime)
          LOAD=$(cat /proc/loadavg | awk '{print $1, $2, $3}')
          MEMORY=$(free -h | awk '/^Mem:/{printf "%s / %s (%.0f%%)", $3, $2, $3/$2*100}')
          DISK=$(df -h / | awk 'NR==2{printf "%s / %s (%s)", $3, $2, $5}')
          IP=$(hostname -I 2>/dev/null | awk '{print $1}')
          KERNEL=$(uname -r)
          PROCS=$(ps aux | wc -l)

          # Display formatted output
          printf "  %-20s %s\n" "Hostname:" "$HOSTNAME"
          printf "  %-20s %s\n" "IP Address:" "$IP"
          printf "  %-20s %s\n" "Kernel:" "$KERNEL"
          printf "  %-20s %s\n" "Uptime:" "$UPTIME"
          printf "  %-20s %s\n" "Load Average:" "$LOAD"
          printf "  %-20s %s\n" "Memory:" "$MEMORY"
          printf "  %-20s %s\n" "Disk (/):" "$DISK"
          printf "  %-20s %s\n" "Processes:" "$PROCS"
          echo ""
      when: ansible_os_family == "Debian"

    - name: Create environment indicator script
      ansible.builtin.copy:
        dest: /etc/update-motd.d/30-environment
        mode: '0755'
        content: |
          #!/bin/bash
          # Environment indicator - managed by Ansible
          ENV="{{ server_env | default('unknown') }}"
          ROLE="{{ group_names[0] | default('server') }}"

          case $ENV in
            prod|production)
              echo "  Environment:       ** PRODUCTION **"
              ;;
            staging)
              echo "  Environment:       Staging"
              ;;
            dev|development)
              echo "  Environment:       Development"
              ;;
            *)
              echo "  Environment:       $ENV"
              ;;
          esac
          echo "  Role:              $ROLE"
          echo ""
      when: ansible_os_family == "Debian"
```

## MOTD for RHEL/CentOS Systems

RHEL-based systems do not use the update-motd.d structure by default. Here is how to handle them.

This playbook configures MOTD on RHEL systems using profile.d:

```yaml
# configure-motd-rhel.yml - MOTD for RHEL-based systems
---
- name: Configure MOTD on RHEL
  hosts: all
  become: true
  tasks:
    - name: Deploy static MOTD
      ansible.builtin.copy:
        dest: /etc/motd
        mode: '0644'
        content: |
          =============================================
          WARNING: Authorized access only
          All sessions are monitored and logged
          =============================================

    - name: Create dynamic MOTD script in profile.d
      ansible.builtin.copy:
        dest: /etc/profile.d/motd-sysinfo.sh
        mode: '0755'
        content: |
          #!/bin/bash
          # Dynamic system info at login - managed by Ansible
          # Only show for interactive sessions
          if [ -n "$PS1" ]; then
            HOSTNAME=$(hostname -f 2>/dev/null || hostname)
            UPTIME=$(uptime -p 2>/dev/null || uptime | awk -F'up ' '{print $2}' | awk -F',' '{print $1}')
            LOAD=$(cat /proc/loadavg | awk '{print $1, $2, $3}')
            MEM_TOTAL=$(free -h | awk '/^Mem:/{print $2}')
            MEM_USED=$(free -h | awk '/^Mem:/{print $3}')
            DISK_USE=$(df -h / | awk 'NR==2{print $5}')
            IP=$(hostname -I 2>/dev/null | awk '{print $1}')

            echo ""
            echo "  Host: $HOSTNAME ($IP)"
            echo "  Uptime: $UPTIME | Load: $LOAD"
            echo "  Memory: $MEM_USED / $MEM_TOTAL | Disk: $DISK_USE used"
            echo ""
          fi
      when: ansible_os_family == "RedHat"
```

## MOTD Templates with Jinja2

For more control, use a Jinja2 template that incorporates Ansible facts.

This playbook uses a template for a detailed MOTD:

```yaml
# configure-motd-template.yml - Template-based MOTD
---
- name: Configure Template-Based MOTD
  hosts: all
  become: true
  tasks:
    - name: Deploy MOTD from template
      ansible.builtin.template:
        src: motd.j2
        dest: /etc/motd
        owner: root
        group: root
        mode: '0644'
```

The Jinja2 template for the MOTD:

```jinja2
{# motd.j2 - Dynamic MOTD template #}
=============================================
  {{ inventory_hostname | upper }}
  {{ group_names | join(', ') }}
=============================================

  OS:        {{ ansible_distribution }} {{ ansible_distribution_version }}
  Kernel:    {{ ansible_kernel }}
  CPUs:      {{ ansible_processor_vcpus }}
  RAM:       {{ (ansible_memtotal_mb / 1024) | round(1) }} GB
  IP:        {{ ansible_default_ipv4.address | default('N/A') }}
{% if server_env is defined %}
  Env:       {{ server_env | upper }}
{% endif %}

  WARNING: Authorized use only.
  All activity is monitored and logged.

=============================================
Last updated by Ansible: {{ ansible_date_time.date }}
```

## Cleaning Up Third-Party MOTD Scripts

Ubuntu and other distributions come with MOTD scripts that display ads, upgrade notices, and other noise. Let us clean that up.

This playbook removes unwanted default MOTD scripts:

```yaml
# cleanup-motd.yml - Remove unwanted MOTD scripts
---
- name: Clean Up Default MOTD
  hosts: all
  become: true
  tasks:
    - name: Disable Ubuntu advertisement MOTD scripts
      ansible.builtin.file:
        path: "/etc/update-motd.d/{{ item }}"
        state: absent
      loop:
        - 10-help-text
        - 50-motd-news
        - 80-esm
        - 80-livepatch
        - 91-release-upgrade
        - 95-hwe-eol
        - 97-overlayroot
        - 98-fsck-at-reboot
        - 98-reboot-required
      failed_when: false
      when: ansible_os_family == "Debian"

    - name: Disable Ubuntu MOTD news fetching
      ansible.builtin.lineinfile:
        path: /etc/default/motd-news
        regexp: '^ENABLED='
        line: 'ENABLED=0'
      failed_when: false
      when: ansible_os_family == "Debian"

    - name: Remove dynamic MOTD cache
      ansible.builtin.file:
        path: /run/motd.dynamic
        state: absent
      failed_when: false
```

## MOTD Components

```mermaid
graph LR
    A[/etc/issue.net] --> B[Pre-Login Banner via SSH]
    C[/etc/motd] --> D[Static Post-Login Message]
    E[/etc/update-motd.d/] --> F[Dynamic Scripts]
    G[/etc/profile.d/] --> H[Shell Login Scripts]
    F --> I[Combined MOTD Output]
    D --> I
    I --> J[User Sees at Login]
    B --> K[User Sees Before Login]
```

A well-configured MOTD is a small detail that makes a big difference in daily operations. It tells you where you are, what environment you are in, and whether the system is healthy, all before you type a single command. With Ansible managing it, every server in your fleet gives you that same consistent experience.
