# How to Configure SSSD for Multi-Domain Environments on RHEL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, SSSD, Multi-Domain, Active Directory, LDAP

Description: Configure SSSD on RHEL to authenticate users from multiple identity domains simultaneously, including mixed Active Directory and LDAP environments.

---

In enterprise environments, you often need a single RHEL system to authenticate users from multiple identity sources. SSSD supports this through multi-domain configuration, where each domain has its own backend and settings.

## Basic Multi-Domain Configuration

```bash
sudo vi /etc/sssd/sssd.conf
```

```ini
[sssd]
# List all domains, separated by commas
# SSSD searches them in the order listed
domains = ad.example.com, ldap.internal.com
services = nss, pam

[domain/ad.example.com]
id_provider = ad
access_provider = ad
ad_domain = ad.example.com
krb5_realm = AD.EXAMPLE.COM
cache_credentials = True

[domain/ldap.internal.com]
id_provider = ldap
auth_provider = ldap
ldap_uri = ldaps://ldap.internal.com
ldap_search_base = dc=internal,dc=com
cache_credentials = True
ldap_tls_reqcert = demand
ldap_tls_cacert = /etc/pki/tls/certs/ca-bundle.crt
```

## Avoiding UID/GID Conflicts

When using multiple domains, ensure there are no UID/GID overlaps.

```bash
# Set different ID ranges for each domain
```

```ini
[domain/ad.example.com]
ldap_id_mapping = True
# AD auto-maps UIDs starting from a hash of the domain SID

[domain/ldap.internal.com]
min_id = 100000
max_id = 199999
```

## Domain Resolution Order

Control which domain SSSD checks first for user lookups.

```ini
[sssd]
domains = ad.example.com, ldap.internal.com
# Users can qualify their domain with a separator
domain_resolution_order = ad.example.com, ldap.internal.com
# Default domain for unqualified names
default_domain_suffix = ad.example.com
```

## Applying and Testing

```bash
# Validate the configuration
sudo sssctl config-check

# Restart SSSD
sudo systemctl restart sssd

# Test user lookup from the AD domain
id user1@ad.example.com

# Test user lookup from the LDAP domain
id user2@ldap.internal.com

# Test with the default domain (unqualified name)
id user1
# Resolves against ad.example.com since it is the default
```

## Checking Domain Status

```bash
# View the status of all configured domains
sudo sssctl domain-list

# Check each domain individually
sudo sssctl domain-status ad.example.com
sudo sssctl domain-status ldap.internal.com
```

Multi-domain setups are common in organizations undergoing directory migrations or those with separate directories for different departments. Keep the domain list short and order them by most frequently used first for best performance.
