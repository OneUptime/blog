# How to Install Node.js on Ubuntu Using NVM

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ubuntu, Node.js, NVM, JavaScript, Development, Tutorial

Description: Learn how to install and manage multiple Node.js versions on Ubuntu using NVM (Node Version Manager) for flexible development environments.

---

NVM (Node Version Manager) is the best way to install Node.js on Ubuntu. It lets you install multiple Node.js versions, switch between them instantly, and avoid permission issues that plague system-wide installations. This guide covers installation, usage, and best practices.

## Why Use NVM?

- **Multiple versions**: Run Node 18, 20, and 22 on the same machine
- **No sudo required**: Install packages globally without root access
- **Project isolation**: Use different Node versions per project
- **Easy upgrades**: Switch to new versions with a single command

## Prerequisites

- Ubuntu 20.04, 22.04, or 24.04
- Terminal access
- curl or wget installed

## Step 1: Install NVM

First, download and run the NVM installation script:

```bash
# Download and run the NVM install script
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.1/install.sh | bash
```

Or using wget:

```bash
# Alternative: install NVM using wget
wget -qO- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.1/install.sh | bash
```

The script clones the NVM repository to `~/.nvm` and adds initialization lines to your shell profile.

## Step 2: Activate NVM

Load NVM into your current shell session:

```bash
# Source your shell profile to load NVM
# For bash:
source ~/.bashrc

# For zsh:
source ~/.zshrc
```

Or start a new terminal session.

## Step 3: Verify Installation

Confirm NVM is installed correctly:

```bash
# Check NVM version - should output version number
nvm --version

# List available NVM commands
nvm --help
```

## Step 4: Install Node.js

### Install Latest LTS Version (Recommended)

LTS versions receive long-term support and are best for production:

```bash
# Install the latest LTS (Long Term Support) version
nvm install --lts

# Verify installation
node --version
npm --version
```

### Install Specific Version

To install a specific Node.js version:

```bash
# List all available Node.js versions
nvm ls-remote

# Install a specific version
nvm install 20.10.0

# Install latest version of a major release
nvm install 20
nvm install 18
nvm install 22
```

### Install Latest Version

For the cutting-edge release:

```bash
# Install the latest Node.js version
nvm install node
```

## Step 5: Switch Between Versions

### List Installed Versions

```bash
# Show all installed Node.js versions
nvm ls
```

Output example:
```
->     v20.10.0
       v18.19.0
       v22.0.0
default -> 20 (-> v20.10.0)
node -> stable (-> v22.0.0)
stable -> 22.0 (-> v22.0.0)
lts/* -> lts/iron (-> v20.10.0)
```

### Switch Versions

```bash
# Switch to a specific version
nvm use 18

# Switch to the latest LTS
nvm use --lts

# Switch to the latest installed version
nvm use node
```

### Set Default Version

Set which version loads when you open a new terminal:

```bash
# Set default Node.js version for new shells
nvm alias default 20

# Verify the default is set
nvm alias default
```

## Project-Specific Node Versions

### Using .nvmrc Files

Create a `.nvmrc` file in your project root to specify the Node version:

```bash
# Create .nvmrc file with desired version
echo "20" > .nvmrc

# Or specify exact version
echo "20.10.0" > .nvmrc
```

Then in that directory:

```bash
# Use the version specified in .nvmrc
nvm use
```

### Auto-Switching (Optional)

Add this to your `~/.bashrc` or `~/.zshrc` to automatically switch versions when entering a directory with `.nvmrc`:

```bash
# Add to ~/.bashrc for automatic version switching
# This function runs on every directory change
autoload_nvmrc() {
    local nvmrc_path="$(nvm_find_nvmrc)"

    if [ -n "$nvmrc_path" ]; then
        local nvmrc_node_version=$(nvm version "$(cat "${nvmrc_path}")")

        if [ "$nvmrc_node_version" = "N/A" ]; then
            nvm install
        elif [ "$nvmrc_node_version" != "$(nvm version)" ]; then
            nvm use
        fi
    fi
}

# Hook into directory change
cd() {
    builtin cd "$@" && autoload_nvmrc
}

# Run when opening a new terminal in a project directory
autoload_nvmrc
```

## Managing npm Global Packages

### Install Global Packages

With NVM, global packages are installed per Node version:

```bash
# Install packages globally (no sudo needed!)
npm install -g yarn
npm install -g typescript
npm install -g pm2
npm install -g nodemon
```

### Migrate Global Packages

When switching to a new Node version, reinstall your global packages:

```bash
# Install new version and migrate packages from another version
nvm install 22 --reinstall-packages-from=20

# Or reinstall from current version when upgrading
nvm install 'lts/*' --reinstall-packages-from=current
```

### List Global Packages

```bash
# List globally installed packages for current Node version
npm list -g --depth=0
```

## Useful NVM Commands

```bash
# Get path to current Node executable
nvm which current

# Get path to specific version
nvm which 20

# Uninstall a Node version
nvm uninstall 18.0.0

# Clear NVM cache
nvm cache clear

# Show current version in use
nvm current

# Run a command with a specific Node version (without switching)
nvm exec 18 node app.js

# Run npm with specific Node version
nvm exec 20 npm test
```

## Uninstalling NVM

If you need to remove NVM:

```bash
# Remove NVM directory
rm -rf ~/.nvm

# Remove NVM lines from shell profile
# Edit ~/.bashrc or ~/.zshrc and remove these lines:
# export NVM_DIR="$HOME/.nvm"
# [ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
# [ -s "$NVM_DIR/bash_completion" ] && \. "$NVM_DIR/bash_completion"
```

## Troubleshooting

### "nvm: command not found"

The shell profile wasn't loaded:

```bash
# Re-source your profile
source ~/.bashrc

# Or check if NVM lines exist in profile
grep -n "NVM_DIR" ~/.bashrc
```

If lines are missing, add them manually:

```bash
# Add NVM initialization to bashrc
cat >> ~/.bashrc << 'EOF'
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
[ -s "$NVM_DIR/bash_completion" ] && \. "$NVM_DIR/bash_completion"
EOF
```

### Slow Shell Startup

NVM can slow down shell initialization. Use lazy loading:

```bash
# Replace NVM initialization in ~/.bashrc with lazy loading
# This only loads NVM when you first use node, npm, or nvm
lazy_load_nvm() {
    unset -f nvm node npm npx
    export NVM_DIR="$HOME/.nvm"
    [ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
    [ -s "$NVM_DIR/bash_completion" ] && \. "$NVM_DIR/bash_completion"
}

nvm() {
    lazy_load_nvm
    nvm "$@"
}

node() {
    lazy_load_nvm
    node "$@"
}

npm() {
    lazy_load_nvm
    npm "$@"
}

npx() {
    lazy_load_nvm
    npx "$@"
}
```

### Permission Errors

NVM should never require sudo. If you see permission errors:

```bash
# Check ownership of NVM directory
ls -la ~/.nvm

# Fix ownership if needed
sudo chown -R $(whoami):$(whoami) ~/.nvm
```

## System Node vs NVM Node

If you previously installed Node via apt, it may conflict:

```bash
# Check if system Node exists
which node
# If output is /usr/bin/node, that's system Node

# Remove system Node to avoid conflicts
sudo apt remove nodejs npm
```

NVM's Node should always be in your home directory (`~/.nvm/versions/node/...`).

---

With NVM installed, you can easily manage Node.js versions for different projects and stay current with the latest releases. The flexibility of running multiple versions side-by-side makes it invaluable for both development and testing compatibility across Node versions.
