# How to Fix SELinux Preventing Apache Custom Directory on RHEL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, SELinux, Apache, HTTPD, Troubleshooting, Web Server

Description: Fix SELinux denials that prevent Apache httpd from serving content from custom directories on RHEL by setting the correct file contexts.

---

When you configure Apache to serve content from a directory outside of `/var/www/html`, SELinux will block access because the files do not have the `httpd_sys_content_t` context. Here is how to fix it.

## Identifying the Problem

```bash
# Apache returns 403 Forbidden for content in /opt/website/
# Check the error log
sudo tail -20 /var/log/httpd/error_log

# Confirm SELinux is the cause
sudo ausearch -m avc -c httpd --start recent
# type=AVC ... denied { read } ... scontext=...httpd_t ... tcontext=...default_t ...

# The target context is default_t instead of httpd_sys_content_t
ls -Z /opt/website/
```

## Fixing the SELinux Context

```bash
# Add a permanent file context rule for the custom directory
sudo semanage fcontext -a -t httpd_sys_content_t "/opt/website(/.*)?"

# Apply the context recursively
sudo restorecon -Rv /opt/website/

# Verify the context was applied
ls -Z /opt/website/
# Should show httpd_sys_content_t
```

## If Apache Needs Write Access

For directories where Apache needs to write (uploads, caches):

```bash
# Use httpd_sys_rw_content_t for read-write access
sudo semanage fcontext -a -t httpd_sys_rw_content_t "/opt/website/uploads(/.*)?"
sudo restorecon -Rv /opt/website/uploads/
```

## For CGI Scripts

```bash
# CGI scripts need the httpd_sys_script_exec_t context
sudo semanage fcontext -a -t httpd_sys_script_exec_t "/opt/website/cgi-bin(/.*)?"
sudo restorecon -Rv /opt/website/cgi-bin/
```

## Apache Configuration

Make sure your Apache configuration matches:

```bash
# /etc/httpd/conf.d/custom-site.conf
cat << 'CONF' | sudo tee /etc/httpd/conf.d/custom-site.conf
<VirtualHost *:80>
    ServerName example.com
    DocumentRoot /opt/website

    <Directory /opt/website>
        AllowOverride None
        Require all granted
    </Directory>
</VirtualHost>
CONF

# Test the configuration
sudo httpd -t

# Restart Apache
sudo systemctl restart httpd
```

## Verifying the Fix

```bash
# Test access
curl http://localhost/

# Check for any remaining AVC denials
sudo ausearch -m avc -c httpd --start recent

# List all custom file context rules you have added
sudo semanage fcontext -l -C
```

Never disable SELinux to fix Apache permission issues. The `semanage fcontext` and `restorecon` commands are the correct approach and take only seconds to apply.
