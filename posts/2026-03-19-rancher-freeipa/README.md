# How to Configure FreeIPA Authentication in Rancher

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rancher, Kubernetes, Authentication, FreeIPA, LDAP, RBAC

Description: A practical guide to setting up FreeIPA as an authentication provider in Rancher using the OpenLDAP integration.

FreeIPA is an open-source identity management system for Linux and Unix environments. It provides centralized authentication, authorization, and account information using LDAP, Kerberos, DNS, and certificate management. This guide explains how to integrate FreeIPA with Rancher for user authentication and group-based access control.

## Prerequisites

- Rancher v2.6 or later with admin access
- A FreeIPA server installed and configured
- A FreeIPA service account for Rancher
- Network connectivity between Rancher and FreeIPA on port 389 (LDAP) or 636 (LDAPS)
- FreeIPA domain details

## Understanding FreeIPA and Rancher Integration

FreeIPA uses an LDAP-compatible directory (389 Directory Server) as its backend. Rancher connects to FreeIPA through the OpenLDAP authentication provider, which is compatible with FreeIPA's LDAP interface. The integration allows users to log in to Rancher with their FreeIPA credentials and receive role-based access based on their FreeIPA group memberships.

## Step 1: Create a FreeIPA Service Account

Create a dedicated bind account in FreeIPA for Rancher:

```bash
# Create a system account for Rancher
ldapadd -x -H ldaps://ipa.example.com:636 \
  -D "cn=Directory Manager" \
  -w "<dm-password>" <<EOF
dn: uid=svc-rancher,cn=sysaccounts,cn=etc,dc=example,dc=com
objectClass: account
objectClass: simplesecurityobject
uid: svc-rancher
userPassword: <service-account-password>
passwordExpirationTime: 20380119031407Z
nsIdleTimeout: 0
EOF
```

## Step 2: Identify FreeIPA LDAP Structure

Determine your FreeIPA LDAP structure:

```bash
# Find the base DN
ipa env basedn
# Output: basedn: dc=example,dc=com

# List user container
ldapsearch -x -H ldaps://ipa.example.com:636 \
  -D "uid=svc-rancher,cn=sysaccounts,cn=etc,dc=example,dc=com" \
  -w "<password>" \
  -b "cn=users,cn=accounts,dc=example,dc=com" \
  "(uid=testuser)" \
  uid cn mail memberOf

# List group container
ldapsearch -x -H ldaps://ipa.example.com:636 \
  -D "uid=svc-rancher,cn=sysaccounts,cn=etc,dc=example,dc=com" \
  -w "<password>" \
  -b "cn=groups,cn=accounts,dc=example,dc=com" \
  "(cn=developers)" \
  cn member
```

FreeIPA uses the following standard paths:

```plaintext
Users: cn=users,cn=accounts,dc=example,dc=com
Groups: cn=groups,cn=accounts,dc=example,dc=com
Service Accounts: cn=sysaccounts,cn=etc,dc=example,dc=com
```

## Step 3: Verify LDAPS Connectivity

Test the LDAPS connection from the Rancher server:

```bash
# Test LDAPS connectivity
openssl s_client -connect ipa.example.com:636 -showcerts < /dev/null 2>/dev/null | \
  openssl x509 -noout -subject -dates

# Test LDAP bind
ldapsearch -x -H ldaps://ipa.example.com:636 \
  -D "uid=svc-rancher,cn=sysaccounts,cn=etc,dc=example,dc=com" \
  -w "<password>" \
  -b "dc=example,dc=com" \
  "(objectClass=*)" -s base

# Export the FreeIPA CA certificate
curl -sk "https://ipa.example.com/ipa/config/ca.crt" > freeipa-ca.crt
```

## Step 4: Configure OpenLDAP Provider in Rancher

Set up the connection using Rancher's OpenLDAP provider:

1. Log in to Rancher as an administrator.
2. Navigate to **Users & Authentication** then **Auth Provider**.
3. Select **OpenLDAP**.

Enter the connection details:

```plaintext
Hostname or IP Address: ipa.example.com
Port: 636
TLS: ☑ Enabled
Certificate: (paste the FreeIPA CA certificate)
Service Account Distinguished Name: uid=svc-rancher,cn=sysaccounts,cn=etc,dc=example,dc=com
Service Account Password: <password>
```

## Step 5: Configure User Search Settings

Set up the user search parameters for FreeIPA:

```plaintext
User Search Base: cn=users,cn=accounts,dc=example,dc=com
Object Class: inetOrgPerson
Username Attribute: cn
Login Attribute: uid
User Member Attribute: memberOf
Search Attribute: uid|cn|mail
User Enabled Attribute: nsAccountLock
Disabled Status Bitmask: TRUE
```

