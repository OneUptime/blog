# How to Configure Ansible for Windows

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, Windows, WinRM, DevOps, Windows Automation, PowerShell

Description: Manage Windows servers with Ansible using WinRM connectivity, PowerShell modules, and Windows-specific automation for configuration, deployment, and administration.

---

Ansible is not just for Linux. With WinRM (Windows Remote Management) connectivity and Windows-specific modules, you can manage Windows servers alongside your Linux infrastructure using the same playbooks and patterns. This enables unified automation across your entire environment.

This guide covers configuring Ansible for Windows management and common Windows automation tasks.

## Windows Requirements

Before Ansible can manage Windows hosts, they need:

1. **PowerShell 5.1 or later** (Windows Server 2016+ includes this)
2. **WinRM service** enabled and configured
3. **.NET Framework 4.0+**
4. **Network connectivity** from Ansible control node

## Preparing Windows Hosts

Run this PowerShell script on Windows hosts to enable WinRM.

```powershell
# ConfigureRemotingForAnsible.ps1
# Run as Administrator

# Enable WinRM
Enable-PSRemoting -Force

# Set WinRM service to start automatically
Set-Service -Name WinRM -StartupType Automatic

# Configure WinRM listener
winrm quickconfig -quiet

# Set WinRM to allow unencrypted traffic (for HTTP)
# Use HTTPS in production instead
winrm set winrm/config/service '@{AllowUnencrypted="true"}'

# Enable basic authentication
winrm set winrm/config/service/auth '@{Basic="true"}'

# Allow connections from any IP (restrict in production)
winrm set winrm/config/client '@{TrustedHosts="*"}'

# Increase max memory per shell for large operations
winrm set winrm/config/winrs '@{MaxMemoryPerShellMB="1024"}'

# Configure firewall to allow WinRM
New-NetFirewallRule -Name "WinRM HTTP" -DisplayName "WinRM HTTP" -Enabled True -Direction Inbound -Protocol TCP -LocalPort 5985 -Action Allow
New-NetFirewallRule -Name "WinRM HTTPS" -DisplayName "WinRM HTTPS" -Enabled True -Direction Inbound -Protocol TCP -LocalPort 5986 -Action Allow

# Restart WinRM service
Restart-Service WinRM

# Verify configuration
winrm enumerate winrm/config/listener
```

For HTTPS (recommended for production):

```powershell
# Generate self-signed certificate for WinRM HTTPS
$cert = New-SelfSignedCertificate -DnsName $env:COMPUTERNAME -CertStoreLocation Cert:\LocalMachine\My

# Create HTTPS listener
winrm create winrm/config/Listener?Address=*+Transport=HTTPS "@{Hostname=`"$env:COMPUTERNAME`";CertificateThumbprint=`"$($cert.Thumbprint)`"}"

# Export certificate for Ansible (if needed)
Export-Certificate -Cert $cert -FilePath C:\winrm_cert.cer
```

## Configuring Ansible for Windows

Install the Windows collection and Python dependencies.

```bash
# Install Windows collection
ansible-galaxy collection install ansible.windows
ansible-galaxy collection install community.windows

# Install pywinrm for WinRM connectivity
pip install pywinrm pywinrm[credssp]
```

## Inventory Configuration

Configure Windows hosts with WinRM connection settings.

```yaml
# inventory/hosts.yml
---
all:
  children:
    windows:
      hosts:
        win-server1:
          ansible_host: 192.168.1.100
        win-server2:
          ansible_host: 192.168.1.101
        win-dc1:
          ansible_host: 192.168.1.10

      vars:
        # Connection settings
        ansible_connection: winrm
        ansible_port: 5986
        ansible_winrm_transport: ntlm
        ansible_winrm_server_cert_validation: ignore

        # Credentials (use vault in production)
        ansible_user: Administrator
        ansible_password: "{{ vault_windows_password }}"

    # Group for domain controllers
    domain_controllers:
      hosts:
        win-dc1:
      vars:
        ansible_winrm_transport: kerberos

    # Group for web servers
    windows_web:
      hosts:
        win-server1:
        win-server2:
```

## Authentication Options

Choose the appropriate authentication method.

```yaml
# Basic Auth (HTTP only, least secure)
ansible_winrm_transport: basic
ansible_port: 5985

# NTLM (most common)
ansible_winrm_transport: ntlm
ansible_port: 5986

# Kerberos (for domain environments)
ansible_winrm_transport: kerberos
ansible_winrm_kerberos_delegation: true

