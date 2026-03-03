# How to Set Up Custom Login Banner on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, Security, SSH, System Administration

Description: Configure custom login banners on Ubuntu for SSH and local console logins, including legal notices, system information, and security warnings.

---

A login banner serves two purposes: it displays useful information to legitimate users (hostname, environment type, maintenance notices) and it establishes legal notice for unauthorized access attempts. Many compliance frameworks - PCI-DSS, HIPAA, SOC 2 - require a banner that informs users that activity is monitored and that unauthorized access is prohibited. Beyond compliance, a well-crafted banner that shows the server's role and environment prevents operators from accidentally running commands on the wrong machine.

Ubuntu has two separate banner mechanisms: one that displays before authentication (the pre-login banner) and one that displays after a successful login (the message of the day, or MOTD).

## Understanding the Different Banner Types

### Pre-Login Banner (SSH)

The SSH pre-login banner is shown before the user enters their password or key. This is where legal notices typically go, since it is shown to everyone who attempts a connection, authenticated or not.

Configuration: `/etc/issue.net` (contents) and `Banner` directive in `/etc/ssh/sshd_config`

### Post-Login MOTD

The MOTD (Message of the Day) is shown after successful authentication. This is the right place for system information, maintenance schedules, and environment-specific notes.

Configuration: `/etc/motd` (static) and `/etc/update-motd.d/` (dynamic scripts)

### Local Console Banner

For servers with physical or serial console access, `/etc/issue` is displayed before the local login prompt.

## Setting Up a Pre-Login SSH Banner

### Step 1: Create the Banner File

```bash
sudo nano /etc/issue.net
```

A typical security/legal notice:

```text
*******************************************************************************
*                                                                             *
*  NOTICE TO USERS                                                            *
*                                                                             *
*  This system is for authorized use only. Individuals using this system     *
*  without authority or in excess of their authority are subject to          *
*  monitoring. All activity on this system may be recorded and disclosed     *
*  to authorized personnel.                                                  *
*                                                                             *
*  Unauthorized access is prohibited and may be subject to criminal and      *
*  civil penalties.                                                           *
*                                                                             *
*******************************************************************************
```

For internal servers, a more informative banner works well:

```text
===============================================================================
  Hostname: prod-db-01.internal.example.com
  Role:     PostgreSQL Primary Database
  Env:      PRODUCTION - exercise caution
  Owner:    Database Team <dba@example.com>

  Unauthorized access is prohibited. All sessions are logged.
===============================================================================
```

### Step 2: Configure sshd to Show the Banner

```bash
sudo nano /etc/ssh/sshd_config
```

Find or add the `Banner` directive:

```bash
# Show this file's content before authentication
Banner /etc/issue.net
```

Restart SSH to apply:

```bash
sudo systemctl restart ssh
```

Test from another terminal (do not close your current session until verified):

```bash
ssh user@your-server-ip
```

The banner should appear before the password prompt.

## Setting Up the Local Console Banner

The `/etc/issue` file is displayed on local console and virtual terminal logins before the login prompt. It supports escape sequences for dynamic content:

```bash
sudo nano /etc/issue
```

```text
Ubuntu \r (\l)
Host: \n
Date: \d \t

Authorized use only. All access is logged.

```

Supported escape sequences in `/etc/issue`:

| Sequence | Value |
|----------|-------|
| `\n` | Hostname |
| `\r` | Kernel version |
| `\l` | TTY line name |
| `\d` | Current date |
| `\t` | Current time |
| `\s` | OS name |
| `\v` | OS version |

Note: These escape sequences work in `/etc/issue` (local console) but NOT in `/etc/issue.net` (SSH), which displays the file literally.

## Configuring the Post-Login MOTD

Ubuntu uses a dynamic MOTD system. Scripts in `/etc/update-motd.d/` are executed in order at login time, and their output is concatenated to form the MOTD.

### Viewing the Current MOTD Scripts

```bash
ls -la /etc/update-motd.d/
```

You will see numbered scripts like:

```text
00-header
10-help-text
50-motd-news
80-esm-announce
91-contract-ua-esm-status
```

### Disabling Unwanted MOTD Components

To disable a component without deleting it, remove its execute permission:

```bash
# Disable Ubuntu Pro marketing messages
sudo chmod -x /etc/update-motd.d/80-esm-announce
sudo chmod -x /etc/update-motd.d/91-contract-ua-esm-status

# Disable generic help text
sudo chmod -x /etc/update-motd.d/10-help-text

# Disable news fetching (slows logins and requires network)
sudo chmod -x /etc/update-motd.d/50-motd-news
```

### Creating a Custom MOTD Script

Add a custom script with a number between existing scripts to control ordering:

```bash
sudo nano /etc/update-motd.d/05-custom-info
```

