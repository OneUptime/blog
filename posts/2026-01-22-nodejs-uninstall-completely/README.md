# How to Uninstall Node.js Completely on Different Platforms

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: NodeJS, Installation, Uninstall, macOS, Linux, Windows

Description: Complete guide to uninstalling Node.js from Windows, macOS, and Linux including removing npm packages, cleaning cache, and preparing for a fresh installation.

---

Sometimes you need to completely remove Node.js from your system to resolve version conflicts, fix corrupted installations, or start fresh. This guide covers complete removal on all major operating systems.

## Before You Start

Check your current Node.js installation:

```bash
# Check Node.js version and location
node --version
which node

# Check npm version and location  
npm --version
which npm

# List globally installed packages (you might want to save this)
npm list -g --depth=0 > ~/global-packages.txt
```

## Uninstall on macOS

### If Installed via Homebrew

```bash
# Check if installed via Homebrew
brew list | grep node

# Uninstall Node.js
brew uninstall node

# Clean up
brew cleanup
```

### If Installed via nvm

```bash
# List installed versions
nvm list

# Remove specific version
nvm uninstall 18.17.0

# Remove all versions (repeat for each)
nvm uninstall <version>

# Remove nvm itself
rm -rf ~/.nvm

# Remove nvm config from shell profile
# Edit ~/.bashrc, ~/.zshrc, or ~/.bash_profile
# Remove lines containing NVM_DIR
```

### If Installed via pkg/Installer

Run these commands to remove Node.js completely:

```bash
# Remove Node.js binary and npm
sudo rm -rf /usr/local/bin/node
sudo rm -rf /usr/local/bin/npm
sudo rm -rf /usr/local/bin/npx

# Remove Node.js include files
sudo rm -rf /usr/local/include/node

# Remove Node.js lib folder
sudo rm -rf /usr/local/lib/node_modules

# Remove documentation
sudo rm -rf /usr/local/share/doc/node

# Remove npm cache
rm -rf ~/.npm

# Remove npm configuration
rm -rf ~/.npmrc

# Remove npx cache
rm -rf ~/.npx

# Verify removal
which node  # Should return nothing
node --version  # Should return "command not found"
```

### Complete macOS Cleanup Script

```bash
#!/bin/bash
# save as uninstall-node.sh and run with: bash uninstall-node.sh

echo "Removing Node.js from macOS..."

# Remove node binaries
sudo rm -rf /usr/local/bin/node
sudo rm -rf /usr/local/bin/npm
sudo rm -rf /usr/local/bin/npx
sudo rm -rf /usr/local/bin/corepack

# Remove node_modules
sudo rm -rf /usr/local/lib/node_modules

# Remove node includes
sudo rm -rf /usr/local/include/node

# Remove node man pages
sudo rm -rf /usr/local/share/man/man1/node.1

# Remove npm-related files
rm -rf ~/.npm
rm -rf ~/.npmrc
rm -rf ~/.node-gyp
rm -rf ~/.node_repl_history

# Remove nvm if installed
rm -rf ~/.nvm

# Homebrew cleanup (if applicable)
brew uninstall node 2>/dev/null
brew cleanup

echo "Node.js has been removed."
echo "Please restart your terminal."
```

## Uninstall on Windows

### Via Control Panel

1. Open **Control Panel** > **Programs** > **Programs and Features**
2. Find **Node.js** in the list
3. Click **Uninstall**
4. Follow the uninstall wizard

### Via Windows Settings (Windows 10/11)

1. Open **Settings** > **Apps** > **Apps & features**
2. Search for "Node"
3. Click **Node.js** and select **Uninstall**

### Manual Cleanup After Uninstall

Open PowerShell as Administrator:

```powershell
# Remove npm cache
Remove-Item -Recurse -Force "$env:APPDATA\npm"
Remove-Item -Recurse -Force "$env:APPDATA\npm-cache"

# Remove roaming npm data
Remove-Item -Recurse -Force "$env:LOCALAPPDATA\npm-cache"

# Remove node_repl_history
Remove-Item -Force "$env:USERPROFILE\.node_repl_history" -ErrorAction SilentlyContinue

# Remove npmrc
Remove-Item -Force "$env:USERPROFILE\.npmrc" -ErrorAction SilentlyContinue

# Clean up environment variables
# Open System Properties > Environment Variables
# Remove entries with "node" or "npm" from PATH
```

### Remove from PATH

1. Press **Win + R**, type `sysdm.cpl`, press Enter
2. Go to **Advanced** tab > **Environment Variables**
3. Under **User variables**, select **Path** and click **Edit**
4. Remove any entries containing `nodejs` or `npm`
5. Repeat for **System variables**

### If Installed via nvm-windows

```powershell
# List installations
nvm list

# Remove all versions
nvm uninstall <version>

# Remove nvm itself
# Delete C:\Users\<username>\AppData\Roaming\nvm
Remove-Item -Recurse -Force "$env:APPDATA\nvm"

# Remove nvm from PATH
```

