# How to Install an IdM Server with Integrated DNS on RHEL

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: RHEL, IdM, Identity Management, DNS, FreeIPA, Linux

Description: Learn how to install and configure a Red Hat Identity Management server with integrated DNS on RHEL for centralized authentication and name resolution.

---

Installing an IdM server with integrated DNS on RHEL gives you a complete identity management solution with automatic DNS record management. The integrated DNS server handles service discovery records that Kerberos and LDAP clients need, significantly simplifying client enrollment and authentication.

## Prerequisites

Before installation, ensure:

- RHEL with a valid subscription
- A static IP address
- A fully qualified hostname that resolves correctly
- At least 4 GB RAM and 10 GB free disk space
- No existing LDAP, Kerberos, or DNS services on the host

## Setting the Hostname

```bash
sudo hostnamectl set-hostname idm1.example.com
```

Verify:

```bash
hostname -f
```

This must return the FQDN: `idm1.example.com`

Ensure the hostname resolves to the correct IP (not 127.0.0.1):

```bash
getent hosts idm1.example.com
```

If needed, add an entry to `/etc/hosts`:

```text
192.168.1.10  idm1.example.com  idm1
```

## Installing Required Packages

```bash
sudo dnf module enable idm:DL1
sudo dnf distro-sync
sudo dnf install ipa-server ipa-server-dns
```

## Opening Firewall Ports

```bash
sudo firewall-cmd --add-service=freeipa-ldap --permanent
sudo firewall-cmd --add-service=freeipa-ldaps --permanent
sudo firewall-cmd --add-service=dns --permanent
sudo firewall-cmd --add-service=ntp --permanent
sudo firewall-cmd --reload
```

## Running the Installation

```bash
sudo ipa-server-install --setup-dns
```

The installer prompts for:

```text
Server host name [idm1.example.com]: <Enter>
Please confirm the domain name [example.com]: <Enter>
Please provide a realm name [EXAMPLE.COM]: <Enter>
Directory Manager password: <enter password>
IPA admin password: <enter password>
Do you want to configure DNS forwarders? [yes]: yes
Enter an IP address for a DNS forwarder: 8.8.8.8
Do you want to search for missing reverse zones? [yes]: yes
Do you want to configure chrony with NTP server or pool address? [no]: <Enter>
```

For non-interactive installation:

```bash
sudo ipa-server-install \
    --setup-dns \
    --hostname=idm1.example.com \
    --domain=example.com \
    --realm=EXAMPLE.COM \
    --ds-password='DirectoryManagerPassword' \
    --admin-password='AdminPassword' \
    --forwarder=8.8.8.8 \
    --no-reverse \
    --unattended
```

The installation takes 10-20 minutes.

## Verifying the Installation

Obtain a Kerberos ticket:

```bash
kinit admin
```

Test the IPA command:

```bash
ipa user-find admin
```

Check service status:

```bash
ipactl status
```

Expected output:

```text
Directory Service: RUNNING
krb5kdc Service: RUNNING
kadmin Service: RUNNING
named Service: RUNNING
httpd Service: RUNNING
ipa-custodia Service: RUNNING
pki-tomcatd Service: RUNNING
ipa-otpd Service: RUNNING
ipa: INFO: The ipactl command was successful
```

## Verifying DNS

Test DNS resolution:

```bash
dig idm1.example.com
dig -t SRV _ldap._tcp.example.com
dig -t SRV _kerberos._tcp.example.com
```

## Accessing the Web UI

Open a browser and navigate to:

```text
https://idm1.example.com
```

Log in with the admin credentials you set during installation.

## Post-Installation Configuration

### Configure DNS Forwarding

If you need to resolve external domains:

```bash
ipa dnsconfig-mod --forwarder=8.8.8.8 --forward-policy=first
```

### Create a Reverse DNS Zone

```bash
ipa dnszone-add 1.168.192.in-addr.arpa.
```

### Adjust Password Policy

```bash
ipa pwpolicy-mod --maxlife=90 --minlife=1 --history=5 --minlength=12
```

## Backup

Create an immediate backup:

```bash
sudo ipa-backup
```

Backups are stored in `/var/lib/ipa/backup/`.

## Troubleshooting Installation Failures

If the installation fails:

```bash
# Check the install log
cat /var/log/ipaserver-install.log

# If you need to retry, uninstall first
sudo ipa-server-install --uninstall
```

Common issues:

- **DNS resolution** - Hostname must resolve to a non-loopback IP
- **Port conflicts** - Ensure no other services use IdM ports
- **Insufficient entropy** - Install `rng-tools` if the installer stalls during key generation

## Summary

Installing an IdM server with integrated DNS on RHEL provides centralized authentication, Kerberos single sign-on, and automatic DNS management. The installation process handles LDAP, Kerberos, CA, and DNS configuration in a single step. After installation, verify all services are running with `ipactl status`, test DNS with dig, and access the web UI to begin managing users and hosts.
