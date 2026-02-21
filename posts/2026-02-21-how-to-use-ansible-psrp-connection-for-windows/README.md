# How to Use Ansible PSRP Connection for Windows

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, Windows, PSRP, PowerShell Remoting

Description: Configure the Ansible PSRP connection plugin for managing Windows hosts using the PowerShell Remoting Protocol for better performance.

---

While WinRM is the traditional way Ansible connects to Windows hosts, there is a newer alternative: the PowerShell Remoting Protocol (PSRP) connection plugin. PSRP uses the same underlying WinRM transport but communicates using native PowerShell Remoting instead of the WinRM SOAP protocol. This results in better performance for PowerShell-heavy workloads and more efficient data serialization. If you manage Windows servers with Ansible, PSRP is worth evaluating.

## PSRP vs WinRM: What Is the Difference?

Both PSRP and WinRM use the same network transport (HTTP/HTTPS on ports 5985/5986). The difference is in the protocol layer on top:

```mermaid
graph TD
    subgraph WinRM Connection
        A1[Ansible] -->|SOAP/WS-Man| B1[WinRM Service]
        B1 --> C1[cmd.exe / PowerShell]
    end

    subgraph PSRP Connection
        A2[Ansible] -->|PowerShell Remoting Protocol| B2[WinRM Service]
        B2 --> C2[PowerShell Runspace]
    end
```

PSRP creates a PowerShell runspace on the remote host and communicates using the native PowerShell serialization format (CLIXML). This is the same protocol used by PowerShell's `Enter-PSSession` and `Invoke-Command`.

Key advantages of PSRP:
- More efficient data serialization
- Better handling of complex PowerShell objects
- Reduced overhead for PowerShell-heavy tasks
- Native PowerShell pipeline support
- Better error handling and output capture

## Installing PSRP Prerequisites

On the Ansible control node:

```bash
# Install the pypsrp library
pip install pypsrp

# Verify installation
python3 -c "import pypsrp; print('pypsrp installed successfully')"

# For Kerberos support
pip install pypsrp[kerberos]

# For CredSSP support
pip install pypsrp[credssp]
```

## Basic PSRP Configuration

### Inventory Setup

```ini
# inventory/hosts
[windows_servers]
win01 ansible_host=10.0.1.100
win02 ansible_host=10.0.1.101

[windows_servers:vars]
ansible_connection=psrp
ansible_psrp_auth=ntlm
ansible_user=Administrator
ansible_password=SecurePassword123!
ansible_psrp_cert_validation=ignore
```

### Group Variables

```yaml
# group_vars/windows_servers.yml
ansible_connection: psrp
ansible_user: Administrator
ansible_password: "{{ vault_windows_password }}"
ansible_psrp_auth: negotiate
ansible_psrp_cert_validation: ignore
ansible_psrp_protocol: https
ansible_psrp_port: 5986
```

## Authentication Options

PSRP supports the same authentication methods as WinRM:

### Basic Authentication

```yaml
# group_vars/windows_lab.yml
ansible_connection: psrp
ansible_psrp_auth: basic
ansible_psrp_protocol: http
ansible_psrp_port: 5985
```

### NTLM Authentication

```yaml
# group_vars/windows_servers.yml
ansible_connection: psrp
ansible_psrp_auth: ntlm
ansible_psrp_protocol: https
ansible_psrp_port: 5986
ansible_psrp_cert_validation: ignore
```

### Negotiate Authentication

Negotiate tries Kerberos first and falls back to NTLM:

```yaml
# group_vars/windows_domain.yml
ansible_connection: psrp
ansible_psrp_auth: negotiate
ansible_user: ansible_svc@COMPANY.LOCAL
ansible_password: "{{ vault_domain_password }}"
ansible_psrp_protocol: https
ansible_psrp_port: 5986
```

### Kerberos Authentication

