# How to Use Ansible to Execute PowerShell Commands on Windows

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, PowerShell, Windows, WinRM

Description: Learn how to run PowerShell commands and scripts on Windows hosts using Ansible with win_shell, win_command modules, and WinRM connectivity.

---

Ansible is not just for Linux. It manages Windows hosts just as effectively using WinRM (Windows Remote Management) for connectivity and PowerShell for command execution. The `win_shell` and `win_command` modules are the Windows equivalents of `shell` and `command`, and they let you run PowerShell on remote Windows machines from your Linux or macOS control node.

## Setting Up Windows Connectivity

Before running commands, you need WinRM configured on your Windows hosts and proper inventory settings.

Windows host preparation (run this PowerShell on each Windows host):

```powershell
# Enable WinRM on the Windows host
Enable-PSRemoting -Force
winrm quickconfig -q
winrm set winrm/config/service '@{AllowUnencrypted="true"}'
winrm set winrm/config/service/auth '@{Basic="true"}'
```

Ansible inventory for Windows hosts:

```ini
# inventory/windows.ini - Windows host inventory
[windows]
win-server-01 ansible_host=192.168.1.100
win-server-02 ansible_host=192.168.1.101

[windows:vars]
ansible_user=ansible_admin
ansible_password={{ vault_win_password }}
ansible_connection=winrm
ansible_winrm_transport=ntlm
ansible_winrm_server_cert_validation=ignore
ansible_port=5986
```

## Basic PowerShell Execution with win_shell

The `win_shell` module runs commands through PowerShell on the Windows host.

```yaml
# basic_powershell.yml - Basic PowerShell command execution
---
- name: Basic PowerShell commands on Windows
  hosts: windows

  tasks:
    - name: Get system information
      ansible.windows.win_shell: |
        Get-ComputerInfo | Select-Object CsName, WindowsVersion, OsArchitecture, CsNumberOfLogicalProcessors
      register: sys_info

    - name: Display system info
      ansible.builtin.debug:
        msg: "{{ sys_info.stdout_lines }}"

    - name: Check Windows version
      ansible.windows.win_shell: "[System.Environment]::OSVersion.Version"
      register: os_version

    - name: Get current date and time
      ansible.windows.win_shell: "Get-Date -Format 'yyyy-MM-dd HH:mm:ss'"
      register: current_time

    - name: Show results
      ansible.builtin.debug:
        msg: "OS: {{ os_version.stdout | trim }}, Time: {{ current_time.stdout | trim }}"
```

## win_command vs win_shell

Just like Linux, `win_command` runs executables directly while `win_shell` processes through PowerShell.

```yaml
# command_vs_shell.yml - Difference between win_command and win_shell
---
- name: win_command vs win_shell comparison
  hosts: windows

  tasks:
    # win_command - runs executables directly, no PowerShell processing
    - name: Run executable with win_command
      ansible.windows.win_command: hostname
      register: hostname_cmd

    # win_shell - processes through PowerShell, supports pipes and cmdlets
    - name: Run PowerShell with win_shell
      ansible.windows.win_shell: "Get-Process | Sort-Object CPU -Descending | Select-Object -First 10"
      register: top_processes

    # win_command cannot use PowerShell pipes or cmdlets
    # This would FAIL with win_command:
    # ansible.windows.win_command: "Get-Process | Sort-Object CPU"

    # win_shell supports PowerShell-specific features
    - name: Use PowerShell variables and pipes
      ansible.windows.win_shell: |
        $services = Get-Service | Where-Object {$_.Status -eq 'Running'}
        $services.Count
      register: running_services
```

## Managing Windows Services

PowerShell gives you full control over Windows services.

```yaml
# manage_services.yml - Windows service management with PowerShell
---
- name: Manage Windows services
  hosts: windows

  tasks:
    - name: Get status of critical services
      ansible.windows.win_shell: |
        $services = @('W3SVC', 'MSSQLSERVER', 'WinRM', 'Spooler')
        foreach ($svc in $services) {
          $status = Get-Service -Name $svc -ErrorAction SilentlyContinue
          if ($status) {
            Write-Output "$($svc): $($status.Status)"
          } else {
            Write-Output "$($svc): NOT INSTALLED"
          }
        }
      register: service_status

    - name: Display service status
      ansible.builtin.debug:
        msg: "{{ service_status.stdout_lines }}"

    - name: Restart IIS if running
      ansible.windows.win_shell: |
        $iis = Get-Service -Name W3SVC -ErrorAction SilentlyContinue
        if ($iis -and $iis.Status -eq 'Running') {
          Restart-Service W3SVC -Force
          Write-Output "IIS restarted"
        } else {
          Write-Output "IIS not running or not installed"
        }
      register: iis_restart
      changed_when: "'restarted' in iis_restart.stdout"
```

