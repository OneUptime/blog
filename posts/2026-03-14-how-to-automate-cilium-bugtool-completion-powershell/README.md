# Automating Cilium Bugtool PowerShell Completion Setup

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Cilium, Bugtool, PowerShell, Automation, Windows

Description: Automate the generation and deployment of cilium-bugtool PowerShell completions across Windows workstations and CI environments.

---

## Introduction

PowerShell provides a sophisticated tab-completion system through Register-ArgumentCompleter that works on Windows, macOS, and Linux. The `cilium-bugtool completion powershell` command generates a PowerShell script that registers argument completers for all cilium-bugtool commands and parameters.


Automating PowerShell completion setup is important for teams using Windows-based management stations. By scripting the installation into PowerShell profiles and distributing through group policy or configuration management, you ensure consistent tooling across the team.

This guide covers automated deployment of cilium-bugtool PowerShell completions.



## Prerequisites

- PowerShell 5.1+ (Windows) or PowerShell 7+ (cross-platform)
- `cilium-bugtool` binary available
- `kubectl` access to a Cilium cluster

## Automated Installation


\`\`\`powershell
# install-bugtool-completion.ps1
# Automated installer for cilium-bugtool PowerShell completions

\$ErrorActionPreference = "Stop"

# Generate completion script
\$completionScript = cilium-bugtool completion powershell

# Save to a dedicated directory
\$completionDir = Join-Path \$HOME ".cilium-completions"
if (!(Test-Path \$completionDir)) {
    New-Item -ItemType Directory -Path \$completionDir -Force | Out-Null
}

\$completionFile = Join-Path \$completionDir "cilium-bugtool.ps1"
\$completionScript | Out-File -FilePath \$completionFile -Encoding utf8

# Add to profile if not already present
\$profileContent = ""
if (Test-Path \$PROFILE) {
    \$profileContent = Get-Content \$PROFILE -Raw
}

\$sourceCommand = ". `"\$completionFile`""
if (\$profileContent -notlike "*cilium-bugtool*") {
    Add-Content -Path \$PROFILE -Value "`n# Cilium bugtool completion`n\$sourceCommand"
    Write-Host "Added completion to PowerShell profile"
} else {
    Write-Host "Completion already in profile"
}

Write-Host "Installation complete. Restart PowerShell or run: \$sourceCommand"
\`\`\`

### Group Policy Distribution

\`\`\`powershell
# For enterprise deployment via GPO startup script
\$networkShare = "\\\\server\\share\\cilium-completions"
\$localPath = "\$env:ProgramData\\cilium-completions"

if (!(Test-Path \$localPath)) {
    New-Item -ItemType Directory -Path \$localPath -Force | Out-Null
}

Copy-Item "\$networkShare\\cilium-bugtool.ps1" -Destination \$localPath -Force
\`\`\`



## Verification

```powershell
# Verify completions are registered
cilium-bugtool completion powershell | Out-String | Invoke-Expression
cilium-bugtool <TAB>
Write-Host "Completions working"
```

## Troubleshooting

- **Execution policy blocks script**: Use `Set-ExecutionPolicy RemoteSigned -Scope CurrentUser`.
- **Profile does not load**: Check `$PROFILE` path exists and is not blocked by antivirus.
- **Completions do not appear after Tab**: Ensure the binary is in PATH and Register-ArgumentCompleter ran without errors.
- **Cross-platform issues**: PowerShell 7 works on Linux/macOS but paths differ. Use `$HOME` instead of Windows-specific paths.

## Conclusion


Automated PowerShell completion deployment ensures consistent tooling across Windows workstations and CI environments. Profile integration and group policy distribution scale the setup from individual developers to enterprise teams.


