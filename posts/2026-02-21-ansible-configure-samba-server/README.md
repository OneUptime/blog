# How to Use Ansible to Configure Samba Server

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, Samba, File Sharing, Linux

Description: Configure Samba file shares on Linux servers using Ansible for cross-platform file sharing between Linux and Windows systems.

---

When you need to share files between Linux servers and Windows desktops, Samba is the standard answer. It implements the SMB/CIFS protocol that Windows uses natively, so Windows machines can access Linux shares without installing any extra software. Setting up Samba on one server is straightforward, but when you need consistent configurations across multiple file servers, with proper user management and share permissions, Ansible makes the whole process much cleaner.

This guide walks through setting up Samba with Ansible, from basic shares to Active Directory integration.

## Installing Samba

The first step is getting Samba installed and the services running:

```yaml
# install-samba.yml - Install Samba server and configure base services
---
- name: Install and configure Samba
  hosts: samba_servers
  become: true

  tasks:
    # Install Samba packages on RHEL/CentOS
    - name: Install Samba (RedHat)
      ansible.builtin.yum:
        name:
          - samba
          - samba-common
          - samba-client
        state: present
      when: ansible_os_family == "RedHat"

    # Install Samba packages on Debian/Ubuntu
    - name: Install Samba (Debian)
      ansible.builtin.apt:
        name:
          - samba
          - samba-common-bin
          - smbclient
        state: present
        update_cache: true
      when: ansible_os_family == "Debian"

    # Enable and start Samba services
    - name: Enable smbd service
      ansible.builtin.systemd:
        name: smb
        state: started
        enabled: true
      when: ansible_os_family == "RedHat"

    - name: Enable nmbd service
      ansible.builtin.systemd:
        name: nmb
        state: started
        enabled: true
      when: ansible_os_family == "RedHat"

    # Open firewall for Samba
    - name: Open Samba firewall ports
      ansible.posix.firewalld:
        service: samba
        permanent: true
        state: enabled
        immediate: true
      when: ansible_os_family == "RedHat"
      failed_when: false
```

## Configuring Samba Shares

The main configuration happens in `/etc/samba/smb.conf`. Here is a template-driven approach that handles multiple shares:

```yaml
# configure-samba.yml - Deploy Samba configuration with shares
---
- name: Configure Samba shares
  hosts: samba_servers
  become: true

  vars:
    samba_workgroup: WORKGROUP
    samba_server_string: "File Server managed by Ansible"
    samba_log_level: 1
    samba_max_log_size: 5000

    samba_shares:
      - name: public
        comment: "Public share for all users"
        path: /srv/samba/public
        browseable: "yes"
        writable: "yes"
        guest_ok: "yes"
        create_mask: "0664"
        directory_mask: "0775"

      - name: engineering
        comment: "Engineering team files"
        path: /srv/samba/engineering
        browseable: "yes"
        writable: "yes"
        guest_ok: "no"
        valid_users: "@engineering"
        create_mask: "0660"
        directory_mask: "0770"
        force_group: "engineering"

      - name: finance
        comment: "Finance department files"
        path: /srv/samba/finance
        browseable: "no"
        writable: "yes"
        guest_ok: "no"
        valid_users: "@finance"
        create_mask: "0660"
        directory_mask: "0770"
        force_group: "finance"

  tasks:
    # Create system groups for share access
    - name: Create share groups
      ansible.builtin.group:
        name: "{{ item }}"
        state: present
      loop:
        - engineering
        - finance

    # Create share directories
    - name: Create share directories
      ansible.builtin.file:
        path: "{{ item.path }}"
        state: directory
        owner: root
        group: "{{ item.force_group | default('root') }}"
        mode: "{{ item.directory_mask | default('0755') }}"
      loop: "{{ samba_shares }}"

    # Deploy smb.conf from template
    - name: Deploy Samba configuration
      ansible.builtin.template:
        src: smb.conf.j2
        dest: /etc/samba/smb.conf
        owner: root
        group: root
        mode: '0644'
        backup: true
        validate: "testparm -s %s"
      notify: restart samba

  handlers:
    - name: restart samba
      ansible.builtin.systemd:
        name: "{{ item }}"
        state: restarted
      loop:
        - smb
        - nmb
```

The Jinja2 template for smb.conf:

