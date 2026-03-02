# How to Manage Multiple Node.js Versions on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, Node.js, NVM, Version Management, JavaScript

Description: Manage multiple Node.js versions on Ubuntu using nvm, fnm, and system tools - switch between versions per project and maintain clean environments.

---

Different projects often require different Node.js versions. One application might be stuck on Node 16 due to a dependency that hasn't been updated, while another requires Node 20 for newer APIs. Installing multiple Node.js versions and switching between them cleanly is a routine task for any developer or ops engineer working with JavaScript.

## Option 1: nvm (Node Version Manager)

nvm is the most widely used tool for managing Node.js versions. It installs Node.js versions in your home directory without requiring root.

### Installing nvm

```bash
# Download and run the install script
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.0/install.sh | bash

# Or with wget
wget -qO- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.0/install.sh | bash
```

The script adds initialization code to your shell profile. Reload it:

```bash
source ~/.bashrc
# or for zsh users
source ~/.zshrc
```

Verify nvm is working:

```bash
nvm --version
```

### Installing Node.js Versions

```bash
# Install the latest LTS version
nvm install --lts

# Install a specific version
nvm install 20.11.0
nvm install 18.20.0
nvm install 16.20.2

# Install the latest version of a major release
nvm install 20

# List all installed versions
nvm ls

# List all available versions
nvm ls-remote

# List only LTS versions available remotely
nvm ls-remote --lts
```

### Switching Between Versions

```bash
# Switch to a specific version
nvm use 20

# Switch to a version by full version number
nvm use 18.20.0

# Use the system-installed Node.js (if any)
nvm use system

# Check the current active version
node --version
nvm current
```

### Setting a Default Version

```bash
# Set the default version for new shells
nvm alias default 20

# Give an alias to a version
nvm alias myproject-version 18.20.0

# Use an alias
nvm use myproject-version
```

### Per-Project Versions with `.nvmrc`

Create a `.nvmrc` file in the project root:

```bash
# From inside your project directory
echo "20.11.0" > .nvmrc

# Or use a partial version number - nvm resolves it
echo "20" > .nvmrc
```

Then switch to the project's version with:

```bash
# Reads .nvmrc in the current directory
nvm use

# Install if not yet installed, then use
nvm install
```

Automate this in your shell by adding to `~/.bashrc`:

```bash
# Auto-switch Node version when entering a directory with .nvmrc
autoload_nvmrc() {
    local nvmrc_path="$(nvm_find_nvmrc)"
    if [ -n "$nvmrc_path" ]; then
        local nvmrc_node_version=$(nvm version "$(cat "${nvmrc_path}")")
        if [ "$nvmrc_node_version" = "N/A" ]; then
            nvm install
        elif [ "$nvmrc_node_version" != "$(nvm version)" ]; then
            nvm use
        fi
    elif [ "$(nvm version)" != "$(nvm version default)" ]; then
        nvm use default
    fi
}

# Run on directory change
if [ -n "$ZSH_VERSION" ]; then
    add-zsh-hook chpwd autoload_nvmrc
    autoload_nvmrc
fi
```

## Option 2: fnm (Fast Node Manager)

fnm is written in Rust and is significantly faster than nvm. It has largely compatible commands and supports `.nvmrc` and `.node-version` files.

### Installing fnm

```bash
# Install fnm
curl -fsSL https://fnm.vercel.app/install | bash

# Reload shell
source ~/.bashrc
```

### Using fnm

```bash
# Install a version
fnm install 20
fnm install 18.20.0

# List installed versions
fnm list

# Use a version
fnm use 20

# Set a default
fnm default 20

# Run a command with a specific version without switching globally
fnm exec --using=18 node --version
```

fnm reads `.nvmrc` files automatically, so projects configured for nvm work without changes.

## Option 3: NodeSource Repository (System-Wide)

For servers running a single application, you might just want a specific version installed system-wide via apt:

```bash
# Remove any existing nodejs
sudo apt remove nodejs npm

# Install Node.js 20.x via NodeSource
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install nodejs

# Or install 18.x LTS
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install nodejs
```

This approach installs Node.js system-wide as a proper apt package, making it easy to update with `apt upgrade`. The downside is that switching versions requires running the setup script again.

## Installing Global npm Packages per Version

When using nvm or fnm, global npm packages are installed per Node.js version. After switching versions, you may need to reinstall them:

```bash
# List globally installed packages in current version
npm list -g --depth=0

# Install common global tools
npm install -g pm2 typescript ts-node nodemon

# nvm can copy global packages from another version
nvm install 20 --reinstall-packages-from=18
```

## Using npx to Avoid Global Installs

Modern npm includes npx, which runs a package without installing it globally:

```bash
# Run a command with a specific package version
npx --yes create-react-app my-app

# Run without caching
npx --no-install some-cli-tool
```

## Checking Which Node.js Is Active

```bash
# Show path to the current node binary
which node

# Show version
node --version
npm --version

# Show all node binaries in PATH
type -a node
```

## nvm in Non-Interactive Scripts

nvm loads lazily and doesn't work in non-interactive scripts by default. For CI or deployment scripts:

```bash
#!/bin/bash
# Explicitly load nvm in scripts
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"

# Now nvm is available
nvm use 20
node --version
npm ci
```

Or use the full path to the node binary:

```bash
# Use nvm's managed node directly without loading nvm
~/.nvm/versions/node/v20.11.0/bin/node --version
```

## Uninstalling Versions

```bash
# Remove a specific version with nvm
nvm uninstall 16.20.2

# With fnm
fnm uninstall 16

# Remove nvm entirely
# Delete the nvm directory
rm -rf ~/.nvm

# Remove the lines nvm added to your .bashrc/.zshrc
# (The lines that source $NVM_DIR/nvm.sh)
```

## Comparing the Tools

| Feature | nvm | fnm |
|---------|-----|-----|
| Speed | Slower (shell script) | Fast (Rust binary) |
| `.nvmrc` support | Yes | Yes |
| Windows support | No | Yes |
| Maturity | Very mature | Mature |
| Shell compatibility | bash, zsh, fish | bash, zsh, fish, PowerShell |

For new setups, fnm is worth considering due to its speed. For teams already using nvm, the switching cost is rarely worth it.

Managing multiple Node.js versions cleanly is essential for any serious JavaScript development workflow. Whether you pick nvm for its ubiquity or fnm for its speed, having per-project version control through `.nvmrc` files makes collaboration and CI consistency much easier to maintain.
