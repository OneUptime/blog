# How to Troubleshoot LDAP IPv6 Connection Issues

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: LDAP, IPv6, Troubleshooting, OpenLDAP, SSSD, Debugging, Authentication

Description: Diagnose and resolve LDAP connection failures over IPv6 by systematically checking server binding, DNS resolution, firewall rules, TLS configuration, and access controls.

---

LDAP over IPv6 failures can stem from many sources - the server not listening on IPv6, DNS not returning AAAA records, firewall blocking port 389, or TLS certificate mismatch. This guide covers a structured diagnostic approach.

## Step 1: Verify Basic IPv6 Connectivity

```bash
# Check IPv6 is functional

ip -6 addr show | grep "scope global"

# Test basic reachability to the LDAP server
ping6 -c 4 2001:db8::1

# Trace the path
traceroute6 2001:db8::1
```

## Step 2: Verify LDAP Server is Listening on IPv6

```bash
# On the LDAP server, check listening ports
ss -tlnp | grep :389
ss -tlnp | grep :636

# Expected for IPv6 support:
# LISTEN 0 128 [::]:389  [::]:*  users:(("slapd",...))

# If only showing 0.0.0.0:389, IPv6 is not enabled on the listener
# Fix: Update slapd startup to include ldap://[::]/
```

## Step 3: Test TCP Connection to LDAP Port

```bash
# Test TCP connectivity to LDAP port over IPv6
nc -6 -w 5 2001:db8::1 389
# Output: nothing (connection accepted, waiting for data) = success
# "Connection refused" = port closed
# No output, then timeout = firewall blocking

# Alternative: use curl for LDAP connectivity test
curl -6 -v ldap://[2001:db8::1]:389/ 2>&1 | head -20

# Check if port is open from outside using nmap
nmap -6 -p 389,636 2001:db8::1
```

## Step 4: Test LDAP Protocol Connectivity

```bash
# Test LDAP with anonymous bind over IPv6
ldapsearch -H ldap://[2001:db8::1]:389 \
  -x \
  -b "" \
  -s base \
  "(objectClass=*)" \
  namingContexts 2>&1

# Test with authentication
ldapsearch -H ldap://[2001:db8::1]:389 \
  -D "cn=admin,dc=example,dc=com" \
  -w adminpassword \
  -b "dc=example,dc=com" \
  "(cn=testuser)" 2>&1

# Common error messages:
# "Can't contact LDAP server" - TCP connection failed
# "Invalid credentials" - wrong password (connection worked)
# "Server is unwilling to perform" - access control issue
```

## Step 5: Check Firewall Rules

```bash
# Check IPv6 firewall for LDAP ports
sudo ip6tables -L -n -v | grep "389\|636"

# Check if LDAP traffic is being dropped
sudo ip6tables -L INPUT -n | grep "DROP\|REJECT"

# Temporarily allow LDAP for testing
sudo ip6tables -I INPUT -p tcp --dport 389 -j ACCEPT
sudo ip6tables -I INPUT -p tcp --dport 636 -j ACCEPT

# Check firewalld
sudo firewall-cmd --list-services | grep ldap
# Runtime-only rule (reverts on reload/restart); use --timeout=SECS for a timed rule
sudo firewall-cmd --add-service=ldap
```

## Step 6: Debug DNS Resolution

```bash
# Check if the LDAP server hostname resolves to IPv6
dig AAAA ldap.example.com +short

# If no AAAA record, your client will use IPv4
# Solution: Use the IPv6 address directly in the URI
ldapsearch -H ldap://[2001:db8::1] ...

# Verify reverse DNS
dig -x 2001:db8::1 +short

# Test getaddrinfo resolution order
python3 -c "import socket; print(socket.getaddrinfo('ldap.example.com', 389))"
```

## Step 7: Troubleshoot TLS/LDAPS Issues

```bash
# Test LDAPS connection with verbose output
openssl s_client \
  -connect [2001:db8::1]:636 \
  -showcerts 2>&1 | head -30

# Check certificate SAN covers the hostname
openssl s_client \
  -connect [2001:db8::1]:636 \
  -servername ldap.example.com 2>&1 | \
  openssl x509 -noout -text | grep "Subject Alternative"

# Test StartTLS
ldapsearch -H ldap://[2001:db8::1]:389 \
  -ZZ \
  -x \
  -b "dc=example,dc=com" "(cn=*)" 2>&1
```

## Step 8: Check SSSD Connectivity

```bash
# Check SSSD logs for LDAP IPv6 errors
sudo journalctl -u sssd --since "1 hour ago"

# Enable SSSD debug logging
sudo sss_cache -E  # Clear cache first
sudo sed -i 's/debug_level = .*/debug_level = 9/' /etc/sssd/sssd.conf
sudo systemctl restart sssd

# Watch SSSD logs in real time
sudo tail -f /var/log/sssd/sssd_LDAP.log

# Test user lookup
id someuser 2>&1
getent passwd someuser
```

## Common LDAP IPv6 Errors Reference

| Error | Cause | Fix |
|-------|-------|-----|
| `Can't contact LDAP server` | No TCP connection | Check firewall, server binding |
| `LDAP Result Code 1 "Operations Error"` | Server-side issue | Check slapd logs |
| `Certificate verify failed` | TLS SAN mismatch | Use matching hostname or IP SAN |
| `Referral` | Wrong base DN | Verify base DN |
| `ldap_url_parse_ext: URL parsing error` | Wrong bracket format in URI | Use `[addr]` around IPv6 literal in URI |

Methodical diagnosis - from basic connectivity through DNS, firewall, LDAP protocol, and TLS - efficiently identifies and resolves LDAP IPv6 connection failures in production environments.
