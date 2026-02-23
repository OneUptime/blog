# How to Install Terraform on Windows Step by Step

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Windows, Installation, DevOps, Infrastructure as Code

Description: A complete step-by-step guide to installing Terraform on Windows using manual download, Chocolatey, and winget with PATH configuration and verification.

---

Installing Terraform on Windows is straightforward, but there are a few ways to do it. You can download the binary manually from HashiCorp's website, use Chocolatey, or use Windows Package Manager (winget). In this guide, I will cover all three methods so you can pick whichever works best for your setup.

## Method 1 - Manual Installation (Download from HashiCorp)

This is the most traditional approach and gives you full control over where the binary lives on your system.

### Step 1 - Download Terraform

Go to the official Terraform downloads page at [https://developer.hashicorp.com/terraform/install](https://developer.hashicorp.com/terraform/install) and download the Windows AMD64 zip file. Alternatively, you can use PowerShell to download it directly:

```powershell
# Download the latest Terraform zip for Windows AMD64
# Replace the version number with the latest available
Invoke-WebRequest -Uri "https://releases.hashicorp.com/terraform/1.7.5/terraform_1.7.5_windows_amd64.zip" -OutFile "$env:TEMP\terraform.zip"
```

### Step 2 - Extract the Binary

Extract the zip file to a permanent location. I recommend creating a dedicated directory for it:

```powershell
# Create a directory for Terraform
New-Item -ItemType Directory -Force -Path "C:\terraform"

# Extract the zip file
Expand-Archive -Path "$env:TEMP\terraform.zip" -DestinationPath "C:\terraform" -Force
```

### Step 3 - Add Terraform to Your PATH

This is the step most people forget. You need to add the Terraform directory to your system PATH so you can run `terraform` from any directory.

Open PowerShell as Administrator and run:

```powershell
# Add Terraform to the system PATH permanently
$currentPath = [System.Environment]::GetEnvironmentVariable("Path", "Machine")
if ($currentPath -notlike "*C:\terraform*") {
    [System.Environment]::SetEnvironmentVariable("Path", "$currentPath;C:\terraform", "Machine")
    Write-Host "Terraform directory added to system PATH"
} else {
    Write-Host "Terraform directory already in PATH"
}
```

After modifying the PATH, close and reopen your terminal (PowerShell, Command Prompt, or Windows Terminal) for the change to take effect.

### Step 4 - Verify the Installation

Open a new terminal window and run:

```powershell
# Verify Terraform is accessible and check the version
terraform -version
```

You should see something like:

```
Terraform v1.7.5
on windows_amd64
```

## Method 2 - Install with Chocolatey

If you use Chocolatey (a popular Windows package manager), installation is much simpler.

### Step 1 - Install Chocolatey (If Needed)

If you do not have Chocolatey installed, open PowerShell as Administrator and run:

```powershell
# Install Chocolatey package manager
Set-ExecutionPolicy Bypass -Scope Process -Force
[System.Net.ServicePointManager]::SecurityProtocol = [System.Net.ServicePointManager]::SecurityProtocol -bor 3072
iex ((New-Object System.Net.WebClient).DownloadString('https://community.chocolatey.org/install.ps1'))
```

### Step 2 - Install Terraform

```powershell
# Install Terraform using Chocolatey
choco install terraform -y
```

That is it. Chocolatey handles downloading, extracting, and adding Terraform to your PATH automatically.

### Updating Terraform with Chocolatey

```powershell
# Upgrade Terraform to the latest version
choco upgrade terraform -y
```

## Method 3 - Install with winget

Windows 11 (and recent Windows 10 builds) comes with winget, the Windows Package Manager. This is the most modern approach.

```powershell
# Install Terraform using winget
winget install HashiCorp.Terraform
```

winget handles everything automatically. You may need to restart your terminal after installation.

### Updating Terraform with winget

```powershell
# Upgrade Terraform via winget
winget upgrade HashiCorp.Terraform
```

## Verifying Your Installation Works

Regardless of which method you chose, let us test that Terraform is functioning correctly. Create a test configuration:

```powershell
# Create a test directory
mkdir $env:USERPROFILE\terraform-test
cd $env:USERPROFILE\terraform-test
```

Create a file named `main.tf` with this content:

```hcl
# Simple test configuration
terraform {
  required_version = ">= 1.0"
}

output "status" {
  value = "Terraform is installed and working on Windows!"
}
```

Then initialize and apply:

```powershell
# Initialize Terraform in the test directory
terraform init

# Apply the configuration to verify it works
terraform apply -auto-approve
```

You should see the output message confirming everything works. Clean up by deleting the test directory:

```powershell
# Clean up the test directory
cd $env:USERPROFILE
Remove-Item -Recurse -Force $env:USERPROFILE\terraform-test
```

## Configuring Your Terminal

While Terraform works in any Windows terminal, I recommend using Windows Terminal with PowerShell for the best experience. Here are some useful settings:

### Enable Tab Completion in PowerShell

You can set up basic tab completion for Terraform in PowerShell by adding this to your PowerShell profile:

```powershell
# Open your PowerShell profile for editing
notepad $PROFILE
```

Add the following line:

```powershell
# Register Terraform argument completer
Register-ArgumentCompleter -Native -CommandName terraform -ScriptBlock {
    param($wordToComplete, $commandAst, $cursorPosition)
    $env:COMP_LINE = $commandAst.ToString()
    $env:COMP_POINT = $cursorPosition
    terraform | ForEach-Object {
        [System.Management.Automation.CompletionResult]::new($_, $_, 'ParameterValue', $_)
    }
}
```

## Troubleshooting Common Issues

### "terraform is not recognized as an internal or external command"

This means Terraform is not in your PATH. Double check the PATH configuration:

```powershell
# Check if Terraform's directory is in the PATH
$env:Path -split ";" | Select-String -Pattern "terraform"
```

If it is not there, add it using the steps in Method 1, Step 3.

### Execution Policy Errors

If PowerShell blocks script execution, you may need to adjust the execution policy:

```powershell
# Set execution policy to allow scripts (run as Administrator)
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

### Antivirus False Positives

Some antivirus software may flag the Terraform binary. This is a false positive. You can add an exception for `C:\terraform\terraform.exe` (or wherever you installed it) in your antivirus settings.

### Multiple Versions Installed

If you installed Terraform using multiple methods (e.g., both manually and with Chocolatey), you might have version conflicts. Check which binary is being used:

```powershell
# Find all terraform executables in your PATH
Get-Command terraform -All
```

Remove the extra installations and keep just one.

## Using WSL as an Alternative

If you prefer working in a Linux environment on Windows, you can also install Terraform inside Windows Subsystem for Linux (WSL). This gives you a Linux-native experience:

```bash
# Inside WSL (Ubuntu), install Terraform using apt
wget -O- https://apt.releases.hashicorp.com/gpg | sudo gpg --dearmor -o /usr/share/keyrings/hashicorp-archive-keyring.gpg
echo "deb [signed-by=/usr/share/keyrings/hashicorp-archive-keyring.gpg] https://apt.releases.hashicorp.com $(lsb_release -cs) main" | sudo tee /etc/apt/sources.list.d/hashicorp.list
sudo apt update && sudo apt install terraform
```

This is a great option if your workflow already involves WSL.

## Next Steps

With Terraform installed on Windows, you are ready to start provisioning infrastructure. Some things to explore next:

- Configure cloud provider credentials (AWS, Azure, or GCP)
- Learn the core Terraform workflow of init, plan, and apply
- Set up VS Code with the HashiCorp Terraform extension for syntax highlighting and IntelliSense
- Explore Terraform modules to organize your configurations

Whether you went with the manual download, Chocolatey, or winget, you now have a working Terraform installation on Windows. The package manager approaches (Chocolatey and winget) are generally easier to maintain long-term since they handle updates automatically.
