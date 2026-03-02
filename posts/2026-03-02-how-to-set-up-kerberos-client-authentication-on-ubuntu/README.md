# How to Set Up Kerberos Client Authentication on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, Kerberos, Authentication, SSO, Security

Description: Configure Ubuntu as a Kerberos client to authenticate against a KDC, enable SSH single sign-on, and integrate with PAM for login authentication.

---

Once a Kerberos KDC is running, you need to configure client machines to use it for authentication. A properly configured Kerberos client can authenticate users via SSH without passwords (using tickets), integrate with PAM for local logins, and provide single sign-on across services. This guide covers configuring an Ubuntu machine as a Kerberos client.

## Prerequisites

- A running Kerberos KDC (MIT Kerberos) with realm `EXAMPLE.COM`
- Ubuntu client machine with working DNS resolution for `kdc.example.com`
- NTP synchronized (clocks within 5 minutes of the KDC)
- Root/sudo access on the client

## Step 1: Install Kerberos Client Packages

```bash
sudo apt update
sudo apt install -y krb5-user libpam-krb5 krb5-config
```

During installation, answer the prompts:
- **Default realm**: `EXAMPLE.COM`
- **Kerberos servers**: `kdc.example.com`
- **Administrative server**: `kdc.example.com`

## Step 2: Configure krb5.conf

The client configuration mirrors what is on the KDC:

```bash
sudo nano /etc/krb5.conf
```

```ini
[libdefaults]
    default_realm = EXAMPLE.COM
    dns_lookup_realm = false
    dns_lookup_kdc = false
    ticket_lifetime = 24h
    renew_lifetime = 7d
    forwardable = true

    # Match encryption types with your KDC
    default_tkt_enctypes = aes256-cts-hmac-sha1-96 aes128-cts-hmac-sha1-96
    default_tgs_enctypes = aes256-cts-hmac-sha1-96 aes128-cts-hmac-sha1-96

[realms]
    EXAMPLE.COM = {
        kdc = kdc.example.com
        admin_server = kdc.example.com
    }

[domain_realm]
    .example.com = EXAMPLE.COM
    example.com = EXAMPLE.COM
```

## Step 3: Test Basic Authentication

Before configuring PAM and SSH, verify the client can reach the KDC and authenticate:

```bash
# Request a ticket (will prompt for password)
kinit jsmith

# Show current tickets
klist

# Destroy ticket after testing
kdestroy
```

Expected `klist` output:

```
Ticket cache: FILE:/tmp/krb5cc_1000
Default principal: jsmith@EXAMPLE.COM

Valid starting     Expires            Service principal
03/02/26 10:00:00  03/03/26 10:00:00  krbtgt/EXAMPLE.COM@EXAMPLE.COM
	renew until 03/09/26 10:00:00
```

If this works, the client is properly communicating with the KDC.

## Step 4: Register the Host Principal

Each client machine should have its own host principal in the KDC. Run this on the KDC (or remotely using `kadmin`):

```bash
# On the KDC (as root)
sudo kadmin.local -q "addprinc -randkey host/client.example.com"
sudo kadmin.local -q "ktadd -k /tmp/client-keytab host/client.example.com"

# Copy the keytab to the client
scp /tmp/client-keytab user@client.example.com:/tmp/
```

On the client:

```bash
sudo mv /tmp/client-keytab /etc/krb5.keytab
sudo chmod 600 /etc/krb5.keytab
sudo chown root:root /etc/krb5.keytab

# Verify the keytab
sudo klist -k /etc/krb5.keytab
```

Alternatively, do this from the client using `kadmin` (requires admin credentials):

```bash
# On the client, using remote kadmin
sudo kadmin -p admin/admin@EXAMPLE.COM \
  -q "addprinc -randkey host/client.example.com"

sudo kadmin -p admin/admin@EXAMPLE.COM \
  -q "ktadd host/client.example.com"
```

## Step 5: Configure SSH for Kerberos Authentication

### On the Client (as SSH client)

Enable GSSAPI (Kerberos) authentication in the SSH client configuration:

```bash
sudo nano /etc/ssh/ssh_config
```

```
Host *.example.com
    GSSAPIAuthentication yes
    GSSAPIDelegateCredentials yes
```

### On SSH Servers (machines you want to SSH into)

Configure the SSH daemon to accept Kerberos authentication:

```bash
sudo nano /etc/ssh/sshd_config
```

```
# Enable GSSAPI (Kerberos) authentication
GSSAPIAuthentication yes
GSSAPICleanupCredentials yes
UsePAM yes

# Optionally: disable password auth once Kerberos is working
# PasswordAuthentication no
```

```bash
sudo systemctl restart sshd
```

### Test SSH with Kerberos

```bash
# Obtain a ticket first
kinit jsmith

# SSH without being prompted for a password
ssh jsmith@server.example.com

# Verify ticket was forwarded
ssh jsmith@server.example.com klist
```

If you see "Authenticated to server.example.com ([...]) using GSSAPI" in verbose output (`ssh -v`), Kerberos SSO is working.

## Step 6: Configure PAM for Kerberos Login

PAM integration allows local console logins and `su` to use Kerberos:

```bash
sudo pam-auth-update --enable krb5
```

This modifies `/etc/pam.d/common-auth` to include `pam_krb5.so`.

Verify the PAM stack:

```bash
grep krb5 /etc/pam.d/common-auth
# Should show: auth    [success=1 default=ignore]    pam_krb5.so minimum_uid=1000
```

Test PAM authentication:

```bash
# Try su to a Kerberos user (user must exist locally or via LDAP/SSSD)
su - jsmith
```

## Step 7: Configure Ticket Renewal

Tickets expire by default after 24 hours. The `k5start` utility or a systemd service can auto-renew tickets:

```bash
sudo apt install -y kstart

# Keep a ticket renewed in the background
k5start -U -f /etc/krb5.keytab -K 60 &
# -U = use keytab's principal
# -f = keytab file
# -K = renew every 60 minutes
```

For system services, create a systemd service:

```bash
sudo nano /etc/systemd/system/kerberos-renew.service
```

```ini
[Unit]
Description=Kerberos Ticket Renewal
After=network.target

[Service]
Type=simple
ExecStart=/usr/bin/k5start -U -f /etc/krb5.keytab -K 60 -b -p /run/kerberos-renew.pid
PIDFile=/run/kerberos-renew.pid

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl enable kerberos-renew
sudo systemctl start kerberos-renew
```

## Configuring Kerberos for User Sessions

For users who log in via SSH or console and need Kerberos tickets for other services, configure automatic ticket acquisition on login:

```bash
# Add to /etc/pam.d/sshd (already handled by pam-auth-update if krb5 is enabled)
# Verify:
grep krb5 /etc/pam.d/sshd
```

Users can set up automatic renewal with a `.bash_profile` entry:

```bash
# In user's ~/.bash_profile
# Renew Kerberos ticket if it exists and is expiring soon
if klist -s 2>/dev/null; then
    kinit -R 2>/dev/null || true
fi
```

## Mapping Principals to Local Users

By default, Kerberos maps `jsmith@EXAMPLE.COM` to local user `jsmith`. Customize this with `/etc/krb5.conf` or `~/.k5login`:

```bash
# A user's ~/.k5login lists principals allowed to log in as them
# This allows jsmith@EXAMPLE.COM to login as the local user
nano /home/jsmith/.k5login
```

```
jsmith@EXAMPLE.COM
jsmith/admin@EXAMPLE.COM
```

This is useful for allowing admin principals to SSH into servers as regular users.

## Troubleshooting

**"kinit: KDC has no support for encryption type"** - encryption type mismatch. Check that `default_tkt_enctypes` in `krb5.conf` matches the KDC's supported types.

**"kinit: Clock skew too great"** - NTP is not working. Check `timedatectl status` and fix time synchronization.

**SSH not using Kerberos** - run `ssh -v user@host` and look for "GSSAPI" in the output. Verify `GSSAPIAuthentication yes` is in `sshd_config` on the server, and the host has a keytab.

**PAM Kerberos authentication failing** - check `/var/log/auth.log` for pam_krb5 errors. Ensure `libpam-krb5` is installed and `pam-auth-update` was run.

**"Server not found in Kerberos database"** - the host principal is missing. Create it with `kadmin.local -q "addprinc -randkey host/hostname.example.com"` and create a keytab.

With Kerberos client authentication configured, users can authenticate once (`kinit`) and access multiple Kerberos-protected services without re-entering passwords, which is the essence of single sign-on.
