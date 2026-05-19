# How to Configure SSSD with Multiple Identity Providers on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, SSSD, Authentication, Multi-Domain, Identity

Description: Configure SSSD on Ubuntu with multiple identity providers including LDAP and Active Directory simultaneously for complex authentication environments.

---

Some environments need to authenticate users from multiple directories simultaneously. A development company might have its own OpenLDAP for engineers, partner companies with their own Active Directory domains, and a local Unix-style database for service accounts. SSSD supports multiple domains in a single configuration, each with its own identity provider, making it possible to serve all these sources through a single unified interface.

## How Multiple Domains Work in SSSD

SSSD allows you to define multiple `[domain/name]` sections in `sssd.conf`. Each domain is queried independently, and NSS returns results from whichever domain has the matching user or group. SSSD searches domains in the order they are listed in `[sssd] domains`.

Key considerations:
- UIDs and GIDs must not overlap between domains (configure distinct ranges)
- Users with the same username in different domains are disambiguated by the `@domain` suffix when `use_fully_qualified_names = true`
- Each domain has its own cache

## Example Scenario

- **Internal LDAP** (`ldap.internal.example.com`) - company engineers
- **Partner AD** (`ad.partner.com`) - contractor accounts
- **Local NSS files** - emergency/service accounts outside SSSD

## Setting Up sssd.conf with Multiple Domains

```bash
sudo nano /etc/sssd/sssd.conf
```

```ini
[sssd]
config_file_version = 2
# List all domains - searched in this order

domains = internal.example.com, partner.com
services = nss, pam

[nss]
# How to handle same username across domains:
# With FQN: jsmith@internal.example.com vs jsmith@partner.com
# Without FQN (risky if names overlap): jsmith (first match wins)
filter_users = root, nobody
filter_groups = root

[pam]
offline_credentials_expiration = 7

##
## Domain 1: Internal OpenLDAP
##
[domain/internal.example.com]
id_provider = ldap
auth_provider = ldap

ldap_uri = ldaps://ldap.internal.example.com
ldap_search_base = dc=internal,dc=example,dc=com
ldap_user_search_base = ou=People,dc=internal,dc=example,dc=com
ldap_group_search_base = ou=Groups,dc=internal,dc=example,dc=com

ldap_default_bind_dn = cn=readonly,dc=internal,dc=example,dc=com
ldap_default_authtok_type = password
ldap_default_authtok = ReadOnlyPassword

ldap_tls_reqcert = demand
ldap_tls_cacert = /etc/ssl/certs/internal-ca.crt

# Schema for OpenLDAP with POSIX attributes
ldap_schema = rfc2307
ldap_user_object_class = posixAccount
ldap_group_object_class = posixGroup
ldap_group_member = memberUid

# Accept only POSIX IDs in this range for internal users
min_id = 100000
max_id = 199999

# Use short names for internal users
use_fully_qualified_names = false
fallback_homedir = /home/%u

cache_credentials = true
entry_cache_timeout = 3600

##
## Domain 2: Partner Active Directory
##
[domain/partner.com]
id_provider = ad
auth_provider = ad

ad_domain = partner.com
ad_server = dc.partner.com
krb5_realm = PARTNER.COM

# Generate UIDs algorithmically from AD SIDs in a non-overlapping range
ldap_id_mapping = true
ldap_idmap_range_min = 200000
ldap_idmap_range_max = 400000
ldap_idmap_range_size = 200000

# Partner users must use FQN to disambiguate
use_fully_qualified_names = true
fallback_homedir = /home/%u@%d
default_shell = /bin/bash

cache_credentials = true

# Only allow specific partner groups to log in
access_provider = simple
simple_allow_groups = ContractorGroup@partner.com
```

```bash
sudo chmod 600 /etc/sssd/sssd.conf
sudo systemctl restart sssd
```

## Verifying Multi-Domain Lookups

```bash
# Look up a user from the internal LDAP domain
id jsmith
# Returns: uid=100001(jsmith) gid=100001(engineers)...

# Look up a partner AD user
id contractor@partner.com
# Returns: uid=200001(contractor@partner.com)...

# Test authentication for each domain
su - jsmith               # Uses internal LDAP password
su - contractor@partner.com   # Uses AD password

# Check the expected UID ranges for sample users
id -u jsmith                    # Internal: 100000-199999
id -u contractor@partner.com    # Partner: 200000-399999
```

