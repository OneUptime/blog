# How to Use Ansible to Manage Windows Power Settings

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, Windows, Power Management, Server Configuration

Description: Configure Windows power settings with Ansible to ensure servers run on the optimal power plan and prevent unwanted sleep or hibernation.

---

Power management on Windows servers is one of those settings that often gets overlooked during provisioning. The default power plan on many Windows installations is "Balanced," which throttles CPU performance to save energy. This is fine for laptops, but on a production server, you want every bit of processing power available. I have seen performance issues in production that were ultimately traced back to a server running on the wrong power plan.

Ansible lets you standardize power settings across your entire server fleet, ensuring consistent performance and preventing surprises like servers going to sleep during batch processing jobs.

## Understanding Windows Power Plans

Windows comes with three built-in power plans, each identified by a GUID:

| Power Plan | GUID | Description |
|------------|------|-------------|
| Balanced | `381b4222-f694-41f0-9685-ff5bb260df2e` | Default, throttles CPU when idle |
| High Performance | `8c5e7fda-e8bf-4a96-9a85-a6e23a8c635c` | Maximum performance, no throttling |
| Power Saver | `a1841308-3541-4fab-bc81-f71556f20b4a` | Maximum power savings, reduced performance |

On Windows Server, you almost always want **High Performance**. On workstations, Balanced might be appropriate depending on the use case.

## Setting the Active Power Plan

The simplest and most impactful change is activating the High Performance power plan:

```yaml
# playbook-power-plan.yml
# Sets the active power plan to High Performance on all servers
- name: Configure power plan
  hosts: windows
  tasks:
    - name: Set High Performance power plan
      ansible.windows.win_shell: |
        # Activate the High Performance power plan
        powercfg /setactive 8c5e7fda-e8bf-4a96-9a85-a6e23a8c635c
        $active = powercfg /getactivescheme
        Write-Output $active
      register: power_plan

    - name: Display active power plan
      ansible.builtin.debug:
        msg: "{{ power_plan.stdout }}"
```

## Disabling Sleep and Hibernation

Servers should never go to sleep or hibernate. Here is how to make sure they do not:

```yaml
# playbook-disable-sleep.yml
# Disables all sleep and hibernation settings on servers
- name: Disable sleep and hibernation
  hosts: windows
  tasks:
    - name: Disable sleep on AC power
      ansible.windows.win_shell: |
        # Set sleep timeout to 0 (never) for AC power
        powercfg /change standby-timeout-ac 0

    - name: Disable sleep on battery (for UPS scenarios)
      ansible.windows.win_shell: |
        powercfg /change standby-timeout-dc 0

    - name: Disable monitor timeout on AC
      ansible.windows.win_shell: |
        powercfg /change monitor-timeout-ac 0

    - name: Disable hibernation completely
      ansible.windows.win_shell: |
        powercfg /hibernate off

    - name: Disable hybrid sleep
      ansible.windows.win_shell: |
        # Hybrid sleep combines sleep and hibernation
        # Subgroup: Sleep (238c9fa8-...), Setting: Allow hybrid sleep (94ac6d29-...)
        powercfg /setacvalueindex scheme_current 238c9fa8-0aad-41ed-83f4-97be242c8f20 94ac6d29-73ce-41a6-809f-6363ba21b47e 0
        powercfg /setactive scheme_current

    - name: Verify sleep settings
      ansible.windows.win_shell: |
        $settings = @{
          "HibernationEnabled" = (Get-ItemProperty -Path "HKLM:\SYSTEM\CurrentControlSet\Control\Power" -Name "HibernateEnabled" -ErrorAction SilentlyContinue).HibernateEnabled
          "ActivePlan" = (powercfg /getactivescheme)
        }
        $settings | ConvertTo-Json
      register: sleep_settings

    - name: Show settings
      ansible.builtin.debug:
        msg: "{{ sleep_settings.stdout }}"
```

## Configuring Hard Disk Timeout

For servers with spinning disks, you may want to prevent the disks from spinning down:

```yaml
# playbook-disk-timeout.yml
# Prevents hard disks from spinning down on servers
- name: Configure disk power settings
  hosts: windows
  tasks:
    - name: Set hard disk timeout to never on AC
      ansible.windows.win_shell: |
        powercfg /change disk-timeout-ac 0

    - name: Set hard disk timeout to never on DC
      ansible.windows.win_shell: |
        powercfg /change disk-timeout-dc 0
```

## Configuring Processor Power Management

