# How to Configure /etc/environment for System-Wide Variables on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, Environment Variables, /etc/environment, PAM, Shell

Description: Learn how to configure /etc/environment on Ubuntu to set system-wide environment variables for all users and services, and understand when to use it versus other methods.

---

Setting environment variables correctly on Linux is more nuanced than it appears. There are multiple files and mechanisms for setting environment variables, each with different scopes and behaviors. `/etc/environment` is the simplest: it sets variables for all users, all shells, and is read very early in the login process. Knowing when to use it and what its limitations are prevents configuration surprises.

## What /etc/environment Does

`/etc/environment` is read by the PAM (Pluggable Authentication Modules) system through `pam_env.so`. It's not a shell script - it doesn't support commands, variable expansion, or conditionals. It's a simple `KEY=VALUE` format file where each line sets one environment variable.

Variables set here are available to:
- All users who log in (interactive or non-interactive)
- Graphical desktop sessions
- SSH sessions
- Any process spawned through PAM-authenticated login

Variables set here are NOT available to:
- System daemons started by systemd (unless the daemon's unit file reads it)
- Cron jobs (use `/etc/profile.d/` or the crontab `SHELL` and environment variables)
- Container processes

## The Format

```bash
# View the current /etc/environment
cat /etc/environment
```

Ubuntu's default `/etc/environment` typically just sets the PATH:

```
PATH="/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin:/usr/games:/usr/local/games:/snap/bin"
```

The format is strictly `KEY="VALUE"` or `KEY=VALUE`:
- One variable per line
- No `export` keyword
- No variable expansion (`$HOME` in values won't work)
- No command substitution (`$(date)` won't work)
- Values can be quoted or unquoted
- `#` starts a comment (some implementations may not support this)

## Editing /etc/environment

```bash
sudo nano /etc/environment
```

Example configuration:

```
# System-wide environment variables
PATH="/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin:/usr/games:/usr/local/games:/snap/bin"

# Default locale settings
LANG="en_US.UTF-8"
LANGUAGE="en_US:en"
LC_ALL="en_US.UTF-8"

# Java home (all users)
JAVA_HOME="/usr/lib/jvm/java-21-openjdk-amd64"

# Default editor
EDITOR="nano"
VISUAL="nano"

# Proxy settings (if behind a corporate proxy)
http_proxy="http://proxy.example.com:3128"
https_proxy="http://proxy.example.com:3128"
no_proxy="localhost,127.0.0.1,.example.com"
```

Changes take effect on the next login - they don't affect currently running sessions.

## Testing Changes

Apply the changes to your current session without logging out:

```bash
# Source the file manually (works for basic KEY=VALUE format)
set -a
source /etc/environment
set +a

# Verify a variable was set
echo $JAVA_HOME
printenv | grep JAVA
```

Or log out and back in to get a clean session with all variables applied through PAM.

## When to Use /etc/environment vs Other Methods

### /etc/environment

Use for:
- Variables that should apply to every user on the system
- Locale settings (`LANG`, `LC_ALL`)
- System-wide proxy settings
- `JAVA_HOME`, `GOPATH` if all users need them
- Simple `KEY=VALUE` settings

Do not use for:
- Variables that need shell expansion (`HOME`, `USER`)
- Variables computed at runtime
- Path additions that need to reference existing variables (`PATH=$PATH:/new/dir`)

### /etc/profile.d/*.sh

Use for:
- Variables that need shell expansion
- Conditional settings based on installed software
- `PATH` additions
- Function definitions

This directory contains shell scripts sourced by `/etc/profile` for all Bourne-compatible shells on interactive login.

```bash
# Add a new PATH entry for all users
sudo nano /etc/profile.d/custom-path.sh
```

```bash
#!/bin/sh
# Add custom bin directory to PATH
export PATH="$PATH:/opt/myapp/bin"
export MYAPP_HOME="/opt/myapp"
```

```bash
sudo chmod +x /etc/profile.d/custom-path.sh

# Apply to current session
source /etc/profile.d/custom-path.sh
```

### /etc/bash.bashrc

For Bash-specific settings that apply to all interactive non-login shells (typical for terminal emulators within a desktop session). Use `/etc/profile.d/` instead for broader compatibility.

### ~/.profile and ~/.bashrc

For per-user variables that shouldn't apply to everyone. User-specific variables override system-wide ones.

## Setting Variables for systemd Services

`/etc/environment` does NOT affect systemd services by default. Set service environment variables in unit files:

```bash
sudo systemctl edit nginx
```

```ini
[Service]
Environment="VARIABLE_NAME=value"
Environment="ANOTHER_VAR=another-value"
```

For variables from `/etc/environment`:

```bash
sudo nano /etc/systemd/system/myapp.service
```

```ini
[Service]
EnvironmentFile=/etc/environment
EnvironmentFile=/etc/myapp/env
ExecStart=/opt/myapp/bin/myapp
```

Or reference the systemd `DefaultEnvironment`:

```bash
sudo nano /etc/systemd/system.conf
```

```ini
[Manager]
DefaultEnvironment="JAVA_HOME=/usr/lib/jvm/java-21-openjdk-amd64"
DefaultEnvironment="MYAPP_ENV=production"
```

## Proxy Configuration

Proxy settings deserve special attention. HTTP clients (curl, apt, wget) look for lowercase and uppercase proxy variables:

```bash
sudo nano /etc/environment
```

```
# Proxy settings - both cases for maximum compatibility
http_proxy="http://proxy.example.com:3128"
HTTP_PROXY="http://proxy.example.com:3128"
https_proxy="http://proxy.example.com:3128"
HTTPS_PROXY="http://proxy.example.com:3128"
ftp_proxy="http://proxy.example.com:3128"
FTP_PROXY="http://proxy.example.com:3128"
no_proxy="localhost,127.0.0.1,::1,.example.com,10.0.0.0/8"
NO_PROXY="localhost,127.0.0.1,::1,.example.com,10.0.0.0/8"
```

For apt specifically (it doesn't always use environment variables), also configure:

```bash
sudo nano /etc/apt/apt.conf.d/01proxy
```

```
Acquire::http::Proxy "http://proxy.example.com:3128";
Acquire::https::Proxy "http://proxy.example.com:3128";
```

## Locale Settings

Ubuntu uses locale settings from `/etc/environment` (and `/etc/default/locale`):

```bash
# Check current locale
locale

# Set system locale
sudo localectl set-locale LANG=en_US.UTF-8

# This updates /etc/locale.gen and /etc/default/locale
# View the result:
cat /etc/default/locale
```

`/etc/default/locale` is read by PAM alongside `/etc/environment`. You can set locale in either file:

```
# In /etc/environment
LANG="en_US.UTF-8"
LC_ALL="en_US.UTF-8"
```

Or use `localectl` which updates the right files automatically.

## Debugging Environment Variable Issues

```bash
# Show all environment variables in current session
printenv

# Show where a variable is set
# Try tracing through login files
bash --login -c "printenv VARIABLE_NAME"

# Check if PAM is reading /etc/environment
sudo strace -e trace=open,openat,read -p $(pgrep -o sshd) 2>&1 | \
    grep environment

# Manual check of variable visibility for a user
sudo -u username bash -l -c "printenv JAVA_HOME"
```

## /etc/environment vs /etc/default/locale

Ubuntu uses both files. They're both read by PAM:

- `/etc/environment`: General-purpose KEY=VALUE variables
- `/etc/default/locale`: Locale-specific variables, managed by `localectl`

If the same variable appears in both, `/etc/default/locale` typically takes precedence (it's loaded later). Stick to `localectl` for locale settings to avoid conflicts.

## Checking PAM Configuration for Environment Loading

Verify that PAM is configured to load environment variables:

```bash
grep pam_env /etc/pam.d/common-session
grep pam_env /etc/pam.d/sshd
```

Look for:

```
session required pam_env.so user_readenv=1 envfile=/etc/environment
```

If this line is missing, `/etc/environment` won't be loaded for that login path.

## /etc/environment.d/ Drop-In Files

For organized, modular configuration, Ubuntu supports `/etc/environment.d/` (via systemd):

```bash
ls /etc/environment.d/
```

These files use the same `KEY=VALUE` format and are processed by systemd's environment generator. They affect systemd service sessions, making them useful for variables that should apply to both user sessions and system services:

```bash
sudo nano /etc/environment.d/90-java.conf
```

```
JAVA_HOME=/usr/lib/jvm/java-21-openjdk-amd64
```

Note: `/etc/environment.d/` is read by systemd, while `/etc/environment` is read by PAM. For comprehensive coverage across both interactive sessions and services, set important variables in both places.

## Summary

`/etc/environment` is the right place for system-wide KEY=VALUE environment variables that should apply to all users on login. Its limitations - no shell expansion, no conditionals, simple format - make it predictable and safe to edit. For more complex per-user or shell-specific settings, use `/etc/profile.d/` scripts. For systemd services, use `Environment=` directives or `EnvironmentFile=` references in service units. Understanding which mechanism handles which scope prevents the common confusion of setting a variable somewhere and wondering why a service doesn't see it.