```yaml
# group_vars/windows_domain.yml
ansible_connection: psrp
ansible_psrp_auth: kerberos
ansible_user: ansible_svc@COMPANY.LOCAL
ansible_password: "{{ vault_domain_password }}"
ansible_psrp_protocol: https
ansible_psrp_port: 5986
```

### CredSSP Authentication

CredSSP supports double-hop authentication, where the remote server needs to access another network resource using your credentials:

```yaml
# group_vars/windows_servers.yml
ansible_connection: psrp
ansible_psrp_auth: credssp
ansible_psrp_protocol: https
ansible_psrp_port: 5986
```

## All PSRP Configuration Options

```yaml
# Complete list of PSRP connection options
ansible_connection: psrp

# Authentication method: basic, ntlm, negotiate, kerberos, credssp
ansible_psrp_auth: negotiate

# Protocol: http or https
ansible_psrp_protocol: https

# Port number
ansible_psrp_port: 5986

# Certificate validation: ignore or validate
ansible_psrp_cert_validation: ignore

# Path to CA certificate bundle
ansible_psrp_ca_cert: /path/to/ca-bundle.crt

# Connection timeout in seconds
ansible_psrp_connection_timeout: 30

# Operation timeout in seconds
ansible_psrp_operation_timeout: 20

# Read timeout in seconds
ansible_psrp_read_timeout: 30

# Maximum envelope size in bytes
ansible_psrp_max_envelope_size: 153600

# Reconnection retries
ansible_psrp_reconnection_retries: 0

# Reconnection backoff in seconds
ansible_psrp_reconnection_backoff: 2

# Message encryption: auto, always, never
ansible_psrp_message_encryption: auto

# Proxy URL
ansible_psrp_proxy: ""

# Ignore proxy for these hosts
ansible_psrp_no_proxy: false
```

## Testing PSRP Connectivity

```bash
# Test with win_ping module
ansible windows_servers -m win_ping

# Test with verbose output for debugging
ansible windows_servers -m win_ping -vvvv

# Test gathering facts
ansible windows_servers -m setup
```

## Practical Playbook Examples

### PowerShell Script Execution

PSRP excels at running PowerShell scripts because it uses the native PowerShell protocol:

```yaml
# ps_management.yml
---
- name: PowerShell management via PSRP
  hosts: windows_servers

  tasks:
    # Run PowerShell commands
    - name: Get system information
      win_shell: |
        $os = Get-CimInstance Win32_OperatingSystem
        [PSCustomObject]@{
            ComputerName = $env:COMPUTERNAME
            OSVersion = $os.Version
            FreeMemoryMB = [math]::Round($os.FreePhysicalMemory / 1024, 2)
            LastBoot = $os.LastBootUpTime
        } | ConvertTo-Json
      register: sys_info

    - name: Display system info
      debug:
        msg: "{{ sys_info.stdout | from_json }}"
```

### Windows Service Management

```yaml
# service_management.yml
---
- name: Manage Windows services via PSRP
  hosts: windows_servers

  tasks:
    - name: Get all running services
      win_shell: |
        Get-Service | Where-Object { $_.Status -eq 'Running' } |
        Select-Object Name, DisplayName, StartType |
        ConvertTo-Json
      register: running_services

    - name: Ensure critical services are running
      win_service:
        name: "{{ item }}"
        state: started
        start_mode: auto
      loop:
        - W3SVC
        - MSSQLSERVER
        - WinRM
```

### Software Deployment

