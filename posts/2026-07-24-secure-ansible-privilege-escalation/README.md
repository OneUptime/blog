# Secure Ansible Privilege Escalation with become, Sudo, and Dedicated Accounts

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, Security, Privilege Escalation, Sudo, Automation

Description: Design Ansible access with separate login and elevated identities, controlled sudo policy, protected credentials, and auditable accounts.

---

Ansible needs elevated privileges for tasks such as installing packages and writing system configuration, but logging in directly as root makes access hard to scope and audit. A stronger design separates authentication from elevation:

1. Ansible connects as a dedicated automation account.
2. Unprivileged tasks remain unprivileged.
3. Only tasks that require elevation use `become`.
4. The operating system's sudo policy decides whether that transition is allowed.

`become` is an Ansible abstraction over privilege-escalation methods. On typical Linux hosts the method is `sudo`, but the connection account, become account, method, and password are distinct settings.

## Keep the Two Identities Clear

```yaml
- name: Configure application hosts
  hosts: app
  remote_user: ansible_deploy
  tasks:
    - name: Read an unprivileged application status
      ansible.builtin.command:
        cmd: /opt/myapp/bin/status
      changed_when: false

    - name: Install the application package
      become: true
      become_user: root
      ansible.builtin.package:
        name: myapp
        state: present
```

`remote_user` or the inventory variable `ansible_user` selects the SSH login account. `become_user` selects the account used after escalation. Setting `become_user` alone does not enable escalation; `become: true` does.

A common inventory baseline is:

```yaml
linux:
  vars:
    ansible_user: ansible_deploy
    ansible_become_method: sudo
```

Avoid setting `ansible_become: true` globally unless nearly every task genuinely requires it. Task-level or block-level elevation gives reviewers a visible privilege boundary.

## Create a Dedicated Automation Account

Do not reuse a developer's personal account. A dedicated identity provides:

- an independent SSH key lifecycle
- a clear audit subject in SSH and sudo logs
- simpler revocation without affecting a person
- predictable home, shell, and group membership
- policy that can differ by environment

Provision the account through an image pipeline, cloud-init, or a controlled bootstrap process:

```yaml
- name: Create the automation account
  become: true
  ansible.builtin.user:
    name: ansible_deploy
    comment: Ansible automation account
    create_home: true
    shell: /bin/bash
    state: present

- name: Install the automation public key
  become: true
  ansible.posix.authorized_key:
    user: ansible_deploy
    key: "{{ automation_public_key }}"
    state: present
```

The `authorized_key` task requires the `ansible.posix` collection, which is not included in `ansible-core`.

Protect the private key in a credential system. Give separate keys or credentials to production and non-production rather than one universal identity.

## Understand the Limits of Command Allowlisting

It is tempting to permit only `/usr/bin/apt`, `/usr/bin/systemctl`, and a few other commands in `sudoers`. Ansible's privilege-escalation documentation warns that this is difficult for normal modules because Ansible executes temporary module code with changing file names. Allowing the target Python interpreter through sudo can effectively allow arbitrary Python code as root, which is not narrow command control.

This leaves three realistic designs:

- Allow broad sudo for a tightly controlled automation account, then constrain who can use its credential and which reviewed playbooks can run.
- Write purpose-built privileged wrappers with fixed paths and strictly validated arguments, then invoke them explicitly through sudo from a non-`become` task. Standard Ansible `become` asks sudo to execute Ansible's generated module command, not the wrapper path.
- Avoid host elevation by moving privileged changes into image construction or another controlled system.

Do not claim least privilege while granting `NOPASSWD: /usr/bin/python3`; assess what that permission actually enables.

## Configure Sudo Explicitly

Manage a drop-in and validate it before installation:

```sudoers
# /etc/sudoers.d/ansible_deploy
Defaults:ansible_deploy !requiretty
ansible_deploy ALL=(root) NOPASSWD: ALL
```

This example is operationally broad. Its security depends on strong control over the account's SSH credential, source repositories, CI or AWX permissions, and playbook review. If your environment requires password-backed sudo, omit `NOPASSWD` and supply the become password through a protected runtime mechanism.

With `NOPASSWD: ALL`, any process running as `ansible_deploy` can call sudo directly. Task-level `become` remains a useful review boundary, but it is not an enforcement boundary against code that has already compromised this account.

Always validate sudoers syntax:

```bash
visudo -cf /etc/sudoers.d/ansible_deploy
sudo -l -U ansible_deploy
```

When automating the file, use module validation:

```yaml
- name: Install validated sudo policy
  become: true
  ansible.builtin.copy:
    src: ansible_deploy.sudoers
    dest: /etc/sudoers.d/ansible_deploy
    owner: root
    group: root
    mode: "0440"
    validate: /usr/sbin/visudo -cf %s
```

