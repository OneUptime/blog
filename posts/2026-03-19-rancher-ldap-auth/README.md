# How to Configure LDAP Authentication in Rancher

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rancher, Kubernetes, Authentication, LDAP, RBAC

Description: Learn how to set up LDAP-based authentication in Rancher for centralized user management with any LDAP-compatible directory service.

LDAP (Lightweight Directory Access Protocol) authentication in Rancher allows you to integrate with any LDAP-compatible directory service for user authentication. This includes OpenLDAP, FreeIPA, 389 Directory Server, and other LDAP implementations. This guide covers the setup process for generic LDAP integration.

## Prerequisites

- Rancher v2.6 or later with admin access
- An LDAP directory server accessible from the Rancher server
- An LDAP bind account with read access
- Network connectivity on port 389 (LDAP) or 636 (LDAPS)
- The LDAP directory structure (base DN, user DN, group DN)

## Step 1: Verify LDAP Server Connectivity

Test connectivity from the Rancher server to your LDAP directory:

```bash
# Test basic TCP connectivity

nc -zv ldap.example.com 389
nc -zv ldap.example.com 636

# Test LDAP bind
ldapsearch -x -H ldap://ldap.example.com:389 \
  -D "cn=rancher-svc,ou=service-accounts,dc=example,dc=com" \
  -w "<password>" \
  -b "dc=example,dc=com" \
  "(objectClass=*)" \
  -s base

# Test LDAPS bind
ldapsearch -x -H ldaps://ldap.example.com:636 \
  -D "cn=rancher-svc,ou=service-accounts,dc=example,dc=com" \
  -w "<password>" \
  -b "dc=example,dc=com" \
  "(objectClass=*)" \
  -s base
```

## Step 2: Identify Your LDAP Schema

Determine the object classes and attributes used in your directory:

```bash
# Find user object classes
ldapsearch -x -H ldap://ldap.example.com:389 \
  -D "cn=rancher-svc,ou=service-accounts,dc=example,dc=com" \
  -w "<password>" \
  -b "ou=users,dc=example,dc=com" \
  "(uid=testuser)" \
  objectClass

# Find group object classes
ldapsearch -x -H ldap://ldap.example.com:389 \
  -D "cn=rancher-svc,ou=service-accounts,dc=example,dc=com" \
  -w "<password>" \
  -b "ou=groups,dc=example,dc=com" \
  "(cn=developers)" \
  objectClass member uniqueMember
```

Common LDAP schemas:

| Directory | User Object Class | Group Object Class | Username Attr |
|-----------|------------------|--------------------|---------------|
| OpenLDAP | inetOrgPerson | groupOfNames | uid |
| 389 DS | inetOrgPerson | groupOfUniqueNames | uid |
| FreeIPA | inetOrgPerson | groupOfNames | uid |

## Step 3: Navigate to Authentication Settings

1. Log in to Rancher as an administrator.
2. Click the hamburger menu and select **Users & Authentication**.
3. Click **Auth Provider**.
4. Select **OpenLDAP** from the list of authentication providers.

## Step 4: Configure Connection Settings

Enter the LDAP server connection details:

```plaintext
Hostname or IP Address: ldap.example.com
Port: 636
TLS: ☑ Enabled
Certificate: (paste the CA certificate for LDAPS)
Service Account Distinguished Name: cn=rancher-svc,ou=service-accounts,dc=example,dc=com
Service Account Password: <password>
```

For StartTLS instead of LDAPS:

```plaintext
Port: 389
TLS: ☐ Disabled
StartTLS: ☑ Enabled
```

## Step 5: Configure User Search Settings

Set up how Rancher finds users in your directory:

```plaintext
User Search Base: ou=users,dc=example,dc=com
Login Attribute: uid
Object Class: inetOrgPerson
Username Attribute: cn
User Member Attribute: memberOf
Search Attribute: uid|sn|givenName
User Enabled Attribute: (leave blank for most OpenLDAP servers)
```

## Step 6: Configure Group Search Settings

