# How to Enable DNSSEC with BIND9 on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, DNS, BIND9, DNSSEC, Security

Description: Enable DNSSEC on your BIND9 authoritative DNS server on Ubuntu to cryptographically sign zones and protect against DNS spoofing and cache poisoning attacks.

---

DNS was designed without security in mind. An attacker on the network path between a client and a DNS server can return forged responses, redirecting users to malicious sites. DNSSEC (DNS Security Extensions) addresses this by adding cryptographic signatures to DNS records, allowing resolvers to verify that responses are authentic and haven't been tampered with.

This tutorial covers enabling DNSSEC on a BIND9 authoritative server. We'll generate signing keys, sign zones, and configure automatic re-signing.

## How DNSSEC Works

DNSSEC uses public-key cryptography. The zone owner generates two key pairs:

- **Zone Signing Key (ZSK)**: Signs the actual resource records in the zone. This key is rotated frequently (monthly is common).
- **Key Signing Key (KSK)**: Signs the ZSK. This key has a longer lifetime and its public key is published as a DS record with the parent zone registrar.

When a DNSSEC-aware resolver queries a signed zone, it:
1. Retrieves the DNSKEY records
2. Uses the KSK to verify the ZSK
3. Uses the ZSK to verify the resource records
4. Validates against the chain of trust from the root zone down

The chain of trust is established by publishing a Delegation Signer (DS) record in the parent zone, which is done through your domain registrar.

## Prerequisites

You should have a working BIND9 primary server with at least one zone configured. See the primary DNS server setup guide at https://oneuptime.com/blog/post/2026-03-02-how-to-set-up-bind9-as-a-primary-dns-server-on-ubuntu/view.

## Method 1: Automatic DNSSEC with `dnssec-policy`

BIND9 version 9.16+ (available in Ubuntu 20.04+) supports the `dnssec-policy` directive, which handles key generation, rotation, and zone signing automatically. This is the recommended approach.

First, verify your BIND9 version:

```bash
named -v
# Should be 9.16.x or newer for full dnssec-policy support
```

Configure a DNSSEC policy in `/etc/bind/named.conf.options`:

```bash
sudo nano /etc/bind/named.conf.options
```

```
// Define a DNSSEC policy
dnssec-policy "my-policy" {
    // Key signing key - 4096 bit RSA, rotate every 2 years
    keys {
        ksk lifetime 730d algorithm rsasha256 4096;
        zsk lifetime 90d algorithm rsasha256 2048;
    };

    // NSEC3 for proof of non-existence (obscures zone enumeration)
    nsec3param iterations 0 optout no salt-length 8;
};
```

Apply the policy to your zone in `/etc/bind/named.conf.local`:

```bash
sudo nano /etc/bind/named.conf.local
```

```
zone "example.com" {
    type master;
    file "/etc/bind/zones/db.example.com";
    // Apply DNSSEC policy
    dnssec-policy "my-policy";
    // Required for inline signing
    inline-signing yes;
    allow-transfer { 192.168.1.20; };
};
```

Restart BIND9 and keys will be generated automatically:

```bash
sudo named-checkconf
sudo systemctl restart bind9

# Watch for key generation in the logs
sudo journalctl -u bind9 -f
```

## Method 2: Manual Key Generation and Signing

If you're on an older BIND9 version or want more control, the manual approach gives you visibility into each step.

### Generating Keys

```bash
# Create a directory for the keys
sudo mkdir /etc/bind/keys
sudo chown bind:bind /etc/bind/keys

# Generate the Zone Signing Key (ZSK)
sudo -u bind dnssec-keygen \
    -a RSASHA256 \
    -b 2048 \
    -n ZONE \
    -K /etc/bind/keys \
    example.com

# Generate the Key Signing Key (KSK)
sudo -u bind dnssec-keygen \
    -a RSASHA256 \
    -b 4096 \
    -n ZONE \
    -f KSK \
    -K /etc/bind/keys \
    example.com

# List the generated keys
ls /etc/bind/keys/
```

Each key pair consists of two files: a `.key` file (public key for publishing in DNS) and a `.private` file (private key for signing). The filenames include the key tag number, like `Kexample.com.+008+12345.key`.

### Including Keys in the Zone File

Add the public keys to your zone file:

