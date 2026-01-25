# How to Fix "Unable to Access" Remote Repository Errors

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Git, Troubleshooting, Remote, SSH, HTTPS, Authentication, DevOps

Description: Learn how to diagnose and fix Git remote access errors including authentication failures, network issues, and permission problems.

---

The "unable to access" error when connecting to a remote Git repository is frustrating because it can stem from many different causes: network issues, authentication problems, SSL certificates, firewall rules, or permission changes. This guide walks through systematic diagnosis and solutions for each scenario.

## Understanding Remote Access Errors

When Git cannot connect to a remote repository, you will see errors like these:

```bash
fatal: unable to access 'https://github.com/user/repo.git/': Could not resolve host: github.com

fatal: unable to access 'https://github.com/user/repo.git/': The requested URL returned error: 403

fatal: Could not read from remote repository.
Please make sure you have the correct access rights and the repository exists.
```

```mermaid
flowchart TD
    ERROR[Unable to Access Error] --> TYPE{Error Type?}

    TYPE -->|Could not resolve host| DNS[DNS/Network Issue]
    TYPE -->|Connection refused| FIREWALL[Firewall/Proxy Issue]
    TYPE -->|SSL certificate| SSL[SSL/TLS Issue]
    TYPE -->|403/401 error| AUTH[Authentication Issue]
    TYPE -->|Could not read| PERM[Permission Issue]

    DNS --> FIX_DNS[Check network, DNS settings]
    FIREWALL --> FIX_FW[Check firewall, proxy config]
    SSL --> FIX_SSL[Update certificates, check time]
    AUTH --> FIX_AUTH[Verify credentials, tokens]
    PERM --> FIX_PERM[Check repo access, SSH keys]
```

## Network and DNS Issues

### Symptom: Could Not Resolve Host

```bash
fatal: unable to access 'https://github.com/user/repo.git/': Could not resolve host: github.com
```

### Solutions

**Check basic connectivity:**

```bash
# Test DNS resolution
nslookup github.com
dig github.com

# Test connectivity
ping github.com

# Test HTTPS connectivity
curl -v https://github.com
```

**Fix DNS issues:**

```bash
# Flush DNS cache (macOS)
sudo dscacheutil -flushcache; sudo killall -HUP mDNSResponder

# Flush DNS cache (Linux)
sudo systemd-resolve --flush-caches

# Flush DNS cache (Windows)
ipconfig /flushdns
```

**Use alternative DNS:**

```bash
# Add to /etc/resolv.conf or network settings
nameserver 8.8.8.8
nameserver 8.8.4.4
```

**Check if behind corporate proxy:**

```bash
# Set proxy for Git
git config --global http.proxy http://proxy.company.com:8080
git config --global https.proxy http://proxy.company.com:8080

# With authentication
git config --global http.proxy http://username:password@proxy.company.com:8080

# Unset proxy
git config --global --unset http.proxy
git config --global --unset https.proxy
```

## Authentication Errors

### Symptom: 401 or 403 Errors

```bash
fatal: unable to access 'https://github.com/user/repo.git/': The requested URL returned error: 403
remote: HTTP Basic: Access denied
fatal: Authentication failed for 'https://gitlab.com/user/repo.git/'
```

### HTTPS Authentication Solutions

**GitHub Personal Access Token:**

GitHub no longer accepts passwords for HTTPS authentication. You need a Personal Access Token (PAT).

```bash
# Generate a PAT at: GitHub Settings > Developer settings > Personal access tokens

# Option 1: Include token in URL (not recommended for shared machines)
git clone https://YOUR_TOKEN@github.com/user/repo.git

# Option 2: Store credentials securely
git config --global credential.helper store   # Stores in plain text
git config --global credential.helper cache   # Caches for 15 minutes
git config --global credential.helper osxkeychain   # macOS Keychain
git config --global credential.helper manager-core  # Git Credential Manager

# Clear stored credentials
git credential-cache exit
```

