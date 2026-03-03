# How to Set Up NFSv4 with Kerberos Authentication on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, NFS, Kerberos, Security, Authentication

Description: Configure NFSv4 with Kerberos authentication on Ubuntu for secure, encrypted NFS mounts that authenticate users without relying solely on IP-based trust.

---

Standard NFS relies on IP address-based trust - the server trusts any client from an allowed IP range, and file access is determined by UID/GID matching. This is acceptable on isolated networks, but on shared or less-trusted networks, it is a significant security weakness: any root user on an allowed client can impersonate any other user. NFSv4 with Kerberos (sec=krb5) solves this by requiring cryptographic authentication for every connection.

## Security Flavors in NFSv4

NFSv4 with Kerberos supports three security flavors:

- **krb5:** Kerberos authentication only. Connections are authenticated but traffic is not encrypted or integrity-checked.
- **krb5i:** Kerberos authentication plus integrity checking. Prevents tampering in transit.
- **krb5p:** Kerberos authentication, integrity checking, plus encryption. Most secure, highest overhead.

For sensitive data, use `krb5p`. For internal networks where performance matters, `krb5i` is a good compromise.

## Prerequisites

You need:
- A Kerberos KDC (MIT Kerberos or Active Directory)
- NFS server and client machines with correct DNS/reverse DNS
- Time synchronization between all systems (Kerberos requires clocks within 5 minutes)

This guide uses MIT Kerberos. If you are using Active Directory as the KDC, the principals look slightly different but the NFS configuration is the same.

## Setting Up Kerberos (KDC)

On the KDC server:

```bash
# Install KDC packages
sudo apt install krb5-kdc krb5-admin-server -y

# Initialize the realm
sudo krb5_newrealm
# Enter a master database password when prompted
```

Configure `/etc/krb5.conf`:

```ini
[libdefaults]
    default_realm = EXAMPLE.COM
    dns_lookup_realm = false
    dns_lookup_kdc = true
    rdns = false

[realms]
    EXAMPLE.COM = {
        kdc = kdc.example.com
        admin_server = kdc.example.com
    }

[domain_realm]
    .example.com = EXAMPLE.COM
    example.com = EXAMPLE.COM
```

Create service principals for the NFS server:

```bash
# Add an admin user
sudo kadmin.local addprinc admin/admin

# Add NFS service principal for the server
sudo kadmin.local addprinc -randkey nfs/nfsserver.example.com

# Export the keytab for the NFS server
sudo kadmin.local ktadd -k /tmp/nfs-server.keytab nfs/nfsserver.example.com
```

Transfer the keytab to the NFS server:

```bash
# On the KDC, copy to NFS server
sudo scp /tmp/nfs-server.keytab nfsserver.example.com:/tmp/

# Clean up the temporary file on the KDC
sudo rm /tmp/nfs-server.keytab
```

Create service principals for client machines (needed for krb5p):

```bash
# For each NFS client
sudo kadmin.local addprinc -randkey host/nfsclient.example.com
sudo kadmin.local ktadd -k /tmp/nfs-client.keytab host/nfsclient.example.com
```

## Configuring the NFS Server

On the Ubuntu NFS server:

```bash
# Install required packages
sudo apt install nfs-kernel-server krb5-user -y
```

Install the keytab:

```bash
# Move the keytab to the standard location
sudo mv /tmp/nfs-server.keytab /etc/krb5.keytab
sudo chown root:root /etc/krb5.keytab
sudo chmod 600 /etc/krb5.keytab

# Verify the keytab contents
sudo klist -k /etc/krb5.keytab
```

Configure the NFS ID mapping service for NFSv4:

```bash
sudo nano /etc/idmapd.conf
```

```ini
[General]
    Verbosity = 0
    # Must match the Kerberos realm domain
    Domain = example.com

[Mapping]
    Nobody-User = nobody
    Nobody-Group = nogroup
```

Configure the NFS server exports:

```bash
sudo nano /etc/exports
```

```text
# Export with Kerberos authentication required
/srv/nfs/shared    *(rw,sync,no_subtree_check,sec=krb5p)

# Allow multiple security flavors (clients can choose)
/srv/nfs/data      192.168.1.0/24(rw,sync,no_subtree_check,sec=krb5i:krb5p)

# Read-only export with Kerberos
/srv/nfs/public    *(ro,sync,no_subtree_check,sec=krb5)
```

Create the export directories:

```bash
sudo mkdir -p /srv/nfs/{shared,data,public}
sudo chown root:root /srv/nfs/shared
sudo chmod 755 /srv/nfs/shared
```

Enable GSSD (the Kerberos GSS daemon required for Kerberos NFS):

