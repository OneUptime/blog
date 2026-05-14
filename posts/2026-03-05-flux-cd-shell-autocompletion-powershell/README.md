# How to Configure Flux CD Shell Autocompletion for PowerShell

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, GitOps, Kubernetes, PowerShell, Shell, Autocompletion, Window

Description: Set up Flux CD CLI autocompletion in PowerShell for efficient command completion on Windows, macOS, and Linux.

---

PowerShell is the primary shell for Windows users and is also available on macOS and Linux. The Flux CD CLI supports PowerShell autocompletion, enabling tab completion for all commands, subcommands, and flags. This guide covers the complete setup process for PowerShell 5.1 (Windows PowerShell) and PowerShell 7+ (PowerShell Core).

## Prerequisites

Before configuring autocompletion, make sure you have:

- The Flux CLI installed (verify with `flux --version`)
- PowerShell 5.1 or later (verify with `$PSVersionTable.PSVersion`)

Check your PowerShell version.

```powershell
# Check PowerShell version

$PSVersionTable.PSVersion
```

## Understanding PowerShell Completion

PowerShell uses a `Register-ArgumentCompleter` mechanism to provide tab completion for commands. The Flux CLI generates a PowerShell script that registers completion functions for the `flux` command. When you press Tab, PowerShell calls these functions to provide context-aware suggestions.

## Step 1: Locate Your PowerShell Profile

PowerShell has a profile script that runs every time a new session starts. You will add the Flux completion to this profile.

Find your profile path.

```powershell
# Display your PowerShell profile path
echo $PROFILE
```

This typically returns one of these paths:

- **Windows PowerShell 5.1:** `C:\Users\<username>\Documents\WindowsPowerShell\Microsoft.PowerShell_profile.ps1`
- **PowerShell 7+ (Windows):** `C:\Users\<username>\Documents\PowerShell\Microsoft.PowerShell_profile.ps1`
- **PowerShell 7+ (macOS/Linux):** `~/.config/powershell/Microsoft.PowerShell_profile.ps1`

## Step 2: Create the Profile File If It Does Not Exist

The profile file may not exist by default. Create it if needed.

```powershell
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

There are three approaches to adding the completion script.

### Option A: Inline Generation (Simplest)

Add a line to your profile that generates and executes the completion script each time PowerShell starts.

```powershell
# Add Flux completion to your PowerShell profile
Add-Content -Path $PROFILE -Value 'flux completion powershell | Out-String | Invoke-Expression'
```

This runs `flux completion powershell` on every shell startup and evaluates the output. It ensures the completions are always current but adds a brief startup delay.

### Option B: Pre-Generated Script (Better Performance)

Generate the completion script once and source it from a file for faster startup.

```powershell
# Generate the completion script to a file
$FluxCompletionPath = Join-Path $HOME '.flux-completion.ps1'
flux completion powershell > $FluxCompletionPath

# Add the source command to your profile
Add-Content -Path $PROFILE -Value '. (Join-Path $HOME ''.flux-completion.ps1'')'
```

Remember to regenerate the file whenever you update the Flux CLI.

### Option C: Current Session Only

If you want to test the completions before making them permanent, run the following in your current session.

```powershell
# Load Flux completions for the current session only
flux completion powershell | Out-String | Invoke-Expression
```

This does not persist across sessions.

## Step 4: Reload Your Profile

Apply the changes by reloading your PowerShell profile.

```powershell
# Reload the PowerShell profile
. $PROFILE
```

If you encounter an execution policy error, adjust the policy.

```powershell
# Allow script execution for the current user
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

Then reload the profile again.

## Step 5: Test the Autocompletion

Verify the completions are working by typing `flux` and pressing Tab.

```powershell
# Type flux and press Tab to cycle through commands
flux <Tab>
```

PowerShell cycles through available completions with each Tab press. With PSReadLine, Ctrl+Spacebar commonly opens menu completion on Windows; key bindings can vary by platform and terminal.

Test subcommand completion.

```powershell
# Complete subcommands
flux create <Tab>
# Cycles through: source, kustomization, helmrelease, alert, etc.

# Complete flags
flux bootstrap github --<Tab>
# Cycles through: --owner, --repository, --branch, --path, etc.
```