## Working with Windows Features and Roles

Install and manage Windows features using PowerShell.

```yaml
# windows_features.yml - Manage Windows features
---
- name: Manage Windows features with PowerShell
  hosts: windows

  tasks:
    - name: Check installed Windows features
      ansible.windows.win_shell: |
        Get-WindowsFeature | Where-Object {$_.Installed -eq $true} |
          Select-Object Name, DisplayName |
          Format-Table -AutoSize
      register: installed_features

    - name: Install IIS with management tools
      ansible.windows.win_shell: |
        $result = Install-WindowsFeature -Name Web-Server -IncludeManagementTools
        if ($result.Success) {
          Write-Output "INSTALLED"
        } else {
          Write-Output "FAILED"
        }
      register: iis_install
      changed_when: "'INSTALLED' in iis_install.stdout"

    - name: Install .NET Framework
      ansible.windows.win_shell: |
        $feature = Get-WindowsFeature -Name NET-Framework-45-Core
        if ($feature.Installed) {
          Write-Output "ALREADY_INSTALLED"
        } else {
          Install-WindowsFeature -Name NET-Framework-45-Core
          Write-Output "INSTALLED"
        }
      register: dotnet_install
      changed_when: "'INSTALLED' in dotnet_install.stdout and 'ALREADY' not in dotnet_install.stdout"
```

## File and Directory Operations

Manage files and directories using PowerShell.

```yaml
# file_operations.yml - File management with PowerShell
---
- name: File operations on Windows
  hosts: windows

  tasks:
    - name: Create directory structure
      ansible.windows.win_shell: |
        $dirs = @(
          'C:\Apps\MyApp\bin',
          'C:\Apps\MyApp\config',
          'C:\Apps\MyApp\logs',
          'C:\Apps\MyApp\data'
        )
        foreach ($dir in $dirs) {
          if (-not (Test-Path $dir)) {
            New-Item -ItemType Directory -Path $dir -Force | Out-Null
            Write-Output "Created: $dir"
          }
        }
      register: dir_result
      changed_when: "'Created' in dir_result.stdout"

    - name: Find large files
      ansible.windows.win_shell: |
        Get-ChildItem -Path C:\ -Recurse -File -ErrorAction SilentlyContinue |
          Where-Object {$_.Length -gt 100MB} |
          Sort-Object Length -Descending |
          Select-Object -First 10 |
          Format-Table Name, @{N='SizeMB';E={[math]::Round($_.Length/1MB,2)}}, DirectoryName -AutoSize
      register: large_files

    - name: Clean temporary files
      ansible.windows.win_shell: |
        $before = (Get-ChildItem -Path $env:TEMP -Recurse -ErrorAction SilentlyContinue |
          Measure-Object -Property Length -Sum).Sum / 1MB
        Remove-Item -Path "$env:TEMP\*" -Recurse -Force -ErrorAction SilentlyContinue
        $after = (Get-ChildItem -Path $env:TEMP -Recurse -ErrorAction SilentlyContinue |
          Measure-Object -Property Length -Sum).Sum / 1MB
        $freed = [math]::Round($before - $after, 2)
        Write-Output "Freed ${freed} MB from temp directory"
      register: cleanup_result
```

## Registry Management

Read and modify the Windows registry.

