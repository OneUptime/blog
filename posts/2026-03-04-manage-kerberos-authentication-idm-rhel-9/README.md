# How to Manage Kerberos Authentication with IdM on RHEL

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: RHEL, IdM, Kerberos, Authentication, SSO, Identity Management, Linux

Description: Learn how to manage Kerberos authentication in Red Hat Identity Management on RHEL, including ticket management, keytabs, and service principals.

---

Kerberos is the core authentication protocol in IdM, providing single sign-on (SSO) across your RHEL infrastructure. Once a user obtains a Kerberos ticket, they can access any Kerberized service without re-entering their password. Understanding how to manage Kerberos tickets, keytabs, and service principals is essential for IdM administration.

## How Kerberos Works in IdM

1. User authenticates to the KDC (Key Distribution Center) running on the IdM server
2. KDC issues a Ticket Granting Ticket (TGT)
3. When accessing a service, the TGT is used to request a service ticket
4. The service ticket authenticates the user to the service

## Obtaining and Managing Tickets

### Getting a Ticket

```bash
kinit username
```

With a specific realm:

```bash
kinit username@EXAMPLE.COM
```

### Viewing Tickets

```bash
klist
```

Output:

```text
Ticket cache: KCM:1000
Default principal: admin@EXAMPLE.COM

Valid starting       Expires              Service principal
03/04/2026 10:00:00  03/04/2026 22:00:00  krbtgt/EXAMPLE.COM@EXAMPLE.COM
03/04/2026 10:05:00  03/04/2026 22:00:00  HTTP/idm1.example.com@EXAMPLE.COM
```

### Destroying Tickets

```bash
kdestroy
```

Destroy all tickets:

```bash
kdestroy -A
```

### Renewing Tickets

```bash
kinit -R
```

## Configuring Ticket Lifetimes

### Global Policy

```bash
ipa krbtpolicy-show
```

Modify defaults:

```bash
ipa krbtpolicy-mod --maxlife=43200 --maxrenew=604800
```

- `maxlife=43200` - 12-hour ticket lifetime (in seconds)
- `maxrenew=604800` - 7-day renewable lifetime

### Per-User Policy

```bash
ipa krbtpolicy-mod admin --maxlife=86400 --maxrenew=604800
```

### Reset to Default

```bash
ipa krbtpolicy-reset admin
```

## Managing Service Principals

### Creating a Service Principal

When you add a host to IdM, a host principal is created automatically. For additional services:

```bash
ipa service-add HTTP/web1.example.com
ipa service-add postgres/db1.example.com
ipa service-add nfs/nfs1.example.com
```

### Viewing Service Principals

```bash
ipa service-find
ipa service-show HTTP/web1.example.com
```

## Managing Keytabs

A keytab file stores service keys used for non-interactive authentication.

### Retrieving a Keytab

```bash
ipa-getkeytab -s idm1.example.com -p HTTP/web1.example.com -k /etc/httpd/http.keytab
```

### Viewing Keytab Contents

```bash
klist -k /etc/httpd/http.keytab
```

### Host Keytab

Every enrolled client has a host keytab at `/etc/krb5.keytab`:

```bash
klist -k /etc/krb5.keytab
```

### Rotating Keytab Keys

```bash
ipa-getkeytab -s idm1.example.com -p host/client1.example.com -k /etc/krb5.keytab
```

## Configuring Kerberos Authentication for Services

### Apache HTTPD with Kerberos

Install the module:

```bash
sudo dnf install mod_auth_gssapi
```

Create the keytab:

```bash
ipa service-add HTTP/web1.example.com
ipa-getkeytab -s idm1.example.com -p HTTP/web1.example.com -k /etc/httpd/http.keytab
chown apache:apache /etc/httpd/http.keytab
chmod 600 /etc/httpd/http.keytab
```

Configure Apache:

```apache
<Location /protected>
    AuthType GSSAPI
    AuthName "Kerberos Login"
    GssapiCredStore keytab:/etc/httpd/http.keytab
    Require valid-user
</Location>
```

### SSH with Kerberos

SSH Kerberos authentication works automatically on IdM clients. Verify:

```bash
# Get a ticket
kinit admin

# SSH without password
ssh web1.example.com
```

GSSAPI authentication is enabled by default in SSSD-configured systems.

## Delegation

Allow one service to act on behalf of a user:

```bash
ipa servicedelegationrule-add http-delegation
ipa servicedelegationrule-add-member http-delegation --principals=HTTP/web1.example.com
ipa servicedelegationtarget-add http-target
ipa servicedelegationtarget-add-member http-target --principals=postgres/db1.example.com
ipa servicedelegationrule-add-target http-delegation --servicedelegationtargets=http-target
```

## Troubleshooting Kerberos

### Clock Skew

Kerberos requires synchronized clocks (within 5 minutes by default):

```bash
chronyc tracking
```

### Encryption Type Mismatches

```bash
ipa-getkeytab -s idm1.example.com -p HTTP/web1.example.com -k /etc/httpd/http.keytab -e aes256-cts-hmac-sha1-96
```

### Debug Kerberos

Enable debug logging:

```bash
export KRB5_TRACE=/dev/stderr
kinit admin
```

### Check KDC Status

```bash
sudo systemctl status krb5kdc
sudo journalctl -u krb5kdc -f
```

## Summary

Kerberos authentication in IdM on RHEL provides single sign-on across your infrastructure. Manage ticket lifetimes with `ipa krbtpolicy-mod`, create service principals for applications, and distribute keytabs with `ipa-getkeytab`. Configure services like Apache and SSH to accept Kerberos authentication for a seamless user experience. Keep clocks synchronized and use `KRB5_TRACE` for debugging authentication issues.
