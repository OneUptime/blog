# How to Configure Smart Card Authentication with IdM on RHEL 9

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, IdM, Smart Card, Authentication, Linux

Description: A practical guide to setting up smart card (PIV/CAC) authentication with Red Hat Identity Management on RHEL 9, covering certificate mapping, SSSD configuration, and login setup.

---

Smart card authentication replaces or supplements password-based login with a physical token containing a digital certificate. In government and defense environments, this is mandatory (think PIV and CAC cards). FreeIPA on RHEL 9 supports smart card authentication natively, integrating with the system's SSSD and PAM stack. This guide walks through the setup from end to end.

## How Smart Card Authentication Works

```mermaid
flowchart LR
    A[User Inserts Smart Card] --> B[PC/SC Daemon]
    B --> C[PAM/SSSD]
    C --> D[Certificate Extraction]
    D --> E[IdM Server]
    E -->|Certificate Mapping| F[User Account]
    F -->|PKINIT| G[Kerberos TGT]
```

The smart card contains a private key and an X.509 certificate. When the user inserts the card and enters a PIN, the system extracts the certificate, maps it to an IdM user, and performs PKINIT (Public Key Cryptography for Initial Authentication in Kerberos) to obtain a Kerberos ticket.

## Prerequisites

- A working IdM deployment on RHEL 9 with an integrated CA
- Smart card readers connected to client machines
- Smart cards with X.509 certificates (PIV, CAC, or PKCS#11 compatible)
- The CA that issued the smart card certificates must be trusted by IdM

## Step 1 - Install Smart Card Packages

Install the required packages on both the IdM server and client machines.

```bash
# On IdM clients, install smart card support packages
sudo dnf install opensc pcsc-lite pcsc-lite-ccid sssd-tools -y

# Start and enable the PC/SC daemon
sudo systemctl enable --now pcscd
```

## Step 2 - Configure IdM Server for Smart Card Authentication

Run the IdM configuration script to enable smart card authentication on the server side.

```bash
# Enable smart card authentication on the IdM server
# Provide the CA certificate that signed the smart card certificates
sudo ipa-advise config-server-for-smart-card-auth > /tmp/sc-server-config.sh

# Review the script before running it
cat /tmp/sc-server-config.sh

# Execute the configuration script
sudo bash /tmp/sc-server-config.sh /etc/ipa/ca.crt
```

If the smart card certificates are signed by an external CA, import that CA certificate first:

```bash
# Import the external CA certificate into IdM
ipa certmap-add external_ca --certificate="$(cat /path/to/external-ca.pem)"

# Or add it as a trusted CA
ipa-cacert-manage install /path/to/external-ca.pem -n "External Smart Card CA" -t CT,C,C
ipa-certupdate
```

## Step 3 - Configure Certificate Mapping Rules

Certificate mapping rules tell IdM how to match a certificate on a smart card to a user account. There are several strategies.

### Map by Certificate Subject

```bash
# Create a mapping rule that matches the certificate subject email to the IdM user
ipa certmaprule-add smart_card_rule \
  --matchrule='<ISSUER>CN=Smart Card CA,O=Example Corp' \
  --maprule='(mail={subject_rfc822name})'
```

### Map by Certificate Serial Number

```bash
# Map specific certificates to users by storing the certificate in the user entry
ipa certmaprule-add cert_exact_match \
  --matchrule='<ISSUER>CN=Smart Card CA' \
  --maprule='(userCertificate;binary={cert!bin})'
```

### Associate a Certificate with a User

```bash
# Add a certificate to a user's IdM entry
ipa user-add-cert jsmith --certificate="$(cat /path/to/jsmith-cert.pem | grep -v '^---' | tr -d '\n')"

# Verify the certificate is associated
ipa user-show jsmith --all | grep -i cert
```

## Step 4 - Configure IdM Clients for Smart Card Authentication

Run the client configuration script on each machine that needs smart card login.

```bash
# Generate the client configuration script
sudo ipa-advise config-client-for-smart-card-auth > /tmp/sc-client-config.sh

# Review and execute
cat /tmp/sc-client-config.sh
sudo bash /tmp/sc-client-config.sh /etc/ipa/ca.crt
```

This script configures SSSD, PAM, and the system to accept smart card authentication.

## Step 5 - Configure SSSD for Smart Card Authentication

Verify that SSSD is configured to handle certificate-based authentication.

```bash
# Check the SSSD configuration
sudo cat /etc/sssd/sssd.conf
```

The configuration should include:

```ini
[sssd]
services = nss, pam, ssh
domains = example.com

[pam]
pam_cert_auth = True

[domain/example.com]
id_provider = ipa
auth_provider = ipa
access_provider = ipa
```

If `pam_cert_auth` is not set, add it:

```bash
# Edit SSSD configuration
sudo vi /etc/sssd/sssd.conf

# Add pam_cert_auth = True under [pam] section
# Then restart SSSD
sudo systemctl restart sssd
```

## Step 6 - Configure authselect for Smart Card

Enable the smart card feature in authselect:

```bash
# Enable smart card authentication in the authselect profile
sudo authselect enable-feature with-smartcard

# Optionally require smart card (disable password fallback)
sudo authselect enable-feature with-smartcard-required

# If you want to allow both smart card and password
sudo authselect enable-feature with-smartcard
```

## Step 7 - Test Smart Card Authentication

### Test at the Console

Insert the smart card and try to log in. You should be prompted for the smart card PIN instead of a password.

### Test with Kerberos

```bash
# Obtain a Kerberos ticket using the smart card
kinit -X X509_user_identity=PKCS11: jsmith

# Verify the ticket
klist
```

### Test SSH with Smart Card

```bash
# SSH using smart card authentication
ssh -o PKCS11Provider=/usr/lib64/opensc-pkcs11.so jsmith@server.example.com
```

## Step 8 - Verify Smart Card Reader and Certificate

If authentication fails, verify the hardware and certificate chain.

```bash
# Check if the smart card reader is detected
pcsc_scan

# List certificates on the smart card
pkcs11-tool --list-objects --type cert

# List available PKCS#11 slots
pkcs11-tool --list-slots

# Read the certificate from the card
pkcs11-tool --read-object --type cert --id 01 -o /tmp/card-cert.der

# Convert and view the certificate
openssl x509 -inform der -in /tmp/card-cert.der -text -noout
```

## Step 9 - Configure GDM for Smart Card Login

If using a graphical desktop, GDM needs to be configured for smart card authentication.

```bash
# GDM should automatically detect smart card configuration from authselect
# Verify by checking the PAM stack
cat /etc/pam.d/gdm-smartcard
```

## Troubleshooting

### Smart Card Not Detected

```bash
# Check PC/SC daemon status
sudo systemctl status pcscd

# Check for card reader hardware
lsusb | grep -i "smart\|card\|reader"

# Test card detection
opensc-tool -l
```

### Certificate Mapping Fails

```bash
# Test certificate mapping manually
sudo sss_debuglevel 6
sudo dbus-send --system --dest=org.freedesktop.sssd.infopipe \
  /org/freedesktop/sssd/infopipe/Users \
  org.freedesktop.sssd.infopipe.Users.FindByCertificate \
  string:"$(cat /tmp/card-cert.pem)"
```

### Check SSSD Logs

```bash
# Enable debug logging for SSSD
sudo sssctl debug-level 6

# Watch the SSSD logs
sudo tail -f /var/log/sssd/sssd_pam.log
```

### PIN Prompt Not Appearing

If the login screen does not prompt for a smart card PIN:

```bash
# Verify authselect configuration
authselect current

# Make sure the smart card feature is enabled
authselect list-features sssd
```

## Security Considerations

- Use `with-smartcard-required` in authselect for environments that mandate smart card authentication with no password fallback
- Implement certificate revocation checking (CRL or OCSP) so that revoked certificates cannot be used for login
- Store the smart card CA certificate securely and rotate it according to your PKI policy
- Monitor for smart card authentication failures, as these could indicate attempted misuse

Smart card authentication takes more effort to set up than password-based auth, but it provides significantly stronger security. Once the infrastructure is in place, the user experience is actually simpler: insert card, enter PIN, and you are in.
