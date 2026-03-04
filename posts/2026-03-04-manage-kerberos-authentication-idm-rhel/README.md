# How to Manage Kerberos Authentication with IdM on RHEL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, IdM, Kerberos, Authentication, FreeIPA, Security, Linux

Description: Learn how to manage Kerberos authentication in Red Hat Identity Management (IdM) on RHEL, including ticket management, keytabs, and service principals.

---

IdM uses Kerberos as its primary authentication protocol. When a user authenticates via `kinit`, they receive a ticket-granting ticket (TGT) that is used to access services without entering passwords again. Understanding Kerberos management in IdM is essential for both administrators and troubleshooting.

## Basic Kerberos Ticket Operations

```bash
# Obtain a Kerberos ticket (TGT)
kinit admin
# Enter password when prompted

# View current tickets
klist

# View detailed ticket information
klist -e

# Renew an existing ticket (if renewable)
kinit -R

# Destroy all tickets (log out)
kdestroy
```

## Managing Service Principals

Services that use Kerberos need their own principals:

```bash
# Authenticate as admin
kinit admin

# Create a service principal for a web server
ipa service-add HTTP/web1.example.com

# Create a service principal for an NFS server
ipa service-add nfs/fileserver.example.com

# List all service principals
ipa service-find

# Show details of a service principal
ipa service-show HTTP/web1.example.com
```

## Managing Keytabs

Keytabs store service credentials for non-interactive authentication:

```bash
# Retrieve a keytab for a service (run on the host)
ipa-getkeytab -s idm1.example.com \
  -p HTTP/web1.example.com \
  -k /etc/httpd/conf/httpd.keytab

# Set proper permissions on the keytab
sudo chown apache:apache /etc/httpd/conf/httpd.keytab
sudo chmod 600 /etc/httpd/conf/httpd.keytab

# Verify the keytab contents
klist -k /etc/httpd/conf/httpd.keytab
```

## Configuring Kerberos Ticket Policies

```bash
# View the default ticket policy
ipa krbtpolicy-show

# Set maximum ticket lifetime (in seconds)
# 86400 = 24 hours
ipa krbtpolicy-mod --maxlife=86400

# Set maximum renewable lifetime
# 604800 = 7 days
ipa krbtpolicy-mod --maxrenew=604800

# Set per-user ticket policy
ipa krbtpolicy-mod jsmith --maxlife=43200
```

## Troubleshooting Kerberos Issues

```bash
# Enable Kerberos debug logging
export KRB5_TRACE=/dev/stderr
kinit admin

# Check KDC logs on the IdM server
sudo journalctl -u krb5kdc --since "1 hour ago"

# Verify clock synchronization (Kerberos requires time sync)
timedatectl status
chronyc tracking

# Check if a service ticket can be obtained
kvno HTTP/web1.example.com
```

## Delegation and Constrained Delegation

```bash
# Allow a service to request tickets on behalf of users
ipa service-add-delegation-target HTTP/web1.example.com \
  --targets=ldap/idm1.example.com
```

Kerberos is time-sensitive. Keep clocks synchronized across all IdM servers and clients using chronyd. A clock skew of more than 5 minutes (default) will cause authentication failures.
