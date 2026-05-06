# How to Configure GSS-TSIG for IPv6 DNS Updates

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GSS-TSIG, Kerberos, DNS, IPv6, Active Directory, BIND, Secure Updates

Description: Configure GSS-TSIG (Kerberos-based TSIG) for secure dynamic DNS updates over IPv6, integrating BIND with Active Directory or MIT Kerberos for authenticated DDNS.

## Introduction

GSS-TSIG (RFC 3645) uses Kerberos (via GSSAPI) to authenticate dynamic DNS updates. It is the mechanism Windows clients use to register their DNS records with Active Directory-integrated DNS. Configuring BIND to accept GSS-TSIG updates over IPv6 allows Linux hosts joined to AD to register AAAA records securely.

## Prerequisites

```bash
# Install required packages

apt-get install -y bind9 krb5-user libgssapi-krb5-2 \
    winbind samba-common-bin

# Verify BIND was built with GSSAPI support
named -V
# Inspect the reported build options for GSSAPI support
```

## Step 1: Configure Kerberos

```ini
# /etc/krb5.conf

[libdefaults]
    default_realm = EXAMPLE.COM
    dns_lookup_realm = false
    dns_lookup_kdc = false

[realms]
    EXAMPLE.COM = {
        # Use an explicit IPv6 KDC entry
        kdc = [2001:db8::88]
        admin_server = kdc.example.com
    }

[domain_realm]
    .example.com = EXAMPLE.COM
    example.com = EXAMPLE.COM
```

## Step 2: Create DNS Service Principal

```bash
# On an AD domain controller, map the DNS SPN to a service account
# and export a keytab for BIND
ktpass /out named.keytab /princ DNS/ns1.example.com@EXAMPLE.COM \
    /mapuser named-svc /pass * /crypto all \
    /ptype KRB5_NT_PRINCIPAL /mapop set

# Or with kadmin
kadmin -p admin/admin -q "addprinc -randkey DNS/ns1.example.com@EXAMPLE.COM"
kadmin -p admin/admin -q "ktadd -k /etc/named.keytab DNS/ns1.example.com@EXAMPLE.COM"

# After copying the keytab to the BIND host, set ownership
chown bind:bind /etc/named.keytab
chmod 640 /etc/named.keytab

# Verify keytab
klist -kte /etc/named.keytab
```

## Step 3: Configure BIND for GSS-TSIG

```nginx
# /etc/bind/named.conf.options

options {
    listen-on-v6 { any; };
    recursion yes;

    # Path to Kerberos keytab
    tkey-gssapi-keytab "/etc/named.keytab";

    # Or explicitly pin the server principal
    # tkey-gssapi-credential "DNS/ns1.example.com@EXAMPLE.COM";
};
```

```nginx
# /etc/bind/named.conf.local

zone "example.com" {
    type master;
    file "/var/lib/bind/db.example.com";

    # Allow joined Linux hosts and Windows machines
    # to update their own address records
    update-policy {
        grant EXAMPLE.COM krb5-self . A AAAA;
        grant EXAMPLE.COM ms-self . A AAAA;
    };
};
```

## Step 4: Linux Host Registration with nsupdate + GSS-TSIG

```bash
# Get a Kerberos ticket for the host
kinit -k -t /etc/krb5.keytab host/myhost.example.com@EXAMPLE.COM

# Update AAAA record using GSS-TSIG
nsupdate -g -6 << EOF
zone example.com
realm EXAMPLE.COM
update delete myhost.example.com. AAAA
update add myhost.example.com. 300 AAAA 2001:db8::100
send
EOF
```

## Step 5: Windows Client Registration over IPv6

```powershell
# Windows automatically registers AAAA records via GSS-TSIG
# when joined to Active Directory

# Force re-registration
ipconfig /registerdns

# Verify the record was created
Resolve-DnsName -Name "myhost.example.com" -Type AAAA

# Check event log for DNS registration
Get-WinEvent -LogName "Microsoft-Windows-DNS-Client/Operational" |
    Where-Object { $_.Message -like "*myhost.example.com*" } |
    Select-Object -First 5
```

## Step 6: Test and Troubleshoot

```bash
# Test Kerberos connectivity to KDC over IPv6
kinit user@EXAMPLE.COM
klist

# Test GSS-TSIG update
nsupdate -d -g -6 << EOF
zone example.com
realm EXAMPLE.COM
update add testhost.example.com. 60 AAAA 2001:db8::123
send
EOF

# Check BIND logs for GSS errors
journalctl -u bind9 | grep -i gss

# Verify record
dig -6 AAAA testhost.example.com @ns1.example.com
```

## Conclusion

GSS-TSIG for IPv6 DNS updates requires BIND with GSSAPI support, a Kerberos keytab for the DNS service principal, `tkey-gssapi-keytab` in `named.conf`, and a zone `update-policy` that matches the Kerberos identities allowed to update records. Windows and Linux clients in the domain can then register AAAA records securely. Monitor DNS registration failures with OneUptime to detect Kerberos ticket expiry or KDC reachability issues.
