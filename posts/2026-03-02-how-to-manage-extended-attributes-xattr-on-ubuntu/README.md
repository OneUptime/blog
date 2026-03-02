# How to Manage Extended Attributes (xattr) on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, File System, Linux, Security, System Administration

Description: Learn how to work with extended attributes (xattr) on Ubuntu to attach custom metadata to files, manage security labels, and understand how tools like SELinux and ACLs use xattrs under the hood.

---

Extended attributes (xattrs) are a way to attach arbitrary name-value pairs to files and directories beyond the standard metadata (permissions, timestamps, ownership). They're stored alongside the file in the filesystem and persist across renames and hard links to the same inode. You'll encounter them when working with ACLs, capabilities, security labels, and custom application metadata.

## Prerequisites and Filesystem Support

Extended attributes require filesystem support. On Ubuntu, ext4, XFS, and Btrfs all support xattrs by default. Verify your filesystem supports them:

```bash
# Check mount options
mount | grep " / "
# ext4 filesystems on Ubuntu mount with user_xattr support by default

# If xattrs are disabled, add user_xattr to /etc/fstab mount options
# UUID=xxxx  /  ext4  defaults,user_xattr  0  1
```

Install the xattr tools:

```bash
sudo apt install attr
```

This provides `getfattr`, `setfattr`, and the `attr` command.

## Namespace Prefixes

Extended attributes are organized into namespaces. The namespace determines who can read and write the attribute:

| Namespace | Prefix | Access |
|-----------|--------|--------|
| user | `user.` | Any user (subject to file permissions) |
| trusted | `trusted.` | Root only |
| security | `security.` | Used by security modules (SELinux, etc.) |
| system | `system.` | Kernel and system use (ACLs stored here) |

For user-defined metadata, always use the `user.` namespace.

## Setting Extended Attributes

```bash
# Set a user attribute on a file
setfattr -n user.comment -v "This file was reviewed on 2026-03-02" /etc/nginx/nginx.conf

# Set multiple attributes
setfattr -n user.author -v "alice" myfile.txt
setfattr -n user.project -v "webapp-v2" myfile.txt
setfattr -n user.reviewed -v "true" myfile.txt

# Set an attribute on a directory
setfattr -n user.environment -v "production" /var/www/html
```

## Reading Extended Attributes

```bash
# Get a specific attribute
getfattr -n user.comment /etc/nginx/nginx.conf
```

Output:

```
# file: etc/nginx/nginx.conf
user.comment="This file was reviewed on 2026-03-02"
```

```bash
# Get all user attributes
getfattr /etc/nginx/nginx.conf

# Get all attributes including trusted and security namespaces
getfattr -m ".*" /etc/nginx/nginx.conf

# Show value in hex dump format (useful for binary values)
getfattr -e hex -n user.comment /etc/nginx/nginx.conf

# Show attribute length instead of value
getfattr -e base64 -n user.comment /etc/nginx/nginx.conf
```

### Using attr command

The `attr` command provides an alternative interface:

```bash
# Get an attribute
attr -g comment /etc/nginx/nginx.conf

# Set an attribute
attr -s reviewed -V "2026-03-02" /etc/nginx/nginx.conf

# List all attributes
attr -l /etc/nginx/nginx.conf

# Remove an attribute
attr -r comment /etc/nginx/nginx.conf
```

## Removing Extended Attributes

```bash
# Remove a specific attribute
setfattr -x user.comment /etc/nginx/nginx.conf

# Verify removal
getfattr /etc/nginx/nginx.conf
```

## Recursive Operations

Extended attribute tools don't have a built-in recursive flag, so use find:

```bash
# Set an attribute on all files in a directory
find /var/www/html -type f -exec setfattr -n user.environment -v "production" {} \;

# Get attributes from all files in a directory
find /srv/project -type f -exec getfattr {} \;

# Remove an attribute from all files recursively
find /srv/project -type f -exec setfattr -x user.draft {} \;
```

