# How to Configure SSSD Caching for Offline Authentication on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, SSSD, Authentication, Caching, Offline

Description: Configure SSSD's credential caching on Ubuntu to allow users to authenticate when the identity provider is unavailable, with tunable cache settings.

---

One of SSSD's most valuable features is its credential caching. When a user logs in, SSSD caches their credentials and directory attributes locally. If the identity provider (LDAP, Active Directory, Kerberos) becomes unreachable, users who have previously logged in can still authenticate using the cached data. This is especially important for laptops that frequently disconnect from corporate networks, or servers that need to remain usable during directory outages.

## How SSSD Caching Works

SSSD maintains two types of cached data:

1. **Identity cache** - stores POSIX attributes (UID, GID, home directory, shell, group memberships) from the directory
2. **Credential cache** - stores a salted hash of the user's password for offline authentication

When the directory is reachable, SSSD refreshes cached data periodically. When the directory is unreachable, SSSD serves identity data from cache and verifies passwords against the cached hash.

The caches are stored in LDB databases in `/var/lib/sss/db/`.

## Enabling Credential Caching

Credential caching must be explicitly enabled in `sssd.conf`:

```bash
sudo nano /etc/sssd/sssd.conf
```

```ini
[sssd]
config_file_version = 2
domains = example.com
services = nss, pam

[pam]
# Allow offline auth for this many days after last successful online login

offline_credentials_expiration = 7

# Limit failed offline login attempts before delaying retries
offline_failed_login_attempts = 3
offline_failed_login_delay = 5

[domain/example.com]
# ... your provider settings ...

# Enable credential caching (required for offline auth)
cache_credentials = true

# Store the password temporarily if Kerberos is offline so SSSD can request
# a TGT when the provider comes back online
krb5_store_password_if_offline = true
```

```bash
sudo chmod 600 /etc/sssd/sssd.conf
sudo systemctl restart sssd
```

## Tuning Cache Refresh Intervals

Control how frequently SSSD refreshes cached data from the directory:

```ini
[domain/example.com]
# How long a positive cache entry is valid (seconds)
entry_cache_timeout = 5400       # 90 minutes (default: 5400)

# Percentage of entry_cache_timeout after which SSSD returns the cached
# entry immediately and refreshes it in the background
entry_cache_nowait_percentage = 50

# How often to refresh the cache of enumerated LDAP records
ldap_enumeration_refresh_timeout = 300

# How many nested group levels SSSD follows for schemas that support nesting
ldap_group_nesting_level = 2

# How long before SSSD considers the server offline
ldap_network_timeout = 3
ldap_opt_timeout = 6
ldap_search_timeout = 6
ldap_enumeration_search_timeout = 60
```

### Background Refresh

SSSD can refresh entries in the background before they expire, ensuring cached data stays current without users experiencing slow logins:

```ini
[domain/example.com]
# Enable background refresh for users, groups, netgroups
refresh_expired_interval = 3600

# Time before expiry at which to start background refresh
entry_cache_nowait_percentage = 75
```

With `entry_cache_nowait_percentage = 75`, SSSD starts a background refresh when 75% of the cache lifetime has elapsed, so future requests are less likely to block on a cache refresh.

## Controlling Offline Authentication Lifetime

The `offline_credentials_expiration` setting in `[pam]` controls how long cached passwords remain valid:

```ini
[pam]
# Users can authenticate offline for 7 days after last successful online login
# 0 = no limit (not recommended)
offline_credentials_expiration = 7
```

To see the current state of offline auth for a user:

```bash
# Check SSSD cache status
sudo sssctl user-checks jsmith

# View detailed cache information
sudo sssctl user-show jsmith
```

## Failed Login Policies

Prevent brute-force attacks against cached credentials:

```ini
[pam]
# Lock out after this many consecutive failed offline attempts
offline_failed_login_attempts = 3

# Wait this many minutes after lockout before allowing retry
offline_failed_login_delay = 5
```

After `offline_failed_login_attempts` failures, the account is locked for `offline_failed_login_delay` minutes. The lockout resets on successful online authentication.

## Forcing Online Authentication for Sensitive Services

Some services should never allow offline authentication. SSSD does not provide a `pam_sss.so` option that forces online authentication for a single PAM service, so avoid adding `pam_sss.so` options for this purpose.

```bash
# Review the PAM stack for sudo before changing authentication behavior
sudo nano /etc/pam.d/sudo
```

There is no standard per-service option in `sssd.conf` for this either:

