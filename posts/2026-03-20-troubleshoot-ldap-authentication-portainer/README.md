# How to Troubleshoot LDAP Authentication Issues in Portainer - Authentication

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, LDAP, Troubleshooting, Authentication, Debugging

Description: A systematic guide to diagnosing and fixing common LDAP authentication problems in Portainer.

---

LDAP authentication failures in Portainer can stem from network issues, misconfigured bind credentials, incorrect search filters, or TLS problems. This guide walks through systematic diagnosis and resolution.

## Enable Debug Logging

Start with debug logs to see what Portainer is attempting:

```bash
# Restart Portainer with debug logging

docker stop portainer && docker container rm portainer

docker run -d \
  -p 8000:8000 \
  -p 9443:9443 \
  --name portainer \
  --restart=always \
  -v /var/run/docker.sock:/var/run/docker.sock \
  -v portainer_data:/data \
  portainer/portainer-ee:latest \
  --log-level DEBUG

# Watch logs while attempting LDAP login
docker logs -f portainer 2>&1 | grep -i ldap
```

## Symptom: "Invalid credentials" Error

The user exists in LDAP but gets "invalid credentials":

```bash
# Verify the exact DN format Portainer constructs
# Portainer constructs: <UserNameAttribute>=<username>,<BaseDN>
# Example: uid=john,ou=users,dc=example,dc=com

# Test manual bind with the same DN
ldapwhoami -H ldaps://ldap.example.com:636 \
  -x \
  -D "uid=john,ou=users,dc=example,dc=com" \
  -w "john-password"

# If this fails, the DN construction is wrong
# Check your BaseDN and UserNameAttribute settings
```

## Symptom: "No such object" or User Not Found

```bash
# Verify the BaseDN is correct
ldapsearch -H ldaps://ldap.example.com:636 \
  -x \
  -D "cn=portainer,dc=example,dc=com" \
  -w "ldap-reader-password" \
  -b "ou=users,dc=example,dc=com" \
  "(uid=john)" \
  uid dn 2>&1

# If user not found, check:
# 1. User is in the specified BaseDN subtree
# 2. Search filter matches the user's object class
# 3. Scope is set to sub (subtree search)
```

## Symptom: TLS/SSL Connection Errors

```bash
# Check if LDAPS port is reachable
nc -zv ldap.example.com 636
# Expected: Connection to ldap.example.com 636 port [tcp/ldaps] succeeded!

# Test LDAPS connection with openssl
openssl s_client -connect ldap.example.com:636 -showcerts </dev/null 2>&1 | \
  grep -E "subject|issuer|Verify"

# Test StartTLS (port 389)
openssl s_client -connect ldap.example.com:389 -starttls ldap </dev/null 2>&1 | \
  grep -E "subject|issuer|Verify"
```

## Symptom: LDAP Reader Bind Fails

```bash
# Test reader DN credentials independently
ldapwhoami -H ldaps://ldap.example.com:636 \
  -x \
  -D "cn=portainer,dc=example,dc=com" \
  -w "ldap-reader-password"
# Expected: dn:cn=portainer,dc=example,dc=com

# Check reader DN has search permissions
ldapsearch -H ldaps://ldap.example.com:636 \
  -x \
  -D "cn=portainer,dc=example,dc=com" \
  -w "ldap-reader-password" \
  -b "dc=example,dc=com" \
  "(objectClass=top)" cn 2>&1 | head -5
```

## Symptom: User Authenticates but Gets Wrong Permissions

```bash
# Check which groups the user belongs to
ldapsearch -H ldaps://ldap.example.com:636 \
  -x \
  -D "cn=portainer,dc=example,dc=com" \
  -w "ldap-reader-password" \
  -b "ou=users,dc=example,dc=com" \
  "(uid=john)" \
  memberOf cn 2>&1

# Verify Portainer team names match LDAP group cn values exactly
curl -s https://localhost:9443/api/teams \
  -H "Authorization: Bearer $TOKEN" \
  --insecure | python3 -c "import sys,json; [print(t['Name']) for t in json.load(sys.stdin)]"
```

## Common Issues Checklist

- [ ] LDAP server hostname resolves from the Portainer container
- [ ] LDAP port (389 or 636) is reachable from the container
- [ ] Reader DN and password are correct
- [ ] BaseDN contains the users you're trying to authenticate
- [ ] Search filter matches user objects (e.g., `objectClass=person`)
- [ ] UserNameAttribute matches the attribute users log in with
- [ ] TLS certificates are valid if using LDAPS
- [ ] Portainer time is synchronized (Kerberos-based LDAP is time-sensitive)

---

*Monitor LDAP server health and Portainer authentication availability with [OneUptime](https://oneuptime.com).*