## How ACLs Use Extended Attributes

ACLs (Access Control Lists) are stored as extended attributes in the `system.` namespace:

```bash
# Set an ACL on a file
sudo setfacl -m u:alice:rw /etc/myapp/config.yml

# Inspect the underlying xattr
sudo getfattr -n system.posix_acl_access /etc/myapp/config.yml
```

Output shows binary-encoded ACL data. The `getfacl` command decodes this into readable form. Understanding this connection explains why copying files without preserving xattrs loses ACL information.

## How Capabilities Use Extended Attributes

Linux capabilities (fine-grained privileges) are also stored as xattrs in the `security.` namespace:

```bash
# Give ping raw network access via capability
sudo setcap cap_net_raw+ep /usr/bin/ping

# This stores capability info as security.capability xattr
sudo getfattr -n security.capability /usr/bin/ping
# Returns binary data (the capability encoding)

# More readable via getcap
getcap /usr/bin/ping
# /usr/bin/ping cap_net_raw=ep
```

## Preserving Extended Attributes During Copy Operations

Standard `cp` does NOT preserve xattrs by default. Use the `--preserve=xattr` flag:

```bash
# Standard cp - loses xattrs
cp source.txt dest.txt

# Preserve xattrs
cp --preserve=xattr source.txt dest.txt

# Preserve all attributes including timestamps, permissions, xattrs
cp -a source.txt dest.txt
```

With `rsync`, add the `--xattrs` flag:

```bash
# Sync with xattr preservation
rsync -av --xattrs source/ destination/

# Full preservation including ACLs
rsync -av --xattrs --acls source/ destination/
```

With `tar`:

```bash
# Create archive preserving xattrs
tar --xattrs -czf backup.tar.gz /srv/project

# Extract with xattr preservation
tar --xattrs -xzf backup.tar.gz
```

## Practical Use Cases

### Marking files with custom metadata

```bash
# Tag configuration files with their last reviewer
setfattr -n user.reviewer -v "alice@company.com" /etc/nginx/nginx.conf
setfattr -n user.review-date -v "2026-03-02" /etc/nginx/nginx.conf
setfattr -n user.ticket -v "OPS-1234" /etc/nginx/nginx.conf
```

### Tracking file status in workflows

```bash
# Mark files as processed in an ETL pipeline
setfattr -n user.status -v "processed" /data/import/file001.csv
setfattr -n user.processed-at -v "2026-03-02T09:00:00Z" /data/import/file001.csv

# Find all unprocessed files
find /data/import -name "*.csv" | while read f; do
    status=$(getfattr -n user.status "$f" 2>/dev/null | grep -oP '(?<=")[^"]+')
    if [ "$status" != "processed" ]; then
        echo "Unprocessed: $f"
    fi
done
```

### Security context tagging

```bash
# Mark files that require encryption before transmission
setfattr -n user.classification -v "confidential" /srv/reports/q1-financials.pdf
setfattr -n user.requires-encryption -v "true" /srv/reports/q1-financials.pdf
```

## Limitations and Gotchas

**xattr data limits**: Individual xattrs are limited in size (typically 64KB for ext4, but in practice keep values small). The total xattr storage per file is also limited.

**Not all tools preserve xattrs**: Many text editors, build tools, and copy utilities strip xattrs. Always verify preservation when xattrs carry important data.

**Symlinks**: `getfattr` and `setfattr` follow symlinks by default and operate on the target. Use `-h` to operate on the symlink itself.

**Backup considerations**: Verify your backup tool supports xattr preservation. Many backup solutions need explicit configuration for this.

**Filesystem migrations**: When moving data between filesystems, confirm the destination supports xattrs and that the migration process preserves them.

Extended attributes are a flexible mechanism for attaching structured metadata to files without requiring a separate database or directory structure. They're already used extensively by the kernel's own security frameworks, and with the right tooling they're a practical way to maintain file-level metadata in your own applications.