```ini
[pam]
pam_verbosity = 1

# Require online auth for specific PAM services
# (not a standard SSSD option - use PAM rules or GPO for this)
```

A practical approach: restrict sudo to AD/LDAP groups that require online verification, and accept offline auth only for regular logins.

## Cache Management Commands

```bash
# Invalidate all cached entries (forces re-sync with directory on next lookup)
sudo sss_cache -E

# Clear cache for a specific user
sudo sss_cache -u jsmith

# Clear cache for a specific group
sudo sss_cache -g devops

# Check domain online/offline status
sudo sssctl domain-status example.com

# Show only the domain's online/offline state
sudo sssctl domain-status example.com --online
```

## Simulating Offline Mode for Testing

To test offline authentication without actually disconnecting from the directory:

```bash
# Block LDAP access temporarily with iptables
sudo iptables -I OUTPUT -p tcp --dport 389 -j DROP
sudo iptables -I OUTPUT -p tcp --dport 636 -j DROP

# Wait for SSSD to detect the server is offline
# Usually 3-6 seconds (ldap_network_timeout)

# Check that SSSD reports offline
sudo sssctl domain-status example.com
# Should show: Online status: Offline

# Try logging in with cached credentials
su - jsmith

# Restore connectivity
sudo iptables -D OUTPUT -p tcp --dport 389 -j DROP
sudo iptables -D OUTPUT -p tcp --dport 636 -j DROP
```

## SSSD Cache Database Files

Understanding the cache file locations helps with troubleshooting:

```bash
# List cache database files
sudo ls -la /var/lib/sss/db/

# Typical contents:
# cache_example.com.ldb - user/group identity cache
# timestamps_example.com.ldb - cache timestamps
# ccache_EXAMPLE.COM - Kerberos credential cache

# View cache content (requires ldbsearch from ldb-tools package)
sudo apt install -y ldb-tools

sudo ldbsearch -H /var/lib/sss/db/cache_example.com.ldb \
  "(objectClass=user)" name dataExpireTimestamp
```

## Extending Cache for Disconnected Laptops

For laptops that may be offline for extended periods:

```ini
[pam]
# Allow 30 days of offline authentication (laptop scenario)
offline_credentials_expiration = 30

[domain/example.com]
cache_credentials = true

# Keep identity cached for longer periods
entry_cache_timeout = 86400        # 24 hours
entry_cache_nowait_percentage = 75

# Refresh cached info in background every 4 hours when online
refresh_expired_interval = 14400
```

If you use Kerberos, you can also tune ticket lifetimes and let SSSD store a password temporarily while the provider is offline so it can request a TGT when connectivity returns:

```ini
[domain/example.com]
krb5_store_password_if_offline = true
krb5_renewable_lifetime = 7d
krb5_lifetime = 24h
```

## Monitoring Cache Health

```bash
# Create a simple monitoring script
cat > /usr/local/bin/sssd-cache-check.sh << 'EOF'
#!/bin/bash
# Check SSSD domain status and alert if offline

DOMAIN="example.com"
STATUS=$(sssctl domain-status $DOMAIN 2>/dev/null | grep "Online status")
echo "SSSD Domain $DOMAIN: $STATUS"

if echo "$STATUS" | grep -q "Offline"; then
    echo "WARNING: SSSD has been offline - cached credentials in use"
fi
EOF

sudo chmod +x /usr/local/bin/sssd-cache-check.sh

# Add to cron for monitoring
echo "*/15 * * * * root /usr/local/bin/sssd-cache-check.sh >> /var/log/sssd-monitor.log 2>&1" | \
  sudo tee /etc/cron.d/sssd-monitor
```

## Troubleshooting Caching Issues

**"Authentication failure" during offline auth** - cached credentials may have expired. Check `offline_credentials_expiration` and the user's last online login time.

**Old data being served** - cache TTL is too long. Lower `entry_cache_timeout` or run `sudo sss_cache -u username`.

**SSSD not going offline** - SSSD may not detect the directory is unreachable if the TCP connection hangs rather than being refused. Lower `ldap_network_timeout` and `ldap_opt_timeout`.

**Cache corruption** - if SSSD behaves erratically, stop it, clear the cache files, and restart:

```bash
sudo systemctl stop sssd
sudo rm -rf /var/lib/sss/db/*
sudo rm -rf /var/lib/sss/mc/*
sudo systemctl start sssd
```

Proper cache configuration makes SSSD resilient to directory outages while maintaining reasonable security constraints on how long cached credentials remain valid.
