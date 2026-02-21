# How to Use Ansible WinRM Connection for Windows

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, Windows, WinRM, Configuration Management

Description: Set up Ansible WinRM connections to manage Windows servers including authentication, HTTPS configuration, and common modules.

---

Ansible is not just for Linux. It manages Windows servers too, using Windows Remote Management (WinRM) instead of SSH. WinRM is Microsoft's implementation of WS-Management, a SOAP-based protocol that comes built into every modern Windows version. Setting it up takes a bit more work than SSH on Linux, but once configured, you get the same powerful automation capabilities across your entire infrastructure.

## Prerequisites

Before you start, you need a few things on the Ansible control node:

```bash
# Install the pywinrm library (required for WinRM connections)
pip install pywinrm

# Install pywinrm with Kerberos support (for domain environments)
pip install pywinrm[kerberos]

# Install pywinrm with CredSSP support
pip install pywinrm[credssp]

# Verify installation
python3 -c "import winrm; print('pywinrm installed')"
```

## Configuring WinRM on Windows

WinRM needs to be enabled and configured on each Windows host. The quickest way is using the Ansible-provided configuration script:

```powershell
# Download and run the Ansible WinRM setup script on the Windows host
# Run PowerShell as Administrator

# Download the script
$url = "https://raw.githubusercontent.com/ansible/ansible-documentation/devel/examples/scripts/ConfigureRemotingForAnsible.ps1"
$file = "$env:temp\ConfigureRemotingForAnsible.ps1"
(New-Object -TypeName System.Net.WebClient).DownloadFile($url, $file)

# Run the script
powershell.exe -ExecutionPolicy ByPass -File $file
```

Or configure WinRM manually:

```powershell
# Enable WinRM service
Enable-PSRemoting -Force

# Set WinRM to start automatically
Set-Service WinRM -StartupType 'Automatic'

# Configure WinRM to allow remote connections
Set-Item -Path WSMan:\localhost\Service\Auth\Basic -Value $true
Set-Item -Path WSMan:\localhost\Service\AllowUnencrypted -Value $true

# Configure firewall rule
New-NetFirewallRule -Name "WinRM-HTTP" -DisplayName "WinRM HTTP" -Enabled True -Direction Inbound -Protocol TCP -LocalPort 5985 -Action Allow

# Verify WinRM is listening
winrm enumerate winrm/config/Listener
```

## Basic Ansible Configuration for Windows

### Inventory Setup

```ini
# inventory/hosts
[windows_servers]
win01 ansible_host=10.0.1.100
win02 ansible_host=10.0.1.101

[windows_servers:vars]
ansible_user=Administrator
ansible_password=SecurePassword123!
ansible_connection=winrm
ansible_winrm_transport=basic
ansible_winrm_port=5985
ansible_winrm_scheme=http
```

### Using Group Variables (Recommended)

```yaml
# group_vars/windows_servers.yml
ansible_connection: winrm
ansible_user: Administrator
ansible_password: "{{ vault_windows_password }}"
ansible_winrm_transport: ntlm
ansible_winrm_port: 5986
ansible_winrm_scheme: https
ansible_winrm_server_cert_validation: ignore
```

## Authentication Methods

WinRM supports several authentication methods:

### Basic Authentication

The simplest but least secure. Only use in lab environments:

```yaml
# group_vars/windows_lab.yml
ansible_winrm_transport: basic
ansible_winrm_scheme: http
ansible_winrm_port: 5985
```

### NTLM Authentication

Better security, works with local accounts:

```yaml
# group_vars/windows_servers.yml
ansible_winrm_transport: ntlm
ansible_winrm_scheme: https
ansible_winrm_port: 5986
ansible_winrm_server_cert_validation: ignore
```

### Kerberos Authentication

Required for domain environments and the most secure option:

```bash
# Install Kerberos dependencies on the control node
# Ubuntu/Debian
sudo apt-get install python3-dev libkrb5-dev krb5-user

# RHEL/CentOS
sudo yum install python3-devel krb5-devel krb5-workstation

# Install Python Kerberos library
pip install pywinrm[kerberos]
```

Configure Kerberos:

```ini
# /etc/krb5.conf
[libdefaults]
    default_realm = COMPANY.LOCAL
    dns_lookup_realm = false
    dns_lookup_kdc = true

[realms]
    COMPANY.LOCAL = {
        kdc = dc01.company.local
        admin_server = dc01.company.local
    }

[domain_realm]
    .company.local = COMPANY.LOCAL
    company.local = COMPANY.LOCAL
```

```yaml
# group_vars/windows_domain.yml
ansible_winrm_transport: kerberos
ansible_user: ansible_svc@COMPANY.LOCAL
ansible_password: "{{ vault_domain_password }}"
ansible_winrm_scheme: https
ansible_winrm_port: 5986
```

### CredSSP Authentication

Supports double-hop authentication:

```bash
# Install CredSSP support
pip install pywinrm[credssp]
```

```yaml
# group_vars/windows_servers.yml
ansible_winrm_transport: credssp
ansible_winrm_scheme: https
ansible_winrm_port: 5986
```

## Configuring HTTPS for WinRM

