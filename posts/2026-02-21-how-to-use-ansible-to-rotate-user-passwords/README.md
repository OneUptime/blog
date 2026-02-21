# How to Use Ansible to Rotate User Passwords

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, Security, Password Management, Linux Administration

Description: Learn how to automate user password rotation across your infrastructure using Ansible playbooks with hashed passwords and vault encryption.

---

Password rotation is one of those tasks that nobody enjoys doing manually. If you manage more than a handful of servers, changing passwords by hand is not just tedious but also error-prone. Ansible gives you a solid way to automate this process while keeping things secure with Ansible Vault.

In this guide, I will walk through building a complete password rotation workflow that handles hashing, distribution, and verification across your fleet.

## Why Automate Password Rotation?

Most compliance frameworks (SOC 2, PCI-DSS, HIPAA) require regular password changes. Doing this manually on 50 or 500 servers is a recipe for missed machines, inconsistent passwords, and frustration. Ansible lets you define the desired state once and push it everywhere.

## Prerequisites

You need Ansible 2.9 or later installed on your control node. You also need the `passlib` Python library for password hashing.

Install passlib on your control node:

```bash
# Install passlib for password hash generation
pip install passlib
```

## Basic Password Rotation Playbook

The simplest approach uses the `user` module with a pre-hashed password. Never put plaintext passwords in your playbooks.

```yaml
# rotate_passwords.yml - Basic password rotation for a single user
---
- name: Rotate user passwords
  hosts: all
  become: yes
  vars:
    target_user: deploy
    # This hash is generated with: python3 -c "from passlib.hash import sha512_crypt; print(sha512_crypt.hash('newpassword123'))"
    new_password_hash: "$6$rounds=656000$randomsalt$hashedvaluehere"

  tasks:
    - name: Update password for target user
      ansible.builtin.user:
        name: "{{ target_user }}"
        password: "{{ new_password_hash }}"
        update_password: always
```

This works, but hardcoding a password hash in a playbook is not great practice. Let's improve this.

## Using Ansible Vault for Secure Storage

Ansible Vault lets you encrypt sensitive data. Create a vault file to store your passwords.

```bash
# Create an encrypted vault file for password storage
ansible-vault create vars/passwords.yml
```

Inside the vault file, define your passwords:

```yaml
# vars/passwords.yml (encrypted with ansible-vault)
vault_deploy_password: "S3cur3P@ssw0rd2026"
vault_admin_password: "Adm1nP@ss2026!#"
vault_monitoring_password: "M0n1t0r1ng2026$$"
```

Now reference these in your playbook with proper hashing:

```yaml
# rotate_passwords_vault.yml - Password rotation using vault-encrypted passwords
---
- name: Rotate user passwords securely
  hosts: all
  become: yes
  vars_files:
    - vars/passwords.yml

  tasks:
    - name: Rotate deploy user password
      ansible.builtin.user:
        name: deploy
        password: "{{ vault_deploy_password | password_hash('sha512', 'staticsalt') }}"
        update_password: always

    - name: Rotate admin user password
      ansible.builtin.user:
        name: admin
        password: "{{ vault_admin_password | password_hash('sha512', 'staticsalt') }}"
        update_password: always

    - name: Rotate monitoring user password
      ansible.builtin.user:
        name: monitoring
        password: "{{ vault_monitoring_password | password_hash('sha512', 'staticsalt') }}"
        update_password: always
```

Run it with:

```bash
# Execute the playbook, prompting for the vault password
ansible-playbook rotate_passwords_vault.yml --ask-vault-pass
```

## Rotating Passwords for Multiple Users with a Loop

When you have many users, loops keep things clean.

```yaml
# rotate_multi_user.yml - Rotate passwords for multiple users using a loop
---
- name: Rotate passwords for multiple users
  hosts: all
  become: yes
  vars_files:
    - vars/passwords.yml

  vars:
    users_to_rotate:
      - name: deploy
        password: "{{ vault_deploy_password }}"
      - name: admin
        password: "{{ vault_admin_password }}"
      - name: monitoring
        password: "{{ vault_monitoring_password }}"

  tasks:
    - name: Rotate passwords for all specified users
      ansible.builtin.user:
        name: "{{ item.name }}"
        password: "{{ item.password | password_hash('sha512') }}"
        update_password: always
      loop: "{{ users_to_rotate }}"
      loop_control:
        label: "{{ item.name }}"
      no_log: true
```

The `no_log: true` directive prevents passwords from showing up in Ansible output. The `loop_control` with `label` shows the username without dumping the password variable.

## Generating Random Passwords