```yaml
# deploy_app.yml
---
- name: Deploy application via PSRP
  hosts: windows_servers

  vars:
    app_name: MyWebApp
    app_version: "2.1.0"
    install_path: "C:\\Apps\\{{ app_name }}"

  tasks:
    - name: Create installation directory
      win_file:
        path: "{{ install_path }}"
        state: directory

    - name: Download application package
      win_get_url:
        url: "https://releases.company.com/{{ app_name }}/{{ app_version }}/setup.zip"
        dest: "C:\\Temp\\{{ app_name }}-{{ app_version }}.zip"

    - name: Extract application
      win_unzip:
        src: "C:\\Temp\\{{ app_name }}-{{ app_version }}.zip"
        dest: "{{ install_path }}"
        creates: "{{ install_path }}\\app.exe"

    - name: Install as Windows service
      win_shell: |
        New-Service -Name "{{ app_name }}" `
          -BinaryPathName "{{ install_path }}\app.exe" `
          -DisplayName "{{ app_name }}" `
          -StartupType Automatic `
          -ErrorAction SilentlyContinue

    - name: Start the service
      win_service:
        name: "{{ app_name }}"
        state: started
```

## Migrating from WinRM to PSRP

If you currently use WinRM, migrating to PSRP is straightforward since both use the same underlying transport:

```yaml
# Before (WinRM):
ansible_connection: winrm
ansible_winrm_transport: ntlm
ansible_winrm_port: 5986
ansible_winrm_scheme: https
ansible_winrm_server_cert_validation: ignore

# After (PSRP):
ansible_connection: psrp
ansible_psrp_auth: ntlm
ansible_psrp_port: 5986
ansible_psrp_protocol: https
ansible_psrp_cert_validation: ignore
```

No changes are needed on the Windows hosts. The same WinRM listener serves both connection types.

## Performance Comparison

In testing, PSRP tends to be faster for tasks that involve significant PowerShell output or complex objects:

```yaml
# benchmark.yml - Compare PSRP vs WinRM
---
- name: PSRP benchmark
  hosts: windows_servers
  connection: psrp

  tasks:
    - name: Run 10 PowerShell tasks
      win_shell: "Get-Process | Select-Object -First 10 | ConvertTo-Json"
      loop: "{{ range(1, 11) | list }}"
```

Run the same playbook with WinRM and PSRP to compare:

```bash
# Time with WinRM
time ansible-playbook benchmark.yml -e "ansible_connection=winrm ansible_winrm_transport=ntlm"

# Time with PSRP
time ansible-playbook benchmark.yml -e "ansible_connection=psrp ansible_psrp_auth=ntlm"
```

## Troubleshooting PSRP

### Common Errors

```bash
# "pypsrp is not installed" error
pip install pypsrp

# "ConnectionError" - WinRM not listening
# On the Windows host:
# winrm enumerate winrm/config/Listener

# "AuthenticationError" - Wrong credentials or auth method
# Try a different auth method:
ansible win01 -m win_ping -e "ansible_psrp_auth=basic" -vvvv

# "Timeout" error
ansible win01 -m win_ping -e "ansible_psrp_connection_timeout=60" -vvvv
```

### Debugging Connection Issues

```bash
# Maximum verbosity shows PSRP protocol details
ansible win01 -m win_ping -vvvv 2>&1 | grep -i "psrp\|auth\|connect"

# Test with Python directly
python3 -c "
from pypsrp.client import Client
client = Client('10.0.1.100', username='Administrator', password='Password', ssl=False, auth='ntlm')
output, streams, had_errors = client.execute_ps('Get-Service WinRM')
print(output)
"
```

### Certificate Issues

```yaml
# For self-signed certificates, ignore validation
ansible_psrp_cert_validation: ignore

# For proper CA certificates
ansible_psrp_cert_validation: validate
ansible_psrp_ca_cert: /etc/ssl/certs/company-ca.pem
```

## Wrapping Up

PSRP is the modern way to connect Ansible to Windows hosts. It uses the same WinRM transport as the traditional connection but communicates using the native PowerShell protocol, which brings better performance and richer data handling. The migration from WinRM to PSRP requires only inventory variable changes since no Windows-side changes are needed. If you are starting fresh with Windows automation in Ansible, PSRP is the recommended choice. If you are already using WinRM, consider switching when you have time to test, especially if your playbooks are PowerShell-heavy.