HTTPS is strongly recommended for production. Set up a self-signed certificate:

```powershell
# On the Windows host, run as Administrator
# Create a self-signed certificate
$cert = New-SelfSignedCertificate -DnsName $(hostname) -CertStoreLocation Cert:\LocalMachine\My

# Create HTTPS listener
winrm create winrm/config/Listener?Address=*+Transport=HTTPS "@{Hostname=`"$(hostname)`";CertificateThumbprint=`"$($cert.Thumbprint)`"}"

# Open the firewall port
New-NetFirewallRule -Name "WinRM-HTTPS" -DisplayName "WinRM HTTPS" -Enabled True -Direction Inbound -Protocol TCP -LocalPort 5986 -Action Allow
```

Then configure Ansible to use HTTPS:

```yaml
# group_vars/windows_servers.yml
ansible_winrm_scheme: https
ansible_winrm_port: 5986
ansible_winrm_server_cert_validation: ignore  # For self-signed certs
```

## Testing the Connection

```bash
# Test Windows connectivity
ansible windows_servers -m win_ping

# Expected output:
# win01 | SUCCESS => {
#     "changed": false,
#     "ping": "pong"
# }
```

Note: Use `win_ping`, not `ping`. The regular `ping` module is for Linux.

## Common Windows Modules

### Running Commands

```yaml
# Run PowerShell commands
- name: Get Windows version
  win_shell: |
    Get-CimInstance Win32_OperatingSystem | Select-Object Caption, Version
  register: os_info

- name: Run a command
  win_command: hostname

- name: Run a batch file
  win_command: C:\Scripts\deploy.bat
```

### Managing Services

```yaml
- name: Ensure IIS is running
  win_service:
    name: W3SVC
    state: started
    start_mode: auto

- name: Restart a service
  win_service:
    name: MyAppService
    state: restarted
```

### Installing Software

```yaml
- name: Install Chocolatey packages
  win_chocolatey:
    name:
      - git
      - nodejs
      - python3
    state: present

- name: Install MSI package
  win_package:
    path: C:\Installers\app.msi
    state: present
```

### Managing Files

```yaml
- name: Copy file to Windows host
  win_copy:
    src: files/config.xml
    dest: C:\App\config.xml

- name: Create a directory
  win_file:
    path: C:\App\logs
    state: directory

- name: Download a file
  win_get_url:
    url: https://example.com/installer.exe
    dest: C:\Temp\installer.exe
```

### Managing Windows Features

```yaml
- name: Install IIS
  win_feature:
    name: Web-Server
    state: present
    include_sub_features: yes
    include_management_tools: yes

- name: Install .NET Framework
  win_feature:
    name: NET-Framework-Core
    state: present
```

## Complete Playbook Example

```yaml
# windows_setup.yml
---
- name: Configure Windows Web Server
  hosts: windows_servers
  gather_facts: yes

  tasks:
    - name: Install IIS
      win_feature:
        name: Web-Server
        state: present
        include_management_tools: yes
      register: iis_install

    - name: Reboot if required by IIS install
      win_reboot:
        reboot_timeout: 300
      when: iis_install.reboot_required

    - name: Create web application directory
      win_file:
        path: C:\inetpub\myapp
        state: directory

    - name: Deploy website content
      win_copy:
        src: website/
        dest: C:\inetpub\myapp\

    - name: Configure IIS site
      win_iis_website:
        name: MyApp
        state: started
        port: 80
        physical_path: C:\inetpub\myapp

    - name: Ensure Windows Firewall allows HTTP
      win_firewall_rule:
        name: HTTP-Inbound
        localport: 80
        action: allow
        direction: in
        protocol: tcp
        state: present
        enabled: yes

    - name: Ensure IIS service is running
      win_service:
        name: W3SVC
        state: started
        start_mode: auto
```

## Troubleshooting WinRM

### Connection Refused

```powershell
# On the Windows host, verify WinRM is listening
winrm enumerate winrm/config/Listener

# Check WinRM service status
Get-Service WinRM

# Restart WinRM
Restart-Service WinRM
```

### Authentication Errors

```bash
# Test with verbose output
ansible win01 -m win_ping -vvvv

# Common fixes:
# 1. Verify username format (domain\user or user@domain for Kerberos)
# 2. Check that the auth method is enabled on the Windows side
# 3. Verify firewall rules
```

### Certificate Errors

```yaml
# For self-signed certs, ignore validation
ansible_winrm_server_cert_validation: ignore

# For production, use proper CA-signed certificates
ansible_winrm_ca_trust_path: /etc/ssl/certs/company-ca.pem
```

### Timeout Issues

```yaml
# Increase operation and connection timeouts
ansible_winrm_operation_timeout_sec: 60
ansible_winrm_read_timeout_sec: 70
```

## Wrapping Up

Managing Windows with Ansible through WinRM is well-supported and production-ready. Start by setting up WinRM on your Windows hosts (preferably with HTTPS), install `pywinrm` on your control node, and configure the inventory with the right connection variables. Use NTLM for workgroup environments and Kerberos for domain-joined servers. The `win_*` modules cover everything from package installation to IIS configuration, giving you the same automation capabilities on Windows that you have on Linux.