The processor power settings control CPU frequency scaling. On servers, you want the CPU running at full speed:

```yaml
# playbook-cpu-power.yml
# Configures processor power management for maximum server performance
- name: Configure processor power
  hosts: windows
  tasks:
    - name: Set minimum processor state to 100% on AC
      ansible.windows.win_shell: |
        # Processor Power Management subgroup GUID
        $processorGuid = "54533251-82be-4824-96c1-47b60b740d00"
        # Minimum processor state setting GUID
        $minStateGuid = "893dee8e-2bef-41e0-89c6-b55d0929964c"
        powercfg /setacvalueindex scheme_current $processorGuid $minStateGuid 100
        powercfg /setactive scheme_current

    - name: Set maximum processor state to 100% on AC
      ansible.windows.win_shell: |
        $processorGuid = "54533251-82be-4824-96c1-47b60b740d00"
        # Maximum processor state setting GUID
        $maxStateGuid = "bc5038f7-23e0-4960-96da-33abaf5935ec"
        powercfg /setacvalueindex scheme_current $processorGuid $maxStateGuid 100
        powercfg /setactive scheme_current

    - name: Set processor cooling policy to active
      ansible.windows.win_shell: |
        $processorGuid = "54533251-82be-4824-96c1-47b60b740d00"
        # Cooling policy GUID (1 = Active, 0 = Passive)
        $coolingGuid = "94d3a615-a899-4ac5-ae2b-e4d8f634367f"
        powercfg /setacvalueindex scheme_current $processorGuid $coolingGuid 1
        powercfg /setactive scheme_current
```

## Creating a Custom Power Plan

Sometimes the built-in plans do not quite match your needs. You can create a custom power plan based on an existing one:

```yaml
# playbook-custom-plan.yml
# Creates a custom power plan optimized for database servers
- name: Create custom power plan
  hosts: database_servers
  vars:
    custom_plan_name: "Database Server Optimized"
    custom_plan_guid: "12345678-1234-1234-1234-123456789abc"

  tasks:
    - name: Check if custom plan already exists
      ansible.windows.win_shell: |
        $plan = powercfg /list | Select-String "{{ custom_plan_guid }}"
        if ($plan) { Write-Output "EXISTS" } else { Write-Output "MISSING" }
      register: plan_check

    - name: Create custom plan based on High Performance
      ansible.windows.win_shell: |
        # Duplicate High Performance plan with a custom GUID
        powercfg /duplicatescheme 8c5e7fda-e8bf-4a96-9a85-a6e23a8c635c {{ custom_plan_guid }}
        powercfg /changename {{ custom_plan_guid }} "{{ custom_plan_name }}" "Optimized for database workloads"
      when: plan_check.stdout | trim == "MISSING"

    - name: Configure USB selective suspend to disabled
      ansible.windows.win_shell: |
        # USB settings subgroup
        $usbGuid = "2a737441-1930-4402-8d77-b2bebba308a3"
        # USB selective suspend setting
        $suspendGuid = "48e6b7a6-50f5-4782-a5d4-53bb8f07e226"
        powercfg /setacvalueindex {{ custom_plan_guid }} $usbGuid $suspendGuid 0
      when: plan_check.stdout | trim == "MISSING"

    - name: Configure PCI Express link state power management to off
      ansible.windows.win_shell: |
        # PCI Express subgroup
        $pcieGuid = "501a4d13-42af-4429-9fd1-a8218c268e20"
        # Link state setting (0 = Off)
        $linkGuid = "ee12f906-d277-404b-b6da-e5fa1a576df5"
        powercfg /setacvalueindex {{ custom_plan_guid }} $pcieGuid $linkGuid 0

    - name: Activate the custom plan
      ansible.windows.win_shell: |
        powercfg /setactive {{ custom_plan_guid }}
        powercfg /getactivescheme
      register: activated

    - name: Show active plan
      ansible.builtin.debug:
        msg: "{{ activated.stdout }}"
```

## Complete Server Power Configuration Playbook

Here is a comprehensive playbook that configures all power-related settings for a production server:

