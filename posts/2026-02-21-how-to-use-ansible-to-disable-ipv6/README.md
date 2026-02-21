# How to Use Ansible to Disable IPv6

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, IPv6, Networking, Security, Linux

Description: Disable IPv6 across your Linux servers using Ansible when your network does not require it, reducing attack surface and simplifying configuration.

---

IPv6 is the future of networking, but many internal networks still run purely on IPv4. If you are not using IPv6 and it is enabled on your servers, you have an extra network stack that is potentially misconfigured and unmonitored. Attackers can use IPv6 to bypass IPv4-based security controls if it is left enabled without proper configuration.

Disabling IPv6 when you do not need it is a straightforward security win. In this post, I will show you how to use Ansible to disable IPv6 consistently across your fleet, with options for different approaches depending on your needs.

## When to Disable IPv6

Not every environment should disable IPv6. Here are some situations where disabling it makes sense:

- Your network infrastructure does not support IPv6
- Your firewalls only filter IPv4 traffic
- You have no IPv6 monitoring in place
- Your applications do not require IPv6
- Compliance requirements mandate reducing unnecessary services

And when you should leave it enabled:

- Your network uses dual-stack (IPv4 + IPv6)
- Cloud providers like AWS use IPv6 for internal services
- Applications specifically bind to IPv6 addresses

## Method 1: Disabling via Sysctl

The most common approach is using kernel parameters through sysctl. This disables IPv6 at runtime without needing to modify the kernel boot parameters.

This playbook disables IPv6 using sysctl parameters:

```yaml
# disable_ipv6_sysctl.yml - Disable IPv6 via sysctl
---
- name: Disable IPv6 via sysctl
  hosts: all
  become: true

  tasks:
    - name: Disable IPv6 on all interfaces
      ansible.posix.sysctl:
        name: "{{ item.key }}"
        value: "{{ item.value }}"
        sysctl_set: true
        state: present
        reload: true
        sysctl_file: /etc/sysctl.d/99-disable-ipv6.conf
      loop:
        - { key: "net.ipv6.conf.all.disable_ipv6", value: "1" }
        - { key: "net.ipv6.conf.default.disable_ipv6", value: "1" }
        - { key: "net.ipv6.conf.lo.disable_ipv6", value: "1" }

    - name: Verify IPv6 is disabled
      ansible.builtin.command: cat /proc/sys/net/ipv6/conf/all/disable_ipv6
      register: ipv6_status
      changed_when: false

    - name: Report IPv6 status
      ansible.builtin.debug:
        msg: "IPv6 disabled: {{ ipv6_status.stdout == '1' }}"
```

## Method 2: Disabling via GRUB

For a more thorough approach, you can disable IPv6 at the kernel level by adding boot parameters. This prevents the IPv6 kernel module from loading at all.

This playbook modifies GRUB to disable IPv6 at boot time:

```yaml
# disable_ipv6_grub.yml - Disable IPv6 via kernel boot parameters
---
- name: Disable IPv6 via GRUB
  hosts: all
  become: true

  tasks:
    - name: Add ipv6.disable to GRUB config (Debian/Ubuntu)
      ansible.builtin.lineinfile:
        path: /etc/default/grub
        regexp: '^GRUB_CMDLINE_LINUX_DEFAULT='
        line: 'GRUB_CMDLINE_LINUX_DEFAULT="quiet splash ipv6.disable=1"'
        backrefs: false
      register: grub_debian
      when: ansible_os_family == "Debian"

    - name: Add ipv6.disable to GRUB config (RHEL)
      ansible.builtin.lineinfile:
        path: /etc/default/grub
        regexp: '^GRUB_CMDLINE_LINUX='
        line: 'GRUB_CMDLINE_LINUX="crashkernel=auto ipv6.disable=1"'
        backrefs: false
      register: grub_rhel
      when: ansible_os_family == "RedHat"

    - name: Update GRUB (Debian/Ubuntu)
      ansible.builtin.command: update-grub
      when: grub_debian.changed | default(false)

    - name: Update GRUB (RHEL)
      ansible.builtin.command: grub2-mkconfig -o /boot/grub2/grub.cfg
      when: grub_rhel.changed | default(false)

    - name: Notify about required reboot
      ansible.builtin.debug:
        msg: "GRUB updated. Reboot required for IPv6 changes to take full effect."
      when: grub_debian.changed | default(false) or grub_rhel.changed | default(false)
```

