# How to Use Ansible to Configure Windows Remote Desktop

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, Windows, Remote Desktop, RDP

Description: Automate Windows Remote Desktop configuration with Ansible including RDP settings, NLA, firewall rules, and security hardening.

---

Remote Desktop Protocol (RDP) is one of the most used features in Windows Server environments. System administrators rely on it for server management, helpdesk teams use it for remote support, and developers connect to test environments through it. But the default RDP configuration on Windows is not always ideal for production use. Security settings need tightening, access needs to be restricted, and session policies need to match your organization's requirements.

Ansible lets you configure every aspect of RDP across your Windows fleet in a consistent, auditable way. This post covers enabling RDP, hardening its security settings, managing access, and configuring session policies.

## Enabling Remote Desktop

On a fresh Windows Server install, RDP might be disabled. Here is how to enable it with Ansible:

```yaml
# playbook-enable-rdp.yml
# Enables Remote Desktop on Windows servers with basic security settings
- name: Enable Remote Desktop
  hosts: windows
  tasks:
    - name: Enable Remote Desktop via registry
      ansible.windows.win_regedit:
        path: HKLM:\SYSTEM\CurrentControlSet\Control\Terminal Server
        name: fDenyTSConnections
        data: 0
        type: dword
        state: present

    - name: Enable Network Level Authentication (NLA)
      ansible.windows.win_regedit:
        path: HKLM:\SYSTEM\CurrentControlSet\Control\Terminal Server\WinStations\RDP-Tcp
        name: UserAuthentication
        data: 1
        type: dword
        state: present

    - name: Allow RDP through Windows Firewall
      community.windows.win_firewall_rule:
        name: Remote Desktop - User Mode (TCP-In)
        localport: 3389
        action: allow
        direction: in
        protocol: tcp
        state: present
        enabled: yes

    - name: Start Remote Desktop Services
      ansible.windows.win_service:
        name: TermService
        state: started
        start_mode: auto
```

The key registry value is `fDenyTSConnections`: setting it to `0` enables RDP, and `1` disables it.

## Security Hardening

The default RDP configuration has several security weaknesses. Let's fix them.

### Enforce TLS Encryption

```yaml
# playbook-rdp-tls.yml
# Forces RDP connections to use TLS encryption
- name: Enforce TLS for RDP
  hosts: windows
  tasks:
    - name: Set security layer to TLS
      ansible.windows.win_regedit:
        path: HKLM:\SYSTEM\CurrentControlSet\Control\Terminal Server\WinStations\RDP-Tcp
        name: SecurityLayer
        data: 2
        type: dword
        state: present

    - name: Set minimum encryption level to High
      ansible.windows.win_regedit:
        path: HKLM:\SYSTEM\CurrentControlSet\Control\Terminal Server\WinStations\RDP-Tcp
        name: MinEncryptionLevel
        data: 3
        type: dword
        state: present
```

Security layer values:
- `0` = RDP Security Layer (least secure)
- `1` = Negotiate (tries TLS, falls back to RDP)
- `2` = TLS (most secure, required)

Encryption level values:
- `1` = Low
- `2` = Client Compatible
- `3` = High
- `4` = FIPS Compliant

### Change the Default RDP Port

Changing the default port from 3389 to something else is a simple way to reduce noise from automated scanners:

```yaml
# playbook-rdp-port.yml
# Changes the RDP listening port and updates firewall rules
- name: Change RDP port
  hosts: windows
  vars:
    rdp_port: 33890

  tasks:
    - name: Set new RDP port
      ansible.windows.win_regedit:
        path: HKLM:\SYSTEM\CurrentControlSet\Control\Terminal Server\WinStations\RDP-Tcp
        name: PortNumber
        data: "{{ rdp_port }}"
        type: dword
        state: present
      register: port_changed

    - name: Add firewall rule for new port
      community.windows.win_firewall_rule:
        name: "Remote Desktop - Custom Port (TCP-In)"
        localport: "{{ rdp_port }}"
        action: allow
        direction: in
        protocol: tcp
        state: present
        enabled: yes

    - name: Remove default port firewall rule
      community.windows.win_firewall_rule:
        name: Remote Desktop - User Mode (TCP-In)
        state: absent

    - name: Restart Remote Desktop Services to apply port change
      ansible.windows.win_service:
        name: TermService
        state: restarted
      when: port_changed.changed
```

