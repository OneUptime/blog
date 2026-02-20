# Git Credential Storage: Cache, Store, and Manage Passwords Securely

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Git, Security, Authentication, DevOps, Git Configuration, Credentials

Description: Configure Git credential helpers to securely store passwords and tokens. Covers credential cache, OS keychain integration, and per-repo credential management.

---

Typing your username and password every time you push or pull gets old fast. Git credential storage lets you save your credentials securely so authentication happens automatically. This guide covers all the credential helper options and when to use each one.

## How Git Credential Storage Works

When you access a remote repository over HTTPS, Git needs authentication. Credential helpers are programs that store and retrieve credentials for Git.

```mermaid
sequenceDiagram
    participant Git
    participant Helper as Credential Helper
    participant Remote as Remote Server

    Git->>Helper: Request credentials for github.com
    Helper->>Helper: Look up stored credentials
    Helper->>Git: Return username/password or token
    Git->>Remote: Authenticate with credentials
    Remote->>Git: Access granted

    Note over Helper: If no stored credential,<br/>prompt user and store new one
```

## Available Credential Helpers

Git comes with several built-in helpers, and each platform has additional options.

### The Cache Helper (Temporary Storage)

The cache helper stores credentials in memory for a limited time. Credentials are lost when the timeout expires or when you log out.

```bash
# Enable credential caching with default 15-minute timeout
git config --global credential.helper cache

# Set a custom timeout (in seconds)
# This example caches for 1 hour (3600 seconds)
git config --global credential.helper 'cache --timeout=3600'

# Cache for 8 hours (useful for a workday)
git config --global credential.helper 'cache --timeout=28800'

# Clear the cache manually
git credential-cache exit
```

The cache helper is good for:
- Temporary or shared computers
- When you want credentials to expire automatically
- Linux systems without a keychain

### The Store Helper (Plaintext File)

The store helper saves credentials to a plaintext file. While convenient, it is less secure because anyone with file access can read your credentials.

```bash
# Enable the store helper (saves to ~/.git-credentials)
git config --global credential.helper store

# Specify a custom file location
git config --global credential.helper 'store --file=/path/to/credentials'

# The credentials file format is:
# https://username:password@github.com
# Each line is one credential entry
```

```bash
# Check file permissions (should be readable only by you)
ls -la ~/.git-credentials
# -rw------- 1 user user 89 Jan 24 10:00 .git-credentials

# If permissions are wrong, fix them
chmod 600 ~/.git-credentials
```

The store helper is good for:
- Headless servers without GUI
- CI/CD systems (though tokens are better)
- When you understand the security tradeoffs

### macOS Keychain (osxkeychain)

On macOS, the osxkeychain helper stores credentials in the secure system Keychain.

```bash
# Check if osxkeychain helper is available
git credential-osxkeychain
# usage: git credential-osxkeychain <get|store|erase>

# Enable the macOS Keychain helper
git config --global credential.helper osxkeychain

# Credentials are now stored in Keychain Access app
# You can view them under login > Passwords > github.com
```

To remove stored credentials from Keychain:
1. Open Keychain Access
2. Search for "github.com" (or your Git host)
3. Delete the entry

Or use the command line:

```bash
# Remove credential from keychain
git credential-osxkeychain erase
host=github.com
protocol=https
# Press Enter twice
```

### Windows Credential Manager

On Windows, Git for Windows includes the manager helper that uses Windows Credential Manager.

```bash
# Check current credential helper
git config --global credential.helper
# manager-core or manager

# Set the Windows credential manager
git config --global credential.helper manager-core

# Or for older Git versions
git config --global credential.helper manager
```

To manage stored credentials:
1. Open Control Panel
2. Go to User Accounts > Credential Manager
3. Select Windows Credentials
4. Find and edit/remove git entries

### Linux Secret Service (libsecret)

On Linux with GNOME, libsecret integrates with the system keyring.

```bash
# Install libsecret (Debian/Ubuntu)
sudo apt-get install libsecret-1-0 libsecret-1-dev

# Build the credential helper
cd /usr/share/doc/git/contrib/credential/libsecret
sudo make

# Enable the libsecret helper
git config --global credential.helper /usr/share/doc/git/contrib/credential/libsecret/git-credential-libsecret
```

For KDE systems with KWallet:

```bash
# Install the KDE credential helper
sudo apt-get install ksshaskpass

# Configure git to use it
git config --global credential.helper /usr/lib/git-core/git-credential-libsecret
```

## Using Personal Access Tokens

Modern Git workflows use Personal Access Tokens (PATs) instead of passwords. GitHub, GitLab, and Bitbucket all support or require them.

### Creating a GitHub Personal Access Token

```bash
# 1. Go to GitHub Settings > Developer settings > Personal access tokens
# 2. Generate new token with appropriate scopes:
#    - repo (for private repos)
#    - public_repo (for public repos only)
#    - workflow (if using GitHub Actions)

# 3. Copy the token immediately (you won't see it again)

# 4. Use the token as your password when Git prompts
git push origin main
# Username: your-username
# Password: ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

### Storing Tokens Securely

```bash
# Configure credential helper first
git config --global credential.helper osxkeychain  # macOS
git config --global credential.helper manager-core  # Windows
git config --global credential.helper cache --timeout=43200  # Linux (12 hours)

# Then trigger credential storage by pushing/pulling
git fetch origin
# Username: your-username
# Password: <paste your token>

# Token is now stored and will be used automatically
```

## Per-Repository and Per-Host Configuration

You can configure different credential helpers for different repositories or hosts.

### Per-Host Credential Storage

```bash
# Use osxkeychain for GitHub
git config --global credential.https://github.com.helper osxkeychain

