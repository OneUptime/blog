# How to Install an IdM Server with Integrated DNS on RHEL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, IdM, FreeIPA, DNS, Identity Management, Kerberos, Linux

Description: Learn how to install and configure a Red Hat Identity Management (IdM) server with integrated DNS on RHEL for centralized authentication and DNS management.

---

Installing IdM with integrated DNS simplifies deployment by having IdM manage DNS records automatically. This is the recommended approach for environments where IdM can serve as the authoritative DNS for its domain.

## Prerequisites

```bash
# Set the hostname to a fully qualified domain name
sudo hostnamectl set-hostname idm1.example.com

# Verify the hostname resolves correctly
hostname -f
# Output: idm1.example.com

# Ensure /etc/hosts has the correct entry
echo "192.168.1.10 idm1.example.com idm1" | sudo tee -a /etc/hosts

# Verify forward and reverse resolution
getent hosts idm1.example.com
```

## Installing Required Packages

```bash
# Install the IdM server with DNS packages
sudo dnf module enable idm:DL1 -y
sudo dnf install -y ipa-server ipa-server-dns

# This installs the 389 Directory Server, Kerberos KDC,
# Dogtag CA, and BIND DNS server
```

## Running the Installer

```bash
# Run the IdM server installer with integrated DNS
sudo ipa-server-install \
  --domain=example.com \
  --realm=EXAMPLE.COM \
  --ds-password='DirectoryManagerPassword123' \
  --admin-password='AdminPassword123' \
  --setup-dns \
  --forwarder=8.8.8.8 \
  --no-reverse \
  --unattended

# The installation takes 10-20 minutes
# It configures: LDAP, Kerberos, CA, DNS, HTTP, NTP
```

## Configuring the Firewall

```bash
# Open required ports
sudo firewall-cmd --permanent --add-service={freeipa-ldap,freeipa-ldaps,dns,kerberos,kpasswd,http,https}
sudo firewall-cmd --reload
```

## Verifying the Installation

```bash
# Authenticate as the admin user
kinit admin
# Enter the admin password when prompted

# Verify Kerberos ticket
klist

# Test the IdM API
ipa user-find --all

# Check DNS is working
dig @localhost example.com SOA

# Verify all services are running
ipactl status
```

## Post-Installation Tasks

```bash
# Access the Web UI at https://idm1.example.com
# Log in with admin and the admin password you set

# Create a DNS reverse zone if needed
ipa dnszone-add 1.168.192.in-addr.arpa.

# Enable password policy
ipa pwpolicy-mod --minlife=1 --maxlife=90 --minlength=12
```

After installation, the next step is typically to install a replica for high availability and then enroll client machines. Keep the Directory Manager password secure since it provides full access to the LDAP database.