### If Installed via Chocolatey

```powershell
# Uninstall via Chocolatey
choco uninstall nodejs

# Or specific version
choco uninstall nodejs-lts
```

## Uninstall on Linux

### Ubuntu/Debian (apt)

```bash
# Remove Node.js
sudo apt-get remove nodejs
sudo apt-get remove npm

# Remove configuration files
sudo apt-get purge nodejs
sudo apt-get purge npm

# Remove dependencies that are no longer needed
sudo apt-get autoremove

# Clean apt cache
sudo apt-get clean
```

### If Installed via NodeSource

```bash
# Remove Node.js
sudo apt-get purge nodejs

# Remove NodeSource repository
sudo rm /etc/apt/sources.list.d/nodesource.list
sudo apt-get update
```

### CentOS/RHEL/Fedora (yum/dnf)

```bash
# Using yum (CentOS 7 and earlier)
sudo yum remove nodejs npm

# Using dnf (Fedora, CentOS 8+)
sudo dnf remove nodejs npm

# Clean cache
sudo yum clean all
# or
sudo dnf clean all
```

### Arch Linux (pacman)

```bash
# Remove Node.js
sudo pacman -Rs nodejs npm
```

### If Installed via nvm

```bash
# List versions
nvm list

# Uninstall each version
nvm uninstall <version>

# Remove nvm
rm -rf ~/.nvm

# Remove nvm configuration from shell
# Edit ~/.bashrc or ~/.zshrc and remove NVM_DIR lines
```

### If Installed from Binary/Source

```bash
# Find where node is installed
which node
# Example: /usr/local/bin/node

# Remove binaries
sudo rm -rf /usr/local/bin/node
sudo rm -rf /usr/local/bin/npm
sudo rm -rf /usr/local/bin/npx

# Remove libraries
sudo rm -rf /usr/local/lib/node_modules

# Remove includes
sudo rm -rf /usr/local/include/node

# Remove documentation
sudo rm -rf /usr/local/share/doc/node
sudo rm -rf /usr/local/share/man/man1/node.1
```

### Complete Linux Cleanup

```bash
#!/bin/bash
# save as uninstall-node.sh

echo "Removing Node.js from Linux..."

# Remove via package manager (try both)
sudo apt-get purge -y nodejs npm 2>/dev/null
sudo yum remove -y nodejs npm 2>/dev/null
sudo dnf remove -y nodejs npm 2>/dev/null

# Remove binaries
sudo rm -rf /usr/local/bin/node
sudo rm -rf /usr/local/bin/npm
sudo rm -rf /usr/local/bin/npx
sudo rm -rf /usr/local/bin/corepack

# Remove lib
sudo rm -rf /usr/local/lib/node_modules
sudo rm -rf /usr/lib/node_modules

# Remove includes
sudo rm -rf /usr/local/include/node

# Remove documentation  
sudo rm -rf /usr/local/share/doc/node
sudo rm -rf /usr/local/share/man/man1/node.1

# Remove user data
rm -rf ~/.npm
rm -rf ~/.npmrc
rm -rf ~/.nvm
rm -rf ~/.node-gyp
rm -rf ~/.node_repl_history

# Remove NodesSource if present
sudo rm -f /etc/apt/sources.list.d/nodesource.list

echo "Node.js has been removed."
echo "Please restart your terminal."
```

## Verify Complete Removal

After uninstalling, verify Node.js is completely removed:

```bash
# Should all return "command not found" or empty
node --version
npm --version
npx --version

# Check if any node processes are running
ps aux | grep node

# Check for remaining files
which node
ls -la /usr/local/bin/node* 2>/dev/null
ls -la /usr/local/lib/node_modules 2>/dev/null
```

## Fresh Installation After Removal

After complete removal, you can install Node.js fresh:

### Recommended: Use nvm

```bash
# Install nvm
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash

# Restart terminal, then install Node
nvm install --lts
nvm use --lts

# Verify
node --version
npm --version
```

### Alternative: Direct Download

Download from [nodejs.org](https://nodejs.org) and run the installer.

### Package Manager (macOS)

```bash
# Homebrew
brew install node
```

## Summary

| Platform | Method | Command |
|----------|--------|---------|
| macOS | Homebrew | `brew uninstall node` |
| macOS | pkg | Manual rm commands |
| Windows | GUI | Control Panel or Settings |
| Windows | Chocolatey | `choco uninstall nodejs` |
| Linux | apt | `sudo apt-get purge nodejs npm` |
| Linux | dnf/yum | `sudo dnf remove nodejs npm` |
| Any | nvm | `nvm uninstall <version>; rm -rf ~/.nvm` |

Always clean up npm cache (`~/.npm`), global modules, and remove from PATH for a complete uninstall. After removal, consider using nvm for easier version management in the future.