**Update stored credentials:**

```bash
# Remove cached credentials (macOS)
git credential-osxkeychain erase
host=github.com
protocol=https
<press Enter twice>

# Remove from Windows Credential Manager
# Control Panel > Credential Manager > Windows Credentials > Remove github.com

# Remove from Linux credential store
rm ~/.git-credentials
```

**GitLab, Bitbucket, Azure DevOps:**

```bash
# GitLab: Use Personal Access Token or Deploy Token
# Bitbucket: Use App Password
# Azure DevOps: Use Personal Access Token

git remote set-url origin https://oauth2:YOUR_TOKEN@gitlab.com/user/repo.git
```

### SSH Authentication Solutions

**Verify SSH key setup:**

```bash
# Check if SSH agent is running
eval "$(ssh-agent -s)"

# List added keys
ssh-add -l

# Add your key
ssh-add ~/.ssh/id_ed25519
# or
ssh-add ~/.ssh/id_rsa
```

**Test SSH connection:**

```bash
# Test GitHub
ssh -T git@github.com

# Test GitLab
ssh -T git@gitlab.com

# Test Bitbucket
ssh -T git@bitbucket.org

# Verbose output for debugging
ssh -vT git@github.com
```

**Generate new SSH key if needed:**

```bash
# Generate ED25519 key (recommended)
ssh-keygen -t ed25519 -C "your_email@example.com"

# Or RSA if ED25519 not supported
ssh-keygen -t rsa -b 4096 -C "your_email@example.com"

# Copy public key to clipboard (macOS)
pbcopy < ~/.ssh/id_ed25519.pub

# Copy public key to clipboard (Linux)
xclip -selection clipboard < ~/.ssh/id_ed25519.pub

# Add to GitHub/GitLab/Bitbucket in their SSH keys settings
```

**Fix SSH config for multiple accounts:**

```bash
# Create or edit ~/.ssh/config
Host github.com
    HostName github.com
    User git
    IdentityFile ~/.ssh/id_ed25519_personal

Host github-work
    HostName github.com
    User git
    IdentityFile ~/.ssh/id_ed25519_work

# Clone with work account
git clone git@github-work:company/repo.git
```

## SSL/TLS Certificate Errors

### Symptom: SSL Certificate Problem

```bash
fatal: unable to access 'https://github.com/': SSL certificate problem: unable to get local issuer certificate
fatal: unable to access 'https://github.com/': SSL certificate problem: certificate has expired
```

### Solutions

**Update CA certificates:**

```bash
# macOS
brew install ca-certificates

# Ubuntu/Debian
sudo apt-get update && sudo apt-get install ca-certificates

# CentOS/RHEL
sudo yum update ca-certificates
```

**Check system time (certificates validate against time):**

```bash
# Check current time
date

# Sync time (Linux)
sudo ntpdate pool.ntp.org
# or
sudo timedatectl set-ntp true
```

**Corporate proxy with SSL inspection:**

```bash
# Add corporate CA certificate
# Get the certificate from your IT department

# Set Git to use custom CA bundle
git config --global http.sslCAInfo /path/to/corporate-ca-bundle.crt

# Or add to system trust store (varies by OS)
```

**Temporary workaround (NOT recommended for production):**

```bash
# Disable SSL verification globally (security risk!)
git config --global http.sslVerify false

# Disable for specific repo only
git config http.sslVerify false

# Better: Disable for specific host
git config --global http.https://self-signed.example.com.sslVerify false
```

## Firewall and Proxy Issues

### Symptom: Connection Refused or Timed Out

```bash
fatal: unable to access 'https://github.com/user/repo.git/': Failed to connect to github.com port 443: Connection refused
fatal: unable to access 'https://github.com/user/repo.git/': Connection timed out
```

### Solutions

**Check if ports are blocked:**

