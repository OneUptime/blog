# How to Create Windows Ansible Modules in PowerShell

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, Windows, PowerShell, Module Development

Description: Write custom Ansible modules in PowerShell for managing Windows systems with proper argument handling.

---

Windows Ansible modules are written in PowerShell instead of Python. They follow a different structure but similar concepts.

## Basic Windows Module

```powershell
#!powershell
# library/win_my_module.ps1

#AnsibleRequires -CSharpUtil Ansible.Basic

$spec = @{
    options = @{
        name = @{ type = 'str'; required = $true }
        state = @{ type = 'str'; default = 'present'; choices = @('present', 'absent') }
        value = @{ type = 'str' }
    }
    supports_check_mode = $true
}

$module = [Ansible.Basic.AnsibleModule]::Create($args, $spec)

$name = $module.Params.name
$state = $module.Params.state
$value = $module.Params.value

# Check current state
$current = Get-ItemProperty -Path "HKLM:\SOFTWARE\MyApp" -Name $name -ErrorAction SilentlyContinue

if ($state -eq 'present') {
    if ($null -eq $current -or $current.$name -ne $value) {
        if (-not $module.CheckMode) {
            Set-ItemProperty -Path "HKLM:\SOFTWARE\MyApp" -Name $name -Value $value
        }
        $module.Result.changed = $true
    }
} elseif ($state -eq 'absent') {
    if ($null -ne $current) {
        if (-not $module.CheckMode) {
            Remove-ItemProperty -Path "HKLM:\SOFTWARE\MyApp" -Name $name
        }
        $module.Result.changed = $true
    }
}

$module.ExitJson()
```

## Module Documentation

Windows modules use a companion Python file for documentation:

```python
# library/win_my_module.py (documentation only)
DOCUMENTATION = r"""
module: win_my_module
short_description: Manage Windows registry settings
options:
    name:
        description: Registry value name
        required: true
        type: str
"""
```

## Key Takeaways

Windows modules use PowerShell with the Ansible.Basic C# utility. Follow the same patterns: argument spec, check mode, idempotency. Use a companion .py file for documentation.
