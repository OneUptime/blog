# How to Configure Cross-Realm Kerberos Trust on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, Kerberos, Authentication, Cross-Realm, Enterprise

Description: Configure cross-realm Kerberos trust between two realms on Ubuntu to allow users from one realm to authenticate to services in another.

---

Large organizations often have multiple Kerberos realms - perhaps because different divisions use separate domains, or because you need users in your MIT Kerberos realm to access services in an Active Directory domain. Cross-realm trust allows a principal from one realm to authenticate to services in another realm without creating a separate account in the second realm.

## How Cross-Realm Trust Works

When realm `A.EXAMPLE.COM` trusts realm `B.EXAMPLE.COM`, a special principal called a "cross-realm ticket-granting ticket" (TGT) is created in both realms. When a user from realm A wants to access a service in realm B:

1. The user's KDC in realm A issues a cross-realm TGT for `krbtgt/B.EXAMPLE.COM@A.EXAMPLE.COM`
2. The user presents this to realm B's KDC
3. Realm B's KDC verifies the cross-realm TGT (using the shared secret) and issues a service ticket

The "shared secret" is a password known to both KDCs, stored as the `krbtgt/REALM_B@REALM_A` and `krbtgt/REALM_A@REALM_B` principals.

## Trust Types

- **One-way trust** - only users from realm A can access services in realm B (not the reverse)
- **Two-way (bidirectional) trust** - users from either realm can access services in the other
- **Hierarchical trust** - used with realms that share a common parent (e.g., `EAST.EXAMPLE.COM` and `WEST.EXAMPLE.COM` both trust `EXAMPLE.COM`)

## Environment

- Realm A (local MIT KDC): `CORP.EXAMPLE.COM` on `kdc-corp.example.com`
- Realm B (partner MIT KDC): `PARTNER.EXAMPLE.COM` on `kdc-partner.example.com`

## Step 1: Create the Cross-Realm Principals

Both KDCs must have matching cross-realm TGT principals with the same shared secret. Run on **Realm A's KDC**:

```bash
sudo kadmin.local
```

```text
# Create the principal that Realm A presents to Realm B's KDC
kadmin.local: addprinc -e "aes256-cts-hmac-sha1-96:normal" krbtgt/PARTNER.EXAMPLE.COM@CORP.EXAMPLE.COM
# Enter and confirm the shared secret password

# For two-way trust, also create:
kadmin.local: addprinc -e "aes256-cts-hmac-sha1-96:normal" krbtgt/CORP.EXAMPLE.COM@PARTNER.EXAMPLE.COM
# Use the SAME shared secret password

kadmin.local: quit
```

Run on **Realm B's KDC**:

```bash
sudo kadmin.local
```

```text
# Create the same principals on Realm B with identical passwords
kadmin.local: addprinc -e "aes256-cts-hmac-sha1-96:normal" krbtgt/PARTNER.EXAMPLE.COM@CORP.EXAMPLE.COM
# Use the SAME shared secret as on Realm A

kadmin.local: addprinc -e "aes256-cts-hmac-sha1-96:normal" krbtgt/CORP.EXAMPLE.COM@PARTNER.EXAMPLE.COM
# Use the SAME shared secret as on Realm A

kadmin.local: quit
```

The passwords must match on both sides. If they differ, the cross-realm authentication will fail.

## Step 2: Configure krb5.conf on Each Realm's KDC

Both KDCs need to know about the other realm. On **Realm A's KDC**:

```bash
sudo nano /etc/krb5.conf
```

```ini
[libdefaults]
    default_realm = CORP.EXAMPLE.COM

[realms]
    CORP.EXAMPLE.COM = {
        kdc = kdc-corp.example.com
        admin_server = kdc-corp.example.com
    }
    PARTNER.EXAMPLE.COM = {
        kdc = kdc-partner.example.com
        admin_server = kdc-partner.example.com
    }

[domain_realm]
    .example.com = CORP.EXAMPLE.COM
    example.com = CORP.EXAMPLE.COM
    .partner.example.com = PARTNER.EXAMPLE.COM
    partner.example.com = PARTNER.EXAMPLE.COM

[capaths]
    # Define the trust path: Realm A to Realm B (direct)
    CORP.EXAMPLE.COM = {
        PARTNER.EXAMPLE.COM = .
    }
    # Return path (for two-way trust)
    PARTNER.EXAMPLE.COM = {
        CORP.EXAMPLE.COM = .
    }
```

The `[capaths]` section defines how to traverse the trust path. A `.` means direct trust (no intermediary realms).

On **Realm B's KDC**, mirror the configuration:

