# How to Use Ansible become with the Windows runas Plugin

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, Windows, runas, Privilege Escalation, DevOps

Description: Configure Ansible become with the runas plugin to execute tasks as different Windows users for service management and administration

---

Ansible is not just for Linux. If you manage Windows servers with Ansible, you will need privilege escalation there too. On Windows, the equivalent of sudo is `runas`, and Ansible supports it through the `runas` become plugin. This lets you run tasks as different Windows users, including the local Administrator, domain accounts, or service accounts.

This guide covers setting up Ansible become with runas for Windows hosts, including WinRM configuration, credential management, and common patterns.

## How Windows Privilege Escalation Differs from Linux

On Linux, `become` typically means "run this as root via sudo." On Windows, the model is different:

- There is no single "root" user. The equivalent is the local Administrator or a domain admin account.
- Windows uses access tokens and user impersonation rather than switching user contexts.
- The `runas` become plugin creates a new process under the target user's security context.
- UAC (User Account Control) adds another layer that does not exist on Linux.

## Prerequisites

Before using runas with Ansible, your Windows hosts need:

- WinRM enabled and configured for remote management
- PowerShell 3.0 or later
- The `pywinrm` Python package on the Ansible controller

```bash
# Install pywinrm on the Ansible controller
pip install pywinrm

# Or if using a requirements file
pip install pywinrm[credssp]
```

On the Windows host, enable WinRM:

```powershell
# Run on the Windows host in an elevated PowerShell prompt
# Enable WinRM with default settings
winrm quickconfig -q

# Allow basic authentication (for testing)
winrm set winrm/config/service/auth '@{Basic="true"}'

# Allow unencrypted traffic (for testing only - use HTTPS in production)
winrm set winrm/config/service '@{AllowUnencrypted="true"}'
```

## Inventory Configuration for Windows

Windows hosts use the `winrm` connection plugin instead of SSH.

```ini
# inventory/windows.ini
[windows_servers]
win1 ansible_host=192.168.1.100
win2 ansible_host=192.168.1.101

[windows_servers:vars]
ansible_connection=winrm
ansible_winrm_transport=ntlm
ansible_port=5986
ansible_winrm_server_cert_validation=ignore
ansible_user=ansible_svc@MYDOMAIN.COM
ansible_password={{ vault_windows_password }}
```

## Basic runas Configuration

The `runas` become method lets you execute tasks as a different Windows user.

```yaml
# playbooks/windows-basic.yml
# Run tasks as a different Windows user using runas
---
- name: Windows administration with runas
  hosts: windows_servers

  tasks:
    - name: Check current user identity
      ansible.windows.win_whoami:
      register: current_user

    - name: Display current user
      ansible.builtin.debug:
        msg: "Connected as {{ current_user.account.account_name }}"

    - name: Run task as local Administrator
      ansible.windows.win_command: whoami
      become: true
      become_method: runas
      become_user: Administrator
      become_pass: "{{ vault_admin_password }}"
      register: admin_user

    - name: Display admin user
      ansible.builtin.debug:
        msg: "Ran as {{ admin_user.stdout | trim }}"
```

## Setting runas at the Play Level

```yaml
# playbooks/windows-play-level.yml
# All tasks run as the local Administrator
---
- name: Windows server setup
  hosts: windows_servers
  become: true
  become_method: runas
  become_user: Administrator

  vars:
    ansible_become_pass: "{{ vault_admin_password }}"

  tasks:
    - name: Install IIS
      ansible.windows.win_feature:
        name: Web-Server
        state: present
        include_management_tools: true

    - name: Start IIS service
      ansible.windows.win_service:
        name: W3SVC
        state: started
        start_mode: auto

    - name: Create web application directory
      ansible.windows.win_file:
        path: C:\inetpub\myapp
        state: directory

    - name: Deploy application files
      ansible.windows.win_copy:
        src: files/myapp/
        dest: C:\inetpub\myapp\
```

## Running Tasks as Domain Users

In Active Directory environments, you can become domain users.

```yaml
# playbooks/windows-domain-user.yml
# Run tasks as a domain service account
---
- name: Manage with domain service account
  hosts: windows_servers

  tasks:
    - name: Run application setup as domain service account
      ansible.windows.win_command: C:\scripts\setup-app.ps1
      become: true
      become_method: runas
      become_user: MYDOMAIN\svc_myapp
      become_pass: "{{ vault_svc_password }}"
      become_flags: logon_type=batch

    - name: Configure scheduled task as domain admin
      community.windows.win_scheduled_task:
        name: NightlyBackup
        actions:
          - path: C:\scripts\backup.ps1
        triggers:
          - type: daily
            start_boundary: '2025-01-01T02:00:00'
        username: MYDOMAIN\svc_backup
        password: "{{ vault_backup_password }}"
        logon_type: password
      become: true
      become_method: runas
      become_user: MYDOMAIN\admin_user
      become_pass: "{{ vault_domain_admin_password }}"
```

## become_flags for Windows runas

The Windows runas plugin supports specific flags that control the logon type.

