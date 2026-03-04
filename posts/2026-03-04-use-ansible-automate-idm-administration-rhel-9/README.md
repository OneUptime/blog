# How to Use Ansible to Automate IdM Administration on RHEL 9

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: RHEL, IdM, Ansible, Automation, Identity Management, Linux

Description: Learn how to use Ansible modules and roles to automate Red Hat Identity Management administration tasks on RHEL 9.

---

Managing IdM manually works for small environments, but as your infrastructure grows, automation becomes essential. The `ansible-freeipa` collection provides Ansible modules for managing every aspect of IdM, from user and group management to DNS, HBAC rules, and certificate operations.

## Installing ansible-freeipa

On your Ansible control node:

```bash
sudo dnf install ansible-freeipa
```

Or install from Ansible Galaxy:

```bash
ansible-galaxy collection install freeipa.ansible_freeipa
```

## Configuring the Inventory

```ini
# inventory/hosts
[ipaserver]
idm1.example.com

[ipareplicas]
idm2.example.com

[ipaclients]
client1.example.com
client2.example.com
client3.example.com

[ipaserver:vars]
ipaadmin_principal=admin
ipaadmin_password=AdminPassword
ipadm_password=DirectoryManagerPassword
```

For production, use Ansible Vault for passwords:

```bash
ansible-vault encrypt_string 'AdminPassword' --name 'ipaadmin_password'
```

## Managing Users

### Creating Users

```yaml
---
- name: Manage IdM users
  hosts: ipaserver
  become: false
  tasks:
    - name: Create users
      ipauser:
        ipaadmin_password: "{{ ipaadmin_password }}"
        name: "{{ item.login }}"
        first: "{{ item.first }}"
        last: "{{ item.last }}"
        email: "{{ item.email }}"
        state: present
      loop:
        - { login: jsmith, first: John, last: Smith, email: jsmith@example.com }
        - { login: jdoe, first: Jane, last: Doe, email: jdoe@example.com }
        - { login: awhite, first: Alice, last: White, email: awhite@example.com }
```

### Disabling Users

```yaml
    - name: Disable departed users
      ipauser:
        ipaadmin_password: "{{ ipaadmin_password }}"
        name: former_employee
        state: disabled
```

### Deleting Users

```yaml
    - name: Remove users
      ipauser:
        ipaadmin_password: "{{ ipaadmin_password }}"
        name: old_user
        state: absent
```

## Managing Groups

```yaml
---
- name: Manage IdM groups
  hosts: ipaserver
  become: false
  tasks:
    - name: Create groups
      ipagroup:
        ipaadmin_password: "{{ ipaadmin_password }}"
        name: developers
        description: "Development team"
        state: present

    - name: Add members to group
      ipagroup:
        ipaadmin_password: "{{ ipaadmin_password }}"
        name: developers
        user:
          - jsmith
          - jdoe
        action: member
        state: present
```

## Managing HBAC Rules

```yaml
---
- name: Configure HBAC rules
  hosts: ipaserver
  become: false
  tasks:
    - name: Create host groups
      ipahostgroup:
        ipaadmin_password: "{{ ipaadmin_password }}"
        name: webservers
        description: "Web server hosts"
        host:
          - web1.example.com
          - web2.example.com
        state: present

    - name: Create HBAC rule
      ipahbacrule:
        ipaadmin_password: "{{ ipaadmin_password }}"
        name: allow_webadmins
        description: "Allow web admins to access web servers"
        user:
          - jsmith
        hostgroup:
          - webservers
        hbacsvc:
          - sshd
          - sudo
        state: present

    - name: Disable allow_all rule
      ipahbacrule:
        ipaadmin_password: "{{ ipaadmin_password }}"
        name: allow_all
        state: disabled
```

## Managing DNS Records

```yaml
---
- name: Manage IdM DNS
  hosts: ipaserver
  become: false
  tasks:
    - name: Add DNS records
      ipadnsrecord:
        ipaadmin_password: "{{ ipaadmin_password }}"
        zone_name: example.com
        name: newserver
        a_rec: 192.168.1.50
        state: present

    - name: Add CNAME record
      ipadnsrecord:
        ipaadmin_password: "{{ ipaadmin_password }}"
        zone_name: example.com
        name: www
        cname_rec: web1.example.com.
        state: present
```

## Enrolling Clients

```yaml
---
- name: Enroll IdM clients
  hosts: ipaclients
  become: true
  roles:
    - role: ipaclient
      state: present
  vars:
    ipaclient_domain: example.com
    ipaclient_realm: EXAMPLE.COM
    ipasssd_enable_dns_updates: true
    ipaclient_mkhomedir: true
    ipaadmin_principal: admin
    ipaadmin_password: "{{ ipaadmin_password }}"
```

## Managing sudo Rules

```yaml
---
- name: Configure sudo rules
  hosts: ipaserver
  become: false
  tasks:
    - name: Create sudo rule
      ipasudorule:
        ipaadmin_password: "{{ ipaadmin_password }}"
        name: developers-sudo
        description: "Sudo access for developers"
        user:
          - developers
        host:
          - devservers
        sudocmd:
          - /usr/bin/systemctl
          - /usr/bin/journalctl
        runasuser:
          - root
        state: present
```

## Managing Password Policies

```yaml
---
- name: Configure password policies
  hosts: ipaserver
  become: false
  tasks:
    - name: Set global password policy
      ipapwpolicy:
        ipaadmin_password: "{{ ipaadmin_password }}"
        maxlife: 90
        minlife: 1
        history: 12
        minlength: 14
        minclasses: 3
        maxfail: 5
        failinterval: 60
        lockouttime: 600
```

## Complete Playbook Example

```yaml
---
- name: Complete IdM configuration
  hosts: ipaserver
  become: false
  vars_files:
    - vault.yml
  tasks:
    - name: Create user groups
      ipagroup:
        ipaadmin_password: "{{ ipaadmin_password }}"
        name: "{{ item.name }}"
        description: "{{ item.desc }}"
      loop:
        - { name: developers, desc: "Development team" }
        - { name: operations, desc: "Operations team" }
        - { name: security, desc: "Security team" }

    - name: Create users from variable list
      ipauser:
        ipaadmin_password: "{{ ipaadmin_password }}"
        name: "{{ item.login }}"
        first: "{{ item.first }}"
        last: "{{ item.last }}"
        email: "{{ item.email }}"
      loop: "{{ idm_users }}"

    - name: Assign users to groups
      ipagroup:
        ipaadmin_password: "{{ ipaadmin_password }}"
        name: "{{ item.group }}"
        user: "{{ item.members }}"
        action: member
      loop: "{{ group_memberships }}"
```

## Summary

The ansible-freeipa collection provides comprehensive Ansible modules for automating IdM administration on RHEL 9. Use `ipauser` and `ipagroup` for identity management, `ipahbacrule` for access control, `ipadnsrecord` for DNS, and the `ipaclient` role for client enrollment. Combine with Ansible Vault for secure credential management and version-controlled playbooks for reproducible IdM configuration across your infrastructure.
