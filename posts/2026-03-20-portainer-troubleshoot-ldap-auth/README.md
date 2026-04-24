# How to Troubleshoot LDAP Authentication Issues in Portainer

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, LDAP, Troubleshooting, Authentication, Debugging

Description: Diagnose and resolve common LDAP authentication failures in Portainer including connection errors, search failures, and credential issues.

## Introduction

LDAP authentication issues in Portainer can range from network connectivity problems to subtle configuration mismatches. This guide provides a systematic approach to diagnosing and fixing the most common LDAP authentication failures.

## Diagnostic Checklist

Work through these checks in order:

1. Network connectivity (can Portainer reach the LDAP server?)
2. Service account bind (can Portainer authenticate?)
3. User search (can Portainer find users?)
4. Specific user search (does the username attribute and Base DN find the user?)
5. TLS/certificate validation (can Portainer trust the LDAP server certificate?)
6. Portainer configuration and logs (are settings saved correctly and are LDAP errors visible?)

## Check 1: Network Connectivity

```bash
# From the Portainer host (or container)

# Test TCP connectivity to LDAP port
nc -zv ldap.example.com 389
nc -zv ldap.example.com 636  # For LDAPS

# From inside the Portainer container
docker exec portainer nc -zv ldap.example.com 389

# DNS resolution check
docker exec portainer nslookup ldap.example.com
```

**Common cause**: Firewall blocking port 389/636 between Docker network and LDAP server.

**Fix**: Update firewall rules to allow outbound TCP 389 or 636 from the Portainer host/container.

## Check 2: Service Account Bind

```bash
# Test the bind account
ldapsearch -x \
  -H ldap://ldap.example.com:389 \
  -D "cn=portainer-bind,dc=example,dc=com" \
  -w "bindpassword" \
  -b "dc=example,dc=com" \
  -s base "(objectClass=*)"
```

**Error: `ldap_bind: Invalid credentials (49)`**
- Wrong password for the bind account
- Wrong DN format
- Account locked or expired

**Fix**: Verify DN format with ldapadmin or by checking the directory structure.

## Check 3: User Search

```bash
# Test user search with the bind account
ldapsearch -x \
  -H ldap://ldap.example.com:389 \
  -D "cn=portainer-bind,dc=example,dc=com" \
  -w "bindpassword" \
  -b "ou=users,dc=example,dc=com" \
  "(objectClass=inetOrgPerson)" uid

# Count returned users
ldapsearch -x \
  -H ldap://ldap.example.com:389 \
  -D "cn=portainer-bind,dc=example,dc=com" \
  -w "bindpassword" \
  -b "ou=users,dc=example,dc=com" \
  "(objectClass=inetOrgPerson)" uid \
  | grep -c "^uid:"
```

**Error: `ldap_search: No such object (32)`**
- Base DN doesn't exist
- Typo in Base DN

**Fix**: Use `ldapsearch -x -H ldap://ldap.example.com:389 -D "cn=portainer-bind,dc=example,dc=com" -w "bindpassword" -b "dc=example,dc=com" -s one "(|(objectClass=organizationalUnit)(objectClass=container))" dn` to discover valid OUs or containers.

## Check 4: Specific User Search

```bash
# Find a specific user
ldapsearch -x \
  -H ldap://ldap.example.com:389 \
  -D "cn=portainer-bind,dc=example,dc=com" \
  -w "bindpassword" \
  -b "ou=users,dc=example,dc=com" \
  "(uid=testuser)" dn uid cn
```

**Returns no results when user exists**:
- Wrong username attribute (try `sAMAccountName`, `cn`, `mail`)
- User is in a different OU than the Base DN covers
- User filter excludes the user

## Check 5: TLS/Certificate Issues

```bash
# Test LDAPS certificate
openssl s_client -connect ldap.example.com:636 < /dev/null 2>&1 \
  | grep -E "Verify return code:|subject=|issuer="

# Test StartTLS
openssl s_client -connect ldap.example.com:389 -starttls ldap < /dev/null 2>&1 \
  | grep -E "Verify return code:|subject=|issuer="
```

**"Verify return code: 21 (unable to verify the first certificate)"**: CA certificate not trusted.

**Fix**: Upload the CA certificate to the TLS CA certificate field in the Portainer LDAP settings.

## Check 6: Portainer Configuration Issues

```bash
# View current LDAP settings
TOKEN=$(curl -s -X POST \
  https://portainer.example.com/api/auth \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"adminpassword"}' \
  | python3 -c "import sys,json; print(json.load(sys.stdin)['jwt'])")

curl -s \
  -H "Authorization: Bearer $TOKEN" \
  https://portainer.example.com/api/settings \
  | python3 -c "import sys,json; s=json.load(sys.stdin); print(json.dumps(s.get('LDAPSettings',{}), indent=2))"
```

## Error Reference Table

| Error Message | Likely Cause | Fix |
|--------------|-------------|-----|
| `Can't contact LDAP server` | Network/firewall | Open port 389/636 |
| `Invalid credentials (49)` | Wrong bind DN or password | Verify bind account |
| `No such object (32)` | Wrong Base DN | Check directory structure |
| `Insufficient access` | Bind account lacks read permission | Grant read access to bind account |
| `Size limit exceeded (4)` | Too many results | Use a more specific filter |
| `TLS handshake failure` | Certificate issue | Provide correct CA cert |

## Portainer Log Analysis

```bash
# View Portainer logs for LDAP errors
docker logs portainer 2>&1 | grep -i "ldap\|auth\|login" | tail -30

# Enable debug logging when starting Portainer (if available in your version)
docker run portainer/portainer-ce:latest --log-level=DEBUG
```

## Conclusion

LDAP troubleshooting follows a systematic path from network to application layer. Start with connectivity, verify the bind account, confirm user search works, then review TLS, Portainer settings, and logs. The ldapsearch tool is your best diagnostic companion - it lets you validate the same server, bind, and search settings Portainer relies on without going through the Portainer UI. Most issues fall into three categories: network problems, incorrect DN/filter configuration, and certificate issues.