Note the FreeIPA-specific settings:

- FreeIPA user entries include `inetOrgPerson`.
- The `uid` attribute is used for login.
- The `nsAccountLock` attribute is set to `TRUE` for disabled accounts.

## Step 6: Configure Group Search Settings

Set up the group search parameters:

```plaintext
Group Search Base: cn=groups,cn=accounts,dc=example,dc=com
Object Class: groupofnames
Name Attribute: cn
Group Member User Attribute: entryDN
Group Member Mapping Attribute: member
Search Attribute: cn
Group DN Attribute: entryDN
Nested Group Membership: ☐ Disabled
```

FreeIPA groups use `groupofnames` as one of their object classes and `member` for group membership, so Rancher should match memberships using DN-valued attributes such as `entryDN`.

## Step 7: Test the Configuration

Test the FreeIPA authentication:

1. Click **Enable**.
2. Enter a valid FreeIPA username and password for the account that should be mapped to Rancher's local principal account.
3. Click **Authenticate With OpenLDAP**.
4. Verify that authentication succeeds.

If the test fails:

```bash
# Verify the LDAP search works with FreeIPA attributes
ldapsearch -x -H ldaps://ipa.example.com:636 \
  -D "uid=svc-rancher,cn=sysaccounts,cn=etc,dc=example,dc=com" \
  -w "<password>" \
  -b "cn=users,cn=accounts,dc=example,dc=com" \
  "(uid=testuser)" \
  uid cn mail memberOf nsAccountLock

# Check Rancher logs
kubectl logs -l app=rancher -n cattle-system --tail=200 | grep -i "ldap\|auth"
```

## Step 8: Enable FreeIPA Authentication

After successful authentication, Rancher enables OpenLDAP (FreeIPA) authentication automatically and maps the authenticated FreeIPA user to the local principal account.

## Step 9: Map FreeIPA Groups to Rancher Roles

Create role mappings:

1. Navigate to **Users & Authentication** then **Groups**.
2. Search for FreeIPA groups.
3. Assign roles.

```plaintext
FreeIPA Group: admins -> Administrator
FreeIPA Group: devops -> Standard User
FreeIPA Group: developers -> Standard User
FreeIPA Group: auditors -> User-Base
```

Create FreeIPA groups specifically for Rancher if they do not exist:

```bash
# Create Rancher-specific groups
ipa group-add rancher-admins --desc="Rancher Administrators"
ipa group-add rancher-users --desc="Rancher Standard Users"
ipa group-add rancher-readonly --desc="Rancher Read-Only Users"

# Add users to groups
ipa group-add-member rancher-admins --users=admin1,admin2
ipa group-add-member rancher-users --users=dev1,dev2,dev3
```

## Step 10: Handle FreeIPA-Specific Scenarios

### Disabled Accounts

FreeIPA uses the `nsAccountLock` attribute to disable accounts. When set to `TRUE`, the user cannot log in. Rancher respects this when `User Enabled Attribute` is set to `nsAccountLock` and `Disabled Status Bitmask` is set to `TRUE`.

```bash
# Disable a user in FreeIPA
ipa user-disable testuser

# Enable a user in FreeIPA
ipa user-enable testuser
```

### Password Expiration

When a FreeIPA password expires, the user will not be able to authenticate through Rancher. Users must update their password through FreeIPA's web UI or command line before logging in to Rancher:

```bash
# User can change their own password
ipa passwd
```

### Multiple FreeIPA Replicas

For high availability, configure Rancher to connect to a load-balanced FreeIPA endpoint or virtual IP:

```plaintext
Hostname: ipa-lb.example.com
```

## Best Practices

- **Use LDAPS**: Always connect to FreeIPA over LDAPS (port 636) for encrypted authentication traffic.
- **Use system accounts**: Create a dedicated service account in the `cn=sysaccounts` container rather than using a regular user account.
- **Map groups, not users**: Use FreeIPA groups for Rancher role assignments to simplify user management.
- **Monitor certificate expiration**: FreeIPA certificates have expiration dates. Track them and renew before they expire.
- **Test with disabled accounts**: Verify that disabled FreeIPA accounts cannot log in to Rancher.

## Conclusion

FreeIPA integration with Rancher provides a fully open-source authentication stack for your Kubernetes management platform. By leveraging FreeIPA's LDAP interface through Rancher's OpenLDAP provider, you get centralized user management, group-based access control, and compatibility with your existing Linux identity infrastructure. The setup requires careful attention to FreeIPA's specific LDAP schema, but once configured, it provides a robust and maintainable authentication solution.
