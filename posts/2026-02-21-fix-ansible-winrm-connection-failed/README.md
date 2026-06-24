# How to Fix Ansible WinRM connection failed Errors

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, WinRM, Window, Troubleshooting, DevOps

Description: Resolve Ansible WinRM connection failures to Windows hosts with proper listener configuration, certificate setup, and authentication settings.

---

When managing Windows hosts, Ansible can use WinRM (Windows Remote Management) instead of SSH. WinRM connection failures are common because the Windows side often needs extra listener, certificate, firewall, and authentication configuration before Ansible can connect.

## The Error

```text
fatal: [windows-server]: UNREACHABLE! => {
    "msg": "winrm connection error: HTTPSConnectionPool(host='10.0.1.100', port=5986): Max retries exceeded"
}
```

## Fixes

### Fix 1: Enable WinRM on the Windows Host

Run this PowerShell script on the Windows target:

```powershell
# Enable PowerShell remoting and the default HTTP WinRM listener

Enable-PSRemoting -Force

# Or use the Ansible-provided setup script for a lab/development HTTPS listener
$url = "https://raw.githubusercontent.com/ansible/ansible-documentation/devel/examples/scripts/ConfigureRemotingForAnsible.ps1"
$file = "$env:temp\ConfigureRemotingForAnsible.ps1"
(New-Object -TypeName System.Net.WebClient).DownloadFile($url, $file)
powershell.exe -ExecutionPolicy ByPass -File $file -Verbose
```

### Fix 2: Configure Ansible Inventory for Windows

```ini
# inventory/hosts.ini - Windows host configuration
[windows]
win-server1 ansible_host=10.0.1.100

[windows:vars]
ansible_user=Administrator
ansible_password="{{ vault_windows_password }}"
ansible_connection=winrm
ansible_winrm_server_cert_validation=ignore
ansible_winrm_transport=ntlm
ansible_port=5986
```

### Fix 3: Install pywinrm on the Control Node

```bash
# Install the WinRM Python library
pip3 install "pywinrm>=0.4.0"

# For Kerberos authentication
pip3 install "pywinrm[kerberos]>=0.4.0"
```

### Fix 4: Check WinRM Listeners

On the Windows host:

```powershell
# List WinRM listeners
winrm enumerate winrm/config/listener

# Check service authentication and encryption settings
winrm get winrm/config/service
```

### Fix 5: Firewall Rules

```powershell
# Ensure WinRM ports are open
New-NetFirewallRule -Name "WinRM-HTTPS" -DisplayName "WinRM HTTPS" -Direction Inbound -Profile Any -Protocol TCP -LocalPort 5986 -Action Allow
```

### Fix 6: Use HTTP Instead of HTTPS (Testing Only)

```ini
# For testing environments only
ansible_port=5985
ansible_winrm_scheme=http
ansible_winrm_transport=ntlm
ansible_winrm_message_encryption=always
```

Only use Basic over HTTP as a last resort in an isolated development environment. In that case, enable Basic auth and allow unencrypted traffic on the Windows host:

```powershell
winrm set winrm/config/service/auth '@{Basic="true"}'
winrm set winrm/config/service '@{AllowUnencrypted="true"}'
```

## Summary

WinRM connection failures require configuration on both sides: the Windows host needs WinRM enabled with an appropriate listener, and the Ansible control node needs pywinrm installed and proper inventory variables set. The ConfigureRemotingForAnsible.ps1 script can handle the Windows side for lab and development environments, and the inventory variables handle the Ansible side.

## Common Use Cases

Here are several practical scenarios where a working WinRM connection proves essential in real-world Windows playbooks.

### Infrastructure Provisioning Workflow

