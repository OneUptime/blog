# How to Manage SELinux File Contexts and Labels on RHEL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, SELinux, File Contexts, Security, Linux

Description: Learn how to view, set, and manage SELinux file contexts and labels on RHEL to ensure services can access the files they need.

---

## What Are SELinux File Contexts?

Every file and directory on an SELinux-enabled RHEL system has a security label (also called a context). This label determines which processes can read, write, or execute the file. When a file has the wrong context, the process trying to access it gets denied, even if traditional Unix permissions allow it.

A typical SELinux context looks like this:

```
system_u:object_r:httpd_sys_content_t:s0
```

The four parts are:
- **User** (system_u) - SELinux user
- **Role** (object_r) - SELinux role (always object_r for files)
- **Type** (httpd_sys_content_t) - The most important part, used for access decisions
- **Level** (s0) - MLS/MCS security level

The **type** field is what matters most. It determines which processes (domains) can access the file.

## Viewing File Contexts

### Using ls -Z

```bash
# Show SELinux context for files
ls -Z /var/www/html/

# Show context for a specific file
ls -Z /etc/httpd/conf/httpd.conf

# Show context for directories
ls -Zd /var/www/html/
```

Example output:

```
system_u:object_r:httpd_sys_content_t:s0 /var/www/html/index.html
```

### Using stat

```bash
# Detailed file information including SELinux context
stat /var/www/html/index.html
```

## Common File Context Types

| Context Type | Used For |
|---|---|
| httpd_sys_content_t | Web server read-only content |
| httpd_sys_rw_content_t | Web server writable content |
| samba_share_t | Samba shared files |
| nfs_t | NFS exported files |
| home_dir_t | User home directories |
| var_log_t | Log files |
| etc_t | Configuration files |
| tmp_t | Temporary files |
| user_home_t | Files in user home directories |

## Viewing the Default File Context Policy

The file context policy defines what context files should have based on their path:

```bash
# View all file context rules
sudo semanage fcontext -l

# Search for a specific path pattern
sudo semanage fcontext -l | grep "/var/www"

# View the default context for a specific path
matchpathcon /var/www/html/index.html
```

## Setting File Contexts

### Using chcon (Temporary)

`chcon` changes the context directly on the file. This change does NOT survive a relabel:

```bash
# Change the type of a file
sudo chcon -t httpd_sys_content_t /srv/mywebsite/index.html

# Change the type recursively
sudo chcon -R -t httpd_sys_content_t /srv/mywebsite/

# Copy context from a reference file
sudo chcon --reference=/var/www/html/index.html /srv/mywebsite/index.html
```

`chcon` is useful for quick testing, but always follow up with `semanage fcontext` for permanent changes.

### Using semanage fcontext (Permanent)

`semanage fcontext` modifies the file context policy. The actual files are not changed until you run `restorecon`:

```bash
# Add a permanent file context rule
sudo semanage fcontext -a -t httpd_sys_content_t "/srv/mywebsite(/.*)?"

# Apply the rule to the filesystem
sudo restorecon -Rv /srv/mywebsite/
```

The `-a` flag adds a new rule. The regex pattern `/srv/mywebsite(/.*)?` matches the directory and everything inside it.

### Modifying an Existing Rule

```bash
# Change an existing file context rule
sudo semanage fcontext -m -t httpd_sys_rw_content_t "/srv/mywebsite/uploads(/.*)?"

# Apply the change
sudo restorecon -Rv /srv/mywebsite/uploads/
```

### Deleting a Custom Rule

```bash
# Remove a custom file context rule
sudo semanage fcontext -d "/srv/mywebsite(/.*)?"

# Restore to the default context
sudo restorecon -Rv /srv/mywebsite/
```

## Context Inheritance

New files inherit the context of their parent directory. This is why setting the right context on directories is important:

```bash
# Create a file in /var/www/html - it gets httpd_sys_content_t automatically
sudo touch /var/www/html/newfile.html
ls -Z /var/www/html/newfile.html
```

But files moved with `mv` keep their original context:

```bash
# This file keeps its home directory context - Apache cannot read it
sudo mv ~/report.html /var/www/html/

# Fix it with restorecon
sudo restorecon -v /var/www/html/report.html
```

Files copied with `cp` get the context of the destination directory:

```bash
# This file gets the correct httpd_sys_content_t context
sudo cp ~/report.html /var/www/html/
```

## Workflow for Custom Web Content Directory

Here is the complete workflow for hosting web content in a non-standard location:

```bash
# 1. Create the directory
sudo mkdir -p /data/website

# 2. Add the file context rule
sudo semanage fcontext -a -t httpd_sys_content_t "/data/website(/.*)?"

# 3. Apply the rule
sudo restorecon -Rv /data/website/

# 4. Verify the context
ls -Zd /data/website/

# 5. Add content and verify
sudo cp /var/www/html/index.html /data/website/
ls -Z /data/website/
```

## Listing Custom File Context Rules

```bash
# Show only locally customized rules (not the full policy)
sudo semanage fcontext -l -C
```

This is useful to see what changes you have made versus the default policy.

## File Context Equivalency

Instead of creating individual rules, you can tell SELinux that one path should be treated the same as another:

```bash
# Make /data/website equivalent to /var/www
sudo semanage fcontext -a -e /var/www /data/website
sudo restorecon -Rv /data/website/
```

Now everything under `/data/website` gets the same contexts as the corresponding paths under `/var/www`.

## Troubleshooting Context Issues

```bash
# Check what context a file should have
matchpathcon /path/to/file

# Compare actual vs expected context
matchpathcon -V /path/to/file

# Find files with incorrect contexts
sudo restorecon -Rvn /path/to/check
```

The `-n` flag on `restorecon` does a dry run, showing what would change without actually changing anything.

## Wrapping Up

File contexts are the foundation of SELinux access control. When a service cannot read a file, the first thing to check is whether the file has the right SELinux type. Use `ls -Z` to check, `semanage fcontext` to set permanent rules, and `restorecon` to apply them. Avoid relying on `chcon` for anything beyond quick testing, since a relabel will undo your changes.
