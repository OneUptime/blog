# How to Understand /etc/nsswitch.conf on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, nsswitch, DNS, Name Resolution, System Administration

Description: Understand /etc/nsswitch.conf on Ubuntu - how it controls hostname resolution, user lookup, and service discovery, and how to configure it for your environment.

---

When a program on Ubuntu asks "what is the IP address of example.com?" or "what user has UID 1000?", the system follows a lookup order defined in `/etc/nsswitch.conf`. This file - the Name Service Switch configuration - tells the C library which databases to consult and in what order for various types of lookups. Misconfiguration here causes slow logins, failed hostname resolution, and authentication problems.

## What nsswitch.conf Controls

The NSS framework covers many types of lookups, not just hostname resolution:

| Database | What it resolves |
|----------|-----------------|
| `passwd` | User account information |
| `group` | Group information |
| `shadow` | Shadow password entries |
| `hosts` | Hostname to IP address mapping |
| `networks` | Network name to address mapping |
| `protocols` | Protocol names (tcp, udp) |
| `services` | Service names (http=80, ssh=22) |
| `ethers` | Ethernet addresses |
| `rpc` | RPC program name/number mapping |
| `netgroup` | NIS netgroup entries |

## Reading /etc/nsswitch.conf

```bash
cat /etc/nsswitch.conf
```

A typical Ubuntu `nsswitch.conf`:

```
# /etc/nsswitch.conf
#
# Example configuration of GNU Name Service Switch functionality.
# If you have the `glibc-doc-reference' and `info' packages installed, try:
# `info libc "Name Service Switch"' for information about this file.

passwd:         files systemd
group:          files systemd
shadow:         files
gshadow:        files

hosts:          files mdns4_minimal [NOTFOUND=return] dns myhostname
networks:       files

protocols:      db files
services:       db files
ethers:         db files
rpc:            db files

netgroup:       nis
```

Each line is:

```
database: source1 [action] source2 source3...
```

## Understanding Sources

Common sources:

| Source | Description |
|--------|-------------|
| `files` | Local files (`/etc/passwd`, `/etc/hosts`, etc.) |
| `dns` | DNS lookup (for `hosts`) |
| `mdns` | Multicast DNS (Avahi/zeroconf) |
| `mdns4` | Multicast DNS, IPv4 only |
| `mdns4_minimal` | mDNS, only for `.local` domains |
| `db` | Berkeley DB databases |
| `nis` | NIS (Network Information Service) |
| `nis+` | NIS+ |
| `ldap` | LDAP directory |
| `systemd` | systemd's dynamic users |
| `sss` | SSSD (System Security Services Daemon) |
| `winbind` | Samba winbind for Active Directory |
| `myhostname` | Current hostname |
| `resolve` | systemd-resolved |

## Understanding Actions

Actions in brackets control what happens when a lookup returns a result:

```
hosts: files mdns4_minimal [NOTFOUND=return] dns
```

This means:
1. Check `files` (`/etc/hosts`)
2. Check `mdns4_minimal` (for `.local` names)
3. If mdns4_minimal returns NOTFOUND, stop (return NOTFOUND without trying DNS)
4. Otherwise, check `dns`

Action syntax: `[STATUS=action]`

**Status codes:**
- `NOTFOUND`: Lookup succeeded but entry not found
- `SUCCESS`: Lookup succeeded and entry found
- `TRYAGAIN`: Service temporarily unavailable
- `UNAVAIL`: Service is permanently unavailable

**Actions:**
- `return`: Stop looking, return current result
- `continue`: Keep checking next source
- `merge`: Merge results from multiple sources (for `group` with supplementary groups)

Default behavior (without explicit actions):
- `SUCCESS` stops the search and returns the result
- `NOTFOUND`, `TRYAGAIN`, `UNAVAIL` continue to the next source

## The hosts Database - Hostname Resolution

The `hosts` line is the most commonly tuned:

```
hosts: files mdns4_minimal [NOTFOUND=return] dns myhostname
```

**Step-by-step:**
1. `files` - Check `/etc/hosts` first. If found, return immediately (default SUCCESS=return)
2. `mdns4_minimal` - Check mDNS for `.local` hostnames
3. `[NOTFOUND=return]` - If mDNS returns NOTFOUND (host not found), stop searching
4. `dns` - Query DNS servers
5. `myhostname` - Resolve the machine's own hostname

### Common hosts Configurations

**Standard configuration (default Ubuntu):**

```
hosts: files mdns4_minimal [NOTFOUND=return] dns myhostname
```

**Skip mDNS (server without Avahi):**

```
hosts: files dns myhostname
```

**Use systemd-resolved:**

```
hosts: files mymachines resolve [!UNAVAIL=return] dns mdns4_minimal myhostname
```

**Check DNS before mDNS:**

```
hosts: files dns mdns4_minimal myhostname
```

**IPv4 only DNS (no IPv6 AAAA lookups):**

This is handled differently - in `/etc/resolv.conf` or systemd-resolved options rather than nsswitch.conf.

## The passwd and group Databases - User Lookups

```
passwd: files systemd
group:  files systemd
```

- `files`: Check `/etc/passwd` and `/etc/group`
- `systemd`: Include systemd dynamic users (used by sandboxed services)

### With LDAP or Active Directory

If your Ubuntu server authenticates against LDAP or Active Directory via SSSD:

```
passwd:         files sss
group:          files sss
shadow:         files sss
gshadow:        files
```

Or with winbind for Active Directory:

```
passwd:         files winbind
group:          files winbind
shadow:         files
```

The `files` source always comes first so local accounts (root, system users) always work even when LDAP is unavailable.

## Debugging nsswitch.conf Issues

### getent - The NSS Testing Tool

`getent` queries the NSS databases directly, following the same rules as system calls:

```bash
# Test hostname resolution (follows hosts: line)
getent hosts example.com
getent hosts 8.8.8.8  # Reverse lookup

