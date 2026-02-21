# How to Use Ansible become with LDAP/AD Authenticated Users

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, LDAP, Active Directory, Privilege Escalation, Security

Description: Configure Ansible become to work with LDAP and Active Directory authenticated users, including sudoers integration and timeout tuning.

---

Using Ansible in environments where users authenticate against LDAP or Active Directory introduces a set of challenges that do not exist when user accounts are local. The sudo operation now depends on a network call to a directory server, which can be slow, unreliable, or require special configuration. This post covers the practical side of making Ansible's become work reliably with LDAP/AD-backed user accounts.

## Why LDAP/AD Makes become Harder

When a user runs sudo on a system with local accounts, the authentication happens entirely on that machine. The system checks `/etc/shadow`, verifies the password, and moves on. The whole thing takes milliseconds.

With LDAP or AD authentication, the process looks very different:

1. Ansible connects via SSH using the LDAP/AD user
2. Ansible issues a sudo command
3. sudo calls PAM to verify the user
4. PAM calls the SSSD or nslcd daemon
5. SSSD/nslcd queries the LDAP or AD server over the network
6. The directory server checks the credentials and group memberships
7. The response travels back through the chain

Each of those network hops adds latency. If the directory server is in a different datacenter, or if there is a lot of traffic, the whole become operation can take 5 to 15 seconds instead of the usual fraction of a second.

## Configuring Timeouts for LDAP Environments

The default Ansible timeout is too short for LDAP-backed environments. Here is how to set appropriate timeouts.

In your ansible.cfg:

```ini
# ansible.cfg - Timeouts tuned for LDAP/AD environments
[defaults]
timeout = 60
gather_timeout = 30

[ssh_connection]
ssh_args = -o ServerAliveInterval=30 -o ServerAliveCountMax=3
```

Or set it per group in your inventory for hosts that use LDAP:

```yaml
# inventory.yml - Group-specific timeout for LDAP-backed hosts
all:
  children:
    ldap_hosts:
      hosts:
        app01.corp.example.com:
        app02.corp.example.com:
        db01.corp.example.com:
      vars:
        ansible_timeout: 60
        ansible_become: true
        ansible_become_method: sudo
        ansible_become_user: root
    local_hosts:
      hosts:
        dev01:
        dev02:
      vars:
        ansible_timeout: 10
```

## Configuring sudoers for LDAP/AD Groups

In most enterprise environments, sudo access is granted based on LDAP/AD group membership rather than individual usernames. This requires sudoers rules that reference groups.

Deploy sudoers rules that use AD group names:

```yaml
---
# configure-ad-sudoers.yml - Set up sudo rules for AD groups
- name: Configure sudoers for Active Directory groups
  hosts: ldap_hosts
  become: true
  tasks:
    - name: Create sudoers rule for AD Linux Admins group
      ansible.builtin.copy:
        content: |
          # Allow members of the AD "Linux Admins" group full sudo
          %linux\ admins ALL=(ALL) NOPASSWD: ALL
        dest: /etc/sudoers.d/ad-linux-admins
        owner: root
        group: root
        mode: '0440'
        validate: 'visudo -cf %s'

    - name: Create sudoers rule for AD DevOps group
      ansible.builtin.copy:
        content: |
          # Allow members of the AD "DevOps Engineers" group limited sudo
          %devops\ engineers ALL=(ALL) NOPASSWD: /usr/bin/systemctl, /usr/bin/docker, /usr/bin/journalctl
        dest: /etc/sudoers.d/ad-devops
        owner: root
        group: root
        mode: '0440'
        validate: 'visudo -cf %s'

    - name: Create sudoers rule for Ansible service account
      ansible.builtin.copy:
        content: |
          # Ansible service account - full access, no password, no tty required
          Defaults:svc_ansible !requiretty
          svc_ansible ALL=(ALL) NOPASSWD: ALL
        dest: /etc/sudoers.d/ansible-svc
        owner: root
        group: root
        mode: '0440'
        validate: 'visudo -cf %s'
```

Note the backslash-escaped spaces in group names. AD group names often contain spaces, and sudoers requires you to escape them.

## Using an LDAP/AD Service Account

For automation, it is best practice to use a dedicated service account rather than personal accounts. This account should be in a specific AD group and should have a password that does not expire (or has a very long expiration with automated rotation).

Configure the service account in your Ansible inventory:

```yaml
# inventory.yml - Using an AD service account
all:
  vars:
    ansible_user: svc_ansible
    ansible_become: true
    ansible_become_method: sudo
    ansible_become_user: root
  children:
    production:
      hosts:
        web[01:10].prod.example.com:
```

Store the SSH key or password for the service account in Ansible Vault:

```yaml
# group_vars/all/vault.yml (encrypted)
vault_ansible_ssh_pass: "ServiceAccountP@ssw0rd"
vault_ansible_become_pass: "ServiceAccountP@ssw0rd"
```

Reference it in your main variables:

```yaml
# group_vars/all/main.yml
ansible_ssh_pass: "{{ vault_ansible_ssh_pass }}"
ansible_become_pass: "{{ vault_ansible_become_pass }}"
```

## Handling SSSD Cache for Offline sudo

SSSD can cache credentials, which means sudo can work even if the LDAP/AD server is temporarily unreachable. This is important for reliability. Configure SSSD caching on your managed hosts:

```yaml
---
# configure-sssd-cache.yml - Enable SSSD caching for sudo
- name: Configure SSSD for cached sudo operations
  hosts: ldap_hosts
  become: true
  tasks:
    - name: Deploy SSSD configuration with caching
      ansible.builtin.template:
        src: templates/sssd.conf.j2
        dest: /etc/sssd/sssd.conf
        owner: root
        group: root
        mode: '0600'
      notify: restart sssd

    - name: Make sure SSSD is running
      ansible.builtin.systemd:
        name: sssd
        state: started
        enabled: true

  handlers:
    - name: restart sssd
      ansible.builtin.systemd:
        name: sssd
        state: restarted
```

