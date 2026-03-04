# How to Secure a WordPress Installation with SELinux on RHEL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, WordPress, SELinux, Security, Apache, Linux

Description: Harden your WordPress installation on RHEL using SELinux contexts and booleans to restrict file access and network operations to only what WordPress needs.

---

SELinux adds a mandatory access control layer that limits what the web server process can do, even if WordPress is compromised. This guide shows how to properly configure SELinux for WordPress on RHEL.

## Verify SELinux is Enforcing

```bash
# Check SELinux status
getenforce
# Should return: Enforcing

# If not, enable it
sudo setenforce 1
# Make persistent in /etc/selinux/config: SELINUX=enforcing
```

## Set File Contexts for WordPress

```bash
# Set the base context for WordPress files (read-only by httpd)
sudo semanage fcontext -a -t httpd_sys_content_t "/var/www/html(/.*)?"

# Allow httpd to write to wp-content (uploads, cache, plugins, themes)
sudo semanage fcontext -a -t httpd_sys_rw_content_t "/var/www/html/wp-content(/.*)?"

# Allow writing to wp-config.php during setup only
# After setup, change back to httpd_sys_content_t
sudo semanage fcontext -a -t httpd_sys_rw_content_t "/var/www/html/wp-config.php"

# Apply the contexts
sudo restorecon -Rv /var/www/html/
```

## Configure SELinux Booleans

```bash
# Allow Apache to connect to the database
sudo setsebool -P httpd_can_network_connect_db 1

# Allow Apache to send emails (for wp_mail)
sudo setsebool -P httpd_can_sendmail 1

# Allow Apache to make outgoing connections (for updates, API calls)
sudo setsebool -P httpd_can_network_connect 1

# List all httpd-related booleans
getsebool -a | grep httpd
```

## Lock Down wp-config.php After Setup

```bash
# After WordPress is configured, make wp-config.php read-only
sudo semanage fcontext -m -t httpd_sys_content_t "/var/www/html/wp-config.php"
sudo restorecon -v /var/www/html/wp-config.php

# Verify the context
ls -Z /var/www/html/wp-config.php
# Should show: httpd_sys_content_t
```

## Troubleshoot SELinux Denials

```bash
# Install troubleshooting tools
sudo dnf install -y setroubleshoot-server

# Check the audit log for denials
sudo ausearch -m AVC -ts recent

# Generate a human-readable report
sudo sealert -a /var/log/audit/audit.log | head -50

# If you find a legitimate denial, create a custom policy module
sudo ausearch -m AVC -ts recent | audit2allow -M wordpress_custom
sudo semodule -i wordpress_custom.pp
```

## Test Your Configuration

```bash
# Verify WordPress can upload files
# Go to Media > Add New in the WordPress admin

# Verify WordPress can install plugins
# Go to Plugins > Add New

# Check for any new SELinux denials after testing
sudo ausearch -m AVC -ts recent --comm httpd
```

## Recommended Practice

Keep these directories read-only via SELinux:
- WordPress core files (`httpd_sys_content_t`)
- `wp-config.php` after initial setup
- `wp-admin/` and `wp-includes/`

Allow writes only to:
- `wp-content/uploads/`
- `wp-content/cache/` (if using caching plugins)

This approach limits the damage an attacker can do even if they exploit a vulnerability in WordPress or a plugin.
