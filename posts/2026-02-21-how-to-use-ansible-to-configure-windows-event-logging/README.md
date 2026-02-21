# How to Use Ansible to Configure Windows Event Logging

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, Windows, Event Logging, Monitoring

Description: Configure Windows Event Logging with Ansible to manage log sizes, retention policies, and event forwarding across your infrastructure.

---

Windows Event Logging is the backbone of monitoring and auditing on Windows systems. Every security event, application crash, system warning, and service state change gets recorded in the Event Log. But the default settings are often insufficient for production environments. Log sizes are too small, retention policies are wrong for compliance requirements, and critical audit events are not enabled by default.

Ansible gives you the ability to standardize Event Log configuration across your entire fleet of Windows servers and workstations. In this post, I will walk through configuring log sizes, enabling audit policies, setting up event subscriptions, and forwarding events to central collectors.

## Configuring Event Log Properties

The most basic configuration involves setting log sizes and retention policies. Windows has several built-in log channels, with Application, Security, System, and Setup being the most commonly used.

```yaml
# playbook-log-config.yml
# Configures Event Log sizes and retention policies for compliance
- name: Configure Windows Event Logs
  hosts: windows
  tasks:
    - name: Configure Security log - increase size and set retention
      ansible.windows.win_shell: |
        # Set max log size to 1GB and enable auto-backup when full
        $logName = "Security"
        $log = Get-WinEvent -ListLog $logName
        $log.MaximumSizeInBytes = 1073741824
        $log.LogMode = "AutoBackup"
        $log.SaveChanges()
        Write-Output "Security log configured: MaxSize=1GB, Mode=AutoBackup"
      register: security_log

    - name: Configure Application log
      ansible.windows.win_shell: |
        $logName = "Application"
        $log = Get-WinEvent -ListLog $logName
        $log.MaximumSizeInBytes = 536870912
        $log.LogMode = "AutoBackup"
        $log.SaveChanges()
        Write-Output "Application log configured: MaxSize=512MB, Mode=AutoBackup"

    - name: Configure System log
      ansible.windows.win_shell: |
        $logName = "System"
        $log = Get-WinEvent -ListLog $logName
        $log.MaximumSizeInBytes = 536870912
        $log.LogMode = "AutoBackup"
        $log.SaveChanges()
        Write-Output "System log configured: MaxSize=512MB, Mode=AutoBackup"
```

Log modes available are:

| Mode | Behavior |
|------|----------|
| `Circular` | Overwrites oldest events when full (default) |
| `AutoBackup` | Archives the log and starts fresh when full |
| `Retain` | Stops logging when full (requires manual clearing) |

For most production environments, `AutoBackup` is the best choice. It preserves all events while preventing the log from growing indefinitely.

## Configuring via Registry

You can also set Event Log properties through the registry, which is more idempotent with Ansible:

```yaml
# playbook-log-registry.yml
# Configures Event Log properties via registry for better idempotency
- name: Configure Event Logs via registry
  hosts: windows
  vars:
    event_logs:
      - name: Application
        max_size_kb: 524288
        retention: 0
      - name: Security
        max_size_kb: 1048576
        retention: 0
      - name: System
        max_size_kb: 524288
        retention: 0
      - name: Setup
        max_size_kb: 262144
        retention: 0

  tasks:
    - name: Set max log size for each log
      ansible.windows.win_regedit:
        path: "HKLM:\\SYSTEM\\CurrentControlSet\\Services\\EventLog\\{{ item.name }}"
        name: MaxSize
        data: "{{ item.max_size_kb * 1024 }}"
        type: dword
        state: present
      loop: "{{ event_logs }}"
      loop_control:
        label: "{{ item.name }}"

    - name: Set retention policy for each log
      ansible.windows.win_regedit:
        path: "HKLM:\\SYSTEM\\CurrentControlSet\\Services\\EventLog\\{{ item.name }}"
        name: Retention
        data: "{{ item.retention }}"
        type: dword
        state: present
      loop: "{{ event_logs }}"
      loop_control:
        label: "{{ item.name }}"
```

A retention value of `0` means "overwrite as needed" and a value of `-1` means "never overwrite."

## Enabling Advanced Audit Policies

The default audit policy in Windows is minimal. For security monitoring and compliance, you need to enable granular audit policies. Windows has two layers: the legacy audit policy and the advanced audit policy. Always use the advanced audit policy for fine-grained control.

