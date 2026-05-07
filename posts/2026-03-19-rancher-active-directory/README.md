# How to Configure Active Directory Authentication in Rancher

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rancher, Kubernetes, Authentication, Active Directory, RBAC

Description: A step-by-step guide to integrating Microsoft Active Directory with Rancher for centralized user authentication and access management.

Microsoft Active Directory (AD) is one of the most widely used directory services in enterprise environments. Integrating AD with Rancher allows your teams to use their existing corporate credentials to access Kubernetes clusters. This guide walks through the complete setup process.

## Prerequisites

- Rancher v2.6 or later with admin access
- A Microsoft Active Directory domain controller accessible from the Rancher server
- An AD service account with read access to the directory
- Network connectivity between Rancher and the AD server (LDAP port 389 or LDAPS port 636)
- AD domain details: base DN, user/group search base DNs, service account username, and NetBIOS domain name

## Step 1: Prepare the Active Directory Service Account

Create a dedicated service account in AD for Rancher:

1. Open **Active Directory Users and Computers** on your domain controller.
2. Create a new user account:

```plaintext
Username: svc-rancher
Password: <strong-password>
Description: Rancher LDAP service account

Password Never Expires: Yes
User Cannot Change Password: Yes
```

3. Grant the service account read access to the OUs containing your users and groups.

## Step 2: Gather AD Connection Details

Collect the following information from your AD environment:

```plaintext
Domain Controller Hostname: dc01.example.com
Port: 636 (LDAPS) or 389 (LDAP)
Base DN: DC=example,DC=com
Service Account Username: EXAMPLE\svc-rancher
User Search Base: OU=Users,DC=example,DC=com
Group Search Base: OU=Groups,DC=example,DC=com
Default Login Domain: EXAMPLE
```

Verify connectivity from the Rancher server:

```bash
# Test LDAP connectivity

ldapsearch -x -H ldap://dc01.example.com:389 \
  -D "EXAMPLE\\svc-rancher" \
  -w "<password>" \
  -b "DC=example,DC=com" \
  "(sAMAccountName=testuser)"

# Test LDAPS connectivity
ldapsearch -x -H ldaps://dc01.example.com:636 \
  -D "EXAMPLE\\svc-rancher" \
  -w "<password>" \
  -b "DC=example,DC=com" \
  "(sAMAccountName=testuser)"
```

## Step 3: Configure AD Authentication in Rancher

Enable Active Directory authentication:

1. Log in to Rancher as an administrator.
2. Navigate to **Users & Authentication** from the hamburger menu.
3. Click **Auth Provider**.
4. Select **Active Directory**.

## Step 4: Enter Connection Settings

Fill in the AD connection details:

```plaintext
Hostname or IP Address: dc01.example.com
Port: 636
TLS: ☑ Enabled
Certificate: (paste the issuing CA certificate, plus any intermediate certificates, in PEM format when using LDAPS)
Service Account Username: EXAMPLE\svc-rancher
Service Account Password: <password>
Default Login Domain: EXAMPLE
```

If your AD uses a self-signed certificate or private CA:

```bash
# Export the certificate chain presented by the AD server
openssl s_client -connect dc01.example.com:636 -showcerts </dev/null 2>/dev/null | \
  sed -ne '/-BEGIN CERTIFICATE-/,/-END CERTIFICATE-/p' > ad-cert-chain.pem
```

Paste the contents of `ad-cert-chain.pem` into the Certificate field.

## Step 5: Configure User and Group Search Settings

Set up the search parameters:

```plaintext
User Search Base: OU=Users,DC=example,DC=com
Object Class: person
Username Attribute: name
Login Attribute: sAMAccountName
User Member Attribute: memberOf
Search Attribute: sAMAccountName|name
User Enabled Attribute: userAccountControl
Disabled Status Bitmask: 2

Group Search Base: OU=Groups,DC=example,DC=com
Object Class: group
Name Attribute: name
Group DN Attribute: distinguishedName
Group Member User Attribute: distinguishedName
Group Member Mapping Attribute: member
Search Attribute: sAMAccountName
```

