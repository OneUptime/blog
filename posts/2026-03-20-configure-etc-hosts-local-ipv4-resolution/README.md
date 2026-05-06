# How to Configure /etc/hosts for Local IPv4 Name Resolution on Linux

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Linux, DNS, IPv4, /etc/hosts, Name Resolution, Network Configuration

Description: Configure /etc/hosts on Linux to resolve hostnames to IPv4 addresses locally, override DNS for specific hosts, and understand the resolution order controlled by /etc/nsswitch.conf.

## Introduction

`/etc/hosts` is the simplest name resolution mechanism - a flat text file mapping hostnames to IP addresses. The system resolver usually checks it before querying DNS according to `/etc/nsswitch.conf`, making it useful for local development, testing, and overriding specific DNS entries.

## /etc/hosts Format

Each line follows the format: `<IP address> <canonical hostname> [aliases...]`

```text
# /etc/hosts

# Loopback addresses

127.0.0.1       localhost
127.0.1.1       myhostname

# Static local hosts
192.168.1.10    fileserver fileserver.local
192.168.1.20    dbserver db
192.168.1.30    webserver01 web01

# Override a public domain for local testing
192.168.1.100   api.example.com

# Block a domain by pointing it to localhost
127.0.0.1       tracking.ads.com
```

## Editing /etc/hosts

```bash
# Open with a text editor (requires sudo)
sudo nano /etc/hosts

# Or append an entry directly
echo "192.168.1.50 mydevserver" | sudo tee -a /etc/hosts
```

Changes normally take effect immediately, though some applications may cache lookups.

## Verifying Resolution

```bash
# Test that the hostname resolves to the expected IP
getent hosts fileserver
# Output: 192.168.1.10    fileserver

# Or use ping (which also tests reachability)
ping -c 1 fileserver
```

## Understanding Resolution Order

The order in which Linux consults different name sources is controlled by `/etc/nsswitch.conf`:

```bash
grep ^hosts /etc/nsswitch.conf
# Typical output:
# hosts: files dns
```

- `files` = `/etc/hosts` (checked first)
- `dns` = the DNS resolver using servers configured in `/etc/resolv.conf`
- `mdns4_minimal` = mDNS for `.local` names

To check DNS first and only fall back to hosts:

```text
hosts: dns files
```

## Using /etc/hosts for Development

Override production endpoints with local development versions:

```text
# Point staging API to a local container
127.0.0.1    api.staging.example.com
127.0.0.1    cdn.staging.example.com

# Point to a local dev server running on a different machine
192.168.1.200   dev.example.com admin.example.com
```

## Multiple Hostnames per IP

```text
# A server with multiple roles
192.168.1.10    primary-db db01 db mysql
```

All four names resolve to the same IP.

## Blocking Hosts (Ad-blocking / Security)

```text
# Block malicious or tracking domains
127.0.0.1    malware.example.com
0.0.0.0      tracking.thirdparty.com
```

## /etc/hosts on Different Platforms

| Platform | Location |
|---|---|
| Linux / macOS | `/etc/hosts` |
| Windows | `C:\Windows\System32\drivers\etc\hosts` |
| Container (Docker) | Set via `--add-host` flag or `extra_hosts:` in Compose |

## Conclusion

`/etc/hosts` provides instant, DNS-independent name resolution that is ideal for local development, static infrastructure mapping, and overriding DNS. Changes normally take effect immediately, and entries persist as long as they are in the file. For anything beyond a handful of entries, use a proper DNS server.
