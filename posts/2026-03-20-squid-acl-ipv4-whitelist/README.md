# How to Configure Squid Proxy Access Control Lists for IPv4 Address Whitelisting

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Squid, ACL, Access Control, IPv4, Whitelist, Proxy

Description: Configure Squid proxy ACLs to whitelist specific IPv4 addresses and subnets, restrict access by destination domain or IP, and implement time-based access controls.

## Introduction

Squid ACLs (Access Control Lists) define who can access the proxy, what destinations they can reach, and when. Rules are evaluated top-to-bottom and the first matching `http_access` rule wins. A well-structured ACL policy enforces the principle of least privilege.

## Source IP Whitelisting

```text
# /etc/squid/squid.conf

# Define allowed client IPs/subnets

acl allowed_clients src 10.0.1.0/24
acl allowed_clients src 10.0.2.100/32
acl allowed_clients src 172.16.5.0/28

# Allow only whitelisted clients
http_access allow allowed_clients
http_access deny all
```

## Destination Domain Whitelisting

Allow clients to reach only specific external sites:

```text
# Allow list for domains
acl allowed_sites dstdomain .github.com .npmjs.com .pypi.org

# Deny everything else
http_access allow allowed_clients allowed_sites
http_access deny all
```

## Destination IP Whitelisting

```text
# Whitelist destination IP ranges (replace example ranges with your targets)
acl allowed_dest dst 203.0.113.0/24
acl allowed_dest dst 198.51.100.0/24

http_access allow allowed_clients allowed_dest
http_access deny all
```

## Using External ACL Files

For large lists, use external files:

```text
# /etc/squid/allowed_domains.txt
.github.com
.npmjs.com
.registry.npmjs.org
.pypi.org
.python.org
.ubuntu.com
.debian.org

# Reference in squid.conf
acl allowed_sites dstdomain "/etc/squid/allowed_domains.txt"
```

## Time-Based ACL

Allow internet access only during business hours:

```text
acl business_hours time MTWHF 08:00-18:00
acl allowed_clients src 10.0.0.0/8

http_access allow allowed_clients business_hours
http_access deny all
```

Days: M=Mon, T=Tue, W=Wed, H=Thu, F=Fri, A=Sat, S=Sun

## Blocking Specific Sites

```text
# Blacklist
acl blocked_sites dstdomain .facebook.com .twitter.com .youtube.com

# Block comes before allow
http_access deny blocked_sites
http_access allow allowed_clients
http_access deny all
```

## User Authentication with Basic Auth

```text
auth_param basic program /usr/lib/squid/basic_ncsa_auth /etc/squid/passwd
auth_param basic realm "Squid Proxy"

acl authenticated_users proxy_auth REQUIRED

http_access allow authenticated_users
http_access deny all
```

Create user credentials:

```bash
sudo htpasswd -c /etc/squid/passwd user1
sudo htpasswd /etc/squid/passwd user2
```

## Combined Policy Example

```text
# Source
acl corp_network src 10.0.0.0/8
acl dev_team     src 10.0.5.0/24

# Destination
acl work_sites   dstdomain "/etc/squid/work_sites.txt"
acl social_media dstdomain .facebook.com .instagram.com .twitter.com

# Time
acl work_hours time MTWHF 08:00-18:00

# Rules (order matters!)
http_access deny social_media
http_access allow dev_team
http_access allow corp_network work_sites work_hours
http_access deny all
```

## Reloading ACL Changes

```bash
# Verify new config syntax first
sudo squid -k parse

# Reload Squid config without restart
sudo squid -k reconfigure
```

## Testing ACL Rules

```bash
# Test from a whitelisted client
curl -x http://squid-server:3128 https://github.com -I

# Test from a non-whitelisted IP (should fail)
# Use curl --interface with a configured local IP or interface to test source-based rules
```

## Conclusion

Squid ACLs follow a top-down, first-match-wins evaluation model. Define ACLs for sources (`src`), destinations (`dstdomain`, `dst`), methods, times, and users. Place deny rules before allows for blocklists. Use external ACL files for large domain or IP lists. Always verify with `squid -k parse`, then reload with `squid -k reconfigure` after changes.
