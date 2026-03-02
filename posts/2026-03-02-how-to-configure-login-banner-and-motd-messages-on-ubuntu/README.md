# How to Configure Login Banner and MOTD Messages on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, Security, System Administration, SSH, Configuration

Description: Configure login banners and MOTD messages on Ubuntu for both SSH and local console logins, including dynamic system information and legal warning banners.

---

Login banners and Message of the Day (MOTD) messages serve two distinct purposes. A pre-login banner (shown before authentication) typically carries a legal notice warning unauthorized users that access is monitored. A post-login MOTD displays useful system information to authenticated users - things like disk usage, pending updates, or system health.

On Ubuntu, these are configured through several different mechanisms depending on whether you're dealing with SSH connections, console logins, or graphical sessions.

## Understanding the Different Banner Types

There are two phases where text can be displayed:

1. **Pre-authentication banner** - shown before the user enters credentials. Configured in `/etc/issue` (console) and `/etc/ssh/sshd_config` (SSH).
2. **Post-authentication MOTD** - shown after successful login. Managed through `/etc/motd` and `/etc/update-motd.d/` on Ubuntu.

## Configuring the Pre-Login SSH Banner

The SSH banner is shown to anyone attempting to connect, before they authenticate. This is the right place for legal warnings.

### Create a banner file

```bash
sudo nano /etc/ssh/banner
```

Add your warning text:

```
*******************************************************************************
                         AUTHORIZED ACCESS ONLY
*******************************************************************************
This system is restricted to authorized users for legitimate business purposes.
Unauthorized access attempts will be logged and reported to law enforcement.
By continuing, you acknowledge that your activity may be monitored and recorded.
*******************************************************************************
```

### Enable the banner in sshd_config

```bash
sudo nano /etc/ssh/sshd_config
```

Find or add the Banner directive:

```
Banner /etc/ssh/banner
```

Restart SSH to apply:

```bash
sudo systemctl restart sshd
```

Test by connecting from another terminal:

```bash
ssh user@your-server
# Banner should appear before the password prompt
```

## Configuring the Console Pre-Login Banner

For local console and TTY logins, the banner comes from `/etc/issue`:

```bash
sudo nano /etc/issue
```

This file supports escape sequences that are replaced at display time:

```
Ubuntu \r (\l)

Authorized users only. All access is logged.
```

Common escape sequences for `/etc/issue`:

| Sequence | Replacement |
|----------|-------------|
| `\n` | Hostname |
| `\r` | Kernel version |
| `\l` | TTY line |
| `\m` | Machine architecture |
| `\s` | OS name |
| `\v` | OS version |

The network-accessible version (shown for remote TCP connections) is `/etc/issue.net`. This is what SSH uses if you don't specify a custom `Banner` path:

```bash
sudo nano /etc/issue.net
```

## Configuring the Post-Login MOTD

Ubuntu uses a dynamic MOTD system through `/etc/update-motd.d/`. The MOTD is assembled by running all executable scripts in that directory in numerical order.

### View the current MOTD scripts

```bash
ls -la /etc/update-motd.d/
```

Typical output on a fresh Ubuntu server:

```
-rwxr-xr-x 1 root root  1220 /etc/update-motd.d/00-header
-rwxr-xr-x 1 root root  1157 /etc/update-motd.d/10-help-text
-rwxr-xr-x 1 root root  4264 /etc/update-motd.d/50-motd-news
-rwxr-xr-x 1 root root   604 /etc/update-motd.d/85-fwupd
-rwxr-xr-x 1 root root   299 /etc/update-motd.d/90-updates-available
-rwxr-xr-x 1 root root   129 /etc/update-motd.d/91-contract-ua-esm-status
-rwxr-xr-x 1 root root   111 /etc/update-motd.d/95-hwe-eol
-rwxr-xr-x 1 root root   142 /etc/update-motd.d/98-reboot-required
```

### Disable specific MOTD components

To disable a component (for example, the Ubuntu news feed which makes outbound connections):

```bash
# Remove execute permission to disable it
sudo chmod -x /etc/update-motd.d/50-motd-news
```

Or remove it entirely:

```bash
sudo rm /etc/update-motd.d/50-motd-news
```

### Creating a custom MOTD script

You can add your own script to display system information:

```bash
sudo nano /etc/update-motd.d/99-custom-info
```

```bash
#!/bin/bash
# Custom system status MOTD

# Colors
YELLOW='\033[1;33m'
GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo ""
echo -e "${YELLOW}=== System Status ===${NC}"

# Hostname and uptime
echo -e "  Hostname: ${GREEN}$(hostname -f)${NC}"
echo -e "  Uptime:   $(uptime -p)"

# CPU load
LOAD=$(cat /proc/loadavg | awk '{print $1, $2, $3}')
echo -e "  Load:     $LOAD (1, 5, 15 min)"

# Memory usage
MEM_TOTAL=$(free -m | awk '/^Mem:/ {print $2}')
MEM_USED=$(free -m | awk '/^Mem:/ {print $3}')
echo -e "  Memory:   ${MEM_USED}MB used of ${MEM_TOTAL}MB"

# Disk usage for /
DISK_USAGE=$(df -h / | awk 'NR==2 {print $3 " used of " $2 " (" $5 " full)"}')
echo -e "  Disk (/): $DISK_USAGE"

# Check for failed services
FAILED=$(systemctl --failed --no-legend | wc -l)
if [ "$FAILED" -gt 0 ]; then
    echo -e "  Services: ${RED}$FAILED failed service(s)${NC}"
else
    echo -e "  Services: ${GREEN}All OK${NC}"
fi

echo ""
```

Make it executable:

```bash
sudo chmod +x /etc/update-motd.d/99-custom-info
```

Test by running MOTD directly:

```bash
run-parts /etc/update-motd.d/
```

Or just log in fresh and observe the output.

## Static MOTD Fallback

If you want a simple static MOTD without the dynamic scripting system, write directly to `/etc/motd`:

```bash
sudo nano /etc/motd
```

However, on Ubuntu the dynamic system in `/etc/update-motd.d/` overwrites `/etc/motd` on each login. To use a purely static MOTD, disable the PAM MOTD module by editing `/etc/pam.d/sshd`:

```bash
sudo nano /etc/pam.d/sshd
```

Comment out the dynamic MOTD lines:

```
# session    optional     pam_motd.so  motd=/run/motd.dynamic
# session    optional     pam_motd.so noupdate
```

Uncomment or add:

```
session    optional     pam_motd.so motd=/etc/motd
```

Now only the static `/etc/motd` is shown.

## Disabling the MOTD Entirely

Some deployments don't want any MOTD displayed:

```bash
# Remove execute permissions from all MOTD scripts
sudo chmod -x /etc/update-motd.d/*

# Clear the static motd file
sudo truncate -s 0 /etc/motd
```

For SSH specifically, set `PrintMotd no` in `/etc/ssh/sshd_config`:

```
PrintMotd no
```

## Per-User MOTD Suppression

Individual users can suppress the MOTD for their own sessions by creating a `.hushlogin` file in their home directory:

```bash
touch ~/.hushlogin
```

This suppresses the MOTD for that user's logins without affecting other users.

A well-configured login banner does two things: it provides legal notice (important if your organization needs to prosecute unauthorized access) and it surfaces useful system information to admins at login time. The dynamic MOTD system in Ubuntu is flexible enough to display anything from a simple hostname to a full system health dashboard.
