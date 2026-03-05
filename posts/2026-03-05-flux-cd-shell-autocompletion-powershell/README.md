# How to Configure Flux CD Shell Autocompletion for PowerShell

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, GitOps, Kubernetes, PowerShell, Shell, Autocompletion, Windows

Description: Set up Flux CD CLI autocompletion in PowerShell for efficient command completion on Windows, macOS, and Linux.

---

PowerShell is the primary shell for Windows users and is also available on macOS and Linux. The Flux CD CLI supports PowerShell autocompletion, enabling tab completion for all commands, subcommands, and flags. This guide covers the complete setup process for PowerShell 5.1 (Windows PowerShell) and PowerShell 7+ (PowerShell Core).

## Prerequisites

Before configuring autocompletion, make sure you have:

- The Flux CLI installed (verify with `flux --version`)
- PowerShell 5.1 or later (verify with `$PSVersionTable.PSVersion`)

Check your PowerShell version.

```bash
# Check PowerShell version
$PSVersionTable.PSVersion
```

## Understanding PowerShell Completion

PowerShell uses a `Register-ArgumentCompleter` mechanism to provide tab completion for commands. The Flux CLI generates a PowerShell script that registers completion functions for the `flux` command. When you press Tab, PowerShell calls these functions to provide context-aware suggestions.

## Step 1: Locate Your PowerShell Profile

PowerShell has a profile script that runs every time a new session starts. You will add the Flux completion to this profile.

Find your profile path.

```bash
# Display your PowerShell profile path
echo $PROFILE
```

This typically returns one of these paths:

- **Windows PowerShell 5.1:** `C:\Users\<username>\Documents\WindowsPowerShell\Microsoft.PowerShell_profile.ps1`
- **PowerShell 7+ (Windows):** `C:\Users\<username>\Documents\PowerShell\Microsoft.PowerShell_profile.ps1`
- **PowerShell 7+ (macOS/Linux):** `~/.config/powershell/Microsoft.PowerShell_profile.ps1`

## Step 2: Create the Profile File If It Does Not Exist

The profile file may not exist by default. Create it if needed.

```bash
# Check if the profile file exists
Test-Path $PROFILE

# Create the profile file and its parent directory if they do not exist
if (!(Test-Path -Path (Split-Path $PROFILE))) {
    New-Item -ItemType Directory -Path (Split-Path $PROFILE) -Force
}
if (!(Test-Path -Path $PROFILE)) {
    New-Item -ItemType File -Path $PROFILE -Force
}
```

## Step 3: Add Flux Autocompletion to Your Profile

There are two approaches to adding the completion script.

### Option A: Inline Generation (Simplest)

Add a line to your profile that generates and executes the completion script each time PowerShell starts.

```bash
# Add Flux completion to your PowerShell profile
Add-Content -Path $PROFILE -Value 'flux completion powershell | Out-String | Invoke-Expression'
```

This runs `flux completion powershell` on every shell startup and evaluates the output. It ensures the completions are always current but adds a brief startup delay.

### Option B: Pre-Generated Script (Better Performance)

Generate the completion script once and source it from a file for faster startup.

```bash
# Generate the completion script to a file
flux completion powershell > "$HOME\.flux-completion.ps1"

# Add the source command to your profile
Add-Content -Path $PROFILE -Value '. "$HOME\.flux-completion.ps1"'
```

Remember to regenerate the file whenever you update the Flux CLI.

### Option C: Current Session Only

If you want to test the completions before making them permanent, run the following in your current session.

```bash
# Load Flux completions for the current session only
flux completion powershell | Out-String | Invoke-Expression
```

This does not persist across sessions.

## Step 4: Reload Your Profile

Apply the changes by reloading your PowerShell profile.

```bash
# Reload the PowerShell profile
. $PROFILE
```

If you encounter an execution policy error, adjust the policy.

```bash
# Allow script execution for the current user
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

Then reload the profile again.

## Step 5: Test the Autocompletion

Verify the completions are working by typing `flux` and pressing Tab.

```bash
# Type flux and press Tab to cycle through commands
flux <Tab>
```

PowerShell cycles through available completions with each Tab press. Press Ctrl+Space to see all available completions at once (in PowerShell 7+ with PSReadLine).

Test subcommand completion.

```bash
# Complete subcommands
flux create <Tab>
# Cycles through: source, kustomization, helmrelease, alert, etc.