## Method 3: Blacklisting the IPv6 Module

You can also prevent the IPv6 kernel module from loading via modprobe configuration.

This playbook blacklists the ipv6 kernel module:

```yaml
# disable_ipv6_modprobe.yml - Blacklist IPv6 kernel module
---
- name: Blacklist IPv6 module
  hosts: all
  become: true

  tasks:
    - name: Blacklist ipv6 module
      ansible.builtin.copy:
        content: |
          # Disable IPv6 - Managed by Ansible
          blacklist ipv6
          options ipv6 disable=1
        dest: /etc/modprobe.d/disable-ipv6.conf
        owner: root
        group: root
        mode: '0644'

    - name: Update initramfs (Debian)
      ansible.builtin.command: update-initramfs -u
      when: ansible_os_family == "Debian"
      changed_when: true

    - name: Update initramfs (RHEL)
      ansible.builtin.command: dracut --force
      when: ansible_os_family == "RedHat"
      changed_when: true
```

## Updating Service Configurations

After disabling IPv6, some services need their configurations updated to avoid binding errors or warnings.

This playbook updates common services to use IPv4 only:

```yaml
# update_services_ipv4.yml - Update services for IPv4-only operation
---
- name: Update services for IPv4 only
  hosts: all
  become: true

  tasks:
    - name: Configure SSH to use IPv4 only
      ansible.builtin.lineinfile:
        path: /etc/ssh/sshd_config
        regexp: "^#?AddressFamily"
        line: "AddressFamily inet"
      notify: restart sshd

    - name: Configure Postfix for IPv4 only
      ansible.builtin.lineinfile:
        path: /etc/postfix/main.cf
        regexp: "^inet_protocols"
        line: "inet_protocols = ipv4"
      when: "'postfix' in ansible_facts.services | default({})"
      notify: restart postfix
      failed_when: false

    - name: Update /etc/hosts to remove IPv6 entries
      ansible.builtin.lineinfile:
        path: /etc/hosts
        regexp: "^::1"
        state: absent

    - name: Configure NTP for IPv4 only
      ansible.builtin.lineinfile:
        path: /etc/ntp.conf
        regexp: "^restrict -6"
        state: absent
      failed_when: false

    - name: Configure systemd-resolved for IPv4
      ansible.builtin.lineinfile:
        path: /etc/systemd/resolved.conf
        regexp: "^#?DNSStubListenerExtra="
        line: "DNSStubListenerExtra=127.0.0.1"
      failed_when: false

  handlers:
    - name: restart sshd
      ansible.builtin.service:
        name: sshd
        state: restarted

    - name: restart postfix
      ansible.builtin.service:
        name: postfix
        state: restarted
```

## Combined Approach: Complete IPv6 Disable Role

Here is a role that combines all methods for thorough IPv6 disabling:

```yaml
# roles/disable_ipv6/defaults/main.yml
---
ipv6_disable_method: sysctl  # Options: sysctl, grub, modprobe, all
ipv6_update_services: true
ipv6_remove_hosts_entry: true
ipv6_services_to_update:
  - ssh
  - postfix
```

The main tasks file:

```yaml
# roles/disable_ipv6/tasks/main.yml
---
- name: Disable IPv6 via sysctl
  ansible.posix.sysctl:
    name: "{{ item.key }}"
    value: "{{ item.value }}"
    sysctl_set: true
    state: present
    reload: true
    sysctl_file: /etc/sysctl.d/99-disable-ipv6.conf
  loop:
    - { key: "net.ipv6.conf.all.disable_ipv6", value: "1" }
    - { key: "net.ipv6.conf.default.disable_ipv6", value: "1" }
    - { key: "net.ipv6.conf.lo.disable_ipv6", value: "1" }
  when: ipv6_disable_method in ['sysctl', 'all']

- name: Disable IPv6 in GRUB
  ansible.builtin.lineinfile:
    path: /etc/default/grub
    regexp: '^(GRUB_CMDLINE_LINUX_DEFAULT=".*)(")'
    line: '\1 ipv6.disable=1\2'
    backrefs: true
  register: grub_change
  when: ipv6_disable_method in ['grub', 'all']
  notify: update grub

- name: Blacklist IPv6 module
  ansible.builtin.copy:
    content: |
      blacklist ipv6
      options ipv6 disable=1
    dest: /etc/modprobe.d/disable-ipv6.conf
    mode: '0644'
  when: ipv6_disable_method in ['modprobe', 'all']

- name: Remove ::1 from /etc/hosts
  ansible.builtin.lineinfile:
    path: /etc/hosts
    regexp: "^::1"
    state: absent
  when: ipv6_remove_hosts_entry

- name: Update SSH for IPv4 only
  ansible.builtin.lineinfile:
    path: /etc/ssh/sshd_config
    regexp: "^#?AddressFamily"
    line: "AddressFamily inet"
  when: ipv6_update_services
  notify: restart sshd
```

## Verification Playbook

After making changes, verify that IPv6 is actually disabled:

```yaml
# verify_ipv6_disabled.yml - Confirm IPv6 is disabled
---
- name: Verify IPv6 is disabled
  hosts: all
  become: true

  tasks:
    - name: Check sysctl value
      ansible.builtin.command: sysctl net.ipv6.conf.all.disable_ipv6
      register: sysctl_check
      changed_when: false
      failed_when: false

    - name: Check for IPv6 addresses on interfaces
      ansible.builtin.shell: ip -6 addr show 2>/dev/null | grep -c inet6
      register: ipv6_addrs
      changed_when: false
      failed_when: false

    - name: Check if IPv6 module is loaded
      ansible.builtin.shell: lsmod | grep -c ipv6
      register: ipv6_module
      changed_when: false
      failed_when: false

    - name: Check for IPv6 listening sockets
      ansible.builtin.shell: ss -6 -tlnp 2>/dev/null | wc -l
      register: ipv6_sockets
      changed_when: false
      failed_when: false

    - name: Report IPv6 status
      ansible.builtin.debug:
        msg:
          - "Sysctl disable_ipv6: {{ sysctl_check.stdout | default('N/A') }}"
          - "IPv6 addresses found: {{ ipv6_addrs.stdout | default('0') }}"
          - "IPv6 module loaded: {{ 'yes' if (ipv6_module.stdout | default('0') | int > 0) else 'no' }}"
          - "IPv6 listening sockets: {{ ipv6_sockets.stdout | default('0') }}"
```

## Things to Consider Before Disabling

1. **Check application requirements.** Some applications (like certain Java apps) require IPv6 to be enabled even if they only use IPv4. They may bind to `::1` (IPv6 loopback) by default.
2. **Docker and containers.** Docker uses IPv6 for internal bridge networking in some configurations. Disabling IPv6 on the host can cause container networking issues.
3. **Cloud environments.** AWS, GCP, and Azure use IPv6 for some internal services. Check your provider's documentation before disabling.
4. **Test first.** Always test on a non-production server. Some distributions have components that fail unexpectedly without IPv6.
5. **Reboot after GRUB/modprobe changes.** Sysctl changes take effect immediately, but kernel parameter and module blacklisting changes require a reboot.

Disabling IPv6 with Ansible is a quick security win for environments that do not use it. The key is choosing the right method for your situation and making sure all dependent services are updated to match.