## Step 6: Test the Configuration

Rancher validates the configuration as part of the enable flow:

1. Click **Enable** at the bottom of the configuration form.
2. Enter the username and password for the AD account that should be mapped to the local principal account.
3. Click **Authenticate with Active Directory**.

If the test fails, check the following:

- Network connectivity to the AD server.
- Service account credentials are correct.
- The search base DNs point to the correct OUs.
- TLS certificates are properly configured.

## Step 7: Save and Enable

After successful authentication, Active Directory authentication is enabled automatically and you are signed in as that AD user. The Rancher login page will then show an option to log in with Active Directory credentials.

## Step 8: Map AD Groups to Rancher Roles

Assign Rancher roles to AD groups:

1. Navigate to **Users & Authentication** then **Groups**.
2. Search for an AD group and click **⋮ > Edit Config**.
3. Assign global roles to the group and save.

```plaintext
AD Group: DevOps-Team
Rancher Role: Standard User

AD Group: Platform-Admins
Rancher Role: Administrator

AD Group: Developers
Rancher Role: User-Base
```

For cluster-level access:

1. Navigate to **Cluster Management**.
2. For the target cluster, click **⋮ > Edit Config**.
3. Open the **Member Roles** tab and click **Add Member**.
4. Search for the AD group.
5. Assign the cluster role.

```plaintext
AD Group: App-Team-A
Cluster Role: Member

AD Group: SRE-Team
Cluster Role: Owner
```

## Step 9: Configure Nested Group Support

Enable nested group resolution if your AD uses nested groups:

1. In the AD authentication configuration, look for **Nested Group Membership**.
2. Enable it if your groups contain other groups.

Note that enabling nested group search can increase authentication latency because Rancher must recursively resolve group memberships. Only enable this if your AD structure requires it.

## Step 10: Troubleshoot AD Integration

Common issues and their solutions:

```bash
# Check Rancher server logs for AD errors
kubectl logs -n cattle-system -l app=rancher -c rancher --tail=200 | grep -Ei "activedirectory|ldap|auth"

# Repeat the LDAP test from a host that has ldapsearch installed and network access to AD
ldapsearch -x -H ldaps://dc01.example.com:636 \
  -D "EXAMPLE\\svc-rancher" \
  -w "<password>" \
  -b "OU=Users,DC=example,DC=com" \
  "(sAMAccountName=testuser)" dn
```

| Issue | Possible Cause | Solution |
|-------|---------------|----------|
| Connection timeout | Firewall blocking LDAP ports | Open ports 389/636 between Rancher and AD |
| Invalid credentials | Wrong service account username format or password | Use a valid UPN or `DOMAIN\\username` and verify the password |
| No users found | Incorrect search base | Verify the OU path in AD |
| TLS handshake failure | Certificate mismatch | Import the correct CA certificate chain |
| Slow authentication | Nested group resolution | Disable nested groups or optimize AD structure |

## Best Practices

- **Always use LDAPS**: Enable TLS to encrypt authentication traffic between Rancher and Active Directory.
- **Use a dedicated service account**: Do not use a personal account for the LDAP bind. Use a service account with minimal permissions.
- **Map groups, not users**: Assign roles to AD groups rather than individual users for easier management.
- **Test in staging**: Configure and test AD integration in a staging Rancher instance before enabling it in production.
- **Plan for failover**: Use a highly available AD endpoint, such as a DNS name or load balancer backed by multiple domain controllers.

## Conclusion

Integrating Active Directory with Rancher brings centralized identity management to your Kubernetes infrastructure. Users can leverage their existing corporate credentials, and administrators can manage access through familiar AD groups. By following the steps in this guide and adhering to security best practices, you can establish a secure and maintainable authentication setup for your Rancher environment.