## Enhancing the Completion Experience with PSReadLine

PowerShell 7+ includes PSReadLine, which provides a richer completion interface. Configure it for a better experience with Flux completions.

```powershell
# Add to your profile for menu-style completion
Set-PSReadLineKeyHandler -Key Tab -Function MenuComplete
```

With `MenuComplete`, pressing Tab shows an interactive menu of all options instead of cycling one at a time. Use arrow keys to navigate and Enter to select.

For an even more informative display of command predictions, enable list view if your PSReadLine version supports Predictive IntelliSense.

```powershell
# Show predictive suggestions in a list
Set-PSReadLineOption -PredictionViewStyle ListView
```

Add these to your profile for persistence.

```powershell
# Add PSReadLine enhancements to your profile
Add-Content -Path $PROFILE -Value @'
Set-PSReadLineKeyHandler -Key Tab -Function MenuComplete
Set-PSReadLineOption -PredictionViewStyle ListView
'@
```

## Complete Profile Example

Here is a complete PowerShell profile snippet with Flux completions and enhanced completion settings.

```powershell
# Flux CD CLI autocompletion
flux completion powershell | Out-String | Invoke-Expression

# Enhanced tab completion with PSReadLine
Set-PSReadLineKeyHandler -Key Tab -Function MenuComplete
Set-PSReadLineOption -PredictionViewStyle ListView

# Optional: Flux alias
Set-Alias -Name f -Value flux
Register-ArgumentCompleter -CommandName 'f' -ScriptBlock ${__fluxCompleterBlock}
```

## Setting Up an Alias

Create a short alias for the flux command.

```powershell
# Create a persistent alias for flux
Add-Content -Path $PROFILE -Value 'Set-Alias -Name f -Value flux'
Add-Content -Path $PROFILE -Value 'Register-ArgumentCompleter -CommandName ''f'' -ScriptBlock ${__fluxCompleterBlock}'
```

The completion script registers completions for the `flux` command name. Register the same completer for the alias after loading the Flux completion script if you want tab completion to work with `f`.

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
sudo apt-get install -y wget apt-transport-https software-properties-common
source /etc/os-release
wget -q https://packages.microsoft.com/config/ubuntu/$VERSION_ID/packages-microsoft-prod.deb
sudo dpkg -i packages-microsoft-prod.deb
rm packages-microsoft-prod.deb
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

```powershell
# Regenerate the completion script
$FluxCompletionPath = Join-Path $HOME '.flux-completion.ps1'
flux completion powershell > $FluxCompletionPath
```

## Troubleshooting

**"flux is not recognized as a cmdlet" error:** Ensure the Flux CLI is installed and its directory is in your PATH. For Chocolatey installations, the binary is in `C:\ProgramData\chocolatey\bin\`.

**Execution policy prevents profile loading:** Change the execution policy to allow running local scripts.

```powershell
# Set execution policy
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser

# Verify the policy
Get-ExecutionPolicy -Scope CurrentUser
```

**Profile file not loading:** Verify the profile path and that the file contains valid PowerShell commands.

```powershell
# Display profile path and check if file exists
echo $PROFILE
Test-Path $PROFILE
Get-Content $PROFILE
```

**Slow startup:** If using inline generation, the `flux completion powershell` command runs on every startup. Switch to the pre-generated script method (Option B) for faster startup times.

**Tab only cycles through file names:** The completion script is not loaded. Check your profile for syntax errors and ensure the Flux completion line is present.

```powershell
# Test completion registration manually
flux completion powershell | Out-String | Invoke-Expression
flux <Tab>
```

**Completions not working in VS Code terminal:** Ensure the VS Code integrated terminal is using the same PowerShell version as your external terminal. Set the default terminal profile in VS Code settings.

## Conclusion

You now have Flux CD autocompletion configured in PowerShell. Combined with PSReadLine enhancements like menu completion and prediction list view, you have a productive environment for managing Flux CD from the command line. Tab completion covers every Flux command, subcommand, and flag, making it easy to work with Flux without memorizing the full CLI syntax. Remember to refresh the completion script after upgrading the Flux CLI to access new commands and options.