```yaml
# playbook-server-power.yml
# Complete power configuration for production Windows servers
- name: Configure server power settings
  hosts: windows
  tasks:
    - name: Activate High Performance power plan
      ansible.windows.win_shell: |
        powercfg /setactive 8c5e7fda-e8bf-4a96-9a85-a6e23a8c635c

    - name: Disable all sleep timers
      ansible.windows.win_shell: |
        powercfg /change standby-timeout-ac 0
        powercfg /change standby-timeout-dc 0
        powercfg /change monitor-timeout-ac 0
        powercfg /change monitor-timeout-dc 0
        powercfg /change disk-timeout-ac 0
        powercfg /change disk-timeout-dc 0
        powercfg /hibernate off

    - name: Configure processor for maximum performance
      ansible.windows.win_shell: |
        $cpu = "54533251-82be-4824-96c1-47b60b740d00"
        $minState = "893dee8e-2bef-41e0-89c6-b55d0929964c"
        $maxState = "bc5038f7-23e0-4960-96da-33abaf5935ec"
        $cooling = "94d3a615-a899-4ac5-ae2b-e4d8f634367f"

        # Min processor state = 100%
        powercfg /setacvalueindex scheme_current $cpu $minState 100
        # Max processor state = 100%
        powercfg /setacvalueindex scheme_current $cpu $maxState 100
        # Active cooling
        powercfg /setacvalueindex scheme_current $cpu $cooling 1
        powercfg /setactive scheme_current

    - name: Disable USB selective suspend
      ansible.windows.win_shell: |
        $usb = "2a737441-1930-4402-8d77-b2bebba308a3"
        $suspend = "48e6b7a6-50f5-4782-a5d4-53bb8f07e226"
        powercfg /setacvalueindex scheme_current $usb $suspend 0
        powercfg /setactive scheme_current

    - name: Configure wake timers to important only
      ansible.windows.win_regedit:
        path: HKLM:\SOFTWARE\Policies\Microsoft\Power\PowerSettings\BD3B718A-0680-4D9D-8AB2-E1D2B4AC806D
        name: ACSettingIndex
        data: 1
        type: dword
        state: present

    - name: Generate power configuration report
      ansible.windows.win_shell: |
        powercfg /query > C:\Temp\power-config.txt
        $active = powercfg /getactivescheme
        $hibernate = (Get-ItemProperty -Path "HKLM:\SYSTEM\CurrentControlSet\Control\Power" -Name "HibernateEnabled" -ErrorAction SilentlyContinue).HibernateEnabled
        @{
          ActivePlan = $active.Trim()
          HibernationEnabled = $hibernate
        } | ConvertTo-Json
      register: power_report

    - name: Display power configuration summary
      ansible.builtin.debug:
        msg: "{{ power_report.stdout | from_json }}"
```

## Auditing Power Settings

Before making changes, it can be helpful to audit the current power configuration across your fleet:

```yaml
# playbook-audit-power.yml
# Audits current power settings across all Windows servers
- name: Audit power settings
  hosts: windows
  tasks:
    - name: Get current power configuration
      ansible.windows.win_shell: |
        $active = powercfg /getactivescheme
        $planGuid = ($active -replace '.*: (\S+)\s.*','$1')
        @{
          Hostname = $env:COMPUTERNAME
          ActivePlan = $active.Trim()
          SleepAC = (powercfg /query $planGuid 238c9fa8-0aad-41ed-83f4-97be242c8f20 29f6c1db-86da-48c5-9fdb-f2b67b1f44da | Select-String "Current AC" | ForEach-Object { $_.ToString().Trim() })
          HibernateEnabled = (Get-ItemProperty "HKLM:\SYSTEM\CurrentControlSet\Control\Power" -Name "HibernateEnabled" -ErrorAction SilentlyContinue).HibernateEnabled
        } | ConvertTo-Json
      register: power_audit

    - name: Display power audit results
      ansible.builtin.debug:
        msg: "{{ power_audit.stdout | from_json }}"
```

## Things to Watch Out For

**Virtual machines may ignore power settings.** Hypervisors like Hyper-V and VMware manage CPU scheduling at the host level. Power plan settings in the guest OS may have limited effect. Still, it is good practice to set them correctly.

**BIOS/UEFI power settings matter too.** The OS power plan works alongside firmware-level power management. For maximum performance, also check BIOS settings like C-States and P-States.

**Windows Update can reset power plans.** Some Windows updates have been known to reset the active power plan to Balanced. Running your Ansible playbook periodically or through a scheduled job protects against this drift.

**Battery-backed servers.** Some rack-mounted servers have battery backup units. The "DC" (battery) settings in powercfg apply when the server is running on battery. Configure these too to prevent unexpected sleep during power events.

Getting power settings right is a small configuration change that can have a measurable impact on server performance. With Ansible, you can enforce the correct power plan across your entire infrastructure and verify that drift has not occurred.