```bash
# Install and enable rpc-gssd
sudo apt install gssd -y

# Enable the service
sudo systemctl enable rpc-gssd
sudo systemctl start rpc-gssd

# Check status
sudo systemctl status rpc-gssd
```

Apply the export configuration:

```bash
sudo exportfs -ra
sudo systemctl restart nfs-kernel-server
```

## Configuring the NFS Client

On the Ubuntu NFS client:

```bash
# Install NFS client and Kerberos tools
sudo apt install nfs-common krb5-user -y
```

Copy `/etc/krb5.conf` from the KDC (or configure it manually with the same realm settings).

Install the client host keytab:

```bash
sudo mv /tmp/nfs-client.keytab /etc/krb5.keytab
sudo chown root:root /etc/krb5.keytab
sudo chmod 600 /etc/krb5.keytab
```

Configure idmapd:

```bash
sudo nano /etc/idmapd.conf
```

```ini
[General]
    Domain = example.com

[Mapping]
    Nobody-User = nobody
    Nobody-Group = nogroup
```

Enable GSSD on the client:

```bash
sudo systemctl enable rpc-gssd
sudo systemctl start rpc-gssd
```

## Obtaining User Kerberos Tickets

Each user who will access the NFS share needs a Kerberos ticket:

```bash
# Get a ticket for the current user
kinit username@EXAMPLE.COM
# Enter the Kerberos password

# Verify the ticket
klist
```

For automatic ticket renewal, install and configure pam_krb5 or use SSSD.

## Mounting the Kerberos-Authenticated NFS Share

```bash
# Create a mount point
sudo mkdir -p /mnt/nfs/shared

# Mount with krb5p security
sudo mount -t nfs4 -o sec=krb5p nfsserver.example.com:/srv/nfs/shared /mnt/nfs/shared

# Verify the mount
df -h /mnt/nfs/shared
mount | grep nfs
```

For persistent mounts in `/etc/fstab`:

```text
nfsserver.example.com:/srv/nfs/shared  /mnt/nfs/shared  nfs4  sec=krb5p,hard,intr,noatime,_netdev  0  0
```

## Verifying Kerberos Authentication

```bash
# After mounting, verify which security flavor is in use
cat /proc/mounts | grep nfs
# Should show sec=krb5p in the options

# Create a test file as a regular user (with a valid Kerberos ticket)
touch /mnt/nfs/shared/testfile
ls -la /mnt/nfs/shared/

# The file should show the correct Kerberos principal mapped to UID
```

## Setting Up Automatic Ticket Renewal

For unattended systems (services accessing NFS), use a keytab for automatic authentication:

```bash
# Create a user principal for a service account
sudo kadmin.local addprinc -randkey serviceuser@EXAMPLE.COM
sudo kadmin.local ktadd -k /etc/serviceuser.keytab serviceuser@EXAMPLE.COM

# Get a ticket using the keytab (no password prompt)
kinit -k -t /etc/serviceuser.keytab serviceuser@EXAMPLE.COM

# Set up automatic renewal with a cron job or systemd timer
sudo crontab -e
```

Add:
```text
0 */8 * * * /usr/bin/kinit -k -t /etc/serviceuser.keytab serviceuser@EXAMPLE.COM
```

## Troubleshooting Kerberos NFS

### "Permission denied" even with valid ticket

```bash
# Check if rpc-gssd is running
sudo systemctl status rpc-gssd

# Check idmapd is running
sudo systemctl status nfs-idmapd

# Verify the domain configuration matches on both sides
cat /etc/idmapd.conf
```

### "Server not found in Kerberos database"

```bash
# Verify the NFS service principal exists
sudo kadmin.local listprincs | grep nfs

# Confirm the server's FQDN matches the principal
hostname -f
# Must be nfsserver.example.com

# Verify DNS forward and reverse lookup
host nfsserver.example.com
host $(dig +short nfsserver.example.com)
```

### Ticket expired during mount

```bash
# Check ticket expiry
klist

# Renew tickets (if within the renewable window)
kinit -R

# Enable automatic renewal via krb5 configuration
# In /etc/krb5.conf:
# [libdefaults]
#     renew_lifetime = 7d
```

### Clock skew errors

```bash
# Kerberos fails if clocks differ by more than 5 minutes
# Check current time vs KDC
date
sudo ntpdate -q kdc.example.com

# Fix with chrony
sudo apt install chrony -y
sudo nano /etc/chrony/chrony.conf
# Add: server kdc.example.com iburst
sudo systemctl restart chrony
```

NFSv4 with Kerberos gives you cryptographically authenticated file sharing where client IP address alone cannot be used to impersonate users. This is significantly more secure than standard NFS for any environment where the network is not completely isolated.