## Managing RDP Access

Controlling who can connect via RDP is critical. By default, the local Administrators group has RDP access. You can add specific users or groups.

```yaml
# playbook-rdp-access.yml
# Configures which users and groups can access the server via RDP
- name: Manage RDP Access
  hosts: windows
  vars:
    rdp_allowed_groups:
      - DOMAIN\ServerAdmins
      - DOMAIN\HelpDesk
    rdp_allowed_users:
      - DOMAIN\jsmith

  tasks:
    - name: Add groups to Remote Desktop Users
      ansible.windows.win_group_membership:
        name: Remote Desktop Users
        members: "{{ rdp_allowed_groups + rdp_allowed_users }}"
        state: pure

    - name: Restrict RDP access via Group Policy registry setting
      ansible.windows.win_regedit:
        path: HKLM:\SOFTWARE\Policies\Microsoft\Windows NT\Terminal Services
        name: fPromptForPassword
        data: 1
        type: dword
        state: present
```

The `state: pure` parameter ensures that ONLY the specified accounts are members of the group. Any existing members not in the list will be removed.

## Session Configuration

RDP session settings control timeouts, reconnection behavior, and session limits.

```yaml
# playbook-rdp-sessions.yml
# Configures RDP session timeouts and limits
- name: Configure RDP Session Settings
  hosts: windows
  tasks:
    - name: Set idle session timeout to 30 minutes
      ansible.windows.win_regedit:
        path: HKLM:\SOFTWARE\Policies\Microsoft\Windows NT\Terminal Services
        name: MaxIdleTime
        data: 1800000
        type: dword
        state: present

    - name: Set disconnected session timeout to 60 minutes
      ansible.windows.win_regedit:
        path: HKLM:\SOFTWARE\Policies\Microsoft\Windows NT\Terminal Services
        name: MaxDisconnectionTime
        data: 3600000
        type: dword
        state: present

    - name: Set active session limit to 12 hours
      ansible.windows.win_regedit:
        path: HKLM:\SOFTWARE\Policies\Microsoft\Windows NT\Terminal Services
        name: MaxConnectionTime
        data: 43200000
        type: dword
        state: present

    - name: End disconnected sessions after timeout
      ansible.windows.win_regedit:
        path: HKLM:\SOFTWARE\Policies\Microsoft\Windows NT\Terminal Services
        name: fResetBroken
        data: 1
        type: dword
        state: present

    - name: Limit each user to a single session
      ansible.windows.win_regedit:
        path: HKLM:\SYSTEM\CurrentControlSet\Control\Terminal Server
        name: fSingleSessionPerUser
        data: 1
        type: dword
        state: present
```

Time values are in milliseconds. Here is a quick reference:

| Duration | Milliseconds |
|----------|-------------|
| 15 minutes | 900000 |
| 30 minutes | 1800000 |
| 1 hour | 3600000 |
| 4 hours | 14400000 |
| 12 hours | 43200000 |

## Complete RDP Hardening Playbook

Here is a comprehensive playbook that applies a full set of RDP security settings suitable for a production environment:

