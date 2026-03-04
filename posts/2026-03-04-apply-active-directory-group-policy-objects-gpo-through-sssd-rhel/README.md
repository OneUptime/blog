# How to Apply Active Directory Group Policy Objects (GPO) Through SSSD on RHEL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, SSSD, Active Directory, GPO, Group Policy

Description: Learn how to configure SSSD on RHEL to enforce Active Directory Group Policy Objects for access control, including logon rights and privilege mapping.

---

SSSD on RHEL can enforce a subset of Active Directory Group Policy Objects (GPOs), specifically those related to logon access control. This allows you to manage which AD users and groups can log in to RHEL systems using the same GPO infrastructure you use for Windows.

## Prerequisites

Your RHEL system must be joined to an Active Directory domain using `realm join` or similar method.

```bash
# Verify domain membership
realm list

# Confirm SSSD is running with the AD provider
grep "id_provider" /etc/sssd/sssd.conf
# id_provider = ad
```

## Enabling GPO Access Control

Edit the SSSD configuration to enable GPO-based access control.

```bash
sudo vi /etc/sssd/sssd.conf
```

Add GPO settings to your domain section:

```ini
[domain/example.com]
id_provider = ad
access_provider = ad

# Enable GPO-based access control
ad_gpo_access_control = enforcing

# Map RHEL login services to GPO logon rights
# The default mapping covers common services
ad_gpo_map_interactive = +login, +su, +gdm-password
ad_gpo_map_remote_interactive = +sshd
ad_gpo_map_service = +ftp

# Cache GPO data for this many seconds (default: 5)
ad_gpo_cache_timeout = 120
```

## GPO Access Control Modes

```bash
# Three modes are available:
# enforcing - GPO rules are enforced (deny if not permitted)
# permissive - GPO rules are logged but not enforced
# disabled - GPO processing is off

# Start with permissive to test
# ad_gpo_access_control = permissive
```

## Applying Changes

```bash
# Restart SSSD after configuration changes
sudo systemctl restart sssd

# Clear the SSSD cache to force GPO re-evaluation
sudo sss_cache -E
```

## Testing GPO Enforcement

```bash
# Try logging in as a user who should be allowed
ssh aduser@rhel-server

# Check the SSSD logs for GPO processing details
sudo journalctl -u sssd -g "GPO" --since "10 minutes ago"

# Increase debug level for detailed GPO troubleshooting
# Add to [domain/example.com] section:
# debug_level = 7
```

## Verifying GPO Application

```bash
# Check which GPOs are being applied
sudo sssctl gpo-show --domain=example.com

# List cached GPO data
ls -la /var/lib/sss/gpo_cache/
```

On the Active Directory side, configure "Allow log on locally" and "Allow log on through Remote Desktop Services" GPO settings for the relevant users and groups. SSSD maps these Windows logon rights to the corresponding Linux PAM services.