```jinja2
# smb.conf - Managed by Ansible
# Do not edit manually

[global]
    workgroup = {{ samba_workgroup }}
    server string = {{ samba_server_string }}
    security = user
    map to guest = Bad User

    # Logging
    log file = /var/log/samba/log.%m
    max log size = {{ samba_max_log_size }}
    log level = {{ samba_log_level }}

    # Performance tuning
    socket options = TCP_NODELAY IPTOS_LOWDELAY
    read raw = yes
    write raw = yes
    use sendfile = yes
    aio read size = 16384
    aio write size = 16384

    # Protocol settings
    server min protocol = SMB2
    server max protocol = SMB3

    # Disable printer sharing (almost never needed on a file server)
    load printers = no
    printing = bsd
    printcap name = /dev/null
    disable spoolss = yes

{% for share in samba_shares %}
[{{ share.name }}]
    comment = {{ share.comment }}
    path = {{ share.path }}
    browseable = {{ share.browseable }}
    writable = {{ share.writable }}
    guest ok = {{ share.guest_ok }}
    create mask = {{ share.create_mask | default('0644') }}
    directory mask = {{ share.directory_mask | default('0755') }}
{% if share.valid_users is defined %}
    valid users = {{ share.valid_users }}
{% endif %}
{% if share.force_group is defined %}
    force group = {{ share.force_group }}
{% endif %}

{% endfor %}
```

## Managing Samba Users

Samba maintains its own user database separate from Linux system users. Here is how to manage Samba users with Ansible:

```yaml
# manage-samba-users.yml - Create and manage Samba user accounts
---
- name: Manage Samba users
  hosts: samba_servers
  become: true

  vars:
    samba_users:
      - name: jsmith
        password: "{{ vault_jsmith_password }}"
        groups:
          - engineering
      - name: alee
        password: "{{ vault_alee_password }}"
        groups:
          - engineering
          - finance
      - name: bwong
        password: "{{ vault_bwong_password }}"
        groups:
          - finance

  tasks:
    # Create Linux system users (Samba users must also be system users)
    - name: Create system users for Samba
      ansible.builtin.user:
        name: "{{ item.name }}"
        groups: "{{ item.groups }}"
        shell: /sbin/nologin
        create_home: false
        state: present
      loop: "{{ samba_users }}"

    # Set Samba passwords using smbpasswd
    - name: Set Samba user passwords
      ansible.builtin.shell:
        cmd: "(echo '{{ item.password }}'; echo '{{ item.password }}') | smbpasswd -s -a {{ item.name }}"
      loop: "{{ samba_users }}"
      no_log: true
      changed_when: true

    # Enable the Samba accounts
    - name: Enable Samba user accounts
      ansible.builtin.command:
        cmd: "smbpasswd -e {{ item.name }}"
      loop: "{{ samba_users }}"
      changed_when: true
```

## Active Directory Integration

For enterprise environments, joining Samba to an Active Directory domain is the better approach. This avoids maintaining a separate user database:

```yaml
# samba-ad-join.yml - Join Samba to Active Directory domain
---
- name: Join Samba to Active Directory
  hosts: samba_servers
  become: true

  vars:
    ad_domain: corp.example.com
    ad_realm: CORP.EXAMPLE.COM
    ad_admin_user: administrator
    ad_admin_password: "{{ vault_ad_admin_password }}"

  tasks:
    # Install required packages for AD integration
    - name: Install AD integration packages
      ansible.builtin.yum:
        name:
          - samba-winbind
          - samba-winbind-clients
          - krb5-workstation
          - oddjob-mkhomedir
          - realmd
          - sssd
        state: present

    # Configure Kerberos for AD authentication
    - name: Configure krb5.conf
      ansible.builtin.template:
        src: krb5.conf.j2
        dest: /etc/krb5.conf
        mode: '0644'

    # Join the AD domain using realm
    - name: Check if already joined to domain
      ansible.builtin.command:
        cmd: realm list
      register: realm_status
      changed_when: false

    - name: Join Active Directory domain
      ansible.builtin.shell:
        cmd: "echo '{{ ad_admin_password }}' | realm join --user={{ ad_admin_user }} {{ ad_domain }}"
      when: ad_domain not in realm_status.stdout
      no_log: true

    # Update smb.conf for AD integration
    - name: Configure Samba for AD auth
      ansible.builtin.blockinfile:
        path: /etc/samba/smb.conf
        insertafter: '\[global\]'
        block: |
            # Active Directory integration
            security = ads
            realm = {{ ad_realm }}
            workgroup = {{ ad_domain.split('.')[0] | upper }}
            idmap config * : backend = tdb
            idmap config * : range = 10000-20000
            winbind use default domain = yes
            winbind enum users = yes
            winbind enum groups = yes
      notify: restart samba

  handlers:
    - name: restart samba
      ansible.builtin.systemd:
        name: "{{ item }}"
        state: restarted
      loop:
        - smb
        - nmb
        - winbind
```