# Complete flags
flux bootstrap github --<Tab>
# Cycles through: --owner, --repository, --branch, --path, etc.
```

## Enhancing the Completion Experience with PSReadLine

PowerShell 7+ includes PSReadLine, which provides a richer completion interface. Configure it for a better experience with Flux completions.

```bash
# Add to your profile for menu-style completion
Set-PSReadLineKeyHandler -Key Tab -Function MenuComplete
```

With `MenuComplete`, pressing Tab shows an interactive menu of all options instead of cycling one at a time. Use arrow keys to navigate and Enter to select.

For an even more informative display, enable list view.

```bash
# Show completions in a list with descriptions
Set-PSReadLineOption -PredictionViewStyle ListView
```

Add these to your profile for persistence.

```bash
# Add PSReadLine enhancements to your profile
Add-Content -Path $PROFILE -Value @'
Set-PSReadLineKeyHandler -Key Tab -Function MenuComplete
Set-PSReadLineOption -PredictionViewStyle ListView
'@
```

## Complete Profile Example

Here is a complete PowerShell profile snippet with Flux completions and enhanced completion settings.

```bash
# Flux CD CLI autocompletion
flux completion powershell | Out-String | Invoke-Expression

# Enhanced tab completion with PSReadLine
Set-PSReadLineKeyHandler -Key Tab -Function MenuComplete
Set-PSReadLineOption -PredictionViewStyle ListView

# Optional: Flux alias
Set-Alias -Name f -Value flux
```

## Setting Up an Alias

Create a short alias for the flux command.

```bash
# Create a persistent alias for flux
Add-Content -Path $PROFILE -Value 'Set-Alias -Name f -Value flux'
```

The completion will work with the alias automatically because PowerShell resolves the alias before applying completions.

## PowerShell on macOS and Linux

PowerShell Core (version 7+) is available on macOS and Linux. The Flux completion setup is identical across platforms.

Install PowerShell on macOS.

```bash
# Install PowerShell on macOS via Homebrew
brew install powershell/tap/powershell
```

Install PowerShell on Ubuntu.

```bash
# Install PowerShell on Ubuntu
sudo apt-get update
sudo apt-get install -y powershell
```

Launch PowerShell and follow the same steps above.

```bash
# Start PowerShell
pwsh
```

## Updating Completions After a Flux Upgrade

When you update the Flux CLI to a new version, update the completions as well.

If you use Option A (inline generation), completions update automatically on the next shell start.

If you use Option B (pre-generated script), regenerate the file.

```bash
# Regenerate the completion script
flux completion powershell > "$HOME\.flux-completion.ps1"
```

## Troubleshooting

**"flux is not recognized as a cmdlet" error:** Ensure the Flux CLI is installed and its directory is in your PATH. For Chocolatey installations, the binary is in `C:\ProgramData\chocolatey\bin\`.

**Execution policy prevents profile loading:** Change the execution policy to allow running local scripts.

```bash
# Set execution policy
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser

# Verify the policy
Get-ExecutionPolicy -Scope CurrentUser
```

**Profile file not loading:** Verify the profile path and that the file contains valid PowerShell commands.

```bash
# Display profile path and check if file exists
echo $PROFILE
Test-Path $PROFILE
Get-Content $PROFILE
```

**Slow startup:** If using inline generation, the `flux completion powershell` command runs on every startup. Switch to the pre-generated script method (Option B) for faster startup times.

**Tab only cycles through file names:** The completion script is not loaded. Check your profile for syntax errors and ensure the Flux completion line is present.

```bash
# Test completion registration manually
flux completion powershell | Out-String | Invoke-Expression
flux <Tab>
```

**Completions not working in VS Code terminal:** Ensure the VS Code integrated terminal is using the same PowerShell version as your external terminal. Set the default terminal profile in VS Code settings.

## Conclusion

You now have Flux CD autocompletion configured in PowerShell. Combined with PSReadLine enhancements like menu completion and list view, you have a productive environment for managing Flux CD from the command line. Tab completion covers every Flux command, subcommand, and flag, making it easy to work with Flux without memorizing the full CLI syntax. Remember to refresh the completion script after upgrading the Flux CLI to access new commands and options.
