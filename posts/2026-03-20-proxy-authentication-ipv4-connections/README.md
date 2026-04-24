# How to Configure Proxy Authentication for IPv4 Connections

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Proxy, Authentication, Squid, IPv4, Security, Basic Auth

Description: Set up username/password authentication on a Squid proxy server to require credentials before allowing IPv4 clients to use the proxy.

## Introduction

Proxy authentication requires clients to provide credentials before the proxy forwards their traffic. This is useful in corporate environments, shared hosting, or any scenario where you need to control who can use your proxy server and audit usage by user.

## Authentication Methods

| Method | Description | Security |
|--------|-------------|---------|
| Basic | Username/password in Base64 | Low (unless the proxy connection uses TLS) |
| Digest | Hashed challenge-response | Medium |
| NTLM/Kerberos | Windows domain auth | High (enterprise) |
| LDAP-backed Basic | Basic auth checked against a directory service | Medium to High (depends on TLS) |

## Setting Up Basic Authentication with Squid

### Step 1: Create the Password File

```bash
# Install the htpasswd utility

sudo apt-get install apache2-utils

# Create a new password file with the first user
sudo htpasswd -c /etc/squid/passwd user1

# Add additional users (omit -c to avoid overwriting)
sudo htpasswd /etc/squid/passwd user2
```

### Step 2: Configure Squid Authentication

Edit `/etc/squid/squid.conf`:

```squid
# Step 1: Configure the authentication helper program
auth_param basic program /usr/lib/squid/basic_ncsa_auth /etc/squid/passwd
auth_param basic realm "Corporate Proxy"
auth_param basic credentialsttl 2 hours
auth_param basic casesensitive on

# Step 2: Create an ACL that requires authentication
acl authenticated_users proxy_auth REQUIRED

# Step 3: Allow only authenticated users
http_access deny !authenticated_users
http_access allow authenticated_users
http_access deny all
```

### Step 3: Apply the Configuration

```bash
# Validate squid.conf
sudo squid -k parse

# Reload Squid
sudo squid -k reconfigure
```

## Restricting Authentication to Specific IP Ranges

Allow specific IP ranges to bypass auth (e.g., internal servers):

```squid
# Trusted internal network can bypass auth
acl trusted_net src 10.0.0.0/8
acl authenticated_users proxy_auth REQUIRED

# Internal network: no auth required
http_access allow trusted_net

# External/guest: auth required
http_access deny !authenticated_users
http_access allow authenticated_users

# Deny everything else
http_access deny all
```

## Using LDAP Authentication

For directory-integrated authentication:

```squid
# LDAP authentication helper
auth_param basic program /usr/lib/squid/basic_ldap_auth \
  -b "dc=example,dc=com" \
  -h ldap.example.com \
  -f "uid=%s" \
  -D "cn=squid,dc=example,dc=com" \
  -w "ldap_password"

auth_param basic realm "Corporate Proxy"
acl ldap_users proxy_auth REQUIRED
http_access deny !ldap_users
http_access allow ldap_users
http_access deny all
```

## Configuring Clients to Use the Authenticated Proxy

### curl

```bash
# HTTP proxy with credentials
curl --proxy http://user1:password@proxy.example.com:3128 \
     http://example.com

# HTTPS destination through the same proxy
curl --proxy-user user1:password \
     --proxy http://proxy.example.com:3128 \
     https://example.com
```

### Shell Environment Variables

```bash
# Set in ~/.bashrc or export in your current shell
export http_proxy="http://user1:password@proxy.example.com:3128"
export https_proxy="http://user1:password@proxy.example.com:3128"
export no_proxy="localhost,127.0.0.1,.internal.example.com"
```

## Logging Authentication Events

```bash
# Monitor authenticated proxy access
sudo tail -f /var/log/squid/access.log | \
  awk '$8 != "-" {print $3, $6, $7, $8}'
```

## Conclusion

Proxy authentication with Squid is straightforward to configure using basic auth for small deployments or LDAP/Kerberos for enterprise environments. Because Basic credentials are only Base64-encoded, use TLS to the proxy itself on untrusted networks to prevent credential interception.
