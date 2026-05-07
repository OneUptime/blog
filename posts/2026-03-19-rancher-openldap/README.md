# How to Configure OpenLDAP with Rancher

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rancher, Kubernetes, Authentication, OpenLDAP, LDAP, RBAC

Description: A step-by-step guide to integrating OpenLDAP with Rancher for centralized user authentication and group-based access control.

OpenLDAP is the most widely deployed open-source LDAP directory server. Integrating OpenLDAP with Rancher enables centralized authentication for your Kubernetes management platform using your existing directory infrastructure. This guide covers the complete setup from OpenLDAP preparation to Rancher configuration.

## Prerequisites

- Rancher v2.6 or later with admin access
- OpenLDAP server (2.4 or later) installed and running
- A bind account in OpenLDAP for Rancher
- Network connectivity between Rancher and OpenLDAP on port 389 or 636
- TLS certificates configured on the OpenLDAP server

## Step 1: Prepare the OpenLDAP Directory

Ensure your OpenLDAP directory has the required structure. A typical setup looks like:

```plaintext
dc=example,dc=com
├── ou=users
│   ├── uid=admin
│   ├── uid=developer1
│   └── uid=developer2
├── ou=groups
│   ├── cn=rancher-admins
│   ├── cn=rancher-users
│   └── cn=rancher-readonly
└── ou=service-accounts
    └── cn=rancher-bind
```

Create the service account for Rancher if it does not exist:

```bash
ldapadd -x -H ldaps://ldap.example.com:636 \
  -D "cn=admin,dc=example,dc=com" \
  -w "<admin-password>" <<EOF
dn: cn=rancher-bind,ou=service-accounts,dc=example,dc=com
objectClass: simpleSecurityObject
objectClass: organizationalRole
cn: rancher-bind
userPassword: {SSHA}encoded-password-here
description: Rancher LDAP bind account
EOF
```

## Step 2: Create Rancher Groups in OpenLDAP

Create groups for Rancher access control:

```bash
# Create admin group

ldapadd -x -H ldaps://ldap.example.com:636 \
  -D "cn=admin,dc=example,dc=com" \
  -w "<admin-password>" <<EOF
dn: cn=rancher-admins,ou=groups,dc=example,dc=com
objectClass: groupOfNames
cn: rancher-admins
member: uid=admin,ou=users,dc=example,dc=com
EOF

# Create users group
ldapadd -x -H ldaps://ldap.example.com:636 \
  -D "cn=admin,dc=example,dc=com" \
  -w "<admin-password>" <<EOF
dn: cn=rancher-users,ou=groups,dc=example,dc=com
objectClass: groupOfNames
cn: rancher-users
member: uid=developer1,ou=users,dc=example,dc=com
member: uid=developer2,ou=users,dc=example,dc=com
EOF
```

## Step 3: Test LDAP Connectivity

Verify connectivity and test queries from the Rancher server:

```bash
# Test LDAP connection
ldapsearch -x -H ldaps://ldap.example.com:636 \
  -D "cn=rancher-bind,ou=service-accounts,dc=example,dc=com" \
  -w "<password>" \
  -b "dc=example,dc=com" \
  -s base \
  "(objectClass=*)"

# Search for a user
ldapsearch -x -H ldaps://ldap.example.com:636 \
  -D "cn=rancher-bind,ou=service-accounts,dc=example,dc=com" \
  -w "<password>" \
  -b "ou=users,dc=example,dc=com" \
  "(uid=developer1)" \
  uid cn mail memberOf

# Search for groups
ldapsearch -x -H ldaps://ldap.example.com:636 \
  -D "cn=rancher-bind,ou=service-accounts,dc=example,dc=com" \
  -w "<password>" \
  -b "ou=groups,dc=example,dc=com" \
  "(objectClass=groupOfNames)" \
  cn member

# Capture the presented certificate chain for inspection
openssl s_client -connect ldap.example.com:636 -showcerts </dev/null 2>/dev/null | \
  sed -ne '/-BEGIN CERTIFICATE-/,/-END CERTIFICATE-/p' > openldap-chain.pem
```

## Step 4: Configure OpenLDAP in Rancher

Set up the OpenLDAP authentication provider:

1. Log in to Rancher as an administrator.
2. Navigate to **Users & Authentication** then **Auth Provider**.
3. Select **OpenLDAP**.

Enter the connection settings:

```plaintext
Hostname or IP Address: ldap.example.com
Port: 636
TLS: ☑ Enabled
Certificate: (paste the OpenLDAP CA certificate, concatenated with any intermediate certificates, in PEM format)
Service Account Distinguished Name: cn=rancher-bind,ou=service-accounts,dc=example,dc=com
Service Account Password: <password>
```

## Step 5: Configure User Search

Set the user search parameters:

```plaintext
User Search Base: ou=users,dc=example,dc=com
Object Class: inetOrgPerson
Username Attribute: cn
Login Attribute: uid
User Member Attribute: memberOf
Search Attribute: uid|cn|mail
```