```bash
# Test HTTPS port
nc -zv github.com 443

# Test SSH port
nc -zv github.com 22

# Test git protocol port
nc -zv github.com 9418
```

**Use SSH over HTTPS port (bypass port 22 blocks):**

```bash
# Add to ~/.ssh/config
Host github.com
    HostName ssh.github.com
    Port 443
    User git

# Test
ssh -T -p 443 git@ssh.github.com
```

**Configure corporate proxy:**

```bash
# Set proxy environment variables
export HTTP_PROXY=http://proxy.company.com:8080
export HTTPS_PROXY=http://proxy.company.com:8080
export NO_PROXY=localhost,127.0.0.1,.company.com

# Git-specific proxy
git config --global http.proxy $HTTP_PROXY
git config --global https.proxy $HTTPS_PROXY
```

## Permission and Access Issues

### Symptom: Repository Not Found or Access Denied

```bash
remote: Repository not found.
fatal: repository 'https://github.com/user/private-repo.git/' not found

remote: Permission to user/repo.git denied to other-user.
```

### Solutions

**Verify repository exists and you have access:**

```bash
# Check if repository exists
curl -I https://github.com/user/repo

# List your GitHub repos via API
curl -H "Authorization: token YOUR_TOKEN" https://api.github.com/user/repos
```

**Check which account Git is using:**

```bash
# Check configured user
git config user.name
git config user.email

# Check SSH key being used
ssh -T git@github.com
# Should say: Hi USERNAME! You've successfully authenticated

# Check credential being used for HTTPS
git credential fill <<EOF
protocol=https
host=github.com
EOF
```

**Switch remote URL protocol:**

```bash
# Check current remote
git remote -v

# Switch from HTTPS to SSH
git remote set-url origin git@github.com:user/repo.git

# Switch from SSH to HTTPS
git remote set-url origin https://github.com/user/repo.git
```

## Diagnostic Flowchart

```mermaid
flowchart TD
    START[Unable to Access Error] --> PING{Can you ping<br/>the host?}
    PING -->|No| DNS[Check DNS and<br/>network connectivity]
    PING -->|Yes| CURL{Can curl reach<br/>the URL?}

    CURL -->|No| PROXY[Check proxy<br/>and firewall settings]
    CURL -->|Yes| AUTH{Authentication<br/>error?}

    AUTH -->|Yes| PROTO{Using SSH<br/>or HTTPS?}
    PROTO -->|SSH| SSH_CHECK[Verify SSH key<br/>is added to account]
    PROTO -->|HTTPS| TOKEN[Generate new<br/>Personal Access Token]

    AUTH -->|No| SSL{SSL error?}
    SSL -->|Yes| CERT[Update CA certificates<br/>or check system time]
    SSL -->|No| PERM[Check repo exists<br/>and you have access]
```

## Quick Reference Commands

```bash
# Check Git remote configuration
git remote -v
git config --list | grep -E '(remote|credential|proxy|ssl)'

# Test connectivity
ssh -vT git@github.com
curl -v https://github.com

# Reset credentials
git credential-cache exit
git config --global --unset credential.helper

# Switch authentication method
git remote set-url origin git@github.com:user/repo.git  # SSH
git remote set-url origin https://github.com/user/repo.git  # HTTPS

# Debug Git operations
GIT_CURL_VERBOSE=1 git fetch
GIT_TRACE=1 git fetch
```

## Summary

Remote access errors in Git typically fall into four categories: network/DNS issues, authentication problems, SSL certificate errors, or permission issues. Start by identifying the error type from the message, then work through the specific solutions.

For most users, the fix is one of these:
- Update your Personal Access Token (HTTPS)
- Add your SSH key to your account (SSH)
- Configure proxy settings (corporate network)
- Switch from HTTPS to SSH or vice versa

When in doubt, use verbose output (`GIT_CURL_VERBOSE=1` or `ssh -v`) to get detailed debugging information.
