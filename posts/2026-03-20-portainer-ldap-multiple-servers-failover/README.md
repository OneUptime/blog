# How to Configure Multiple LDAP Servers for Failover in Portainer (2)

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, LDAP, High Availability, Failover, Authentication

Description: Configure Portainer with multiple LDAP servers for high availability authentication failover when the primary server is unavailable.

## Introduction

A single LDAP server is a single point of failure for LDAP-backed authentication. If it goes down, LDAP users cannot log in to Portainer, so keep the initial admin account available as a break-glass login. Portainer's web UI documents support for additional LDAP servers for authentication fallback, which is especially important for production environments with uptime requirements.

## How LDAP Failover Works in Portainer

Portainer's current documentation describes multiple LDAP servers as authentication fallback:
1. Configure the primary LDAP server in Settings → Authentication → LDAP
2. Use **Add additional server** in the web UI to enter fallback servers
3. Keep the bind account, TLS mode, and search settings consistent across those servers
4. Keep the initial admin account available for break-glass access if external authentication is unavailable

## Prerequisites

- Portainer Business Edition (LDAP and Active Directory external authentication are gated as BE features in the current Portainer UI)
- Multiple LDAP servers (primary + one or more replicas)
- Read-only service account with identical credentials on all servers (or different accounts per server)

## Configuration via the Web UI

In Settings → Authentication → LDAP, you can add multiple servers in Portainer Business Edition:

1. Configure the first (primary) server
2. Click **Add additional server** to add fallback servers
3. Each server entry has its own host, port, and optional credentials

## Configuration via API

Portainer's current public API schema documents a single `LDAPSettings.URL` field rather than a `Servers` array, so the web UI is the documented path for configuring multiple fallback servers. The example below shows the documented single-server LDAP payload shape:

```bash
TOKEN=$(curl -s -X POST \
  https://portainer.example.com/api/auth \
  -H "Content-Type: application/json" \
  -d '{"Username":"admin","Password":"adminpassword"}' \
  | python3 -c "import sys,json; print(json.load(sys.stdin)['jwt'])")

# Configure LDAP using the documented API schema

curl -X PUT \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  https://portainer.example.com/api/settings \
  -d '{
    "AuthenticationMethod": 2,
    "LDAPSettings": {
      "URL": "ldap-primary.example.com:636",
      "AnonymousMode": false,
      "ReaderDN": "cn=portainer-bind,dc=example,dc=com",
      "Password": "bindpassword",
      "TLSConfig": {
        "TLS": true,
        "TLSSkipVerify": false
      },
      "StartTLS": false,
      "SearchSettings": [
        {
          "BaseDN": "ou=users,dc=example,dc=com",
          "UserNameAttribute": "uid",
          "Filter": "(objectClass=inetOrgPerson)"
        }
      ]
    }
  }'
```

## Active Directory Multi-DC Configuration

For AD environments with multiple domain controllers, add each controller in the web UI with the same bind account and TLS mode:

```text
AD Controller 1: dc01.corp.example.com:636
AD Controller 2: dc02.corp.example.com:636
Service Account: portainer-svc@corp.example.com
Use TLS: enabled
```

**Pro tip**: Active Directory environments can also use a stable DNS name or load balancer in front of the domain controllers:
```text
Host: ldap.corp.example.com
Port: 636
```

This works when that hostname resolves to reachable controllers or a load-balanced VIP. Portainer connects to the configured host and port directly; it does not query DNS SRV records itself.

## Monitoring LDAP Server Health

Set up monitoring to detect LDAP failures before they impact users:

```bash
#!/bin/bash
# check-ldap-health.sh

LDAP_SERVERS=("ldap-primary.example.com:636" "ldap-secondary.example.com:636")
BIND_DN="cn=portainer-bind,dc=example,dc=com"
BIND_PW="bindpassword"

for server in "${LDAP_SERVERS[@]}"; do
  HOST=$(echo $server | cut -d: -f1)
  PORT=$(echo $server | cut -d: -f2)

  # Try to bind
  RESULT=$(ldapsearch -x \
    -H "ldaps://${HOST}:${PORT}" \
    -D "$BIND_DN" \
    -w "$BIND_PW" \
    -b "dc=example,dc=com" \
    -s base "(objectClass=*)" \
    2>&1)

  if echo "$RESULT" | grep -q "result: 0 Success"; then
    echo "✓ ${HOST}:${PORT} - HEALTHY"
  else
    echo "✗ ${HOST}:${PORT} - UNREACHABLE or AUTH FAILURE"
    echo "  Error: $(echo "$RESULT" | grep "ldap_" | head -1)"
    # Send alert here
  fi
done
```

## Connection Timeout Configuration

Portainer does not expose a separate LDAP connection-timeout setting in the current UI or public API. If an LDAP endpoint is slow or unreachable, login delays are governed by the underlying network and TCP timeouts, so keep LDAP servers close to Portainer or place them behind a fast local load balancer.

## Testing Failover

```bash
# Simulate primary server failure
# Block ldap-primary traffic temporarily
sudo iptables -A OUTPUT -d ldap-primary.example.com -j DROP

# Try to log in to Portainer - it should fall back to the next configured server

# Restore connectivity
sudo iptables -D OUTPUT -d ldap-primary.example.com -j DROP
```

## Conclusion

Multiple LDAP server configuration in Portainer is done in the web UI by adding additional servers, while the current public API schema documents only a single `LDAPSettings.URL`. For production environments, keep fallback servers aligned on bind, TLS, and search settings, and keep the initial admin account available for break-glass access.
