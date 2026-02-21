# How to Use Ansible Ad Hoc Commands to Copy Files

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, Ad Hoc Commands, File Management, Copy Module

Description: Learn how to use Ansible ad hoc commands to copy files and directories to remote hosts, set permissions, create backups, and transfer content efficiently.

---

Copying files to remote servers is one of the most frequent tasks in infrastructure management. Whether you need to push a configuration file, deploy a script, or distribute certificates, Ansible's `copy` module handles it with a single command. No playbook needed. Let me show you how to use ad hoc commands for file operations effectively.

## Basic File Copy

The simplest form copies a file from the Ansible controller to the remote hosts:

```bash
# Copy a local file to all web servers
ansible webservers -m copy -a "src=./nginx.conf dest=/etc/nginx/nginx.conf"
```

This copies `nginx.conf` from the current directory on your controller to `/etc/nginx/nginx.conf` on every host in the `webservers` group.

Output on success:

```
web1 | CHANGED => {
    "changed": true,
    "checksum": "a4b5c6d7e8f9...",
    "dest": "/etc/nginx/nginx.conf",
    "gid": 0,
    "group": "root",
    "md5sum": "1234567890ab...",
    "mode": "0644",
    "owner": "root",
    "size": 2458,
    "src": "/home/deploy/.ansible/tmp/...",
    "state": "file",
    "uid": 0
}
```

## Setting File Permissions

You should almost always set explicit permissions when copying files:

```bash
# Copy with specific owner, group, and mode
ansible webservers -m copy -a "src=./app.conf dest=/etc/app/app.conf owner=www-data group=www-data mode=0644" --become

# Copy an executable script with execute permissions
ansible all -m copy -a "src=./deploy.sh dest=/usr/local/bin/deploy.sh mode=0755" --become

# Copy a private key with restricted permissions
ansible all -m copy -a "src=./ssl/server.key dest=/etc/ssl/private/server.key owner=root group=root mode=0600" --become
```

The `--become` flag is needed when the destination requires root permissions. Without it, the copy runs as the SSH user, which may not have write access to system directories.

## Copying Content Directly

Instead of copying from a file, you can write content directly using the `content` parameter:

```bash
# Write a string directly to a file on remote hosts
ansible webservers -m copy -a "content='server_name example.com;\nlisten 80;\n' dest=/etc/nginx/conf.d/server_name.conf" --become

# Create a simple configuration file
ansible databases -m copy -a "content='[mysqld]\nmax_connections=500\ninnodb_buffer_pool_size=4G\n' dest=/etc/mysql/conf.d/custom.cnf" --become

# Write a JSON configuration
ansible all -m copy -a 'content={\"log_level\": \"info\", \"port\": 8080} dest=/etc/app/config.json mode=0644'
```

This is perfect for small configuration snippets where creating a separate source file would be overkill.

## Creating Backup Copies

Before overwriting an existing file, create a backup:

```bash
# Copy file and create a timestamped backup of the original
ansible webservers -m copy -a "src=./nginx.conf dest=/etc/nginx/nginx.conf backup=yes" --become
```

When `backup=yes` is set and the destination file already exists and differs from the source, Ansible creates a backup file like `/etc/nginx/nginx.conf.2026-02-21@14:30:45~` before writing the new content.

## Copying Directories

The copy module handles directories too. When the `src` path ends with `/`, it copies the contents of the directory. Without the trailing slash, it copies the directory itself.

```bash
# Copy the contents of configs/ into /etc/app/ (no extra directory level)
ansible webservers -m copy -a "src=./configs/ dest=/etc/app/" --become

# Copy the configs directory itself into /opt/ (creates /opt/configs/)
ansible webservers -m copy -a "src=./configs dest=/opt/" --become
```

## Check Mode (Dry Run)

Before pushing files to production, test what would happen:

```bash
# Dry run: show what would change without actually changing anything
ansible webservers -m copy -a "src=./nginx.conf dest=/etc/nginx/nginx.conf" --check --diff --become
```

The `--check` flag prevents any changes, and `--diff` shows you the content differences between the current file and what you are about to push. This is critical for production environments.

## Validating Before Deployment

Some files need to be validated before the copy is finalized. The `validate` parameter runs a command on the remote host with the new file, and the copy only completes if the command succeeds:

```bash
# Copy nginx config and validate it before finalizing
ansible webservers -m copy -a "src=./nginx.conf dest=/etc/nginx/nginx.conf validate='nginx -t -c %s' backup=yes" --become

# Copy sudoers file with validation
ansible all -m copy -a "src=./sudoers dest=/etc/sudoers validate='visudo -cf %s'" --become
```

The `%s` is replaced with the path to the temporary file. If validation fails, the original file is left untouched.

## Using the Fetch Module for Reverse Copy

To copy files from remote hosts back to the controller, use the `fetch` module:

```bash
# Fetch log files from all web servers
ansible webservers -m fetch -a "src=/var/log/nginx/error.log dest=./logs/ flat=no"

# This creates:
# ./logs/web1/var/log/nginx/error.log
# ./logs/web2/var/log/nginx/error.log

# Fetch with flat structure (good for single hosts)
ansible web1.example.com -m fetch -a "src=/etc/nginx/nginx.conf dest=./web1_nginx.conf flat=yes"
```

The `flat=no` (default) preserves the directory structure and separates files by hostname, which prevents overwriting when fetching the same file from multiple hosts.

## Synchronizing Files with synchronize Module

For larger file transfers or directory synchronization, the `synchronize` module (which wraps rsync) is more efficient:

```bash
# Sync a directory to remote hosts (uses rsync under the hood)
ansible webservers -m synchronize -a "src=./webroot/ dest=/var/www/html/"

# Sync with delete (remove files on dest that are not in src)
ansible webservers -m synchronize -a "src=./webroot/ dest=/var/www/html/ delete=yes"

# Sync in pull mode (remote to local)
ansible webservers -m synchronize -a "src=/var/log/app/ dest=./logs/{{ inventory_hostname }}/ mode=pull"
```

## Practical Workflow: Deploying a Configuration Update

Here is a realistic workflow for pushing a configuration update:

```bash
# Step 1: Check current state of the config file
ansible webservers -m shell -a "cat /etc/nginx/nginx.conf | head -5"

# Step 2: Dry run the copy with diff to see changes
ansible webservers -m copy -a "src=./nginx.conf dest=/etc/nginx/nginx.conf" --check --diff --become

# Step 3: Copy with backup and validation
ansible webservers -m copy -a "src=./nginx.conf dest=/etc/nginx/nginx.conf backup=yes validate='nginx -t -c %s'" --become

# Step 4: Reload nginx to apply changes
ansible webservers -m service -a "name=nginx state=reloaded" --become

# Step 5: Verify nginx is running
ansible webservers -m shell -a "systemctl status nginx | head -5"
```

## Performance Considerations

When copying large files or distributing to many hosts, keep these tips in mind:

```bash
# Increase parallelism for large fleets
ansible all -m copy -a "src=./large_file.tar.gz dest=/tmp/large_file.tar.gz" -f 20

# For very large files, use synchronize instead of copy
# synchronize uses rsync which is much more efficient for large transfers
ansible all -m synchronize -a "src=./large_file.tar.gz dest=/tmp/large_file.tar.gz"

# For files that already exist and may not have changed, copy module
# checks the checksum and skips unchanged files automatically
ansible all -m copy -a "src=./config.yml dest=/etc/app/config.yml"
# Output shows "changed": false if the file is already identical
```

## Common Pitfalls

A few things to watch out for when copying files with ad hoc commands:

```bash
# WRONG: Forgetting --become for system directories
ansible all -m copy -a "src=./config dest=/etc/app/config"
# Results in "Permission denied" errors

# RIGHT: Use --become for system directories
ansible all -m copy -a "src=./config dest=/etc/app/config" --become

# WRONG: Using ~ for home directory in dest (may not expand correctly)
ansible all -m copy -a "src=./script.sh dest=~/script.sh"

# RIGHT: Use the full path or the HOME variable
ansible all -m copy -a "src=./script.sh dest=/home/deploy/script.sh"
```

## Summary

The Ansible `copy` module via ad hoc commands is the fastest way to distribute files across your infrastructure. Use `src` and `dest` for file-based copies, `content` for inline text, `backup=yes` for safety, `validate` for config file verification, and `--check --diff` for dry runs. For reverse copies use `fetch`, and for large-scale synchronization use `synchronize`. These tools cover nearly every file distribution scenario you will encounter in daily operations.
