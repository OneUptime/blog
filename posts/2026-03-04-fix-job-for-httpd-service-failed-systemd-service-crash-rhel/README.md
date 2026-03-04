# How to Fix 'Job for httpd.service Failed' Systemd Service Crash on RHEL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, httpd, Apache, systemd, Troubleshooting, Web Server

Description: Diagnose and fix 'Job for httpd.service failed' errors on RHEL by examining configuration syntax, port conflicts, and SELinux issues.

---

When you see "Job for httpd.service failed because the control process exited with error code", Apache failed to start. The fix depends on the specific reason for the failure.

## Step 1: Read the Error Details

```bash
# Get detailed status information
sudo systemctl status httpd.service

# Read the full journal for httpd
sudo journalctl -u httpd.service --since "5 minutes ago" --no-pager
```

## Common Cause 1: Configuration Syntax Error

```bash
# Test the Apache configuration for syntax errors
sudo httpd -t
# Or
sudo apachectl configtest

# Common errors:
# AH00526: Syntax error on line 42 of /etc/httpd/conf.d/ssl.conf:
# SSLCertificateFile: file '/etc/pki/tls/certs/localhost.crt' does not exist

# Fix the configuration error and retry
sudo vi /etc/httpd/conf.d/ssl.conf
sudo systemctl start httpd
```

## Common Cause 2: Port Already in Use

```bash
# Check if port 80 or 443 is already in use
sudo ss -tlnp | grep -E ":80|:443"

# If another process is using the port
# Find and stop the conflicting service
sudo kill <PID>
# Or change Apache to a different port

# Retry starting httpd
sudo systemctl start httpd
```

## Common Cause 3: Missing SSL Certificate

```bash
# If SSL is configured but certificates are missing
sudo httpd -t 2>&1 | grep SSL

# Generate a self-signed certificate for testing
sudo openssl req -x509 -nodes -days 365 \
  -newkey rsa:2048 \
  -keyout /etc/pki/tls/private/localhost.key \
  -out /etc/pki/tls/certs/localhost.crt \
  -subj "/CN=localhost"

sudo systemctl start httpd
```

## Common Cause 4: SELinux Denial

```bash
# Check for SELinux denials related to httpd
sudo ausearch -m avc -c httpd --start recent

# If using a non-standard port, add it to SELinux
sudo semanage port -a -t http_port_t -p tcp 8080

# If serving from a custom directory, fix the context
sudo semanage fcontext -a -t httpd_sys_content_t "/custom/path(/.*)?"
sudo restorecon -Rv /custom/path/
```

## Common Cause 5: Module Loading Error

```bash
# Check for module errors
sudo httpd -t -D DUMP_MODULES 2>&1 | grep -i error

# If a module is missing, install it
sudo dnf install mod_ssl
# Or comment out the LoadModule line in the config
```

## Common Cause 6: Permission Issues

```bash
# Check log directory permissions
ls -la /var/log/httpd/

# Check document root permissions
ls -la /var/www/html/

# Fix permissions if needed
sudo chown -R apache:apache /var/www/html/
sudo chmod 755 /var/www/html/
```

Always check `httpd -t` first. Syntax errors are the most common cause of httpd failing to start, and the error message tells you exactly which file and line to fix.