```yaml
# playbook-audit-policy.yml
# Enables advanced audit policies for security monitoring
- name: Configure Advanced Audit Policy
  hosts: windows
  tasks:
    - name: Force advanced audit policy over legacy policy
      ansible.windows.win_regedit:
        path: HKLM:\SYSTEM\CurrentControlSet\Control\Lsa
        name: SCENoApplyLegacyAuditPolicy
        data: 1
        type: dword
        state: present

    - name: Configure audit subcategories
      ansible.windows.win_shell: |
        # Enable success and failure auditing for key categories
        $policies = @(
            @{Name="Logon"; Success=$true; Failure=$true},
            @{Name="Logoff"; Success=$true; Failure=$false},
            @{Name="Account Lockout"; Success=$true; Failure=$true},
            @{Name="Process Creation"; Success=$true; Failure=$true},
            @{Name="Credential Validation"; Success=$true; Failure=$true},
            @{Name="Security Group Management"; Success=$true; Failure=$true},
            @{Name="User Account Management"; Success=$true; Failure=$true},
            @{Name="Directory Service Access"; Success=$true; Failure=$true},
            @{Name="File System"; Success=$true; Failure=$true},
            @{Name="Registry"; Success=$true; Failure=$true}
        )

        foreach ($policy in $policies) {
            $successFlag = if ($policy.Success) { "enable" } else { "disable" }
            $failureFlag = if ($policy.Failure) { "enable" } else { "disable" }
            auditpol /set /subcategory:"$($policy.Name)" /success:$successFlag /failure:$failureFlag
        }
        Write-Output "Audit policies configured successfully"
      register: audit_result

    - name: Display audit configuration result
      ansible.builtin.debug:
        msg: "{{ audit_result.stdout }}"
```

## Enabling PowerShell Script Block Logging

PowerShell script block logging records the full content of every PowerShell script that runs. This is invaluable for security monitoring and detecting malicious PowerShell activity.

```yaml
# playbook-ps-logging.yml
# Enables PowerShell logging for security monitoring
- name: Enable PowerShell Logging
  hosts: windows
  tasks:
    - name: Enable script block logging
      ansible.windows.win_regedit:
        path: HKLM:\SOFTWARE\Policies\Microsoft\Windows\PowerShell\ScriptBlockLogging
        name: EnableScriptBlockLogging
        data: 1
        type: dword
        state: present

    - name: Enable module logging
      ansible.windows.win_regedit:
        path: HKLM:\SOFTWARE\Policies\Microsoft\Windows\PowerShell\ModuleLogging
        name: EnableModuleLogging
        data: 1
        type: dword
        state: present

    - name: Log all modules
      ansible.windows.win_regedit:
        path: HKLM:\SOFTWARE\Policies\Microsoft\Windows\PowerShell\ModuleLogging\ModuleNames
        name: "*"
        data: "*"
        type: string
        state: present

    - name: Enable transcription logging
      ansible.windows.win_regedit:
        path: HKLM:\SOFTWARE\Policies\Microsoft\Windows\PowerShell\Transcription
        name: EnableTranscripting
        data: 1
        type: dword
        state: present

    - name: Set transcription output directory
      ansible.windows.win_regedit:
        path: HKLM:\SOFTWARE\Policies\Microsoft\Windows\PowerShell\Transcription
        name: OutputDirectory
        data: C:\PSTranscripts
        type: string
        state: present

    - name: Create transcription output directory
      ansible.windows.win_file:
        path: C:\PSTranscripts
        state: directory
```

## Setting Up Windows Event Forwarding (WEF)

Windows Event Forwarding lets you collect events from multiple machines into a central collector. Here is how to configure both the collector and the source machines:

```yaml
# playbook-wef-collector.yml
# Configures a Windows Event Collector server
- name: Configure WEF Collector
  hosts: event_collectors
  tasks:
    - name: Enable Windows Remote Management service
      ansible.windows.win_service:
        name: WinRM
        state: started
        start_mode: auto

    - name: Enable Windows Event Collector service
      ansible.windows.win_service:
        name: Wecsvc
        state: started
        start_mode: auto

    - name: Configure the collector
      ansible.windows.win_shell: |
        wecutil qc /q
        Write-Output "Event Collector configured"

    - name: Create a subscription for security events
      ansible.windows.win_shell: |
        # Define the subscription XML
        $subscriptionXml = @"
        <Subscription xmlns="http://schemas.microsoft.com/2006/03/windows/events/subscription">
          <SubscriptionId>SecurityEvents</SubscriptionId>
          <SubscriptionType>SourceInitiated</SubscriptionType>
          <Description>Collects security events from all servers</Description>
          <Enabled>true</Enabled>
          <Uri>http://schemas.microsoft.com/wbem/wsman/1/windows/EventLog</Uri>
          <ConfigurationMode>Normal</ConfigurationMode>
          <Query>
            <![CDATA[
              <QueryList>
                <Query Id="0" Path="Security">
                  <Select Path="Security">*[System[(Level=1 or Level=2 or Level=3)]]</Select>
                </Query>
                <Query Id="1" Path="Security">
                  <Select Path="Security">*[System[EventID=4624 or EventID=4625 or EventID=4648 or EventID=4672]]</Select>
                </Query>
              </QueryList>
            ]]>
          </Query>
          <ReadExistingEvents>false</ReadExistingEvents>
          <TransportName>HTTP</TransportName>
          <DeliveryMode>Push</DeliveryMode>
          <Heartbeat Interval="900000"/>
        </Subscription>
        "@

        $subscriptionXml | Out-File -FilePath C:\Temp\SecuritySubscription.xml -Encoding UTF8
        wecutil cs C:\Temp\SecuritySubscription.xml 2>&1
        Write-Output "Subscription created"
      register: subscription_result
```