```yaml
# playbook-rdp-hardened.yml
# Complete RDP security hardening for production Windows servers
- name: Harden Remote Desktop Configuration
  hosts: windows
  vars:
    rdp_port: 3389
    idle_timeout_ms: 1800000
    disconnect_timeout_ms: 3600000
    allowed_groups:
      - BUILTIN\Administrators
      - DOMAIN\ServerAdmins

  tasks:
    - name: Enable Remote Desktop
      ansible.windows.win_regedit:
        path: HKLM:\SYSTEM\CurrentControlSet\Control\Terminal Server
        name: fDenyTSConnections
        data: 0
        type: dword

    - name: Require Network Level Authentication
      ansible.windows.win_regedit:
        path: HKLM:\SYSTEM\CurrentControlSet\Control\Terminal Server\WinStations\RDP-Tcp
        name: UserAuthentication
        data: 1
        type: dword

    - name: Force TLS security layer
      ansible.windows.win_regedit:
        path: HKLM:\SYSTEM\CurrentControlSet\Control\Terminal Server\WinStations\RDP-Tcp
        name: SecurityLayer
        data: 2
        type: dword

    - name: Set high encryption level
      ansible.windows.win_regedit:
        path: HKLM:\SYSTEM\CurrentControlSet\Control\Terminal Server\WinStations\RDP-Tcp
        name: MinEncryptionLevel
        data: 3
        type: dword

    - name: Disable clipboard redirection
      ansible.windows.win_regedit:
        path: HKLM:\SOFTWARE\Policies\Microsoft\Windows NT\Terminal Services
        name: fDisableClip
        data: 1
        type: dword

    - name: Disable drive redirection
      ansible.windows.win_regedit:
        path: HKLM:\SOFTWARE\Policies\Microsoft\Windows NT\Terminal Services
        name: fDisableCdm
        data: 1
        type: dword

    - name: Disable printer redirection
      ansible.windows.win_regedit:
        path: HKLM:\SOFTWARE\Policies\Microsoft\Windows NT\Terminal Services
        name: fDisableCpm
        data: 1
        type: dword

    - name: Set idle session timeout
      ansible.windows.win_regedit:
        path: HKLM:\SOFTWARE\Policies\Microsoft\Windows NT\Terminal Services
        name: MaxIdleTime
        data: "{{ idle_timeout_ms }}"
        type: dword

    - name: Set disconnected session timeout
      ansible.windows.win_regedit:
        path: HKLM:\SOFTWARE\Policies\Microsoft\Windows NT\Terminal Services
        name: MaxDisconnectionTime
        data: "{{ disconnect_timeout_ms }}"
        type: dword

    - name: Require password prompt on reconnection
      ansible.windows.win_regedit:
        path: HKLM:\SOFTWARE\Policies\Microsoft\Windows NT\Terminal Services
        name: fPromptForPassword
        data: 1
        type: dword

    - name: Configure RDP access groups
      ansible.windows.win_group_membership:
        name: Remote Desktop Users
        members: "{{ allowed_groups }}"
        state: pure

    - name: Ensure firewall allows RDP
      community.windows.win_firewall_rule:
        name: "Remote Desktop (TCP-In)"
        localport: "{{ rdp_port }}"
        action: allow
        direction: in
        protocol: tcp
        state: present
        enabled: yes

    - name: Start and enable RDP service
      ansible.windows.win_service:
        name: TermService
        state: started
        start_mode: auto
```

## Disabling RDP When Not Needed

For servers that should not have RDP enabled (like servers managed entirely through Ansible via WinRM), you can disable it:

```yaml
# playbook-disable-rdp.yml
# Disables RDP on servers that should only be managed via WinRM
- name: Disable Remote Desktop
  hosts: automated_servers
  tasks:
    - name: Disable Remote Desktop
      ansible.windows.win_regedit:
        path: HKLM:\SYSTEM\CurrentControlSet\Control\Terminal Server
        name: fDenyTSConnections
        data: 1
        type: dword

    - name: Block RDP in firewall
      community.windows.win_firewall_rule:
        name: "Remote Desktop - User Mode (TCP-In)"
        action: block
        direction: in
        protocol: tcp
        localport: 3389
        state: present
        enabled: yes

    - name: Stop Remote Desktop Services
      ansible.windows.win_service:
        name: TermService
        state: stopped
        start_mode: disabled
```

## Practical Considerations

**NLA is essential.** Network Level Authentication requires the user to authenticate before a full RDP session is established. This prevents unauthenticated users from consuming server resources and mitigates certain denial-of-service attacks.

**Clipboard and drive redirection are security risks.** Disabling them prevents data exfiltration through RDP sessions. If users need to transfer files, provide a dedicated mechanism instead.

**Single session per user saves resources.** Without this limit, users who disconnect without logging off will consume a session, and then create a new one when they reconnect. This wastes memory and CPU.

**Log RDP events.** Enable auditing for logon events (Event ID 4624, type 10 for RDP) to track who connects and when. This is essential for compliance and security monitoring.

RDP configuration is one of those areas where getting it right matters for both usability and security. Ansible gives you the tools to enforce a consistent RDP policy across every Windows server in your environment, and to prove it through auditable playbook runs.
