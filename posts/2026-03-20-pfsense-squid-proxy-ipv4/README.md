# How to Set Up Squid Proxy on pfSense for IPv4

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: pfSense, Squid, Proxy, IPv4, Web Filtering, Content Caching

Description: Install and configure the Squid proxy package on pfSense for IPv4 web traffic caching and filtering, including transparent proxy mode, SSL inspection, and SquidGuard URL filtering.

## Introduction

Squid on pfSense provides HTTP caching and web filtering for LAN clients. In transparent mode, clients need no manual proxy configuration - pfSense intercepts port 80 traffic automatically, and port 443 only when HTTPS/SSL Interception is enabled. Netgate currently marks Squid, SquidGuard, and Lightsquid as deprecated in pfSense Plus and pfSense CE due to unfixed upstream security vulnerabilities and warns they will stop functioning in a future major release.

## Install Squid Package

Navigate to **System > Package Manager > Available Packages**:
- Install: `squid`
- Install: `squidGuard` (optional - for URL filtering)

## Basic Squid Configuration

Navigate to **Services > Squid Proxy Server > General**:

```text
Enable Squid Proxy:     checked
Proxy Interface(s):     LAN, OPT1 (interfaces to listen on)
Proxy Port:             3128
Allow Users on Interface: checked (allow LAN subnet)

Transparent HTTP Proxy: checked
Transparent Proxy Interface(s): LAN

Logging:
  Enable Access Logging: checked
  Log Store Directory:   /var/squid/logs
```

## Cache Configuration

Navigate to **Services > Squid Proxy Server > Local Cache**:

```text
Hard Disk Cache Size:    2048 MB
Hard Disk Cache System:  ufs
Level 1 Directories:     16
Memory Cache Size:       256 MB
Maximum Object Size:     512 MB
```

The current pfSense package fixes the Level 2 directory count at `256` internally instead of exposing it as a GUI field.

## SSL/HTTPS Interception (SSL Bump)

```text
WARNING: HTTPS/SSL Interception requires installing the pfSense CA on client devices.

Navigate to: Services > Squid Proxy Server > General
  HTTPS/SSL Interception:     checked
  SSL/MITM Mode:              Splice Whitelist, Bump Otherwise
  SSL Intercept Interface(s): LAN
  CA:                         pfSense-CA (create under System > Certificates)
  SSL Proxy Compatibility Mode: Modern
```

Deploy the CA certificate to clients via GPO or MDM.

## Transparent Proxy Firewall Rules

Do not create a manual **Firewall > NAT > Port Forward** rule for Squid transparent mode. When **Transparent HTTP Proxy** is enabled, the package installs the required redirect rules automatically. If **HTTPS/SSL Interception** is also enabled, the package adds the port `443` redirect to the SSL proxy port automatically as well.

## SquidGuard URL Filtering

Navigate to **Services > SquidGuard Proxy Filter > General settings**:
- Enable: checked

Navigate to **Target categories**:
- Create category: `BLOCKED-SITES`
- Domain List: `facebook.com twitter.com tiktok.com`

Navigate to **Common ACL**:
- Target Rules: `BLOCKED-SITES → deny`
- Default access: `allow`

Return to **General settings** and click **Apply**.

## Monitor Squid

Navigate to **Services > Squid Proxy Server > Status**:
- Overall proxy and cache statistics

Navigate to **Services > Squid Proxy Server > Real Time**:
- Access, cache, and SquidGuard logs

```bash
# pfSense CLI

/usr/local/sbin/squid -k check -f /usr/local/etc/squid/squid.conf
tail -f /var/squid/logs/access.log
```

## Conclusion

Squid on pfSense enables transparent IPv4 web caching and filtering with minimal client configuration. Enable the transparent proxy, configure cache storage, optionally enable HTTPS/SSL Interception for HTTPS filtering, and use SquidGuard for URL blocklists. When transparent proxy mode is enabled, the package installs the redirect rules automatically rather than requiring a manual firewall NAT port-forward rule.