## Monitoring and Auditing Samba

Keeping track of who is accessing what on your Samba shares:

```yaml
# audit-samba.yml - Monitor Samba connections and share access
---
- name: Audit Samba usage
  hosts: samba_servers
  become: true

  tasks:
    # Show current Samba connections
    - name: Show connected users
      ansible.builtin.command:
        cmd: smbstatus --shares
      register: smb_shares
      changed_when: false

    - name: Display active share connections
      ansible.builtin.debug:
        var: smb_shares.stdout_lines

    # Show locked files
    - name: Show locked files
      ansible.builtin.command:
        cmd: smbstatus --locks
      register: smb_locks
      changed_when: false

    - name: Display file locks
      ansible.builtin.debug:
        var: smb_locks.stdout_lines

    # Check Samba configuration for errors
    - name: Validate Samba configuration
      ansible.builtin.command:
        cmd: testparm -s
      register: testparm_output
      changed_when: false

    - name: Display configuration validation
      ansible.builtin.debug:
        var: testparm_output.stdout_lines

    # Check share disk usage
    - name: Get disk usage per share
      ansible.builtin.command:
        cmd: "du -sh {{ item.path }}"
      loop: "{{ samba_shares }}"
      register: share_usage
      changed_when: false

    - name: Display share sizes
      ansible.builtin.debug:
        msg: "{{ item.stdout }}"
      loop: "{{ share_usage.results }}"
      loop_control:
        label: "{{ item.item.name }}"
```

## Enabling Samba Audit Logging

For compliance requirements, you can enable detailed audit logging of file access:

```yaml
# samba-audit.yml - Enable VFS audit module for file access logging
---
- name: Configure Samba audit logging
  hosts: samba_servers
  become: true

  tasks:
    # Add VFS audit module to shares that need auditing
    - name: Add audit VFS object to finance share
      ansible.builtin.blockinfile:
        path: /etc/samba/smb.conf
        insertafter: '^\[finance\]'
        marker: "# {mark} ANSIBLE MANAGED AUDIT CONFIG"
        block: |
            vfs objects = full_audit
            full_audit:prefix = %u|%I|%m|%S
            full_audit:success = mkdir rmdir open read write rename unlink
            full_audit:failure = none
            full_audit:facility = local5
            full_audit:priority = notice
      notify: restart samba

    # Configure rsyslog to separate Samba audit logs
    - name: Configure rsyslog for Samba audit
      ansible.builtin.copy:
        dest: /etc/rsyslog.d/samba-audit.conf
        mode: '0644'
        content: |
          # Samba audit logs
          local5.notice    /var/log/samba/audit.log
      notify: restart rsyslog

  handlers:
    - name: restart samba
      ansible.builtin.systemd:
        name: smb
        state: restarted

    - name: restart rsyslog
      ansible.builtin.systemd:
        name: rsyslog
        state: restarted
```

## Tips for Production Samba Deployments

From years of running Samba in mixed Linux/Windows environments:

1. Set `server min protocol = SMB2` to disable SMBv1. It is slow, insecure, and has been the target of major vulnerabilities (remember WannaCry). There is no reason to keep it enabled unless you have ancient Windows XP machines.

2. Use `force group` on shares to avoid permission headaches. When multiple users write to the same share, files end up owned by different groups, which causes access issues. Forcing a group ensures consistent ownership.

3. Disable printer sharing unless you actually need it. Samba enables printer sharing by default, which creates unnecessary attack surface and generates confusing log messages.

4. Store Samba user passwords in Ansible Vault. The examples above use `vault_` prefixed variables that should come from encrypted vault files. Never store passwords in plain text.

5. Always validate your configuration with `testparm` before restarting Samba. A syntax error in smb.conf will prevent the service from starting, which means all connected users lose access immediately. The template task in the playbook above uses the `validate` parameter to catch this automatically.

Samba with Ansible gives you a well-documented, reproducible file sharing setup that bridges the gap between Linux and Windows. Treat the configuration as code, keep it in version control, and let Ansible handle the deployment.