# CredSSP (supports double-hop)
ansible_winrm_transport: credssp
```

For Kerberos authentication:

```bash
# Install Kerberos client
sudo apt install krb5-user

# Configure /etc/krb5.conf
[realms]
EXAMPLE.COM = {
    kdc = dc1.example.com
    admin_server = dc1.example.com
}

[domain_realm]
.example.com = EXAMPLE.COM
example.com = EXAMPLE.COM

# Get Kerberos ticket
kinit administrator@EXAMPLE.COM
```

## Testing Connectivity

Verify Ansible can connect to Windows hosts.

```bash
# Test connection with win_ping module
ansible windows -i inventory/hosts.yml -m ansible.windows.win_ping

# Expected output:
# win-server1 | SUCCESS => {
#     "changed": false,
#     "ping": "pong"
# }
```

## Common Windows Tasks

### Software Installation

```yaml
# playbooks/windows-software.yml
---
- name: Install software on Windows
  hosts: windows
  gather_facts: yes

  tasks:
    - name: Install Chocolatey package manager
      ansible.windows.win_chocolatey:
        name: chocolatey
        state: present

    - name: Install common software via Chocolatey
      ansible.windows.win_chocolatey:
        name: "{{ item }}"
        state: present
      loop:
        - googlechrome
        - 7zip
        - notepadplusplus
        - git
        - vscode

    - name: Install Windows features
      ansible.windows.win_feature:
        name: "{{ item }}"
        state: present
      loop:
        - Web-Server
        - Web-Asp-Net45
        - Web-Mgmt-Console

    - name: Install MSI package from URL
      ansible.windows.win_package:
        path: https://example.com/installer.msi
        product_id: '{12345678-1234-1234-1234-123456789012}'
        state: present
        arguments: /quiet /norestart
```

### Windows Services

```yaml
# playbooks/windows-services.yml
---
- name: Manage Windows services
  hosts: windows

  tasks:
    - name: Ensure IIS service is running
      ansible.windows.win_service:
        name: W3SVC
        state: started
        start_mode: auto

    - name: Configure custom service
      ansible.windows.win_service:
        name: MyAppService
        path: C:\Apps\MyApp\service.exe
        display_name: My Application Service
        description: Custom application service
        state: started
        start_mode: auto
        username: .\ServiceAccount
        password: "{{ vault_service_password }}"

    - name: Stop and disable unnecessary services
      ansible.windows.win_service:
        name: "{{ item }}"
        state: stopped
        start_mode: disabled
      loop:
        - RemoteRegistry
        - Spooler
      when: disable_unnecessary_services | default(false)
```

### File and Directory Management

```yaml
# playbooks/windows-files.yml
---
- name: Manage files on Windows
  hosts: windows

  tasks:
    - name: Create directory
      ansible.windows.win_file:
        path: C:\Apps\MyApp
        state: directory

    - name: Copy file to Windows
      ansible.windows.win_copy:
        src: files/config.xml
        dest: C:\Apps\MyApp\config.xml

    - name: Download file from URL
      ansible.windows.win_get_url:
        url: https://example.com/installer.exe
        dest: C:\Temp\installer.exe
        checksum: sha256:abc123...

    - name: Template configuration file
      ansible.windows.win_template:
        src: templates/appsettings.json.j2
        dest: C:\Apps\MyApp\appsettings.json

    - name: Set file permissions
      ansible.windows.win_acl:
        path: C:\Apps\MyApp
        user: IIS_IUSRS
        rights: Read,ReadAndExecute
        type: allow
        state: present
        inherit: ContainerInherit, ObjectInherit
```

### Registry Management

```yaml
# playbooks/windows-registry.yml
---
- name: Manage Windows registry
  hosts: windows

  tasks:
    - name: Set registry value
      ansible.windows.win_regedit:
        path: HKLM:\SOFTWARE\MyApp
        name: InstallPath
        data: C:\Apps\MyApp
        type: string
        state: present

    - name: Configure Windows settings via registry
      ansible.windows.win_regedit:
        path: HKLM:\SOFTWARE\Policies\Microsoft\Windows\WindowsUpdate\AU
        name: NoAutoUpdate
        data: 1
        type: dword
        state: present

    - name: Create registry key
      ansible.windows.win_regedit:
        path: HKLM:\SOFTWARE\MyCompany\MyApp
        state: present