```bash
#!/bin/bash
# Display system information after login

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Server identity
HOSTNAME=$(hostname -f)
ROLE=$(cat /etc/server-role 2>/dev/null || echo "General Purpose")
ENVIRONMENT=$(cat /etc/server-env 2>/dev/null || echo "unknown")

# System stats
UPTIME=$(uptime -p)
LOAD=$(uptime | awk -F'load average:' '{print $2}' | xargs)
MEMORY_USED=$(free -h | awk '/^Mem:/ {print $3}')
MEMORY_TOTAL=$(free -h | awk '/^Mem:/ {print $2}')
DISK_ROOT=$(df -h / | awk 'NR==2 {print $3"/"$2" ("$5" used)"}')

# Network
IP_ADDR=$(ip route get 1.1.1.1 2>/dev/null | awk '{print $7; exit}')

echo ""
echo -e "${BLUE}================================================================${NC}"
echo -e "  ${GREEN}${HOSTNAME}${NC}"
echo -e "  Role: ${ROLE}  |  Environment: ${YELLOW}${ENVIRONMENT}${NC}"
echo -e "----------------------------------------------------------------"
echo -e "  Uptime:   ${UPTIME}"
echo -e "  Load:     ${LOAD}"
echo -e "  Memory:   ${MEMORY_USED} / ${MEMORY_TOTAL}"
echo -e "  Disk /:   ${DISK_ROOT}"
echo -e "  IP:       ${IP_ADDR}"
echo -e "${BLUE}================================================================${NC}"
echo ""
```

Make it executable:

```bash
sudo chmod +x /etc/update-motd.d/05-custom-info
```

Create the role and environment files:

```bash
echo "PostgreSQL Primary Database" | sudo tee /etc/server-role
echo "PRODUCTION" | sudo tee /etc/server-env
```

Test the output:

```bash
sudo run-parts /etc/update-motd.d/
```

### Adding Failed Login Warnings

Show recent failed login attempts in the MOTD:

```bash
sudo nano /etc/update-motd.d/15-login-info
```

```bash
#!/bin/bash
# Show login statistics

LAST_LOGIN=$(last -n 1 -R $USER 2>/dev/null | head -1)
FAILED_ATTEMPTS=$(lastb -n 5 2>/dev/null | grep -v "^$\|^btmp\|^$" | wc -l)

if [ "$FAILED_ATTEMPTS" -gt 0 ]; then
    echo "WARNING: ${FAILED_ATTEMPTS} failed login attempts since last check"
    echo "Last 5 failed attempts:"
    lastb -n 5 2>/dev/null | grep -v "^btmp\|^$" | head -5
    echo ""
fi
```

```bash
sudo chmod +x /etc/update-motd.d/15-login-info
```

Note: `lastb` requires read access to `/var/log/btmp`, which is typically only available to root. This script will only show data for root logins.

## Disabling the Dynamic MOTD Entirely

If you prefer a simple static MOTD:

```bash
# Disable all dynamic MOTD scripts
sudo chmod -x /etc/update-motd.d/*

# Set a static MOTD
sudo nano /etc/motd
```

```text
Welcome to prod-web-01

This is a production server. Proceed with caution.
For emergencies, contact: ops-team@example.com

```

## Environment-Specific Banners

For servers that exist across multiple environments, use a script to set different banners based on the environment:

```bash
sudo nano /usr/local/bin/update-login-banner
```

```bash
#!/bin/bash
# Update login banners based on environment file

ENV=$(cat /etc/server-env 2>/dev/null | tr '[:lower:]' '[:upper:]')

case "$ENV" in
    PRODUCTION)
        BORDER="!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!"
        MSG="PRODUCTION ENVIRONMENT - ALL CHANGES REQUIRE APPROVAL"
        ;;
    STAGING)
        BORDER="================================================"
        MSG="STAGING ENVIRONMENT - Test data may be present"
        ;;
    *)
        BORDER="------------------------------------------------"
        MSG="Development / Unknown environment"
        ;;
esac

# Update SSH banner
cat > /etc/issue.net << EOF
${BORDER}
  $(hostname -f)
  ${MSG}
  Unauthorized access is prohibited. Sessions are logged.
${BORDER}
EOF

echo "Login banner updated for environment: ${ENV}"
```

```bash
sudo chmod +x /usr/local/bin/update-login-banner
sudo /usr/local/bin/update-login-banner
```

## Verifying the Banner Configuration

```bash
# Check the SSH banner setting
sudo sshd -T | grep banner

# Verify the banner file exists and is readable
cat /etc/issue.net

# Test MOTD scripts
sudo run-parts --test /etc/update-motd.d/

# Check PAM MOTD configuration
grep -r motd /etc/pam.d/sshd
```

## Summary

Custom login banners on Ubuntu serve both compliance and operational purposes. Use `/etc/issue.net` with the `Banner` SSH directive for pre-authentication legal notices, `/etc/issue` for local console banners, and the dynamic `/etc/update-motd.d/` scripts for rich post-login system information. For production fleets, combining informative banners with monitoring through a platform like [OneUptime](https://oneuptime.com) gives your team both context at login and alerting when something goes wrong.
