# How to Fix npm ERR! Error: EACCES Permission Denied

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: NodeJS, npm, Permissions, Linux, Troubleshooting

Description: Learn how to fix the npm EACCES permission denied error when installing global packages, with solutions for Linux, macOS, and Windows.

---

The `EACCES: permission denied` error occurs when npm tries to install global packages in a directory that requires elevated permissions. Instead of using sudo, here are proper solutions.

## Understanding the Error

```bash
npm ERR! Error: EACCES: permission denied, access '/usr/local/lib/node_modules'
npm ERR! Error: EACCES: permission denied, mkdir '/usr/local/lib/node_modules/package'
npm ERR! code EACCES
npm ERR! syscall access
npm ERR! path /usr/local/lib/node_modules
```

This happens because:
- npm tries to write to system directories
- Your user does not have write permissions to these directories
- Default npm configuration points to restricted paths

## Solution 1: Change npm's Default Directory (Recommended)

Create a directory for global packages in your home folder:

```bash
# Create directory
mkdir -p ~/.npm-global

# Configure npm to use it
npm config set prefix '~/.npm-global'

# Add to PATH in ~/.bashrc or ~/.zshrc
echo 'export PATH=~/.npm-global/bin:$PATH' >> ~/.bashrc

# Reload shell configuration
source ~/.bashrc
```

For zsh users:

```bash
echo 'export PATH=~/.npm-global/bin:$PATH' >> ~/.zshrc
source ~/.zshrc
```

Now install global packages without sudo:

```bash
npm install -g typescript
```

## Solution 2: Use nvm (Node Version Manager)

nvm installs Node.js in your home directory, avoiding permission issues entirely:

```bash
# Install nvm
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash

# Restart terminal or source profile
source ~/.bashrc

# Install Node.js
nvm install node
nvm use node

# Global packages now work without sudo
npm install -g typescript
```

Check installation:

```bash
which npm
# Should show: ~/.nvm/versions/node/vX.X.X/bin/npm

npm config get prefix
# Should show: ~/.nvm/versions/node/vX.X.X
```

## Solution 3: Fix Existing Directory Permissions

If you must use the default directory:

```bash
# Find npm prefix
npm config get prefix

# Take ownership (replace with your username)
sudo chown -R $(whoami) $(npm config get prefix)/{lib/node_modules,bin,share}
```

Or for specific directories:

```bash
sudo chown -R $(whoami) /usr/local/lib/node_modules
sudo chown -R $(whoami) /usr/local/bin
sudo chown -R $(whoami) /usr/local/share
```

## Solution 4: Use npx Instead of Global Install

Avoid global installs entirely using npx:

```bash
# Instead of: npm install -g create-react-app
npx create-react-app my-app

# Instead of: npm install -g typescript && tsc
npx tsc

# Run specific version
npx typescript@4.5 --version
```

## Fix for Cache Permission Errors

```bash
npm ERR! Error: EACCES: permission denied, scandir '/root/.npm/_logs'
```

Fix npm cache permissions:

```bash
# Check cache location
npm config get cache

# Fix permissions
sudo chown -R $(whoami) ~/.npm

# Or clear and rebuild cache
npm cache clean --force
```

## Fix for Local Project Errors

If you get EACCES in a project directory:

```bash
npm ERR! Error: EACCES: permission denied, mkdir '/home/user/project/node_modules'
```

Fix project directory ownership:

```bash
# Check current ownership
ls -la

# Fix ownership
sudo chown -R $(whoami) .

# Fix if node_modules exists
sudo chown -R $(whoami) node_modules

# Remove and reinstall
rm -rf node_modules
npm install
```

## macOS Specific Solutions

### Using Homebrew

```bash
# Install Node.js via Homebrew (recommended for macOS)
brew install node

# Homebrew manages permissions correctly
npm install -g typescript
```

### Fix Homebrew Permissions

```bash
sudo chown -R $(whoami) /usr/local/Cellar
sudo chown -R $(whoami) /usr/local/lib/node_modules
```

## Windows Solutions

On Windows, run Command Prompt or PowerShell as Administrator:

```powershell
# Right-click Command Prompt > Run as Administrator
npm install -g typescript
```

Or change npm prefix to user directory:

```powershell
# Create directory
mkdir %APPDATA%\npm-global

# Set prefix
npm config set prefix %APPDATA%\npm-global

# Add to PATH via System Properties > Environment Variables
```

Using PowerShell:

```powershell
npm config set prefix "$env:APPDATA\npm-global"
$env:PATH += ";$env:APPDATA\npm-global"
```

## Docker Considerations

In Docker, avoid running npm as root:

```dockerfile
# Create non-root user
FROM node:18

RUN groupadd -r appuser && useradd -r -g appuser appuser
RUN mkdir -p /home/appuser/app && chown -R appuser:appuser /home/appuser

WORKDIR /home/appuser/app

# Copy as root, then change ownership
COPY --chown=appuser:appuser package*.json ./

# Switch to non-root user
USER appuser

RUN npm install

COPY --chown=appuser:appuser . .

CMD ["node", "index.js"]
```

## Verify Your Setup

Check npm configuration:

```bash
# View all config
npm config list

# View prefix
npm config get prefix

# View cache
npm config get cache

# View global packages location
npm root -g
```

Test global install:

```bash
npm install -g cowsay
cowsay "It works!"
npm uninstall -g cowsay
```

## Prevention Tips

### Use .npmrc File

Create `~/.npmrc`:

```ini
prefix=${HOME}/.npm-global
cache=${HOME}/.npm-cache
```

### Project-Level Settings

Create `.npmrc` in project root:

```ini
save-exact=true
engine-strict=true
```

### Never Use sudo with npm

```bash
# BAD - creates permission issues
sudo npm install -g package

# GOOD - fix permissions first
npm install -g package
```

## Troubleshooting

### Check File Permissions

```bash
# Check npm directories
ls -la $(npm config get prefix)
ls -la $(npm config get cache)

# Check ownership
stat $(npm config get prefix)
```

### Reset npm Configuration

```bash
# Delete npm config
rm ~/.npmrc

# Reinstall npm
npm install -g npm@latest
```

### Clean Reinstall

```bash
# Remove Node.js completely
sudo apt remove nodejs npm  # Debian/Ubuntu
brew uninstall node         # macOS

# Remove leftover directories
rm -rf ~/.npm
rm -rf ~/.nvm
rm -rf /usr/local/lib/node_modules

# Fresh install via nvm (recommended)
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
nvm install node
```

## Summary

| Solution | Best For | Complexity |
|----------|----------|------------|
| nvm | New setups, multiple Node versions | Medium |
| Change prefix | Existing setup, single version | Easy |
| Fix permissions | Quick fix, controlled environments | Easy |
| npx | One-off tools | Easiest |

Best practices:
- Use nvm for development machines
- Never run npm with sudo
- Use npx for infrequent tools
- Keep npm updated: `npm install -g npm@latest`
- Use project-local dependencies when possible