And for the source machines that will forward events:

```yaml
# playbook-wef-source.yml
# Configures Windows servers to forward events to the collector
- name: Configure WEF Sources
  hosts: windows
  vars:
    collector_server: collector.corp.local

  tasks:
    - name: Configure event forwarding subscription manager
      ansible.windows.win_shell: |
        # Set the collector server address
        winrm set winrm/config/client '@{TrustedHosts="{{ collector_server }}"}'

    - name: Enable WinRM service
      ansible.windows.win_service:
        name: WinRM
        state: started
        start_mode: auto

    - name: Configure subscription manager via registry
      ansible.windows.win_regedit:
        path: HKLM:\SOFTWARE\Policies\Microsoft\Windows\EventLog\EventForwarding\SubscriptionManager
        name: "1"
        data: "Server=http://{{ collector_server }}:5985/wsman/SubscriptionManager/WEC,Refresh=60"
        type: string
        state: present

    - name: Restart WinRM to apply changes
      ansible.windows.win_service:
        name: WinRM
        state: restarted
```

## Complete Logging Hardening Playbook

Here is a comprehensive playbook that ties everything together for a production logging setup:

```yaml
# playbook-logging-hardened.yml
# Complete logging hardening playbook for compliance
- name: Harden Windows Event Logging
  hosts: windows
  tasks:
    - name: Verify event log service is running
      ansible.windows.win_service:
        name: EventLog
        state: started
        start_mode: auto

    - name: Create log archive directory
      ansible.windows.win_file:
        path: C:\EventLogArchive
        state: directory

    - name: Set archive directory permissions
      ansible.windows.win_acl:
        path: C:\EventLogArchive
        user: NT AUTHORITY\SYSTEM
        rights: FullControl
        type: allow
        state: present

    - name: Configure all critical logs
      ansible.windows.win_shell: |
        $logs = @{
            "Security" = 1073741824    # 1 GB
            "Application" = 536870912  # 512 MB
            "System" = 536870912       # 512 MB
            "Windows PowerShell" = 268435456  # 256 MB
        }
        foreach ($logName in $logs.Keys) {
            $log = Get-WinEvent -ListLog $logName
            $log.MaximumSizeInBytes = $logs[$logName]
            $log.LogMode = "AutoBackup"
            $log.SaveChanges()
        }
        Write-Output "All logs configured"

    - name: Verify final configuration
      ansible.windows.win_shell: |
        $results = @()
        foreach ($logName in @("Security","Application","System","Windows PowerShell")) {
            $log = Get-WinEvent -ListLog $logName
            $results += @{
                Name = $log.LogName
                MaxSizeMB = [math]::Round($log.MaximumSizeInBytes / 1MB, 0)
                Mode = $log.LogMode.ToString()
                RecordCount = $log.RecordCount
            }
        }
        $results | ConvertTo-Json
      register: final_config

    - name: Display final logging configuration
      ansible.builtin.debug:
        msg: "{{ final_config.stdout | from_json }}"
```

## Monitoring Tips

**Do not set logs to Retain mode in production.** If the log fills up and stops, you lose visibility into your systems. Use `AutoBackup` instead.

**Monitor Event Log service health.** If the Event Log service stops, nothing gets logged. Set up monitoring for this service.

**Archive logs before clearing.** If you need to clear a log, always archive it first. Use `wevtutil cl Security /bu:C:\Archive\Security-backup.evtx`.

**Test audit policies in stages.** Enabling every audit category at once can generate enormous amounts of data and impact performance. Start with the most critical categories and expand from there.

Proper Event Log configuration is not glamorous work, but it is absolutely essential for security monitoring, incident response, and compliance. With Ansible handling the configuration, you can be confident that every server in your environment has consistent, hardened logging settings.
