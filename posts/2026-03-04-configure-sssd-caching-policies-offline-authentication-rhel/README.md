# How to Configure SSSD Caching Policies for Offline Authentication on RHEL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, SSSD, Authentication, Caching, Offline Access

Description: Configure SSSD caching policies on RHEL to allow users to authenticate even when the identity provider (LDAP, Active Directory) is unreachable.

---

SSSD (System Security Services Daemon) caches user credentials and identity information locally, enabling users to log in when the remote identity provider is unavailable. Properly configuring these caching policies is essential for laptops and systems with intermittent connectivity.

## Understanding SSSD Caching

SSSD stores cached credentials in a local database (typically under `/var/lib/sss/db/`). When the identity provider is unreachable, SSSD falls back to these cached entries.

```bash
# Check current SSSD status
sudo systemctl status sssd

# View the SSSD cache databases
ls -la /var/lib/sss/db/
```

## Configuring Cache Timeouts

Edit the SSSD configuration to set caching parameters.

```bash
# Edit the SSSD configuration
sudo vi /etc/sssd/sssd.conf
```

Key settings for the domain section:

```ini
[domain/example.com]
# Cache credentials for offline auth (required)
cache_credentials = True

# How long cached entries are valid (in seconds)
# Default is 5400 (90 minutes)
entry_cache_timeout = 14400

# How long cached credentials remain valid for offline login
# 0 means forever, default is 0
offline_credentials_expiration = 30

# Number of days cached credentials can be used for offline login
# Applies per-user from their last successful online login
account_cache_expiration = 30

# How often to refresh cached entries in the background (seconds)
entry_cache_nowait_percentage = 50
```

## Applying the Configuration

```bash
# Validate the configuration file syntax
sudo sssctl config-check

# Restart SSSD to apply changes
sudo systemctl restart sssd

# Clear the cache if you need a fresh start
sudo sss_cache -E
```

## Testing Offline Authentication

```bash
# First, log in while the identity provider is reachable
# This caches the credentials
su - testuser

# Simulate offline by blocking the LDAP/AD server
sudo iptables -A OUTPUT -d ldap-server.example.com -j DROP

# Try logging in again - should work with cached credentials
su - testuser

# Remove the firewall rule after testing
sudo iptables -D OUTPUT -d ldap-server.example.com -j DROP
```

## Monitoring Cache Status

```bash
# Check if SSSD is operating in online or offline mode
sudo sssctl domain-status example.com

# List cached users
sudo sssctl user-checks testuser

# View cache statistics
sudo sssctl domain-status example.com --online
```

Setting `cache_credentials = True` is the minimum requirement for offline authentication. Adjust the expiration values based on your security policy and how frequently users need offline access.
