# How to Fix 'The Term az Is Not Recognized' Errors in Azure CLI on Windows

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Azure CLI, Windows, Troubleshooting, PATH, Installation, DevOps

Description: Step-by-step fixes for the common 'The term az is not recognized' error when running Azure CLI commands on Windows systems.

---

You install Azure CLI on Windows, open a terminal, type `az login`, and get hit with this:

```
az : The term 'az' is not recognized as the name of a cmdlet, function, script file, or operable program.
```

This is one of the most common issues people run into when getting started with Azure CLI on Windows. The good news is that the fix is usually straightforward. The bad news is that there are several different causes, so you might need to work through a few possibilities.

## Why This Happens

The error means that your shell cannot find the `az` executable. Windows looks for executables in directories listed in the PATH environment variable. If the directory containing `az.cmd` (the Azure CLI entry point on Windows) is not in your PATH, or if the installation did not complete properly, you get this error.

## Fix 1: Restart Your Terminal

This sounds obvious, but it catches a lot of people. When you install Azure CLI, the installer updates the system PATH. But terminals that were open before the installation do not pick up the change. They still use the old PATH from when they started.

Close every terminal window - PowerShell, Command Prompt, Windows Terminal, VS Code integrated terminal - and open a fresh one. Then try `az --version` again.

If you are using VS Code, you may need to completely restart VS Code, not just the integrated terminal.

## Fix 2: Verify the Installation

Check whether Azure CLI actually got installed. The default installation directory on Windows is:

```
C:\Program Files\Microsoft SDKs\Azure\CLI2\wbin
```

Or for older versions:

```
C:\Program Files (x86)\Microsoft SDKs\Azure\CLI2\wbin
```

Open File Explorer and check if these directories exist and contain `az.cmd`.

```powershell
# Check if az.cmd exists in the expected locations
Test-Path "C:\Program Files\Microsoft SDKs\Azure\CLI2\wbin\az.cmd"
Test-Path "C:\Program Files (x86)\Microsoft SDKs\Azure\CLI2\wbin\az.cmd"
```

If neither directory exists, the installation failed or was never completed. Download the MSI installer from Microsoft's official page and run it again.

## Fix 3: Add Azure CLI to PATH Manually

If the installation directory exists but `az` is not recognized, the PATH was not updated correctly. Add it manually.

```powershell
# Check current PATH entries
$env:Path -split ';' | Where-Object { $_ -like "*Azure*" }

# If nothing shows up, add the Azure CLI directory to PATH
# For the current session only:
$env:Path += ";C:\Program Files\Microsoft SDKs\Azure\CLI2\wbin"

# To make it permanent (requires admin PowerShell):
[Environment]::SetEnvironmentVariable(
    "Path",
    [Environment]::GetEnvironmentVariable("Path", "Machine") + ";C:\Program Files\Microsoft SDKs\Azure\CLI2\wbin",
    "Machine"
)
```

After setting the permanent PATH, open a new terminal and test:

```powershell
az --version
```

You can also add it through the Windows GUI:

1. Press Win + S, search for "Environment Variables"
2. Click "Edit the system environment variables"
3. Click "Environment Variables"
4. Under "System variables," find "Path" and click Edit
5. Click New and add `C:\Program Files\Microsoft SDKs\Azure\CLI2\wbin`
6. Click OK to save, then open a new terminal

## Fix 4: Install via Winget or Chocolatey

If the MSI installer gave you trouble, try alternative installation methods that tend to handle PATH configuration more reliably.

```powershell
# Using winget (built into Windows 10/11)
winget install Microsoft.AzureCLI

# Using Chocolatey
choco install azure-cli

# Using pip (if you have Python installed)
pip install azure-cli
```

Winget and Chocolatey both handle PATH setup as part of their installation process. After installing, open a new terminal and test.

## Fix 5: Check for Python PATH Conflicts (pip Installation)

