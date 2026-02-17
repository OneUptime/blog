# How to Install and Configure the gcloud CLI on macOS Linux and Windows

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, gcloud CLI, Installation, Configuration, Google Cloud

Description: Step-by-step instructions for installing and configuring the Google Cloud gcloud CLI on macOS, Linux, and Windows, with authentication and project setup.

---

The gcloud CLI is the primary command-line tool for interacting with Google Cloud. Whether you are creating VMs, deploying containers, managing IAM, or debugging network issues, gcloud is what you will reach for most of the time. Getting it installed and configured properly on your machine is the first step to being productive with GCP.

This guide covers installation on all three major operating systems, initial authentication, project configuration, and the setup tweaks that make daily use smoother.

## Installing on macOS

### Method 1: Using the Interactive Installer

This is the recommended approach for most macOS users:

```bash
# Download and run the installer
curl https://sdk.cloud.google.com | bash
```

The script downloads the SDK, extracts it to your home directory, and adds gcloud to your PATH. After installation, restart your shell or run:

```bash
# Reload your shell profile
source ~/.zshrc  # or source ~/.bashrc if using bash
```

### Method 2: Using Homebrew

If you prefer managing packages through Homebrew:

```bash
# Install Google Cloud SDK via Homebrew cask
brew install --cask google-cloud-sdk
```

Homebrew installs the SDK and manages updates for you. After installation, add the SDK components to your PATH by adding these lines to your shell profile:

```bash
# Add to ~/.zshrc or ~/.bashrc
source "$(brew --prefix)/share/google-cloud-sdk/path.zsh.inc"
source "$(brew --prefix)/share/google-cloud-sdk/completion.zsh.inc"
```

### Method 3: Manual Download