## Adding a Kerberos-Only Domain

For a domain that uses LDAP for identity but Kerberos for authentication:

```ini
[domain/kerberos.example.com]
id_provider = ldap
auth_provider = krb5

ldap_uri = ldap://ldap.example.com
ldap_search_base = dc=example,dc=com
ldap_tls_reqcert = demand

# Kerberos for authentication
krb5_realm = EXAMPLE.COM
krb5_server = kdc.example.com
krb5_store_password_if_offline = true
krb5_renewable_lifetime = 7d
krb5_lifetime = 24h

min_id = 300000
max_id = 399999
fallback_homedir = /home/%u@%d
```

## Handling UID Conflicts Between Domains

If two domains use the same UID numbers for different users, SSSD cannot safely expose both sets of POSIX IDs unchanged. With AD, SSSD's `ldap_id_mapping = true` generates UIDs algorithmically from the SID:

```ini
[domain/partner.com]
# Generate UIDs algorithmically from AD SIDs
ldap_id_mapping = true

# Range for generated IDs
ldap_idmap_range_min = 200000
ldap_idmap_range_max = 400000
ldap_idmap_range_size = 200000
```

For OpenLDAP, you cannot use `ldap_id_mapping` unless the directory provides Active Directory-style objectSID attributes. Instead, ensure UID/GID values do not overlap in the directory, and optionally use `min_id`/`max_id` to filter which POSIX IDs SSSD accepts from each domain.

## Configuring Subdomains (AD Trusted Domains)

If the partner AD has trust relationships with other AD domains, SSSD can automatically discover and authenticate users from those trusted domains:

```ini
[domain/partner.com]
id_provider = ad
auth_provider = ad
ad_domain = partner.com

# Enable subdomain discovery for trusted domains
subdomains_provider = ad

# Optionally restrict which trusted domains are accessible
ad_enabled_domains = partner.com, trusted.partner.com
```

Check discovered subdomains:

```bash
sudo sssctl domain-list
```

## Per-Domain sudo Access

When users come from multiple domains, configure sudo per-domain:

```bash
sudo nano /etc/sudoers.d/multi-domain
```

```text
# Internal LDAP group gets full access
%sysadmins ALL=(ALL:ALL) ALL

# Partner AD group gets limited access
%ContractorGroup@partner.com ALL=(ALL:ALL) NOPASSWD: \
    /bin/systemctl status *, \
    /usr/bin/journalctl *
```

## Domain Status and Health Monitoring

```bash
# Check status of all configured domains
sudo sssctl domain-status internal.example.com
sudo sssctl domain-status partner.com

# Inspect cached entries for specific users
sudo sssctl user-show jsmith
sudo sssctl user-show contractor@partner.com

# Check for provider errors
sudo journalctl -u sssd --since "1 hour ago" | grep -i error
```

## Troubleshooting Multi-Domain Setups

### Wrong Domain Searched First

SSSD searches domains in the order listed in `[sssd] domains`. If both domains have a user named `jsmith`, the first domain wins when not using FQN. Reorder domains or enable `use_fully_qualified_names = true`.

### UID Range Conflicts

```bash
# If enumeration is enabled, find duplicate UIDs across visible users
getent passwd | awk -F: '{print $3}' | sort | uniq -d
```

If duplicates exist, adjust the directory UID/GID assignments or the `min_id`/`max_id` filters for POSIX LDAP domains. For AD domains using SID-based mapping, adjust `ldap_idmap_range_min`/`ldap_idmap_range_max`, then clear the SSSD cache while the identity providers are reachable.

### Authentication Works for One Domain but Not Another

Test each domain independently:

```bash
# Enable debug for a specific domain
# In sssd.conf under [domain/partner.com]:
# debug_level = 7

sudo systemctl restart sssd
sudo tail -f /var/log/sssd/sssd_partner.com.log
```

### Slow Lookups with Multiple Domains

If `getent passwd username` is slow, SSSD may be searching all domains sequentially. Enable `enumerate = false` (the default) and check that `entry_cache_timeout` is set appropriately so cached data is used for most lookups.

```ini
[domain/partner.com]
# Disable full enumeration (only look up users on demand)
enumerate = false
# 1 hour cache
entry_cache_timeout = 3600
```

Multiple identity providers in SSSD give you a flexible, unified authentication layer that can serve complex hybrid environments where users live in different directories.
