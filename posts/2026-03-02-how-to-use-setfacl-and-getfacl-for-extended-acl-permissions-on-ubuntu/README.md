# How to Use setfacl and getfacl for Extended ACL Permissions on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, File Permissions, ACL, Security, System Administration

Description: Master extended Access Control Lists (ACLs) on Ubuntu using setfacl and getfacl to grant precise file permissions beyond the standard owner/group/other model.

---

Standard Linux permissions operate on three principals: owner, group, and others. That works well when your access requirements are simple. But what if you need to give a specific user read access to a file owned by someone else, without making it world-readable and without adding that user to the file's group? That's exactly what ACLs solve.

Access Control Lists extend the standard permission model to support multiple named users and groups with individual permission entries on a single file or directory.

## Checking ACL Support

ACLs require filesystem support. ext4, XFS, and Btrfs all support ACLs natively on Ubuntu. Verify your filesystem supports ACLs:

```bash
# Check mount options for a filesystem
grep -E "acl|ext4|xfs" /proc/mounts

# On Ubuntu, ext4 filesystems mount with ACL support enabled by default
tune2fs -l /dev/sda1 | grep "Default mount options"
```

If ACL support is not listed, you can add it to `/etc/fstab`:

```text
UUID=xxxx-xxxx  /  ext4  defaults,acl  0  1
```

Install the ACL tools:

```bash
sudo apt install acl
```

## Reading ACLs with getfacl

`getfacl` displays the full ACL for a file or directory:

```bash
# View ACL for a specific file
getfacl /etc/some-config-file

# View ACL for a directory
getfacl /var/www/html
```

Example output for a file with no extra ACL entries:

```text
# file: some-config-file
# owner: root
# group: root
user::rw-
group::r--
other::r--
```

Example output after adding an ACL entry:

```text
# file: some-config-file
# owner: root
# group: root
user::rw-
user:alice:rw-
group::r--
mask::rw-
other::r--
```

The `mask` entry is important - it acts as a ceiling for all non-owner permissions. A user ACL entry of `rwx` combined with a mask of `rw-` results in effective permissions of `rw-`.

## Setting ACLs with setfacl

### Grant a specific user access

```bash
# Grant user 'alice' read access to a file
sudo setfacl -m u:alice:r /etc/app-config

# Grant user 'bob' read/write access
sudo setfacl -m u:bob:rw /var/log/app.log

# Grant execute permission in addition to read
sudo setfacl -m u:charlie:rx /usr/local/scripts/deploy.sh
```

The `-m` flag means "modify" - it adds or updates entries without removing existing ones.

### Grant a specific group access

```bash
# Grant the 'devteam' group read access to a directory
sudo setfacl -m g:devteam:r /srv/project

# Grant read/write/execute to a group on a directory
sudo setfacl -m g:webdevs:rwx /var/www/html
```

### Set default ACLs for directories

Default ACLs are inherited by newly created files and subdirectories within the directory. This is the feature that makes ACLs really powerful for shared directories:

```bash
# Set default ACL so new files in /srv/shared are readable by 'auditors' group
sudo setfacl -m d:g:auditors:r /srv/shared

# Combined: set both the directory ACL and the default ACL
sudo setfacl -m g:auditors:rx,d:g:auditors:rx /srv/shared
```

The `d:` prefix marks the entry as a default ACL.

### Recursive ACL application

Apply ACLs to a directory and all its contents:

```bash
# Apply ACL recursively to all existing files and directories
sudo setfacl -R -m u:alice:rX /srv/project
```

Note the uppercase `X` - it means "execute only if the file is a directory or already has execute permission for someone." This prevents adding execute permission to regular files that shouldn't be executable, while still setting it on directories (needed to traverse them).

## Removing ACL Entries

### Remove a specific entry

```bash
# Remove alice's ACL entry from a file
sudo setfacl -x u:alice /etc/app-config

# Remove the devteam group entry
sudo setfacl -x g:devteam /srv/project
```

### Remove all ACL entries

```bash
# Remove all extended ACL entries (reset to standard permissions)
sudo setfacl -b /etc/app-config

# Remove all default ACLs from a directory
sudo setfacl -k /srv/shared
```

## Practical Example: Shared Project Directory

A common scenario: a web project owned by the `www-data` user, with a deployment pipeline user needing write access and an auditor needing read access, without changing ownership.

```bash
# Create the project directory
sudo mkdir -p /srv/webapp

# Set primary ownership
sudo chown www-data:www-data /srv/webapp
sudo chmod 750 /srv/webapp

# Give the deploy user write access
sudo setfacl -m u:deploy:rwx /srv/webapp
sudo setfacl -m d:u:deploy:rwx /srv/webapp

# Give the auditor group read access
sudo setfacl -m g:auditors:rx /srv/webapp
sudo setfacl -m d:g:auditors:rx /srv/webapp

# Verify
getfacl /srv/webapp
```

Output:

```text
# file: webapp
# owner: www-data
# group: www-data
user::rwx
user:deploy:rwx
group::r-x
group:auditors:r-x
mask::rwx
other::---
default:user::rwx
default:user:deploy:rwx
default:group::r-x
default:group:auditors:r-x
default:mask::rwx
default:other::---
```

## Copying ACLs Between Files

```bash
# Copy ACLs from one file to another
getfacl source-file | setfacl --set-file=- destination-file

# Apply ACLs from a file to multiple targets
getfacl template-dir | setfacl -R --set-file=- /srv/new-project
```

## Saving and Restoring ACLs

Useful for backups or migrating configurations:

```bash
# Save ACLs for an entire directory tree
getfacl -R /srv/project > /backup/project-acls.txt

# Restore from backup
setfacl --restore=/backup/project-acls.txt
```

## The ACL Mask

The mask limits the maximum permissions that any named user or group ACL can have. It's automatically updated when you add ACL entries, but you can set it explicitly:

```bash
# Restrict all ACL entries to read-only regardless of what they specify
sudo setfacl -m m:r /srv/shared

# Reset mask to match the most permissive ACL entry
sudo setfacl -m m:rwx /srv/shared
```

Check the effective permissions (what mask allows) in getfacl output - they appear as a comment after the entry:

```text
user:alice:rwx        #effective:r--
```

This means alice has `rwx` in her ACL entry, but the mask is `r--`, so her effective access is only `r--`.

## Detecting Files with ACLs

When you list files with `ls -la`, a `+` sign at the end of the permissions string indicates the file has extended ACLs:

```bash
ls -la /srv/webapp
# drwxr-x---+ 3 www-data www-data 4096 Mar  2 10:00 webapp
# The + at the end means extended ACLs are set
```

To find all files with ACLs in a directory:

```bash
# Find files that have extended ACLs
sudo find /srv -xdev -exec getfacl {} \; 2>/dev/null | grep -B5 "^user:.*:"
```

ACLs are indispensable when the standard Unix permission model's three-level hierarchy isn't granular enough for your access requirements. The combination of `setfacl` and `getfacl` gives you precise, auditable control over who can access what without resorting to adding users to groups they don't belong in.
