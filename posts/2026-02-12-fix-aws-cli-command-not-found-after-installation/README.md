# How to Fix AWS CLI 'Command Not Found' After Installation

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, CLI, Installation, Troubleshooting

Description: Fix the command not found error after installing the AWS CLI by resolving PATH issues, symlink problems, and installation conflicts on macOS, Linux, and Windows.

---

You just installed the AWS CLI, tried running `aws --version`, and got back `command not found`. It's one of the most common post-installation issues, and it nearly always comes down to your system's PATH not including the directory where the CLI was installed. Let's fix it on every platform.

## Understanding the Problem

When you type `aws` in your terminal, your shell searches through the directories listed in your PATH environment variable. If the AWS CLI binary isn't in any of those directories (or there's no symlink pointing to it), the shell reports "command not found."

## Fix on macOS

The AWS CLI v2 installer on macOS puts the binary in `/usr/local/aws-cli/` and creates a symlink in `/usr/local/bin/`. If the symlink wasn't created, you'll get the error.

Check if the binary exists.

```bash
# Check if the AWS CLI binary was actually installed
ls -la /usr/local/aws-cli/v2/current/bin/aws
```

If the file exists, the installation worked but the symlink is missing. Create it.

```bash
# Create the symlink for the aws command
sudo ln -s /usr/local/aws-cli/v2/current/bin/aws /usr/local/bin/aws
sudo ln -s /usr/local/aws-cli/v2/current/bin/aws_completer /usr/local/bin/aws_completer
```

Now verify it works.

```bash
# Verify the installation
aws --version
```

If `/usr/local/bin` isn't in your PATH (rare on macOS but possible), add it to your shell profile.

```bash
# Add /usr/local/bin to PATH in your shell profile
echo 'export PATH="/usr/local/bin:$PATH"' >> ~/.zshrc
source ~/.zshrc
```

For macOS users with Apple Silicon (M1/M2/M3), the installation path is the same. The CLI distributes a universal binary that works on both Intel and ARM.

## Fix on Linux

On Linux, the AWS CLI v2 installer puts files in `/usr/local/aws-cli/` by default and creates symlinks in `/usr/local/bin/`. But if you ran the installer with a custom install directory or without sudo, things might be different.

First, find where the CLI was installed.

```bash
# Search for the aws binary anywhere on the system
which aws 2>/dev/null || find / -name "aws" -type f 2>/dev/null | head -5
```

If you installed with the default settings, recreate the symlinks.

```bash
# Recreate symlinks (default installation paths)
sudo ln -sf /usr/local/aws-cli/v2/current/bin/aws /usr/local/bin/aws
sudo ln -sf /usr/local/aws-cli/v2/current/bin/aws_completer /usr/local/bin/aws_completer
```

If you installed to a custom directory, the symlinks need to point there instead.

```bash
# If you used --install-dir and --bin-dir during installation
# Example: installed to ~/aws-cli with bin links in ~/bin
~/aws-cli/v2/current/bin/aws --version
```

Make sure the bin directory is in your PATH.

```bash
# Add to PATH in your shell profile (bash)
echo 'export PATH="$HOME/bin:$PATH"' >> ~/.bashrc
source ~/.bashrc

# Or for zsh
echo 'export PATH="$HOME/bin:$PATH"' >> ~/.zshrc
source ~/.zshrc
```

## Fix on Windows

On Windows, the AWS CLI installer should add itself to the system PATH automatically. If it didn't, here's how to fix it.

Open PowerShell and check if the binary exists.

```powershell
# Check if the AWS CLI executable exists
Test-Path "C:\Program Files\Amazon\AWSCLIV2\aws.exe"
```

If it exists, add it to your PATH.

```powershell
# Add AWS CLI to system PATH (requires admin PowerShell)
$currentPath = [Environment]::GetEnvironmentVariable("Path", "Machine")
$newPath = "$currentPath;C:\Program Files\Amazon\AWSCLIV2"
[Environment]::SetEnvironmentVariable("Path", $newPath, "Machine")
```

After changing the PATH, open a new terminal window for the changes to take effect.

## Fix with pip Installation (CLI v1)

If you installed the older AWS CLI v1 via pip, the binary location depends on your Python installation.

```bash
# Find where pip installed the aws binary
pip3 show awscli | grep Location

# Or check the pip scripts directory
python3 -m site --user-base
```

The binary is typically in `~/.local/bin/` on Linux or `~/Library/Python/3.x/bin/` on macOS.

```bash
# Add the pip scripts directory to PATH
echo 'export PATH="$HOME/.local/bin:$PATH"' >> ~/.bashrc
source ~/.bashrc
```

## Fix for Docker and Container Environments

In Docker containers, you might install the CLI during the build but then not find it at runtime. Make sure the installation happens in the right layer and the PATH is set correctly.

```dockerfile
# Install AWS CLI v2 in a Docker container
FROM python:3.11-slim

RUN apt-get update && apt-get install -y curl unzip \
    && curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip" \
    && unzip awscliv2.zip \
    && ./aws/install \
    && rm -rf aws awscliv2.zip \
    && apt-get clean

# Verify it's available
RUN aws --version
```

## Fix for CI/CD Pipelines

In CI/CD environments, the PATH might not include the AWS CLI location. Add the install directory to PATH explicitly in your pipeline.

```yaml
# GitHub Actions example
steps:
  - name: Install AWS CLI
    run: |
      curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip"
      unzip awscliv2.zip
      sudo ./aws/install
      echo "/usr/local/bin" >> $GITHUB_PATH

  - name: Verify
    run: aws --version
```

## Version Conflicts Between v1 and v2

If you have both CLI v1 (pip) and v2 installed, they can conflict. Check which version your PATH resolves to.

```bash
# See which aws binary is being used
which aws
aws --version

# Check if there are multiple aws binaries
type -a aws
```

If you want v2 only, remove v1.

```bash
# Remove AWS CLI v1 installed via pip
pip3 uninstall awscli

# Verify v2 is now the default
aws --version
```

## The Nuclear Option: Reinstall

If nothing else works, do a clean reinstall.

On macOS/Linux:

```bash
# Remove existing installation
sudo rm -rf /usr/local/aws-cli
sudo rm /usr/local/bin/aws
sudo rm /usr/local/bin/aws_completer

# Download and install fresh
curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip"
unzip awscliv2.zip
sudo ./aws/install
rm -rf aws awscliv2.zip

# Verify
aws --version
```

## Troubleshooting Checklist

1. Check if the binary exists in the expected location
2. Verify PATH includes the directory with the aws binary
3. Create missing symlinks if needed
4. Source your shell profile after PATH changes
5. Open a new terminal window after system PATH changes
6. Check for v1/v2 conflicts
7. If all else fails, do a clean reinstall

The "command not found" error is almost always a PATH issue. Once you know where the binary is and make sure your PATH includes that location, you're good to go. For getting started with configuration after installation, see our guide on [fixing CLI profile issues](https://oneuptime.com/blog/post/fix-aws-cli-profile-configuration-issues/view).