If your OpenLDAP entries do not expose `memberOf`, Rancher can still resolve groups from the group-side membership mapping in the next step, but enabling the overlay makes those memberships available directly on user entries.

## Step 6: Configure Group Search

Set the group search parameters:

```plaintext
Group Search Base: ou=groups,dc=example,dc=com
Object Class: groupOfNames
Name Attribute: cn
Group DN Attribute: entryDN
Group Member User Attribute: entryDN
Group Member Mapping Attribute: member
Search Attribute: cn
Nested Group Membership: ☐ Disabled
```

For `groupOfUniqueNames` (used by some OpenLDAP configurations):

```plaintext
Object Class: groupOfUniqueNames
Group Member Mapping Attribute: uniqueMember
```

## Step 7: Enable the memberOf Overlay (Optional)

The `memberOf` overlay in OpenLDAP automatically maintains reverse group membership on user entries. This improves performance:

```bash
# Enable memberOf overlay on the OpenLDAP host
# Adjust the module DN and database index to match your server.
ldapmodify -Y EXTERNAL -H ldapi:/// <<EOF
dn: cn=module{0},cn=config
changetype: modify
add: olcModuleLoad
olcModuleLoad: memberof

dn: olcOverlay=memberof,olcDatabase={1}mdb,cn=config
changetype: add
objectClass: olcOverlayConfig
objectClass: olcMemberOf
olcOverlay: memberof
EOF
```

If your directory uses `groupOfUniqueNames`, set the overlay to use `groupOfUniqueNames` and `uniqueMember` instead of the default `groupOfNames` and `member`.

## Step 8: Test and Enable

Test the OpenLDAP configuration:

1. Click **Enable** in the Rancher UI.
2. When Rancher prompts you to authenticate with OpenLDAP, enter a valid OpenLDAP username and password.
3. Verify the returned user details and group memberships.

If authentication succeeds, OpenLDAP authentication is enabled and the authenticated OpenLDAP user is mapped to the local principal account with administrator privileges.

Troubleshoot failures:

```bash
# Check Rancher logs
kubectl logs -l app=rancher -n cattle-system --tail=200 | grep -i "ldap\|openldap\|auth"
```

| Issue | Solution |
|-------|----------|
| No groups returned | Enable the memberOf overlay or verify group search configuration |
| Cannot bind | Check the service account DN and password |
| TLS error | Verify the CA certificate matches the OpenLDAP server certificate |
| User not found | Verify the user search base and object class |

## Step 9: Map Groups to Roles

Assign Rancher roles to OpenLDAP groups:

1. Navigate to **Users & Authentication** then **Groups**.
2. Search for OpenLDAP groups.
3. Assign roles.

```plaintext
Group: rancher-admins -> Administrator
Group: rancher-users -> Standard User
Group: rancher-readonly -> User-Base
```

For cluster-level access:

```plaintext
Group: team-backend -> Cluster Member (production)
Group: team-frontend -> Cluster Member (staging)
```

## Step 10: Secure and Maintain the Integration

### Enable LDAPS

Always use LDAPS for production:

```bash
# Verify LDAPS is working
openssl s_client -connect ldap.example.com:636 -showcerts < /dev/null

# Check certificate expiration
openssl s_client -connect ldap.example.com:636 </dev/null 2>/dev/null | \
  openssl x509 -noout -enddate
```

### Monitor OpenLDAP Health

```bash
# Check OpenLDAP replication status (if using replication)
ldapsearch -x -H ldaps://ldap.example.com:636 \
  -D "cn=admin,dc=example,dc=com" \
  -w "<password>" \
  -b "cn=config" \
  "(objectClass=olcSyncReplConfig)" \
  olcSyncRepl
```

### Rotate the Bind Password

```bash
# Change the bind account password
ldappasswd -x -H ldaps://ldap.example.com:636 \
  -D "cn=admin,dc=example,dc=com" \
  -w "<admin-password>" \
  -s "<new-password>" \
  "cn=rancher-bind,ou=service-accounts,dc=example,dc=com"
```

Then update the password in Rancher's OpenLDAP configuration.

## Best Practices

- **Always use LDAPS**: Encrypt all LDAP traffic between Rancher and OpenLDAP.
- **Enable memberOf overlay**: This significantly improves authentication performance by avoiding additional group lookups.
- **Use specific search bases**: Narrow the search scope to relevant OUs rather than searching from the root DN.
- **Monitor certificate expiration**: Track LDAPS certificate dates and renew before they expire.
- **Test after directory changes**: Verify Rancher authentication after making structural changes to the OpenLDAP directory.

## Conclusion

OpenLDAP integration with Rancher provides a fully open-source authentication solution for your Kubernetes management platform. By carefully configuring the LDAP connection, user and group search parameters, and role mappings, you create a maintainable and secure authentication system. The key is understanding your OpenLDAP schema and ensuring the memberOf overlay is configured for optimal performance.