Set up how Rancher finds groups:

```plaintext
Group Search Base: ou=groups,dc=example,dc=com
Group Object Class: groupOfNames
Group Name Attribute: cn
Group DN Attribute: entryDN
Group Member User Attribute: entryDN
Group Member Mapping Attribute: member
Group Search Attribute: cn
Nested Group Membership: ☐ Disabled (enable only if needed)
```

## Step 7: Test the Configuration

To test and apply the configuration with a known user:

1. Click **Enable**.
2. Enter a valid LDAP username and password.
3. Click **Authenticate With OpenLDAP**.

The LDAP user used for this step is mapped to the local principal account and assigned administrator privileges in Rancher.

If the test fails, inspect Rancher logs for LDAP errors:

```bash
# Check Rancher logs for LDAP errors
kubectl logs -l app=rancher -n cattle-system --tail=100 | grep -i ldap
```

Common test failures and fixes:

```plaintext
Error: "Invalid credentials"
Fix: Verify the service account DN and password, and verify the test user's credentials. Use the full service account DN, not just the username.

Error: "No such object"
Fix: Check the User Search Base and Group Search Base DN paths.

Error: "Connection refused"
Fix: Verify network connectivity and firewall rules for LDAP/LDAPS ports.
```

## Step 8: Enable LDAP Authentication

After successful authentication, Rancher enables OpenLDAP authentication.

The Rancher login page will now show an LDAP login option alongside local authentication. You can still log in with the local `admin` account if LDAP is unavailable.

## Step 9: Assign Roles to LDAP Groups

Map LDAP groups to Rancher roles:

For global roles:

1. Go to **Users & Authentication** then **Groups**.
2. Search for an LDAP group by name.
3. Assign a global role.

```plaintext
LDAP Group: cn=platform-admins,ou=groups,dc=example,dc=com
Role: Administrator

LDAP Group: cn=developers,ou=groups,dc=example,dc=com
Role: Standard User
```

For cluster-level roles:

1. Navigate to the cluster.
2. Click **Cluster Members** then **Add**.
3. Search for the LDAP group.
4. Assign the cluster role.

For project-level roles:

1. Navigate to the project within a cluster.
2. Click **Members** then **Add**.
3. Search for the LDAP group.
4. Assign the project role.

## Step 10: Configure LDAP Failover

For high availability, point Rancher at a highly available LDAP endpoint such as a load balancer or virtual IP:

```plaintext
Hostname: ldap.example.com
Port: 636
```

Back `ldap.example.com` with your LDAP redundancy mechanism rather than relying on SRV records, because Rancher connects to the configured host and port directly.

## Securing Your LDAP Integration

Apply these security measures:

```bash
# Generate a strong password for the service account
openssl rand -base64 32

# Verify TLS certificate validity
openssl s_client -connect ldap.example.com:636 -showcerts < /dev/null 2>/dev/null | \
  openssl x509 -noout -dates -subject

# Test LDAPS with certificate verification
LDAPTLS_CACERT=/path/to/ca.pem ldapsearch -x -H ldaps://ldap.example.com:636 \
  -D "cn=rancher-svc,ou=service-accounts,dc=example,dc=com" \
  -w "<password>" \
  -b "dc=example,dc=com" \
  "(uid=testuser)"
```

## Best Practices

- **Always use LDAPS or StartTLS**: Never transmit credentials in plain text.
- **Use a read-only service account**: The Rancher bind account only needs read access to the directory.
- **Limit search scope**: Set specific search bases rather than searching from the root DN to improve performance.
- **Monitor authentication failures**: Set up alerting on repeated authentication failures to detect potential attacks.
- **Keep certificates current**: Track LDAPS certificate expiration and renew before they expire.

## Conclusion

LDAP authentication in Rancher enables seamless integration with your existing directory infrastructure. By configuring proper search bases, secure connections, and group-to-role mappings, you create a maintainable and secure authentication system for your Kubernetes platform. Test thoroughly in a staging environment before deploying to production, and always use encrypted connections for LDAP traffic.