```yaml
# Complete workflow incorporating Windows hosts over WinRM
- name: Windows infrastructure provisioning
  hosts: windows
  gather_facts: true
  tasks:
    - name: Verify WinRM connectivity
      ansible.windows.win_ping:

    - name: Gather system information
      ansible.builtin.setup:
        gather_subset:
          - hardware
          - network

    - name: Display system summary
      ansible.builtin.debug:
        msg: >-
          Host {{ inventory_hostname }} has
          {{ ansible_memtotal_mb }}MB RAM,
          {{ ansible_processor_vcpus }} vCPUs,
          running {{ ansible_distribution }} {{ ansible_distribution_version }}

    - name: Install IIS web server
      ansible.windows.win_feature:
        name: Web-Server
        state: present

    - name: Configure system timezone
      ansible.windows.win_timezone:
        timezone: "{{ system_timezone | default('UTC') }}"

    - name: Configure hostname
      ansible.windows.win_hostname:
        name: "{{ inventory_hostname }}"
      register: hostname_result

    - name: Reboot if hostname changed
      ansible.windows.win_reboot:
      when: hostname_result.reboot_required

    - name: Configure firewall rules
      community.windows.win_firewall_rule:
        name: "Allow TCP {{ item }}"
        localport: "{{ item }}"
        action: allow
        direction: in
        protocol: tcp
        state: present
        enabled: true
      loop:
        - 80
        - 443
```

### Integration with Monitoring

```yaml
# Using gathered facts to configure monitoring thresholds
- name: Configure monitoring based on Windows system specs
  hosts: windows
  tasks:
    - name: Set monitoring thresholds based on hardware
      ansible.windows.win_template:
        src: monitoring_config.json.j2
        dest: C:\ProgramData\Monitoring\config.json
      vars:
        memory_warning_threshold: "{{ (ansible_memtotal_mb * 0.8) | int }}"
        memory_critical_threshold: "{{ (ansible_memtotal_mb * 0.95) | int }}"
        cpu_warning_threshold: 80
        cpu_critical_threshold: 95

    - name: Register host with monitoring system
      ansible.builtin.uri:
        url: "https://monitoring.example.com/api/hosts"
        method: POST
        body_format: json
        body:
          hostname: "{{ inventory_hostname }}"
          ip_address: "{{ ansible_default_ipv4.address }}"
          os: "{{ ansible_distribution }}"
          memory_mb: "{{ ansible_memtotal_mb }}"
          cpus: "{{ ansible_processor_vcpus }}"
        headers:
          Authorization: "Bearer {{ monitoring_api_token }}"
        status_code: [200, 201, 409]
```

### Error Handling Patterns

```yaml
# Robust error handling over WinRM
- name: Robust task execution
  hosts: windows
  tasks:
    - name: Attempt primary operation
      ansible.windows.win_command: C:\Scripts\primary-task.cmd
      register: primary_result
      failed_when: false

    - name: Handle primary failure with fallback
      ansible.windows.win_command: C:\Scripts\fallback-task.cmd
      when: primary_result.rc != 0
      register: fallback_result

    - name: Report final status
      ansible.builtin.debug:
        msg: >-
          Task completed via {{ 'primary' if primary_result.rc == 0 else 'fallback' }} path.
          Return code: {{ primary_result.rc if primary_result.rc == 0 else fallback_result.rc }}

    - name: Fail if both paths failed
      ansible.builtin.fail:
        msg: "Both primary and fallback operations failed"
      when:
        - primary_result.rc != 0
        - fallback_result is defined
        - fallback_result.rc != 0
```

### Scheduling and Automation

```yaml
# Set up scheduled compliance scans using Windows Task Scheduler
- name: Configure automated scans
  hosts: windows
  tasks:
    - name: Create scan script
      ansible.windows.win_copy:
        dest: C:\Scripts\compliance_scan.ps1
        content: |
          $result = Test-Path C:\ProgramData\Monitoring\config.json
          if (-not $result) {
            Invoke-RestMethod -Uri https://hooks.example.com/alert -Method Post -ContentType 'application/json' -Body '{"text":"Compliance scan failed"}'
            exit 1
          }
          exit 0

    - name: Schedule weekly compliance scan
      community.windows.win_scheduled_task:
        name: "Weekly compliance scan"
        actions:
          - path: powershell.exe
            arguments: -NoProfile -ExecutionPolicy Bypass -File C:\Scripts\compliance_scan.ps1
        triggers:
          - type: weekly
            days_of_week: monday
            start_boundary: '2026-02-23T03:00:00'
        username: SYSTEM
        state: present
```
