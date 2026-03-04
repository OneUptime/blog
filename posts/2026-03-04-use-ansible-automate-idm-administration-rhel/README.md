# How to Use Ansible to Automate IdM Administration on RHEL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, IdM, Ansible, Automation, FreeIPA, Identity Management, Linux

Description: Learn how to use Ansible modules and roles to automate Red Hat Identity Management (IdM) administration tasks on RHEL, including user management, DNS, and client enrollment.

---

Red Hat provides official Ansible roles and modules for IdM (FreeIPA) automation. These allow you to manage users, groups, DNS records, HBAC rules, and even install IdM servers and clients through Ansible playbooks.

## Installing the Ansible IdM Collection

```bash
# Install the ansible-freeipa collection
sudo dnf install -y ansible-freeipa

# Or install via ansible-galaxy
ansible-galaxy collection install freeipa.ansible_freeipa
```

## Configuring Ansible Inventory

```ini
# inventory/hosts
[ipaserver]
idm1.example.com

[ipareplicas]
idm2.example.com

[ipaclients]
client1.example.com
client2.example.com

[ipaserver:vars]
ipaadmin_password=AdminPassword123
ipadm_password=DirectoryManagerPassword123
```

## Automating Client Enrollment

```yaml
# playbooks/enroll-clients.yml
---
- name: Enroll IdM clients
  hosts: ipaclients
  become: true
  roles:
    - role: ipaclient
      state: present
      ipaclient_domain: example.com
      ipaclient_realm: EXAMPLE.COM
      ipaclient_servers:
        - idm1.example.com
        - idm2.example.com
      ipaclient_mkhomedir: true
```

```bash
# Run the playbook
ansible-playbook -i inventory/hosts playbooks/enroll-clients.yml
```

## Managing Users with Ansible

```yaml
# playbooks/manage-users.yml
---
- name: Manage IdM users
  hosts: ipaserver
  become: false
  tasks:
    - name: Create users
      freeipa.ansible_freeipa.ipauser:
        ipaadmin_password: "{{ ipaadmin_password }}"
        name: "{{ item.login }}"
        first: "{{ item.first }}"
        last: "{{ item.last }}"
        email: "{{ item.email }}"
        state: present
      loop:
        - { login: jsmith, first: John, last: Smith, email: jsmith@example.com }
        - { login: jdoe, first: Jane, last: Doe, email: jdoe@example.com }

    - name: Create developer group
      freeipa.ansible_freeipa.ipagroup:
        ipaadmin_password: "{{ ipaadmin_password }}"
        name: developers
        user:
          - jsmith
          - jdoe
        state: present
```

## Managing HBAC Rules with Ansible

```yaml
# playbooks/hbac-rules.yml
---
- name: Configure HBAC rules
  hosts: ipaserver
  become: false
  tasks:
    - name: Create HBAC rule for developers
      freeipa.ansible_freeipa.ipahbacrule:
        ipaadmin_password: "{{ ipaadmin_password }}"
        name: dev-access
        description: "Developer access to dev servers"
        group:
          - developers
        hostgroup:
          - dev-servers
        hbacsvc:
          - sshd
        state: present
```

## Managing DNS Records

```yaml
# playbooks/dns-records.yml
---
- name: Manage DNS records
  hosts: ipaserver
  become: false
  tasks:
    - name: Add A records
      freeipa.ansible_freeipa.ipadnsrecord:
        ipaadmin_password: "{{ ipaadmin_password }}"
        zone_name: example.com
        name: webserver
        a_rec: 192.168.1.50
        state: present
```

Using Ansible for IdM administration ensures consistent, repeatable configurations across your identity infrastructure. Store your playbooks in version control to maintain an audit trail of all identity management changes.