```yaml
# Different logon types for different scenarios
- name: Interactive logon (default)
  ansible.windows.win_command: whoami /all
  become: true
  become_method: runas
  become_user: Administrator
  become_pass: "{{ admin_pass }}"
  become_flags: logon_type=interactive

- name: Batch logon (for service accounts)
  ansible.windows.win_command: C:\scripts\batch-job.ps1
  become: true
  become_method: runas
  become_user: MYDOMAIN\svc_batch
  become_pass: "{{ svc_pass }}"
  become_flags: logon_type=batch

- name: Network logon (for accessing network resources)
  ansible.windows.win_command: net use \\fileserver\share
  become: true
  become_method: runas
  become_user: MYDOMAIN\net_user
  become_pass: "{{ net_pass }}"
  become_flags: logon_type=new_credentials logon_flags=netcredentials_only
```

The `logon_type` options:

- `interactive` (default) - Normal interactive logon
- `batch` - For scheduled tasks and service accounts
- `new_credentials` - For accessing remote network resources with different credentials

## Managing Windows Services with runas

```yaml
# playbooks/windows-services.yml
# Manage Windows services with proper user context
---
- name: Manage Windows services
  hosts: windows_servers
  become: true
  become_method: runas
  become_user: Administrator
  vars:
    ansible_become_pass: "{{ vault_admin_password }}"

  tasks:
    - name: Configure application service
      ansible.windows.win_service:
        name: MyAppService
        path: C:\myapp\myapp.exe
        start_mode: auto
        state: started
        username: .\svc_myapp
        password: "{{ vault_svc_myapp_password }}"
        display_name: My Application Service
        description: Runs the MyApp application

    - name: Configure service recovery options
      ansible.windows.win_command: >
        sc.exe failure MyAppService reset= 86400 actions= restart/60000/restart/60000/restart/60000

    - name: Verify service status
      ansible.windows.win_service_info:
        name: MyAppService
      register: service_info

    - name: Show service details
      ansible.builtin.debug:
        msg: "Service state: {{ service_info.services[0].state }}, User: {{ service_info.services[0].username }}"
```

## Storing Windows Passwords Securely

Never put Windows passwords in plaintext. Use Ansible Vault.

```bash
# Create encrypted vault file for Windows credentials
ansible-vault create group_vars/windows_servers/vault.yml
```

```yaml
# group_vars/windows_servers/vault.yml (encrypted)
vault_admin_password: "AdminP@ssw0rd"
vault_svc_password: "Svc@cc0untP@ss"
vault_domain_admin_password: "D0m@inAdm1n"
```

```yaml
# group_vars/windows_servers/main.yml (references vault)
ansible_become_pass: "{{ vault_admin_password }}"
```

## Handling UAC (User Account Control)

UAC can interfere with runas because even Administrator accounts get filtered tokens by default.

```yaml
# playbooks/windows-uac.yml
# Handle UAC when using runas
---
- name: Tasks that need full admin token
  hosts: windows_servers
  become: true
  become_method: runas
  become_user: Administrator
  vars:
    ansible_become_pass: "{{ vault_admin_password }}"

  tasks:
    - name: Disable UAC for the ansible_svc account (not recommended for all users)
      ansible.windows.win_regedit:
        path: HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\Policies\System
        name: EnableLUA
        data: 0
        type: dword

    - name: Or better - configure UAC to not filter admin tokens
      ansible.windows.win_regedit:
        path: HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\Policies\System
        name: LocalAccountTokenFilterPolicy
        data: 1
        type: dword
```

The `LocalAccountTokenFilterPolicy` registry value is the more targeted fix. When set to 1, it allows local admin accounts to get full admin tokens over remote connections.

## Troubleshooting runas Issues

```yaml
# playbooks/diagnose-windows-become.yml
# Diagnose runas issues on Windows hosts
---
- name: Diagnose Windows become
  hosts: windows_servers
  gather_facts: false

  tasks:
    - name: Test without become
      ansible.windows.win_whoami:
      register: no_become

    - name: Show base user
      ansible.builtin.debug:
        msg: "Without become: {{ no_become.account.account_name }}"

    - name: Test with runas
      ansible.windows.win_whoami:
      become: true
      become_method: runas
      become_user: Administrator
      become_pass: "{{ vault_admin_password }}"
      register: with_become
      ignore_errors: true

    - name: Show runas user
      ansible.builtin.debug:
        msg: "With become: {{ with_become.account.account_name | default('FAILED') }}"

    - name: Check if user has right to log on locally
      ansible.windows.win_command: whoami /priv
      become: true
      become_method: runas
      become_user: Administrator
      become_pass: "{{ vault_admin_password }}"
      register: privs
      ignore_errors: true
```

Common errors and fixes:

- "The user name or password is incorrect" - Verify the credentials are correct
- "User account restrictions" - The account might be disabled or locked
- "Logon type not granted" - The target user does not have the "Log on as a batch job" right (for batch logon type)
- "Access is denied" - UAC is filtering the token, apply the registry fix above

The Windows runas become plugin gives you the same flexibility on Windows that sudo gives you on Linux. Combined with Ansible Vault for credential management, you can build secure, automated Windows management workflows that respect user isolation and the principle of least privilege.