```

### PowerShell Execution

```yaml
# playbooks/windows-powershell.yml
---
- name: Run PowerShell commands
  hosts: windows

  tasks:
    - name: Run PowerShell command
      ansible.windows.win_powershell:
        script: |
          Get-Process | Where-Object { $_.CPU -gt 100 } | Select-Object Name, CPU
      register: ps_result

    - name: Display result
      debug:
        var: ps_result.output

    - name: Run PowerShell script file
      ansible.windows.win_powershell:
        script: "{{ lookup('file', 'scripts/setup.ps1') }}"
        parameters:
          Environment: Production
          AppName: MyApp

    - name: Install PowerShell module
      community.windows.win_psmodule:
        name: Az
        state: present

    - name: Run DSC configuration
      ansible.windows.win_dsc:
        resource_name: WindowsFeature
        Name: Web-Server
        Ensure: Present
```

### IIS Configuration

```yaml
# playbooks/windows-iis.yml
---
- name: Configure IIS web server
  hosts: windows_web

  tasks:
    - name: Install IIS
      ansible.windows.win_feature:
        name: Web-Server
        include_management_tools: yes
        state: present

    - name: Create application pool
      community.windows.win_iis_webapppool:
        name: MyAppPool
        state: started
        attributes:
          managedRuntimeVersion: v4.0
          managedPipelineMode: Integrated
          startMode: AlwaysRunning
          processModel.identityType: ApplicationPoolIdentity

    - name: Create website
      community.windows.win_iis_website:
        name: MyWebsite
        state: started
        port: 80
        ip: "*"
        hostname: myapp.example.com
        application_pool: MyAppPool
        physical_path: C:\inetpub\myapp

    - name: Create virtual directory
      community.windows.win_iis_virtualdirectory:
        name: static
        site: MyWebsite
        physical_path: C:\inetpub\static

    - name: Configure IIS binding
      community.windows.win_iis_webbinding:
        name: MyWebsite
        port: 443
        protocol: https
        certificate_hash: ABC123...
        certificate_store_name: My
```

### Windows Updates

```yaml
# playbooks/windows-updates.yml
---
- name: Manage Windows Updates
  hosts: windows

  tasks:
    - name: Install all critical updates
      ansible.windows.win_updates:
        category_names:
          - CriticalUpdates
          - SecurityUpdates
        state: installed
        reboot: yes
        reboot_timeout: 3600
      register: update_result

    - name: Display update results
      debug:
        msg: |
          Updates installed: {{ update_result.installed_update_count }}
          Reboot required: {{ update_result.reboot_required }}

    - name: Install specific KB
      ansible.windows.win_updates:
        whitelist:
          - KB1234567
        state: installed
```

### User and Group Management

```yaml
# playbooks/windows-users.yml
---
- name: Manage Windows users
  hosts: windows

  tasks:
    - name: Create local user
      ansible.windows.win_user:
        name: deploy
        password: "{{ vault_deploy_password }}"
        state: present
        groups:
          - Administrators
        password_never_expires: yes

    - name: Create local group
      ansible.windows.win_group:
        name: AppAdmins
        description: Application administrators
        state: present

    - name: Add user to group
      ansible.windows.win_group_membership:
        name: AppAdmins
        members:
          - deploy
          - DOMAIN\app_admin
        state: present
```

## Windows Role Example

```yaml
# roles/windows_base/tasks/main.yml
---
- name: Set computer description
  ansible.windows.win_powershell:
    script: |
      $description = "{{ computer_description | default('Managed by Ansible') }}"
      Set-ItemProperty -Path "HKLM:\SYSTEM\CurrentControlSet\Services\LanmanServer\Parameters" -Name "srvcomment" -Value $description

- name: Configure Windows Firewall
  community.windows.win_firewall:
    state: enabled
    profiles:
      - Domain
      - Private
      - Public

- name: Set timezone
  community.windows.win_timezone:
    timezone: "{{ windows_timezone | default('UTC') }}"

- name: Configure NTP
  ansible.windows.win_powershell:
    script: |
      w32tm /config /manualpeerlist:"{{ ntp_servers | join(' ') }}" /syncfromflags:manual /reliable:yes /update
      Restart-Service w32time
      w32tm /resync

- name: Install monitoring agent
  ansible.windows.win_package:
    path: "{{ monitoring_agent_url }}"
    product_id: "{{ monitoring_agent_product_id }}"
    state: present
```

---

Ansible brings the same automation patterns you use for Linux to your Windows environment. The key is proper WinRM configuration and using Windows-specific modules from the ansible.windows and community.windows collections. Start with basic connectivity testing, then build out playbooks for your Windows management tasks, from software installation to IIS configuration and beyond.
