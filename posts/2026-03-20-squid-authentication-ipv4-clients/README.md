# How to Set Up Squid Authentication for IPv4 Clients

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Squid, Authentication, IPv4, Basic Auth, Security, Proxy, Configuration

Description: Learn how to configure Squid proxy authentication using basic auth with htpasswd to require username and password from IPv4 clients.

---

Squid supports several authentication schemes. Basic authentication with an htpasswd file is the simplest approach for small deployments: clients must provide a username and password before the proxy forwards their requests.

## Creating the Password File

```bash
# Install the apache2-utils package for htpasswd

apt install apache2-utils -y  # Debian/Ubuntu
# or
dnf install httpd-tools -y    # RHEL/Rocky

# Create the password file and add the first user
htpasswd -c /etc/squid/passwd user1

# Add additional users (omit -c to append)
htpasswd /etc/squid/passwd user2

# Verify the file
cat /etc/squid/passwd
```

## Squid Configuration

```squid
# /etc/squid/squid.conf

# --- Authentication helper: use basic auth with htpasswd ---
auth_param basic program /usr/lib/squid/basic_ncsa_auth /etc/squid/passwd
auth_param basic realm "Squid Proxy"
auth_param basic credentialsttl 2 hours   # Cache credentials for 2 hours
auth_param basic casesensitive off

# --- ACL: clients must be authenticated ---
acl authenticated proxy_auth REQUIRED

# --- Allow only authenticated clients from the internal IPv4 subnet ---
acl localnet src 192.168.1.0/24

http_access allow localnet authenticated
http_access deny all

# --- Listening port ---
http_port 3128
```

## Bypassing Authentication for Specific IPv4 Addresses

Trusted servers (monitoring, backup agents) can bypass authentication.

```squid
# Trusted internal monitoring servers that don't need authentication
acl trusted_hosts src 10.0.0.5/32 10.0.0.6/32
acl localnet src 192.168.1.0/24

# Allow trusted hosts without authentication
http_access allow trusted_hosts

# Require authentication for other internal IPv4 clients
acl authenticated proxy_auth REQUIRED
http_access allow localnet authenticated
http_access deny all
```

## Testing Authentication

```bash
# Request from an allowed IPv4 client without credentials - should return 407 Proxy Authentication Required
curl -x http://192.168.1.10:3128 http://example.com

# Request with valid credentials
curl -x http://user1:password@192.168.1.10:3128 http://example.com

# Request with invalid credentials - should be denied
curl -x http://baduser:wrongpass@192.168.1.10:3128 http://example.com
```

## Logging Authentication in Access Logs

By default Squid logs the authenticated username in the access log.

```bash
# View access log - with the default squid logformat, the username appears after the URL
tail -f /var/log/squid/access.log
# Example: 1710844800.000  100 192.168.1.5 TCP_MISS/200 1024 GET http://example.com/ user1 DIRECT/93.184.216.34 text/html
```

## Reloading Configuration

```bash
# Test config syntax
squid -k parse

# Reload without dropping connections
squid -k reconfigure
```

## Key Takeaways

- `auth_param basic program /usr/lib/squid/basic_ncsa_auth` sets the authentication helper.
- `acl authenticated proxy_auth REQUIRED` requires any authenticated user.
- Use `credentialsttl` to reduce repeated authentication overhead for busy clients.
- Trusted IPv4 addresses can be exempted from authentication using `src` ACLs with `http_access` allow rules placed before authentication-required rules.