Use the `sudoers` manual for command tags and matching semantics. Test the policy on every supported operating system because command paths and sudo builds differ.

## Handle Become Passwords Safely

For an interactive run:

```bash
ansible-playbook -i inventories/production site.yml \
  --ask-become-pass
```

For unattended automation, provide the password through a supported credential store, an encrypted Ansible Vault variable, or the automation platform's machine credential. Do not commit this:

```yaml
ansible_become_password: plain-text-password
```

If inventory must reference a vaulted value, keep the variable encrypted and suppress tasks that could expose it. Ansible Vault protects data at rest only; after decryption, normal output controls still matter.

Do not pass become passwords through shell command arguments. They can appear in process listings, CI traces, and shell history.

## Elevate the Smallest Useful Scope

Group related privileged tasks in a named block:

```yaml
- name: Install system-level application resources
  become: true
  block:
    - name: Install package
      ansible.builtin.package:
        name: myapp
        state: present

    - name: Install service configuration
      ansible.builtin.template:
        src: myapp.service.j2
        dest: /etc/systemd/system/myapp.service
        owner: root
        group: root
        mode: "0644"
      notify:
        - Reload systemd
        - Restart myapp
```

Keep API calls, controller-side lookups, assertions, and read-only application commands outside the block when they do not need root. This improves review. It also limits privileges when the sudo policy itself enforces a boundary, but not with the broad `NOPASSWD: ALL` policy shown above.

## Account for Environment Changes

Sudo commonly resets environment variables and applies a `secure_path`. A command that works during an interactive login may disappear under `become`.

Prefer absolute executable paths for custom tools:

```yaml
- name: Run the privileged maintenance command
  become: true
  ansible.builtin.command:
    cmd: /opt/myapp/bin/maintenance --compact
```

If an environment value is required, declare it on the task:

```yaml
- name: Run migration with an explicit environment
  become: true
  ansible.builtin.command:
    cmd: /opt/myapp/bin/migrate
  environment:
    APP_ENV: production
```

Do not preserve an entire caller environment just for convenience. It may include unsafe `PATH`, library paths, proxies, or credentials.

## Consider Pipelining and Temporary Files

Ansible normally transfers module code to a temporary location on the managed node. Pipelining can reduce network operations by executing supported modules without first saving their code to temporary files, and may improve performance and temporary-file handling. It does not avoid temporary files for modules that transfer files, such as `copy`, `fetch`, and `template`, or for non-Python modules. It is disabled by default and must be compatible with the connection plugin and sudo policy.

Sudo configurations that require a TTY conflict with pipelining. Automation accounts should not require an interactive TTY.

Ansible documents additional risks when both the connection user and `become_user` are unprivileged accounts. It may need POSIX ACLs, group sharing, or another mechanism so the second user can read the temporary module. Do not enable world-readable temporary files as a casual workaround. Review the privilege-escalation documentation for the exact platform and core version.

## Test the Boundary

Verify unprivileged and privileged identities separately:

```bash
ansible app-01 -i inventories/production \
  -m ansible.builtin.command -a 'id'

ansible app-01 -i inventories/production \
  --become \
  -m ansible.builtin.command -a 'id'
```

Then test denial. A playbook should fail when the automation account attempts an unapproved transition or target user.

Review:

- SSH authentication logs
- sudo logs or journal entries
- AWX or CI job ownership and credential access
- repository approvals for privileged roles
- key and password rotation
- removal of access when a host or environment is retired

## A Sustainable Security Model

Secure privilege escalation is not achieved by one `become: true` line. It is a chain:

```text
operator or service identity
  -> automation platform authorization
  -> protected SSH credential
  -> dedicated target account
  -> reviewed playbook
  -> explicit become boundary
  -> operating-system sudo policy
  -> host audit record
```

Treat every link as part of the control. A dedicated account with broad sudo can be appropriate when the upstream controls are strong and visible. A supposedly narrow sudo rule can be dangerous if it permits a general interpreter or attacker-controlled arguments.

## Official Documentation

- [Understanding privilege escalation: become](https://docs.ansible.com/projects/ansible/latest/playbook_guide/playbooks_privilege_escalation.html)
- [Become plugins](https://docs.ansible.com/projects/ansible/latest/plugins/become.html)
- [Connection methods and remote users](https://docs.ansible.com/projects/ansible/latest/inventory_guide/connection_details.html)
- [Ansible pipelining configuration](https://docs.ansible.com/projects/ansible/latest/reference_appendices/config.html#ansible-pipelining)
- [sudoers manual](https://www.sudo.ws/docs/man/sudoers.man/)