The SSSD template with sudo caching enabled:

```ini
# templates/sssd.conf.j2
[sssd]
services = nss, pam, sudo
domains = {{ ad_domain | default('corp.example.com') }}

[nss]
filter_groups = root
filter_users = root

[pam]
offline_credentials_expiration = 7

[sudo]
# Cache sudo rules for 4 hours
sudo_cache_timeout = 14400

[domain/{{ ad_domain | default('corp.example.com') }}]
id_provider = ad
auth_provider = ad
access_provider = ad
sudo_provider = ad

# Cache settings
cache_credentials = True
entry_cache_timeout = 3600
entry_cache_sudo_timeout = 14400

# AD connection settings
ad_domain = {{ ad_domain | default('corp.example.com') }}
ad_server = {{ ad_server | default('dc01.corp.example.com') }}
krb5_realm = {{ krb5_realm | default('CORP.EXAMPLE.COM') }}

# Use POSIX attributes from AD
ldap_id_mapping = False
```

## Debugging LDAP/AD become Failures

When become fails with LDAP/AD users, the problem is usually in one of three places: DNS resolution, Kerberos tickets, or SSSD communication with the directory server.

Here is a diagnostic playbook:

```yaml
---
# debug-ldap-become.yml - Diagnose LDAP/AD become issues
- name: Debug LDAP/AD become problems
  hosts: problematic_hosts
  gather_facts: false
  tasks:
    - name: Test basic SSH connectivity
      ansible.builtin.ping:

    - name: Check current user identity
      ansible.builtin.command: id
      register: user_id
      changed_when: false

    - name: Show user identity (groups come from LDAP/AD)
      ansible.builtin.debug:
        msg: "{{ user_id.stdout }}"

    - name: Check if SSSD is running
      ansible.builtin.command: systemctl is-active sssd
      register: sssd_status
      changed_when: false
      failed_when: false
      become: true

    - name: Show SSSD status
      ansible.builtin.debug:
        msg: "SSSD: {{ sssd_status.stdout }}"

    - name: Check DNS resolution for AD server
      ansible.builtin.command: host {{ ad_server | default('dc01.corp.example.com') }}
      register: dns_check
      changed_when: false
      failed_when: false

    - name: Show DNS result
      ansible.builtin.debug:
        msg: "{{ dns_check.stdout }}"

    - name: Check Kerberos ticket
      ansible.builtin.command: klist
      register: kerberos_ticket
      changed_when: false
      failed_when: false

    - name: Show Kerberos ticket info
      ansible.builtin.debug:
        msg: "{{ kerberos_ticket.stdout_lines | default(['No Kerberos ticket found']) }}"

    - name: Test sudo access
      ansible.builtin.command: sudo -l
      register: sudo_access
      changed_when: false
      failed_when: false

    - name: Show sudo permissions
      ansible.builtin.debug:
        msg: "{{ sudo_access.stdout_lines }}"
      when: sudo_access.rc == 0

    - name: Show sudo error
      ansible.builtin.debug:
        msg: "sudo -l failed: {{ sudo_access.stderr }}"
      when: sudo_access.rc != 0
```

## Handling Kerberos Authentication

If your environment uses Kerberos (common with Active Directory), Ansible needs to either use a keytab file or have a valid ticket before running playbooks.

Set up Kerberos authentication for the service account:

```yaml
---
# setup-kerberos.yml - Configure Kerberos for Ansible service account
- name: Configure Kerberos authentication
  hosts: localhost
  connection: local
  tasks:
    - name: Initialize Kerberos ticket using keytab
      ansible.builtin.command: >
        kinit -kt /etc/ansible/svc_ansible.keytab
        svc_ansible@CORP.EXAMPLE.COM
      changed_when: true

    - name: Verify the ticket
      ansible.builtin.command: klist
      register: ticket_info
      changed_when: false

    - name: Show ticket info
      ansible.builtin.debug:
        msg: "{{ ticket_info.stdout_lines }}"
```

Then configure Ansible to use GSSAPI (Kerberos) authentication:

```ini
# ansible.cfg - Kerberos SSH authentication
[defaults]
timeout = 60

[ssh_connection]
ssh_args = -o GSSAPIAuthentication=yes -o GSSAPIDelegateCredentials=yes
```

## Performance Tips

Here are some things I have found that help reduce the impact of LDAP/AD on Ansible become performance:

Use SSH keys instead of passwords. This removes one round of LDAP authentication from the connection phase, so only the sudo step hits the directory server.

Enable SSSD caching aggressively. A 4-hour cache timeout for sudo rules means most playbook runs will not need to contact the AD server at all.

Use `gather_facts: false` on plays that do not need facts. Gathering facts runs several commands with become, each of which triggers an LDAP lookup.

Use forks conservatively. If you run 50 forks against hosts that all authenticate against the same AD server, you are hitting that server with 50 simultaneous authentication requests. Set forks to 10 or 15 for LDAP environments.

```ini
# ansible.cfg - Conservative settings for LDAP environments
[defaults]
forks = 10
timeout = 60
```

## Wrapping Up

LDAP/AD authenticated environments add an extra layer of complexity to Ansible's become mechanism, but it is manageable with the right configuration. Use a dedicated service account, set appropriate timeouts, enable SSSD caching, and make sure your sudoers rules handle AD group names correctly. Test your setup with the diagnostic playbook before running production workloads, and keep your SSSD cache warm so that temporary directory server outages do not bring your automation to a halt.