# Test user lookup (follows passwd: line)
getent passwd root
getent passwd 1000  # By UID

# Test group lookup
getent group sudo
getent group 1000  # By GID

# List all users
getent passwd

# Test service lookup
getent services ssh
getent services 80/tcp
```

### Diagnosing Slow Logins

Slow SSH logins are often caused by the `hosts` database configuration. If the server is trying to reverse-resolve your IP address through DNS and DNS is slow:

```bash
# Time a hostname lookup
time getent hosts 8.8.8.8

# If slow, DNS reverse lookups are the culprit
# Fix: set UseDNS no in /etc/ssh/sshd_config
# Or ensure reverse DNS works quickly
```

### Diagnosing "User not found" After Adding LDAP

```bash
# Test if SSSD is providing users
getent passwd ldapuser

# If getent works but login fails, check PAM
# If getent fails, check SSSD:
sudo systemctl status sssd
sudo sssctl user-show ldapuser
```

### Checking Which Source Resolved a Lookup

```bash
# Use strace to see which files are opened during a lookup
strace -e trace=open,openat getent passwd root 2>&1 | grep -E "passwd|nsswitch"
```

## mDNS and the .local Domain

The `mdns4_minimal [NOTFOUND=return]` combination in the `hosts` line means:

- `.local` hostnames go through mDNS
- If not found in mDNS, the search stops (doesn't fall through to DNS)
- Non-.local names are not tried through mDNS

This prevents DNS leakage of `.local` names to the internet. If you're in an environment where `.local` is a real DNS domain (some corporate networks use it), this causes lookups to fail:

```bash
# If .local is a real DNS domain, remove mdns4_minimal:
hosts: files dns myhostname
```

## nsswitch.conf and systemd-resolved

Ubuntu uses `systemd-resolved` for DNS. The interaction with nsswitch.conf:

```bash
# Check if systemd-resolved is running
systemctl status systemd-resolved

# The resolv.conf symlink
ls -la /etc/resolv.conf

# Should point to:
# /run/systemd/resolve/stub-resolv.conf (recommended)
# or /run/systemd/resolve/resolv.conf
```

To use `systemd-resolved` fully through nsswitch:

```
hosts: files mymachines resolve [!UNAVAIL=return] dns mdns4_minimal myhostname
```

Or check what Ubuntu currently configures:

```bash
cat /etc/nsswitch.conf | grep hosts
```

## Performance Considerations

### Order Matters

Put the most-frequently-used and fastest source first:

```
# Good: local files checked before DNS
hosts: files dns

# Less efficient: DNS checked before local files
hosts: dns files  # Don't do this unless you have a reason
```

### Negative Caching

When a lookup fails, the result isn't cached by default. If `getent hosts nonexistent.example.com` fails, the next call checks all sources again. Tools like `nscd` (Name Service Caching Daemon) or `systemd-resolved`'s built-in cache handle negative caching.

```bash
# Install nscd for NSS caching
sudo apt install nscd
sudo systemctl enable --now nscd
```

### Avoid Unnecessary Sources

Each source adds latency if the previous one returns NOTFOUND. Keep only what you need:

```bash
# If you don't use NIS:
# Don't have 'nis' in any database line
netgroup:       nis  # Remove if not using NIS
```

## Modifying nsswitch.conf Safely

Always keep `files` first in `passwd`, `group`, and `shadow` databases - this ensures local system accounts always work even if a remote directory (LDAP, AD) is unreachable:

```
# Safe - local files first
passwd: files ldap

# Dangerous - if LDAP is down, local accounts may not work
passwd: ldap files  # Don't do this
```

Test after changes with `getent` before logging out of all sessions:

```bash
# Verify root still resolves
getent passwd root

# Verify hostname resolution works
getent hosts localhost
getent hosts google.com
```

## Summary

`/etc/nsswitch.conf` is a small but impactful configuration file that controls the lookup order for user accounts, hostnames, groups, and other name services. The most common tuning tasks are: adjusting the `hosts` line for faster or different hostname resolution, adding LDAP/SSSD sources to `passwd` and `group` for centralized authentication, and removing unnecessary sources like NIS when they're not in use. Testing changes with `getent` before committing them prevents authentication lockouts or name resolution failures.
