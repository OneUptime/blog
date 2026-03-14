# Using Cilium Bugtool PowerShell Completion

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Cilium, Bugtool, PowerShell, Shell Completion, Windows

Description: Set up and use PowerShell tab completion for cilium-bugtool to streamline diagnostic workflows on Windows and cross-platform environments.

---

## Introduction

PowerShell provides a sophisticated tab-completion system through Register-ArgumentCompleter that works on Windows, macOS, and Linux. The `cilium-bugtool completion powershell` command generates a PowerShell script that registers argument completers for all cilium-bugtool commands and parameters.

PowerShell completions enhance the cilium-bugtool experience for operators who use PowerShell as their primary shell, especially on Windows-based management workstations that connect to Kubernetes clusters remotely.

This guide covers generating, installing, and using cilium-bugtool PowerShell completions.




## Prerequisites

- PowerShell 5.1+ (Windows) or PowerShell 7+ (cross-platform)
- `cilium-bugtool` binary available
- `kubectl` access to a Cilium cluster

## Generating and Installing Completions

### Quick Setup

\`\`\`powershell
## Generate and load completions in current session
cilium-bugtool completion powershell | Out-String | Invoke-Expression

## Test completion
cilium-bugtool <TAB>
\`\`\`

### Persistent Installation

Add to your PowerShell profile for automatic loading:

\`\`\`powershell
## Check your profile path
echo $PROFILE

## Create profile if it does not exist
if (!(Test-Path -Path $PROFILE)) {
    New-Item -ItemType File -Path $PROFILE -Force
}

## Add completion loading to profile
Add-Content -Path $PROFILE -Value "`ncilium-bugtool completion powershell | Out-String | Invoke-Expression"

## Alternatively, save to a file and dot-source it
cilium-bugtool completion powershell > "$HOME\cilium-bugtool-completion.ps1"
Add-Content -Path $PROFILE -Value ". $HOME\cilium-bugtool-completion.ps1"
\`\`\`

### Using the Completions

\`\`\`powershell
## Complete subcommands
cilium-bugtool <TAB>
## Cycles through: completion, help

## Complete flags
cilium-bugtool --<TAB>
## Shows available flags

## Complete completion shells
cilium-bugtool completion <TAB>
## Shows: bash, fish, powershell, zsh
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

PowerShell completions for cilium-bugtool bring the same tab-completion productivity to Windows and cross-platform PowerShell environments. Once loaded into your profile, completions are available in every session.