```bash
# View the key content to copy into the zone file
cat /etc/bind/keys/Kexample.com.*.key
```

Add `$INCLUDE` directives to the zone file:

```bash
sudo nano /etc/bind/zones/db.example.com
```

```dns
$TTL    86400
@       IN      SOA     ns1.example.com. admin.example.com. (
                        2026030201
                        3600
                        900
                        604800
                        86400 )

@       IN      NS      ns1.example.com.
@       IN      NS      ns2.example.com.

; Include the generated DNSKEY records
$INCLUDE /etc/bind/keys/Kexample.com.+008+11111.key
$INCLUDE /etc/bind/keys/Kexample.com.+008+22222.key

; Regular records follow...
ns1     IN      A       192.168.1.10
www     IN      A       192.168.1.100
```

### Signing the Zone

```bash
# Sign the zone file
sudo dnssec-signzone \
    -A \
    -3 $(head -c 1000 /dev/random | sha1sum | cut -b 1-16) \
    -N increment \
    -o example.com \
    -t \
    -K /etc/bind/keys \
    /etc/bind/zones/db.example.com

# This creates db.example.com.signed
ls /etc/bind/zones/
```

Update the zone file reference in `named.conf.local` to use the signed file:

```
zone "example.com" {
    type master;
    file "/etc/bind/zones/db.example.com.signed";
    allow-transfer { 192.168.1.20; };
};
```

Reload BIND9:

```bash
sudo rndc reload example.com
```

## Getting the DS Record for the Registrar

The DS record links your zone into the global chain of trust. Without it, resolvers can't verify your zone's signatures.

For the automatic approach, get the DS record from BIND:

```bash
sudo rndc signing -list example.com
```

For manual signing, extract it from the key file:

```bash
# Generate DS records from the KSK
dnssec-dsfromkey /etc/bind/keys/Kexample.com.+008+22222.key
```

This outputs something like:

```
example.com. IN DS 22222 8 1 ABCDEF1234567890...
example.com. IN DS 22222 8 2 FEDCBA0987654321...
```

Submit both SHA-1 (type 1) and SHA-256 (type 2) DS records to your registrar. The exact process depends on your registrar's control panel.

## Verifying DNSSEC

After adding the DS records (allow up to 48 hours for propagation), verify the chain of trust:

```bash
# Check DNSKEY records
dig +dnssec example.com DNSKEY

# Check DS records at the parent zone
dig example.com DS

# Check RRSIG records on A records
dig +dnssec www.example.com A

# Full DNSSEC trace using delv
delv @localhost example.com A +multiline

# Online validator
# Visit: https://dnssec-analyzer.verisignlabs.com/ and enter your domain
```

Look for the `ad` (Authenticated Data) flag in the dig output, which confirms DNSSEC validation succeeded.

## Checking Signature Expiry

DNSSEC signatures expire and must be refreshed. With the automatic `dnssec-policy` approach, BIND handles this. With manual signing, set up a cron job:

```bash
sudo nano /etc/cron.monthly/resign-zones
```

```bash
#!/bin/bash
# Re-sign all DNSSEC zones
# Run monthly, well before signature expiry

ZONE="example.com"
ZONE_FILE="/etc/bind/zones/db.$ZONE"
KEYS_DIR="/etc/bind/keys"

dnssec-signzone \
    -A \
    -N increment \
    -o $ZONE \
    -K $KEYS_DIR \
    $ZONE_FILE

rndc reload $ZONE
```

```bash
sudo chmod +x /etc/cron.monthly/resign-zones
```

## Troubleshooting

If DNSSEC validation fails, check:

```bash
# Check for SERVFAIL which indicates DNSSEC failure
dig +dnssec example.com A

# Disable DNSSEC validation temporarily to confirm it's the issue
dig +cd +dnssec example.com A

# Check BIND logs for signing errors
sudo journalctl -u bind9 | grep -i dnssec
```

Common issues include expired signatures (re-sign the zone), incorrect DS records at the registrar (delete and re-add), and clock skew between servers (ensure NTP is running on all servers).

DNSSEC adds meaningful protection against DNS cache poisoning but requires ongoing maintenance for key rotation and signature renewal. The `dnssec-policy` feature in modern BIND9 automates the most error-prone parts of that lifecycle.