# Use store for internal GitLab (less secure but maybe needed)
git config --global credential.https://gitlab.company.com.helper store

# Use cache for temporary access to other hosts
git config --global credential.helper cache
```

### Per-Repository Configuration

```bash
# In a specific repository, override global settings
cd my-project
git config credential.helper store

# This only affects this repository
# Other repos use the global helper
```

### Multiple GitHub Accounts

If you have personal and work GitHub accounts, configure them separately.

```bash
# Use different credentials based on repository URL
git config --global credential.https://github.com/personal.helper osxkeychain
git config --global credential.https://github.com/work.helper 'store --file=~/.git-credentials-work'

# Or use SSH with different keys instead (often easier)
# ~/.ssh/config
# Host github.com-personal
#     HostName github.com
#     User git
#     IdentityFile ~/.ssh/id_rsa_personal
#
# Host github.com-work
#     HostName github.com
#     User git
#     IdentityFile ~/.ssh/id_rsa_work

# Clone using the appropriate host alias
git clone git@github.com-work:company/repo.git
```

## Updating and Removing Credentials

### Updating Stored Credentials

When your token expires or password changes, update the stored credential.

```bash
# Method 1: Reject the old credential, Git will prompt for new one
git credential reject
protocol=https
host=github.com
# Press Enter twice

# Next Git operation will prompt for credentials again
git fetch origin

# Method 2: Clear all cached credentials
git credential-cache exit

# Method 3: Remove from credential store file
# Edit ~/.git-credentials and remove the line for the host
```

### Removing Credentials by Platform

```bash
# macOS: Remove from Keychain
security delete-internet-password -s github.com

# Windows: Use Credential Manager GUI or
cmdkey /delete:git:https://github.com

# Linux with libsecret: Use Seahorse (GNOME) or
secret-tool clear server github.com protocol https
```

## Git Credential Environment Variables

For CI/CD pipelines, use environment variables instead of stored credentials.

```bash
# Set credentials via environment variables
export GIT_ASKPASS=/path/to/credential-script.sh
# or
export GIT_USERNAME=myuser
export GIT_PASSWORD=mytoken

# Use in clone URL
git clone https://${GIT_USERNAME}:${GIT_PASSWORD}@github.com/user/repo.git
```

### GitHub Actions Example

```yaml
name: Deploy
on: push

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          token: ${{ secrets.GITHUB_TOKEN }}  # Automatic for same repo

      - name: Clone private repo
        run: |
          git clone https://x-access-token:${{ secrets.PAT }}@github.com/org/private-repo.git
```

### GitLab CI Example

```yaml
deploy:
  script:
    # Use CI_JOB_TOKEN for same-server repos
    - git clone https://gitlab-ci-token:${CI_JOB_TOKEN}@gitlab.com/group/repo.git

    # Use custom token for external access
    - git clone https://oauth2:${DEPLOY_TOKEN}@gitlab.com/group/repo.git
```

## Security Best Practices

### Use Tokens Instead of Passwords

```bash
# Tokens can have limited scope and be revoked individually
# Create tokens with minimum required permissions

# Good: repo scope only for pushing code
# Bad: full admin access "just in case"
```

### Set Appropriate Timeouts

```bash
# For personal machines - longer timeouts are acceptable
git config --global credential.helper 'cache --timeout=86400'  # 24 hours

# For shared machines - short timeouts
git config --global credential.helper 'cache --timeout=900'  # 15 minutes
```

### Protect Credential Files

```bash
# Ensure credential files have correct permissions
chmod 600 ~/.git-credentials
chmod 700 ~/.git-credential-cache

# Never commit credential files
echo ".git-credentials" >> ~/.gitignore_global
git config --global core.excludesfile ~/.gitignore_global
```

### Use SSH Instead of HTTPS When Possible

SSH keys are generally more secure than stored passwords/tokens.

```bash
# Generate SSH key
ssh-keygen -t ed25519 -C "your.email@example.com"

# Add to ssh-agent
eval "$(ssh-agent -s)"
ssh-add ~/.ssh/id_ed25519

# Add public key to GitHub/GitLab
cat ~/.ssh/id_ed25519.pub
# Copy and paste into Git host settings

# Clone using SSH
git clone git@github.com:user/repo.git
```

## Quick Reference

```bash
# Check current credential helper
git config --global credential.helper

# Common helpers by platform
git config --global credential.helper osxkeychain    # macOS
git config --global credential.helper manager-core   # Windows
git config --global credential.helper cache          # Linux temporary
git config --global credential.helper store          # Plaintext file

# Set cache timeout (seconds)
git config --global credential.helper 'cache --timeout=3600'

# Clear cached credentials
git credential-cache exit

# Remove stored credential
git credential reject << EOF
protocol=https
host=github.com
EOF

# Test credential helper
echo "protocol=https
host=github.com" | git credential fill
```

## Summary

Git credential storage eliminates repetitive password entry while keeping your credentials secure:

- **cache**: Temporary memory storage, good for shared/temporary access
- **store**: Plaintext file, simple but less secure
- **osxkeychain**: macOS Keychain, secure and convenient
- **manager-core**: Windows Credential Manager, secure and integrated
- **libsecret**: Linux system keyring, secure with GUI integration

For modern workflows, use Personal Access Tokens instead of passwords, and choose a credential helper appropriate for your security needs. On personal machines, platform keychains provide the best balance of security and convenience. For CI/CD, use environment variables or short-lived tokens.