Download the archive from the [Cloud SDK page](https://cloud.google.com/sdk/docs/install):

```bash
# Download the archive for macOS (Apple Silicon)
curl -O https://dl.google.com/dl/cloudsdk/channels/rapid/downloads/google-cloud-cli-darwin-arm.tar.gz

# Extract it
tar -xf google-cloud-cli-darwin-arm.tar.gz

# Run the install script
./google-cloud-sdk/install.sh
```

## Installing on Linux

### Debian/Ubuntu

```bash
# Add the Cloud SDK distribution URI as a package source
echo "deb [signed-by=/usr/share/keyrings/cloud.google.asc] https://packages.cloud.google.com/apt cloud-sdk main" | \
  sudo tee -a /etc/apt/sources.list.d/google-cloud-sdk.list

# Import the Google Cloud public key
curl https://packages.cloud.google.com/apt/doc/apt-key.gpg | \
  sudo tee /usr/share/keyrings/cloud.google.asc

# Update and install the SDK
sudo apt-get update && sudo apt-get install google-cloud-cli
```

### RHEL/CentOS/Fedora

```bash
# Add the Cloud SDK repo
sudo tee -a /etc/yum.repos.d/google-cloud-sdk.repo << EOM
[google-cloud-cli]
name=Google Cloud CLI
baseurl=https://packages.cloud.google.com/yum/repos/cloud-sdk-el9-x86_64
enabled=1
gpgcheck=1
repo_gpgcheck=0
gpgkey=https://packages.cloud.google.com/yum/doc/rpm-package-key.gpg
EOM

# Install the SDK
sudo dnf install google-cloud-cli
```

### Universal Linux Install

Works on any Linux distribution:

```bash
# Download and extract
curl -O https://dl.google.com/dl/cloudsdk/channels/rapid/downloads/google-cloud-cli-linux-x86_64.tar.gz
tar -xf google-cloud-cli-linux-x86_64.tar.gz

# Run the installer
./google-cloud-sdk/install.sh

# Restart your shell
exec -l $SHELL
```

## Installing on Windows

### Method 1: Interactive Installer

Download the installer from [cloud.google.com/sdk/docs/install](https://cloud.google.com/sdk/docs/install) and run it. The installer handles everything, including adding gcloud to your PATH.

### Method 2: PowerShell

```powershell
# Download the installer
(New-Object Net.WebClient).DownloadFile(
  "https://dl.google.com/dl/cloudsdk/channels/rapid/GoogleCloudSDKInstaller.exe",
  "$env:Temp\GoogleCloudSDKInstaller.exe"
)

# Run the installer
& "$env:Temp\GoogleCloudSDKInstaller.exe"
```

### Method 3: Chocolatey

```powershell
# Install using Chocolatey package manager
choco install gcloudsdk
```

## Initial Configuration

After installation, initialize the SDK:

```bash
# Initialize gcloud - this walks through first-time setup
gcloud init
```

The init command will:
1. Open a browser window for authentication
2. Ask you to select a default project
3. Ask you to set a default compute region and zone

### Authenticate Your Account

If you need to authenticate separately:

```bash
# Log in with your Google account
gcloud auth login
```

This opens a browser for OAuth authentication. For headless environments (like remote servers), use:

```bash
# Authenticate without a browser
gcloud auth login --no-launch-browser
```

This gives you a URL to visit on another machine and a code to paste back into the terminal.

### Set Application Default Credentials

For applications and client libraries that need to authenticate:

```bash
# Set up application default credentials
gcloud auth application-default login
```

This creates credentials at `~/.config/gcloud/application_default_credentials.json` that client libraries automatically use.

## Setting Default Configuration

Configure defaults so you do not have to specify them on every command:

```bash
# Set the default project
gcloud config set project my-project

# Set the default compute region
gcloud config set compute/region us-central1

# Set the default compute zone
gcloud config set compute/zone us-central1-a

# Verify your configuration
gcloud config list
```

The output looks like:

```
[compute]
region = us-central1
zone = us-central1-a
[core]
account = your-email@example.com
project = my-project
```

## Installing Additional Components

The gcloud CLI has additional components you might need:

```bash
# List available components
gcloud components list

# Install commonly used components
gcloud components install kubectl          # Kubernetes CLI
gcloud components install gke-gcloud-auth-plugin  # GKE authentication
gcloud components install beta             # Beta commands
gcloud components install alpha            # Alpha commands
gcloud components install gsutil           # Cloud Storage CLI (usually bundled)
gcloud components install bq               # BigQuery CLI (usually bundled)
```

## Updating the CLI

Keep your CLI up to date:

```bash
# Update all installed components
gcloud components update
```

If you installed via a package manager, use that instead:

```bash
# Debian/Ubuntu
sudo apt-get update && sudo apt-get upgrade google-cloud-cli

# Homebrew
brew upgrade --cask google-cloud-sdk
```

## Shell Completion

Enable tab completion for faster command entry:

### Bash

```bash
# Add to ~/.bashrc
source /path/to/google-cloud-sdk/completion.bash.inc
```

### Zsh

```bash
# Add to ~/.zshrc
source /path/to/google-cloud-sdk/completion.zsh.inc
```

### Fish

```bash
# Add to ~/.config/fish/config.fish
source /path/to/google-cloud-sdk/path.fish.inc
```

## Verifying the Installation

Run a few commands to make sure everything works:

```bash
# Check the version
gcloud version

# List your projects
gcloud projects list

# Test compute access
gcloud compute zones list --filter="region:us-central1"

# Test storage access
gcloud storage ls
```

## Setting Up for Multiple Users

If multiple people use the same machine, each should have their own gcloud configuration:

```bash
# Create a named configuration for each user
gcloud config configurations create user-alice
gcloud auth login  # Alice logs in
gcloud config set project alice-project

gcloud config configurations create user-bob
gcloud auth login  # Bob logs in
gcloud config set project bob-project

# Switch between configurations
gcloud config configurations activate user-alice
```

## Docker Alternative

If you do not want to install gcloud locally, use the Docker image:

```bash
# Run gcloud from Docker
docker run --rm -it \
  -v ~/.config/gcloud:/root/.config/gcloud \
  gcr.io/google.com/cloudsdktool/google-cloud-cli:latest \
  gcloud projects list
```

This mounts your local gcloud config into the container so authentication persists.

## Troubleshooting Common Issues

### Authentication Fails

```bash
# Revoke and re-authenticate
gcloud auth revoke --all
gcloud auth login
```

### Wrong Project

```bash
# Check which project is active
gcloud config get-value project

# Switch to the correct project
gcloud config set project correct-project-id
```

### Path Issues

If gcloud is not found after installation, add it to your PATH manually:

```bash
# Add to your shell profile
export PATH="$HOME/google-cloud-sdk/bin:$PATH"
```

### Proxy Configuration

If you are behind a corporate proxy:

```bash
# Configure proxy settings
gcloud config set proxy/type http
gcloud config set proxy/address proxy.example.com
gcloud config set proxy/port 8080
```

## Best Practices

1. **Use named configurations** - If you work with multiple projects or accounts, named configurations prevent mistakes.

2. **Set defaults** - Configure default project, region, and zone to save typing on every command.

3. **Enable completion** - Tab completion speeds up your workflow significantly.

4. **Update regularly** - New features and bug fixes are released frequently.

5. **Use --format flag** - Learn the output formatting options (json, yaml, table, csv) to get data in the format you need.

## Wrapping Up

The gcloud CLI is your gateway to Google Cloud. A properly configured installation saves you time on every interaction with GCP. Install it using the method that best fits your operating system and workflow, set your defaults, enable shell completion, and you will be productive from day one.