```yaml
# registry.yml - Windows registry operations
---
- name: Registry management with PowerShell
  hosts: windows

  tasks:
    - name: Read a registry value
      ansible.windows.win_shell: |
        Get-ItemProperty -Path 'HKLM:\SOFTWARE\Microsoft\Windows NT\CurrentVersion' |
          Select-Object ProductName, CurrentBuild, ReleaseId
      register: reg_info

    - name: Set a registry value
      ansible.windows.win_shell: |
        $path = 'HKLM:\SOFTWARE\MyApp'
        if (-not (Test-Path $path)) {
          New-Item -Path $path -Force | Out-Null
        }
        Set-ItemProperty -Path $path -Name 'Version' -Value '2.5.1'
        Set-ItemProperty -Path $path -Name 'InstallDate' -Value (Get-Date -Format 'yyyy-MM-dd')
        Write-Output "Registry updated"
      register: reg_set
      changed_when: "'updated' in reg_set.stdout"

    - name: Disable SMBv1 via registry
      ansible.windows.win_shell: |
        $current = Get-ItemProperty -Path 'HKLM:\SYSTEM\CurrentControlSet\Services\LanmanServer\Parameters' -Name 'SMB1' -ErrorAction SilentlyContinue
        if ($current.SMB1 -ne 0) {
          Set-ItemProperty -Path 'HKLM:\SYSTEM\CurrentControlSet\Services\LanmanServer\Parameters' -Name 'SMB1' -Value 0
          Write-Output "SMB1_DISABLED"
        } else {
          Write-Output "SMB1_ALREADY_DISABLED"
        }
      register: smb1_result
      changed_when: "'SMB1_DISABLED' in smb1_result.stdout and 'ALREADY' not in smb1_result.stdout"
```

## Running PowerShell Scripts

Execute full PowerShell scripts on Windows hosts.

```yaml
# run_scripts.yml - Execute PowerShell scripts
---
- name: Run PowerShell scripts on Windows
  hosts: windows

  tasks:
    - name: Copy and run a PowerShell script
      ansible.windows.win_copy:
        src: scripts/setup-iis.ps1
        dest: C:\Temp\setup-iis.ps1

    - name: Execute the script
      ansible.windows.win_shell: |
        Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope Process -Force
        & C:\Temp\setup-iis.ps1
      register: script_result

    - name: Run inline PowerShell script with error handling
      ansible.windows.win_shell: |
        try {
          # Check prerequisites
          if (-not (Get-Command 'dotnet' -ErrorAction SilentlyContinue)) {
            throw "dotnet CLI not found"
          }

          # Build the application
          Set-Location C:\Apps\MyApp
          dotnet restore
          dotnet build --configuration Release
          dotnet publish --configuration Release --output C:\Apps\MyApp\publish

          Write-Output "BUILD_SUCCESS"
        }
        catch {
          Write-Error "Build failed: $_"
          exit 1
        }
      register: build_result
      changed_when: "'BUILD_SUCCESS' in build_result.stdout"
```

## Gathering Windows System Information

Collect detailed system information for auditing.

```yaml
# system_info.yml - Gather Windows system information
---
- name: Gather Windows system information
  hosts: windows

  tasks:
    - name: Get comprehensive system report
      ansible.windows.win_shell: |
        $report = @{
          ComputerName = $env:COMPUTERNAME
          OS = (Get-CimInstance Win32_OperatingSystem).Caption
          RAM_GB = [math]::Round((Get-CimInstance Win32_ComputerSystem).TotalPhysicalMemory / 1GB, 2)
          CPU = (Get-CimInstance Win32_Processor).Name
          Uptime = ((Get-Date) - (Get-CimInstance Win32_OperatingSystem).LastBootUpTime).ToString()
          DiskSpace = @()
        }

        Get-CimInstance Win32_LogicalDisk -Filter "DriveType=3" | ForEach-Object {
          $report.DiskSpace += @{
            Drive = $_.DeviceID
            TotalGB = [math]::Round($_.Size / 1GB, 2)
            FreeGB = [math]::Round($_.FreeSpace / 1GB, 2)
          }
        }

        $report | ConvertTo-Json -Depth 3
      register: system_report

    - name: Parse and display system report
      ansible.builtin.set_fact:
        win_info: "{{ system_report.stdout | from_json }}"

    - name: Show system summary
      ansible.builtin.debug:
        msg: |
          Server: {{ win_info.ComputerName }}
          OS: {{ win_info.OS }}
          RAM: {{ win_info.RAM_GB }} GB
          Uptime: {{ win_info.Uptime }}
```

## Summary

Running PowerShell on Windows via Ansible uses the `win_shell` module for PowerShell commands with pipes and cmdlets, and `win_command` for direct executable calls. The setup requires WinRM on the target hosts and proper inventory variables for authentication. PowerShell's rich object pipeline, error handling with try/catch, and access to .NET libraries make it extremely powerful for Windows management. Use `ConvertTo-Json` in your PowerShell scripts when you want to parse structured output with Ansible's `from_json` filter. And always use `changed_when` to accurately report whether your PowerShell commands actually modified the system state.
