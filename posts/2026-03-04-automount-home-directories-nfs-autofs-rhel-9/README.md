# How to Automount Home Directories Over NFS Using autofs on RHEL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, autofs, NFS, Home Directories, LDAP, Linux

Description: Configure autofs on RHEL to automatically mount user home directories from an NFS server when users log in.

---

Automounting home directories over NFS allows users to log in to any machine in the network and access their home directory. This is a common setup in environments with centralized authentication (LDAP, Active Directory) where user accounts exist on multiple machines but home directories are stored on a single NFS server.

## Architecture

```bash
NFS Server: /export/home/alice, /export/home/bob, /export/home/carol
                    |
Client machines mount /home/username on demand via autofs
```

## Prerequisites

- NFS server exporting `/export/home/` with user home directories
- RHEL clients with autofs and nfs-utils installed
- Users created on all systems (or centralized via LDAP/SSSD)

## Step 1: Configure the NFS Server

On the NFS server, export the home directory tree:

```bash
sudo mkdir -p /export/home
```

Add to `/etc/exports`:

```bash
/export/home  192.168.1.0/24(rw,sync,no_subtree_check)
```

Apply:

```bash
sudo exportfs -ra
sudo systemctl enable --now nfs-server
```

Create user home directories:

```bash
sudo mkdir -p /export/home/alice
sudo mkdir -p /export/home/bob
sudo cp -r /etc/skel/. /export/home/alice/
sudo cp -r /etc/skel/. /export/home/bob/
sudo chown -R 1001:1001 /export/home/alice
sudo chown -R 1002:1002 /export/home/bob
```

## Step 2: Configure autofs on the Client

Install the required packages:

```bash
sudo dnf install -y autofs nfs-utils
```

### Master Map Entry

```bash
sudo tee /etc/auto.master.d/home.autofs << 'EOF'
/home /etc/auto.home
EOF
```

### Home Directory Map

Using a wildcard to handle any username:

```bash
sudo tee /etc/auto.home << 'EOF'
* -rw,soft,intr nfsserver:/export/home/&
EOF
```

The `*` matches any directory name under `/home/`, and `&` is replaced with the matched name. So when user `alice` accesses `/home/alice`, autofs mounts `nfsserver:/export/home/alice`.

## Step 3: Handle the Existing /home

If there are local home directories that should not be overridden, you have options:

### Option A: Move Local Home Directories

```bash
# Move local homes to the NFS server
sudo rsync -av /home/alice/ nfsserver:/export/home/alice/
sudo rsync -av /home/bob/ nfsserver:/export/home/bob/

# Remove local directories
sudo rm -rf /home/alice /home/bob
```

### Option B: Use a Different Mount Point

```bash
# Use /nhome instead of /home
sudo tee /etc/auto.master.d/home.autofs << 'EOF'
/nhome /etc/auto.home
EOF
```

Then update user records to use `/nhome/username` as their home directory.

## Step 4: Restart autofs

```bash
sudo systemctl restart autofs
```

## Step 5: Test

```bash
# Check that /home shows as autofs managed
mount | grep autofs

# Switch to a user
su - alice

# Verify the mount
df -h /home/alice
mount | grep /home/alice

# Check the home directory contents
pwd
ls -la
```

## SELinux Considerations

If SELinux is enforcing, enable the NFS home directory boolean:

```bash
sudo setsebool -P use_nfs_home_dirs on
```

Check for SELinux denials:

```bash
sudo ausearch -m avc -ts recent | grep home
```

## Integration with SSSD/LDAP

When using centralized authentication, SSSD can manage autofs maps from LDAP:

```bash
# In /etc/sssd/sssd.conf
[sssd]
services = nss, pam, autofs
domains = example.com

[domain/example.com]
autofs_provider = ldap
ldap_autofs_search_base = ou=autofs,dc=example,dc=com
```

With LDAP-managed maps, you do not need local map files. SSSD retrieves the mount information from LDAP.

## Handling Multiple NFS Servers

If home directories are spread across multiple servers:

```bash
# /etc/auto.home
alice   -rw,soft  nfsserver1:/export/home/alice
bob     -rw,soft  nfsserver2:/export/home/bob
carol   -rw,soft  nfsserver1:/export/home/carol
```

Or use LDAP maps for dynamic, per-user server assignment.

## Troubleshooting

### Mount Does Not Happen

```bash
# Check autofs is running
sudo systemctl status autofs

# Enable debug logging
sudo vi /etc/sysconfig/autofs
# Set: LOGGING="debug"
sudo systemctl restart autofs
sudo journalctl -u autofs -f
```

### Permission Denied

```bash
# Check NFS export permissions
showmount -e nfsserver

# Check user UID matches on server and client
id alice

# Check SELinux
sudo getsebool use_nfs_home_dirs
```

### Home Directory Not Found

```bash
# Verify the directory exists on the NFS server
ls -la /export/home/alice   # On the NFS server

# Check the autofs map
sudo automount -m
```

## Conclusion

Automounting home directories with autofs provides a seamless experience for users in multi-machine environments. The wildcard map (`* ... &`) handles any number of users without per-user configuration. Combined with LDAP/SSSD for authentication, this creates a fully centralized user environment where users can log in to any machine and find their home directory.
