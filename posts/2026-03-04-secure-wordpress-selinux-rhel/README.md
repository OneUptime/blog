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

# Allow httpd to write to uploads and cache only
sudo semanage fcontext -a -t httpd_sys_rw_content_t "/var/www/html/wp-content/uploads(/.*)?"
sudo semanage fcontext -a -t httpd_sys_rw_content_t "/var/www/html/wp-content/cache(/.*)?"

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

# Verify dashboard plugin installation is blocked
# Plugin and theme updates should be done from the command line

# Check for any new SELinux denials after testing
sudo ausearch -m AVC -ts recent --comm httpd
```

## Understanding the Core Update Trade-Off

Setting WordPress core files to `httpd_sys_content_t` (read-only) means WordPress cannot update itself through the dashboard. You will see a Site Health notice:

> Your installation of WordPress prompts for FTP credentials to perform updates.

This is expected and intentional. Allowing Apache to write to core files (`wp-admin/`, `wp-includes/`, root PHP files) weakens your security posture because an attacker who compromises WordPress could modify those files.

Instead of loosening SELinux contexts, use WP-CLI to perform core, plugin, and theme updates from the command line as the system user that owns the WordPress files:

```bash
# Update WordPress core via WP-CLI (recommended)
sudo -u wordpress wp core update --path=/var/www/html
sudo -u wordpress wp plugin update --all --path=/var/www/html
sudo -u wordpress wp theme update --all --path=/var/www/html
```

If you prefer dashboard-based updates and accept the reduced security, you can set the entire WordPress directory to read-write:

```bash
# Less secure: allow httpd to write to all WordPress files
sudo semanage fcontext -m -t httpd_sys_rw_content_t "/var/www/html(/.*)?"
sudo restorecon -Rv /var/www/html/
```

## Recommended Practice

Keep these directories read-only via SELinux:
- WordPress core files (`httpd_sys_content_t`)
- `wp-config.php` after initial setup
- `wp-admin/` and `wp-includes/`

Allow writes only to:
- `wp-content/uploads/`
- `wp-content/cache/` (if using caching plugins)

This approach limits the damage an attacker can do even if they exploit a vulnerability in WordPress or a plugin. The trade-off is that core updates must be performed via WP-CLI or your system package manager rather than the WordPress dashboard.
