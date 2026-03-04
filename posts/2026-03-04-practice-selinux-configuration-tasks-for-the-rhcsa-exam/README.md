# How to Practice SELinux Configuration Tasks for the RHCSA Exam

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, RHCSA, SELinux, Security, Certification

Description: Practice the SELinux tasks required for the RHCSA exam, including checking modes, setting file contexts, managing booleans, and troubleshooting denials.

---

SELinux is always tested on the RHCSA exam. You need to be comfortable changing modes, managing contexts, toggling booleans, and reading audit logs.

## Check and Change SELinux Modes

```bash
# Check the current mode
getenforce
# Output: Enforcing, Permissive, or Disabled

# Temporarily switch to permissive (does not survive reboot)
sudo setenforce 0

# Switch back to enforcing
sudo setenforce 1

# Make the change persistent by editing the config
sudo vi /etc/selinux/config
# Set SELINUX=enforcing
```

## View and Manage File Contexts

```bash
# View the SELinux context of a file
ls -Z /var/www/html/

# View the context of a process
ps -eZ | grep httpd

# Change the context of a file temporarily
sudo chcon -t httpd_sys_content_t /srv/webdata/index.html

# Set the default context permanently using semanage
sudo semanage fcontext -a -t httpd_sys_content_t "/srv/webdata(/.*)?"

# Apply the saved context rules to the filesystem
sudo restorecon -Rv /srv/webdata/
```

## Manage SELinux Booleans

```bash
# List all booleans (filtered)
getsebool -a | grep httpd

# Enable a boolean temporarily
sudo setsebool httpd_enable_homedirs on

# Enable a boolean persistently (survives reboot)
sudo setsebool -P httpd_enable_homedirs on

# Check a specific boolean
getsebool httpd_enable_homedirs
```

## Troubleshoot SELinux Denials

```bash
# Install the troubleshooting tools
sudo dnf install -y setroubleshoot-server

# Check the audit log for denials
sudo ausearch -m avc --start recent

# Use sealert for human-readable analysis
sudo sealert -a /var/log/audit/audit.log | head -50

# Quick check of recent denials
sudo grep "denied" /var/log/audit/audit.log | tail -5
```

## Common Exam Scenario: Non-Standard Web Root

A typical exam task is to serve content from a non-standard directory:

```bash
# Create the directory and content
sudo mkdir -p /custom/www
echo "Hello" | sudo tee /custom/www/index.html

# Set the correct SELinux context
sudo semanage fcontext -a -t httpd_sys_content_t "/custom/www(/.*)?"
sudo restorecon -Rv /custom/www/

# Verify
ls -Z /custom/www/
# Should show httpd_sys_content_t
```

Always use `semanage fcontext` followed by `restorecon` for persistent changes. Using `chcon` alone is not persistent and will be lost after a relabel.