```ini
[libdefaults]
    default_realm = PARTNER.EXAMPLE.COM

[realms]
    PARTNER.EXAMPLE.COM = {
        kdc = kdc-partner.example.com
        admin_server = kdc-partner.example.com
    }
    CORP.EXAMPLE.COM = {
        kdc = kdc-corp.example.com
        admin_server = kdc-corp.example.com
    }

[domain_realm]
    .partner.example.com = PARTNER.EXAMPLE.COM
    partner.example.com = PARTNER.EXAMPLE.COM
    .example.com = CORP.EXAMPLE.COM
    example.com = CORP.EXAMPLE.COM

[capaths]
    CORP.EXAMPLE.COM = {
        PARTNER.EXAMPLE.COM = .
    }
    PARTNER.EXAMPLE.COM = {
        CORP.EXAMPLE.COM = .
    }
```

## Step 3: Configure Client Machines

Client machines in either realm need `krb5.conf` entries for both realms:

```ini
[libdefaults]
    default_realm = CORP.EXAMPLE.COM
    forwardable = true

[realms]
    CORP.EXAMPLE.COM = {
        kdc = kdc-corp.example.com
        admin_server = kdc-corp.example.com
    }
    PARTNER.EXAMPLE.COM = {
        kdc = kdc-partner.example.com
        admin_server = kdc-partner.example.com
    }

[domain_realm]
    .example.com = CORP.EXAMPLE.COM
    .partner.example.com = PARTNER.EXAMPLE.COM

[capaths]
    CORP.EXAMPLE.COM = {
        PARTNER.EXAMPLE.COM = .
    }
```

## Step 4: Add Services in Realm B That Accept Realm A Users

Services in Realm B need to be configured to accept cross-realm tickets. For SSH:

On a server in Realm B, create its host principal:

```bash
# On Realm B's KDC
sudo kadmin.local -q "addprinc -randkey host/server-b.partner.example.com"
sudo kadmin.local -q "ktadd -k /tmp/server-b.keytab host/server-b.partner.example.com"
# Copy keytab to the server
```

## Step 5: Test Cross-Realm Authentication

From a client in Realm A:

```bash
# Authenticate in Realm A
kinit jsmith@CORP.EXAMPLE.COM

# Verify TGT
klist
# Shows: krbtgt/CORP.EXAMPLE.COM@CORP.EXAMPLE.COM

# Request a cross-realm service ticket
kvno -S host server-b.partner.example.com
# This should trigger cross-realm authentication
klist
# Should now show: krbtgt/PARTNER.EXAMPLE.COM@CORP.EXAMPLE.COM
# and: host/server-b.partner.example.com@PARTNER.EXAMPLE.COM

# SSH to server in Realm B
ssh jsmith@server-b.partner.example.com
```

## Cross-Realm Trust with Active Directory

A common scenario: MIT Kerberos realm trusting an Active Directory domain.

The process is similar but AD-specific:

```bash
# On the MIT KDC
sudo kadmin.local
kadmin.local: addprinc -e "aes256-cts-hmac-sha1-96:normal rc4-hmac:normal" \
  krbtgt/AD.CORP.COM@LINUX.CORP.COM
# Use the same password you will configure in AD

kadmin.local: addprinc -e "aes256-cts-hmac-sha1-96:normal rc4-hmac:normal" \
  krbtgt/LINUX.CORP.COM@AD.CORP.COM
```

In Active Directory (PowerShell on a Domain Controller):

```powershell
# Create the trust on the AD side
netdom trust LINUX.CORP.COM /domain:AD.CORP.COM /add /twoway /realm

# Set the trust password (must match the MIT KDC principal)
netdom trust LINUX.CORP.COM /domain:AD.CORP.COM /passwordt:SharedTrustPassword

# Set supported encryption types
ksetup /setenctypeattr LINUX.CORP.COM AES256-CTS-HMAC-SHA1-96
```

## Controlling Which Cross-Realm Users Get Access

Accepting a Kerberos ticket from another realm does not automatically grant access to services. Services can filter cross-realm principals:

### SSH Access Control

Restrict which cross-realm users can SSH in via `.k5login`:

```bash
# /home/localuser/.k5login
jsmith@CORP.EXAMPLE.COM
bwilliams@CORP.EXAMPLE.COM
```

Or configure `auth_to_local` rules in `krb5.conf`:

```ini
[realms]
    PARTNER.EXAMPLE.COM = {
        # Map CORP realm users to local names
        auth_to_local = RULE:[1:$1@$0](.*@CORP\.EXAMPLE\.COM$)s/@CORP\.EXAMPLE\.COM//
        auth_to_local = DEFAULT
    }
```

### PAM-Based Access Control

Use `pam_krb5` with `permitted_host_realm` settings or SSSD's cross-domain access control.

## Troubleshooting

**"Server not found in Kerberos database" during cross-realm** - the service's host principal does not exist in its home realm. Create it with `kadmin.local`.

**"Credentials cache: Ticket expired" immediately** - clock skew between the two KDCs. Synchronize NTP on both.

**"Cannot find KDC for realm" for the remote realm** - the `[realms]` section does not list the remote KDC. Add it to `krb5.conf`.

**Trust principals with wrong passwords** - delete and recreate them on both KDCs, ensuring you use the exact same password.

Cross-realm trust is a powerful feature that enables federation between Kerberos environments without duplicating user accounts, forming the foundation of enterprise-scale single sign-on.