Sometimes you want Ansible to generate passwords rather than specifying them. The `password` lookup plugin handles this.

```yaml
# rotate_random.yml - Generate and apply random passwords per host
---
- name: Rotate with randomly generated passwords
  hosts: all
  become: yes

  tasks:
    - name: Generate and set random password for deploy user
      ansible.builtin.user:
        name: deploy
        password: "{{ lookup('password', 'credentials/' + inventory_hostname + '/deploy length=20 chars=ascii_letters,digits,punctuation') | password_hash('sha512') }}"
        update_password: always
      no_log: true

    - name: Store the generated password reference
      ansible.builtin.debug:
        msg: "Password for {{ inventory_hostname }} stored in credentials/{{ inventory_hostname }}/deploy"
      delegate_to: localhost
      run_once: false
```

This creates unique passwords per host and stores them locally in the `credentials/` directory. Each file contains the plaintext password for reference.

## Forcing Password Expiry After Rotation

After rotating passwords, you might want to force users to change their password on next login.

```yaml
# rotate_and_expire.yml - Rotate password and force change on next login
---
- name: Rotate passwords and enforce immediate expiry
  hosts: all
  become: yes
  vars_files:
    - vars/passwords.yml

  tasks:
    - name: Set new password for deploy user
      ansible.builtin.user:
        name: deploy
        password: "{{ vault_deploy_password | password_hash('sha512') }}"
        update_password: always
      no_log: true

    - name: Force password change on next login
      ansible.builtin.command:
        cmd: chage -d 0 deploy
      changed_when: true
```

## Verifying Password Rotation

After rotating passwords, verify that the change took effect.

```yaml
# verify_rotation.yml - Verify that passwords were actually changed
---
- name: Verify password rotation
  hosts: all
  become: yes

  tasks:
    - name: Get password last changed date
      ansible.builtin.command:
        cmd: chage -l deploy
      register: chage_output
      changed_when: false

    - name: Display password change info
      ansible.builtin.debug:
        msg: "{{ chage_output.stdout_lines }}"

    - name: Check shadow file for password hash update
      ansible.builtin.command:
        cmd: "getent shadow deploy"
      register: shadow_entry
      changed_when: false
      no_log: true

    - name: Confirm password hash is not empty
      ansible.builtin.assert:
        that:
          - shadow_entry.stdout.split(':')[1] | length > 0
          - shadow_entry.stdout.split(':')[1] != '!'
          - shadow_entry.stdout.split(':')[1] != '*'
        fail_msg: "Password for deploy user appears to be locked or empty"
        success_msg: "Password hash verified for deploy user"
```

## Building a Complete Rotation Role

For production use, organize this into an Ansible role.

```
roles/password_rotation/
  tasks/
    main.yml
  defaults/
    main.yml
  vars/
    main.yml
```

The defaults file:

```yaml
# roles/password_rotation/defaults/main.yml
password_rotation_users: []
password_rotation_force_change: false
password_rotation_hash_algorithm: sha512
```

The main tasks file:

```yaml
# roles/password_rotation/tasks/main.yml
---
- name: Rotate password for each user
  ansible.builtin.user:
    name: "{{ item.name }}"
    password: "{{ item.password | password_hash(password_rotation_hash_algorithm) }}"
    update_password: always
  loop: "{{ password_rotation_users }}"
  loop_control:
    label: "{{ item.name }}"
  no_log: true

- name: Force password change on next login if required
  ansible.builtin.command:
    cmd: "chage -d 0 {{ item.name }}"
  loop: "{{ password_rotation_users }}"
  loop_control:
    label: "{{ item.name }}"
  when: password_rotation_force_change
  changed_when: true
```

## Scheduling Automated Rotation

Combine your playbook with cron or a CI/CD pipeline to run rotations on a schedule. Here is a simple cron entry:

```bash
# Run password rotation on the first day of every month at 2 AM
0 2 1 * * cd /opt/ansible && ansible-playbook rotate_passwords_vault.yml --vault-password-file /opt/ansible/.vault_pass
```

Make sure the vault password file has strict permissions:

```bash
# Lock down the vault password file
chmod 600 /opt/ansible/.vault_pass
chown root:root /opt/ansible/.vault_pass
```

## Key Takeaways

Password rotation with Ansible is straightforward once you have the right pieces in place. Always use Ansible Vault for storing passwords, always hash passwords before setting them (the `password_hash` filter handles this), and always use `no_log: true` to keep credentials out of your logs.

The combination of vault encryption, the `user` module, and the `password_hash` filter gives you a secure, repeatable, and auditable password rotation process that scales from a few servers to thousands.
