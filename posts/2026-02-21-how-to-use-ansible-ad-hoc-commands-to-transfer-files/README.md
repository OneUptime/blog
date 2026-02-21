# How to Use Ansible Ad Hoc Commands to Transfer Files

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, Ad Hoc Commands, File Transfer, Synchronize

Description: Learn all the ways to transfer files between your Ansible controller and remote hosts using ad hoc commands with copy, fetch, and synchronize modules.

---

File transfer is a core part of infrastructure management. You need to push configuration files, distribute scripts, deploy application artifacts, pull back logs for analysis, and synchronize directories. Ansible provides several modules for file transfer, each optimized for different scenarios. Knowing which one to use and when makes your operations faster and more reliable.

## Pushing Files to Remote Hosts

### The copy Module

The `copy` module transfers files from the Ansible controller to remote hosts. It handles checksums, permissions, ownership, and backups.

```bash
# Push a single file
ansible webservers -m copy -a "src=./nginx.conf dest=/etc/nginx/nginx.conf owner=root group=root mode=0644" --become

# Push a file with backup of the original
ansible webservers -m copy -a "src=./nginx.conf dest=/etc/nginx/nginx.conf backup=yes" --become

# Write content directly (no source file needed)
ansible all -m copy -a "content='ENVIRONMENT=production\nDEBUG=false\n' dest=/etc/app/environment mode=0644" --become
```

The copy module calculates an MD5 checksum of the file and only transfers it if the remote file differs. This makes it safe to run repeatedly without unnecessary transfers.

### The template Module

For files that need variable substitution, use the `template` module:

```bash
# Push a Jinja2 template that gets rendered on the controller
ansible webservers -m template -a "src=./nginx.conf.j2 dest=/etc/nginx/nginx.conf owner=root group=root mode=0644" --become
```

The template module renders the Jinja2 template on the controller using available variables, then transfers the rendered output to the remote hosts.

### The synchronize Module

For large files, directories, or when you need rsync features, the `synchronize` module is significantly faster than `copy`:

```bash
# Sync a directory to remote hosts
ansible webservers -m synchronize -a "src=./webroot/ dest=/var/www/html/"

# Sync with compression (faster over slow links)
ansible webservers -m synchronize -a "src=./webroot/ dest=/var/www/html/ compress=yes"

# Sync and delete files on remote that do not exist locally
ansible webservers -m synchronize -a "src=./webroot/ dest=/var/www/html/ delete=yes"

# Sync with specific rsync options
ansible webservers -m synchronize -a "src=./app/ dest=/opt/app/ rsync_opts='--exclude=.git,--exclude=node_modules'"
```

The synchronize module wraps rsync, which transfers only the differences between files. For large directories where only a few files changed, this is orders of magnitude faster than the copy module.

## Pulling Files from Remote Hosts

### The fetch Module

The `fetch` module copies files from remote hosts back to the controller:

```bash
# Fetch a file from all web servers (preserves directory structure per host)
ansible webservers -m fetch -a "src=/var/log/nginx/error.log dest=./logs/"

# This creates:
# ./logs/web1/var/log/nginx/error.log
# ./logs/web2/var/log/nginx/error.log

# Fetch with a flat structure (for single host)
ansible web1.example.com -m fetch -a "src=/etc/nginx/nginx.conf dest=./configs/web1_nginx.conf flat=yes"

# Fetch from all hosts with flat naming
ansible all -m fetch -a "src=/etc/hostname dest=./hostnames/{{ inventory_hostname }}_hostname flat=yes"
```

The directory structure created by `fetch` (without `flat=yes`) prevents filename collisions when fetching the same file from multiple hosts.

### Using synchronize in Pull Mode

```bash
# Pull a directory from a remote host to the controller
ansible web1.example.com -m synchronize -a "src=/var/log/nginx/ dest=./logs/web1/ mode=pull"

# Pull with compression
ansible web1.example.com -m synchronize -a "src=/var/log/app/ dest=./logs/web1/app/ mode=pull compress=yes"
```

## Performance Comparison

The choice of module affects transfer speed significantly:

```bash
# copy module: good for small files, calculates full checksums
# Best for: config files, scripts, certificates
ansible all -m copy -a "src=./config.yml dest=/etc/app/config.yml"

# synchronize module: great for large files and directories
# Best for: application deployments, large assets, directory syncs
ansible all -m synchronize -a "src=./deploy/ dest=/opt/app/"

# For very large single files, synchronize is much faster because
# rsync can resume interrupted transfers and only send changed blocks
ansible all -m synchronize -a "src=./database_dump.sql.gz dest=/tmp/"
```

## Transferring Between Remote Hosts

Sometimes you need to transfer files between two remote hosts without going through the controller:

```bash
# Use the synchronize module with delegate_to
# This requires SSH access between the remote hosts
ansible web2.example.com -m synchronize -a "src=/var/www/html/ dest=/var/www/html/" -e "delegate_to=web1.example.com"

# Alternative: fetch to controller, then push to destination
ansible web1.example.com -m fetch -a "src=/etc/app/config.yml dest=/tmp/config.yml flat=yes"
ansible web2.example.com -m copy -a "src=/tmp/config.yml dest=/etc/app/config.yml" --become
```

## Handling Large Transfers

For transferring large files across many hosts:

```bash
# Use compression to speed up transfers over WAN links
ansible all -m synchronize -a "src=./large_artifact.tar.gz dest=/opt/releases/ compress=yes" -f 10

# Bandwidth limiting (in KB/s)
ansible all -m synchronize -a "src=./large_artifact.tar.gz dest=/opt/releases/ rsync_opts='--bwlimit=5000'"

# For very large files, consider splitting and transferring in parallel
# First, split the file locally
# split -b 100M large_file.tar.gz chunk_
# Then transfer all chunks
ansible all -m synchronize -a "src=./chunks/ dest=/tmp/chunks/" -f 20
# Reassemble on remote hosts
ansible all -m shell -a "cat /tmp/chunks/chunk_* > /tmp/large_file.tar.gz"
```

## File Transfer with Validation

Ensure transferred files are correct before they go live:

```bash
# Copy with validation (validate the file before finalizing)
ansible webservers -m copy -a "src=./nginx.conf dest=/etc/nginx/nginx.conf validate='nginx -t -c %s' backup=yes" --become

# Copy a sudoers file with syntax checking
ansible all -m copy -a "src=./sudoers dest=/etc/sudoers validate='visudo -cf %s'" --become

# Transfer and verify checksum
ansible all -m copy -a "src=./critical_binary dest=/usr/local/bin/myapp mode=0755" --become
ansible all -m shell -a "sha256sum /usr/local/bin/myapp"
```

## Practical Workflows

### Deploying an Application Update

```bash
# Transfer the new release
ansible appservers -m synchronize -a "src=./releases/v2.5.0/ dest=/opt/app/releases/v2.5.0/" -f 10

# Update the symlink
ansible appservers -m file -a "src=/opt/app/releases/v2.5.0 dest=/opt/app/current state=link" --become

# Restart the application
ansible appservers -m service -a "name=myapp state=restarted" --become -f 1
```

### Collecting Logs for Analysis

```bash
# Fetch the last hour of logs from all servers
ansible all -m shell -a "journalctl --since '1 hour ago' > /tmp/recent_logs.txt"
ansible all -m fetch -a "src=/tmp/recent_logs.txt dest=./incident_logs/"
ansible all -m file -a "path=/tmp/recent_logs.txt state=absent"
```

### Distributing SSL Certificates

```bash
# Transfer certificate and key with proper permissions
ansible webservers -m copy -a "src=./ssl/server.crt dest=/etc/ssl/certs/server.crt owner=root group=root mode=0644" --become
ansible webservers -m copy -a "src=./ssl/server.key dest=/etc/ssl/private/server.key owner=root group=root mode=0600" --become

# Reload the web server to pick up new certs
ansible webservers -m service -a "name=nginx state=reloaded" --become
```

## Transfer Security

Keep transfers secure:

```bash
# All Ansible transfers are encrypted via SSH by default
# For additional security, verify checksums after transfer
ansible all -m copy -a "src=./important_file dest=/opt/important_file"
ansible all -m shell -a "sha256sum /opt/important_file" --one-line

# Check against local checksum
sha256sum ./important_file
```

## Common Pitfalls

```bash
# PITFALL: trailing slash matters with synchronize
# With trailing slash: copies CONTENTS of src into dest
ansible all -m synchronize -a "src=./mydir/ dest=/opt/mydir/"
# Result: /opt/mydir/file1, /opt/mydir/file2

# Without trailing slash: copies the DIRECTORY into dest
ansible all -m synchronize -a "src=./mydir dest=/opt/"
# Result: /opt/mydir/file1, /opt/mydir/file2

# PITFALL: copy module is slow for large directories
# Use synchronize instead
ansible all -m synchronize -a "src=./large_dir/ dest=/opt/large_dir/"

# PITFALL: fetch without flat creates deep directory trees
# Use flat=yes for cleaner local organization
ansible all -m fetch -a "src=/etc/hostname dest=./hostnames/{{ inventory_hostname }} flat=yes"
```

## Summary

Ansible provides three main modules for file transfer: `copy` for pushing small files with full permission control and validation, `fetch` for pulling files from remote hosts to the controller, and `synchronize` for efficient large-scale transfers using rsync. Choose `copy` for config files and scripts where you need validation and backup features. Choose `synchronize` for application deployments and large directories where speed matters. Choose `fetch` for pulling logs and diagnostic data back for analysis. All transfers are encrypted over SSH by default, and checksum verification ensures data integrity.
