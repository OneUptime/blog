# How to Install and Configure an IdM Client on RHEL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, IdM, FreeIPA, Client, SSSD, Kerberos, Linux

Description: Learn how to install and configure a RHEL system as an IdM client for centralized authentication, enabling users to log in with their IdM credentials.

---

Enrolling a RHEL system as an IdM client enables centralized user authentication through Kerberos and LDAP. Once enrolled, IdM users can log in to the client using their domain credentials. The client uses SSSD to cache credentials and handle offline authentication.

## Prerequisites

```bash
# Ensure the client can resolve the IdM server
dig idm1.example.com

# Verify DNS SRV records are available
dig _ldap._tcp.example.com SRV

# Set the hostname
sudo hostnamectl set-hostname client1.example.com
```

## Installing the IdM Client

```bash
# Install the IdM client package
sudo dnf install -y ipa-client

# Run the client installer
sudo ipa-client-install \
  --domain=example.com \
  --realm=EXAMPLE.COM \
  --server=idm1.example.com \
  --server=idm2.example.com \
  --principal=admin \
  --password='AdminPassword123' \
  --mkhomedir \
  --unattended

# The --mkhomedir flag automatically creates home directories
# for IdM users on first login
```

## Verifying the Client Enrollment

```bash
# Test Kerberos authentication
kinit admin
klist

# Look up an IdM user
id admin

# Test SSH login as an IdM user
ssh admin@client1.example.com

# Check SSSD is running and connected
sudo systemctl status sssd
sudo sssctl domain-status example.com
```

## Configuring SSSD Options

The installer creates `/etc/sssd/sssd.conf`. You can tune it for your needs:

```bash
# View current SSSD configuration
sudo cat /etc/sssd/sssd.conf

# Common tuning: adjust cache timeout (default 5400 seconds)
sudo sed -i 's/\[domain\/example.com\]/[domain\/example.com]\nentry_cache_timeout = 3600/' /etc/sssd/sssd.conf

# Restart SSSD after changes
sudo systemctl restart sssd
```

## Enabling Home Directory Creation

If you did not use `--mkhomedir` during installation:

```bash
# Enable automatic home directory creation via authselect
sudo authselect enable-feature with-mkhomedir
sudo systemctl enable --now oddjobd
```

## Troubleshooting Client Issues

```bash
# Clear SSSD cache if users are not resolving
sudo sss_cache -E
sudo systemctl restart sssd

# Check SSSD logs for errors
sudo journalctl -u sssd -f

# Verify Kerberos configuration
cat /etc/krb5.conf

# Test LDAP connectivity
ldapsearch -x -H ldap://idm1.example.com -b "dc=example,dc=com" "(uid=admin)"
```

After enrollment, the client automatically discovers available IdM servers through DNS SRV records and fails over between them. Credentials are cached locally by SSSD, allowing users to log in even when the IdM servers are temporarily unreachable.
