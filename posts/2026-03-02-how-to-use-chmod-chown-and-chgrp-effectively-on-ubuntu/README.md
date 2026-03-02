# How to Use chmod, chown, and chgrp Effectively on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, File Permissions, System Administration, Linux, Security

Description: A practical guide to chmod, chown, and chgrp on Ubuntu, covering octal and symbolic modes, recursive changes, and real-world usage patterns for managing file ownership and permissions.

---

Three commands handle the bulk of permission management on Linux: `chmod` sets permission bits, `chown` changes file ownership, and `chgrp` changes the group. You'll use these constantly when setting up web servers, configuring services, or managing shared directories. This covers their full syntax and the patterns that come up most often in practice.

## chmod - Change File Mode Bits

`chmod` accepts permissions in two formats: octal notation (numbers) and symbolic notation (letters).

### Octal notation

```bash
# Set specific permissions directly
chmod 644 filename      # rw-r--r--
chmod 755 dirname       # rwxr-xr-x (standard directory or executable)
chmod 600 ~/.ssh/id_rsa # rw------- (private key)
chmod 700 ~/.ssh        # rwx------ (SSH directory)
chmod 750 /etc/app      # rwxr-x--- (owner full, group read/exec, others nothing)
```

### Symbolic notation

Symbolic mode uses letters to add (`+`), remove (`-`), or set (`=`) permissions:

```bash
# Add execute permission for the owner
chmod u+x script.sh

# Remove write permission from group and others
chmod go-w sensitive-file

# Set exact permissions: owner read/write, group read, others nothing
chmod u=rw,g=r,o= myfile

# Add execute to everyone
chmod +x script.sh   # equivalent to a+x (all)

# Remove all permissions for others
chmod o-rwx privatedir
```

### Recursive changes with -R

Apply changes to a directory and everything inside it:

```bash
# Set all files and directories under /var/www to owned by www-data
chmod -R 755 /var/www/html

# CAUTION: -R sets the same permissions on both files and directories
# Files generally shouldn't have execute bits; directories need them
```

The problem with `chmod -R 755` on a web directory is that it makes every file executable (755), when files should usually be 644 and directories 755. Use `find` to handle them separately:

```bash
# Set directories to 755 and files to 644
find /var/www/html -type d -exec chmod 755 {} \;
find /var/www/html -type f -exec chmod 644 {} \;
```

### The capital X trick

The uppercase `X` applies execute permission only to directories and files that already have execute set for any user:

```bash
# This is equivalent to the find approach above, more concisely
chmod -R u=rwX,g=rX,o=rX /var/www/html
```

`X` makes execute apply to directories (so they can be traversed) but not regular files (unless they were already executable).

### Reference mode

Copy permissions from one file to another:

```bash
# Set permissions of newfile to match existingfile
chmod --reference=existingfile newfile
```

## chown - Change File Owner and Group

`chown` can change just the owner, just the group, or both at once.

```bash
# Change owner only
sudo chown alice filename

# Change owner and group
sudo chown alice:developers filename

# Change group only (using chown syntax with empty owner)
sudo chown :developers filename
```

Only root can change a file's owner. Users can change the group only to a group they belong to.

### Recursive ownership changes

```bash
# Change everything under /home/alice to be owned by alice
sudo chown -R alice:alice /home/alice

# Change a web directory to be owned by www-data
sudo chown -R www-data:www-data /var/www/html
```

### Useful chown patterns

```bash
# Change ownership to match another file's ownership
sudo chown --reference=/etc/nginx/nginx.conf /etc/nginx/conf.d/mysite.conf

# Change only files that match a certain pattern
sudo find /srv/project -name "*.conf" -exec chown deploy:deploy {} \;

# Change ownership without following symlinks
sudo chown --no-dereference alice symlink-name
```

## chgrp - Change Group Ownership

`chgrp` does what `chown :group` does, but with slightly cleaner syntax when you only want to change the group:

```bash
# Change group of a file
chgrp developers filename

# Change group recursively
sudo chgrp -R webteam /var/www/html

# Change group to match another file
sudo chgrp --reference=/var/www/html /var/www/staging
```

In practice, many admins use `chown user:group` for everything and rarely touch `chgrp` directly, but it's worth knowing.

## Real-World Scenarios

### Setting up a web application directory

```bash
# Application owned by deploy user, served by www-data
sudo mkdir -p /var/www/myapp
sudo chown deploy:www-data /var/www/myapp

# Directories traversable by both; files readable by www-data
find /var/www/myapp -type d -exec chmod 750 {} \;
find /var/www/myapp -type f -exec chmod 640 {} \;

# Scripts need to be executable
chmod 750 /var/www/myapp/deploy.sh
```

### Setting up a shared team directory

```bash
# Create group
sudo groupadd devteam
sudo usermod -aG devteam alice
sudo usermod -aG devteam bob

# Create shared directory
sudo mkdir /srv/devteam
sudo chown root:devteam /srv/devteam
sudo chmod 2775 /srv/devteam
# 2775 = setgid bit + rwxrwxr-x
# setgid ensures new files inherit the devteam group
```

### Locking down configuration files

```bash
# Config files should be readable but not writable by others
sudo chown root:root /etc/myapp/
sudo chmod 755 /etc/myapp/
sudo chown root:root /etc/myapp/config.yml
sudo chmod 644 /etc/myapp/config.yml

# Secret files (database passwords, API keys)
sudo chown root:myapp /etc/myapp/secrets.yml
sudo chmod 640 /etc/myapp/secrets.yml
# Only root and members of myapp group can read
```

### Deployment script permissions

```bash
# Script should be executable by the deploy user only
sudo chown deploy:deploy /usr/local/bin/deploy.sh
sudo chmod 700 /usr/local/bin/deploy.sh

# Or executable by a deploy group
sudo chown root:deployers /usr/local/bin/deploy.sh
sudo chmod 750 /usr/local/bin/deploy.sh
```

## Common Mistakes

**Using -R on /var/www without distinguishing files from directories**: Sets execute bit on all files, which is a security risk and unnecessary.

**chown -R on a directory with symlinks**: By default, chown follows symlinks when used recursively. If a symlink in your directory points to a file outside the directory, chown will change that file's ownership too. Use `--no-dereference` if the directory contains symlinks to external locations.

**Forgetting to set group correctly**: Setting permissions but leaving the group as root when a service user needs access is a common oversight. Always check both ownership and permissions together.

```bash
# Quick audit: check owner, group, and permissions together
ls -lan /srv/myapp/
# The -n flag shows numeric UIDs and GIDs which can be easier to spot mismatches
```

These three commands are used more frequently than almost any others in day-to-day system administration. Getting comfortable with symbolic notation for chmod and understanding the `find -exec` pattern for applying changes selectively makes permission management much less error-prone.