If you installed Azure CLI through pip (Python's package manager), the `az` command lives in Python's Scripts directory rather than the Microsoft SDK directory. Make sure that directory is in your PATH.

```powershell
# Find where pip installed the az script
pip show azure-cli

# The 'Location' field shows the base directory
# The actual 'az' command will be in the Scripts subdirectory
# For example: C:\Users\YourName\AppData\Local\Programs\Python\Python311\Scripts

# Check if Python Scripts is in PATH
$env:Path -split ';' | Where-Object { $_ -like "*Python*Scripts*" }
```

Having multiple Python installations can also cause confusion. If you have both Python 3.9 and 3.11 installed, Azure CLI might be in one Scripts directory while your PATH points to the other.

## Fix 6: WSL and Windows PATH Mixing

If you use Windows Subsystem for Linux, there is a subtle issue where the Windows PATH and WSL PATH can get confused. Running `az` from a WSL terminal looks for the Linux version, not the Windows `.cmd` file.

If you need Azure CLI in WSL, install it separately inside WSL:

```bash
# Install Azure CLI inside WSL (Ubuntu/Debian)
curl -sL https://aka.ms/InstallAzureCLIDeb | sudo bash
```

If you want to use the Windows installation from WSL (not recommended but possible):

```bash
# Call the Windows az.cmd from WSL
/mnt/c/Program\ Files/Microsoft\ SDKs/Azure/CLI2/wbin/az.cmd --version

# Or create an alias
alias az='/mnt/c/Program\ Files/Microsoft\ SDKs/Azure/CLI2/wbin/az.cmd'
```

## Fix 7: PowerShell Execution Policy

In some cases, PowerShell's execution policy prevents running the `az.cmd` script. This usually produces a slightly different error about script execution being disabled, but it can sometimes manifest as "not recognized" in certain configurations.

```powershell
# Check current execution policy
Get-ExecutionPolicy

# If it is 'Restricted', change it to allow scripts
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

## Fix 8: Conflicting az Aliases

PowerShell defines built-in aliases that might conflict. Check if something is shadowing the `az` command:

```powershell
# Check if 'az' is aliased to something else
Get-Alias -Name az -ErrorAction SilentlyContinue

# Check if there is a function named 'az'
Get-Command az -ErrorAction SilentlyContinue

# Remove a conflicting alias if found
Remove-Alias -Name az -ErrorAction SilentlyContinue
```

## Verifying a Working Installation

Once you get `az` working, verify the full installation:

```powershell
# Check the version and installed extensions
az version

# Test authentication
az login

# List your subscriptions to confirm everything works
az account list --output table
```

The output of `az version` should show the CLI version plus the versions of all installed extensions. If you see version information, you are good to go.

## Keeping Azure CLI Updated

Outdated installations can cause their own set of problems. Keep Azure CLI current:

```powershell
# Update Azure CLI (MSI installation)
az upgrade

# Update via winget
winget upgrade Microsoft.AzureCLI

# Update via Chocolatey
choco upgrade azure-cli

# Update via pip
pip install --upgrade azure-cli
```

## When Running in CI/CD Pipelines

If you encounter the "not recognized" error in a CI/CD pipeline (Azure DevOps, GitHub Actions), the issue is usually that Azure CLI is not pre-installed on the build agent, or the agent's PATH does not include it.

For Azure DevOps hosted agents, Azure CLI is pre-installed. Use the `AzureCLI@2` task rather than trying to run `az` directly in a script task.

For GitHub Actions, use the `azure/cli@v2` action, which handles installation and authentication.

For self-hosted agents, make sure Azure CLI is installed on the agent machine and the service account running the agent has the correct PATH configuration. Service accounts sometimes have different environment variables than interactive users.

## The Nuclear Option

If nothing else works, do a complete clean installation:

1. Uninstall Azure CLI from Programs and Features
2. Delete `C:\Program Files\Microsoft SDKs\Azure\CLI2` if it still exists
3. Delete `%USERPROFILE%\.azure` to remove cached configurations
4. Remove any Azure CLI entries from the PATH
5. Restart your computer
6. Download the latest MSI installer from Microsoft
7. Run the installer with administrator privileges
8. Open a fresh terminal and run `az --version`

This scorched-earth approach resolves virtually every installation issue. It takes a few minutes but saves hours of debugging obscure configuration problems.
