# How to Install and Configure Git on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, Git, Version Control, Development, Linux

Description: Learn how to install Git on Ubuntu, configure your identity and preferences, set up SSH keys for authentication, and establish a productive Git workflow.

---

Git is the version control system used by virtually every software project. Setting it up correctly from the start - with proper identity configuration, SSH authentication, and useful defaults - saves time and avoids confusion later.

## Installing Git

Ubuntu includes Git in its default repositories:

```bash
# Update package index
sudo apt update

# Install Git
sudo apt install git

# Verify installation
git --version
# Output: git version 2.x.x
```

For the latest Git version, use the official Git PPA:

```bash
sudo add-apt-repository ppa:git-core/ppa
sudo apt update
sudo apt install git
git --version
```

## Initial Configuration

Git stores configuration in three places:
- `/etc/gitconfig` - system-wide (rarely used)
- `~/.gitconfig` - user-level (most common)
- `.git/config` - repository-specific (overrides user config)

### Set Your Identity

Every commit records the author's name and email. Set these before making any commits:

```bash
# Set your name
git config --global user.name "Your Name"

# Set your email
git config --global user.email "you@example.com"

# Verify settings
git config --global user.name
git config --global user.email
```

Use the same email address as your GitHub/GitLab account for commit attribution to work correctly.

### Set Default Editor

Git opens an editor for commit messages and interactive operations. Set your preferred editor:

```bash
# Use nano (simplest for beginners)
git config --global core.editor nano

# Use vim
git config --global core.editor vim

# Use VS Code
git config --global core.editor "code --wait"

# Use Neovim
git config --global core.editor nvim
```

### Set Default Branch Name

Modern Git defaults to `main` for new repositories. Ensure consistency:

```bash
git config --global init.defaultBranch main
```

### Line Ending Handling

On Linux/Ubuntu, use this setting to avoid line ending issues with Windows users:

```bash
# Convert CRLF to LF on input, preserve LF on output
git config --global core.autocrlf input
```

## Viewing Your Configuration

```bash
# Show all settings with their source
git config --list --show-origin

# Show only global config
git config --global --list

# Show a specific setting
git config user.email

# View the config file directly
cat ~/.gitconfig
```

A configured `~/.gitconfig` looks like:

```ini
[user]
    name = Your Name
    email = you@example.com
[core]
    editor = vim
    autocrlf = input
[init]
    defaultBranch = main
```

## Setting Up SSH Authentication

SSH key authentication is more secure and convenient than entering a password for every Git operation.

### Generate an SSH Key

```bash
# Generate a new Ed25519 SSH key (recommended)
ssh-keygen -t ed25519 -C "you@example.com"

# When prompted, press Enter to accept the default location (~/.ssh/id_ed25519)
# Enter a passphrase for additional security (or press Enter for no passphrase)
```

For systems that require RSA:

```bash
ssh-keygen -t rsa -b 4096 -C "you@example.com"
```

### Add the Key to the SSH Agent

```bash
# Start the SSH agent
eval "$(ssh-agent -s)"

# Add your key to the agent
ssh-add ~/.ssh/id_ed25519
```

### Add the Public Key to GitHub/GitLab

```bash
# Display your public key - copy this output
cat ~/.ssh/id_ed25519.pub
```

On GitHub: Settings > SSH and GPG Keys > New SSH Key > paste the key.
On GitLab: User Settings > SSH Keys > Add Key > paste.

### Test the SSH Connection

```bash
# Test GitHub authentication
ssh -T git@github.com
# Expected: Hi username! You've successfully authenticated...

# Test GitLab
ssh -T git@gitlab.com
```

## Useful Global Git Aliases

Aliases save typing for frequently used commands:

```bash
# Status shorthand
git config --global alias.st status

# Compact status
git config --global alias.s 'status -s'

# Pretty log with graph
git config --global alias.lg 'log --oneline --graph --decorate'

# Detailed log
git config --global alias.ll 'log --oneline --decorate --graph --all'

# Unstage a file
git config --global alias.unstage 'reset HEAD --'

# Show last commit
git config --global alias.last 'log -1 HEAD'

# Amend without editing message
git config --global alias.amend 'commit --amend --no-edit'

# Discard changes to a file
git config --global alias.discard 'checkout --'
```

Now you can use `git st` instead of `git status`, `git lg` for a visual log, etc.

## Setting Up a .gitignore_global

A global gitignore file prevents OS and editor junk from appearing in every repository:

```bash
# Create the file
nano ~/.gitignore_global
```

```text
# macOS
.DS_Store
.AppleDouble
.LSOverride

# Linux
*~
.Trash-*

# Editor files
.idea/
.vscode/
*.swp
*.swo
*~
\#*#

# Python
__pycache__/
*.py[cod]
*.pyo
.env
venv/
.venv/
dist/
*.egg-info/

# Node.js
node_modules/
npm-debug.log
yarn-error.log

# Logs
*.log
logs/
```

```bash
# Tell Git to use this global ignore file
git config --global core.excludesfile ~/.gitignore_global
```

## Setting Up a Repository

```bash
# Initialize a new repository
mkdir myproject && cd myproject
git init

# Clone an existing repository (HTTPS)
git clone https://github.com/user/repository.git

# Clone via SSH (requires SSH key setup)
git clone git@github.com:user/repository.git

# Clone to a specific directory name
git clone git@github.com:user/repository.git my-local-name
```

## Configuring Pull Behavior

Avoid the "pulling without reconcile strategy" warning:

```bash
# Rebase on pull (preferred for clean history)
git config --global pull.rebase true

# Or merge on pull (default behavior)
git config --global pull.rebase false

# Or fast-forward only (safe, fails if not possible)
git config --global pull.ff only
```

## Setting Up Credential Storage

For HTTPS remote operations, store credentials:

```bash
# Cache credentials in memory for 1 hour
git config --global credential.helper 'cache --timeout=3600'

# Store credentials on disk permanently (less secure)
git config --global credential.helper store

# On Ubuntu, use the libsecret backend (secure keyring integration)
sudo apt install libsecret-1-0 libsecret-1-dev
sudo make --directory=/usr/share/doc/git/contrib/credential/libsecret
git config --global credential.helper /usr/share/doc/git/contrib/credential/libsecret/git-credential-libsecret
```

## Configuring GPG Commit Signing

For verified commits (shows "Verified" badge on GitHub):

```bash
# Generate a GPG key
gpg --full-generate-key

# List your keys
gpg --list-secret-keys --keyid-format=long

# Get the key ID (the part after the / on the 'sec' line)
# Example: sec   rsa4096/3AA5C34371567BD2

# Tell Git to use it
git config --global user.signingkey 3AA5C34371567BD2

# Sign all commits automatically
git config --global commit.gpgsign true

# Export public key to add to GitHub
gpg --armor --export 3AA5C34371567BD2
```

## Complete Configuration Reference

```bash
# Check your full configuration
git config --global --list

# Reset a specific setting
git config --global --unset setting.name

# Edit config file directly
git config --global --edit
```

Running through this setup on a fresh Ubuntu installation takes about 10 minutes and makes every subsequent interaction with Git smoother. The SSH key setup is the most impactful step - eliminating password prompts for every push and pull reduces friction significantly.
