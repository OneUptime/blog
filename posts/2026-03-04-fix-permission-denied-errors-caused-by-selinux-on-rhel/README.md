# How to Fix 'Permission Denied' Errors Caused by SELinux on RHEL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, SELinux, Permissions, Troubleshooting, Security

Description: Diagnose and resolve permission denied errors caused by SELinux on RHEL by checking contexts, reviewing audit logs, and applying the correct fixes.

---

When you get "Permission denied" on RHEL and standard file permissions look correct, SELinux is often the cause. Here is how to confirm and fix SELinux-related denials.

## Step 1: Confirm SELinux is the Cause

```bash
# Check if SELinux is enforcing
getenforce

# Temporarily switch to permissive to test
sudo setenforce 0

# Try the operation again
# If it works now, SELinux was blocking it

# Switch back to enforcing
sudo setenforce 1
```

## Step 2: Check the Audit Log

```bash
# Look for recent AVC (Access Vector Cache) denials
sudo ausearch -m avc --start recent

# Or grep the audit log directly
sudo grep "denied" /var/log/audit/audit.log | tail -10

# Example output:
# type=AVC msg=audit(...): avc:  denied  { read } for
# pid=1234 comm="httpd" name="index.html"
# scontext=system_u:system_r:httpd_t:s0
# tcontext=unconfined_u:object_r:default_t:s0 tclass=file
```

## Step 3: Use sealert for Recommendations

```bash
# Install the troubleshooting tools
sudo dnf install -y setroubleshoot-server

# Get human-readable analysis
sudo sealert -a /var/log/audit/audit.log

# The output will suggest specific fixes
```

## Fix: Wrong File Context

The most common cause is files with incorrect SELinux labels:

```bash
# Check the context of the problem file
ls -Z /srv/website/index.html

# If the context is wrong (e.g., default_t instead of httpd_sys_content_t):
# Set the correct context permanently
sudo semanage fcontext -a -t httpd_sys_content_t "/srv/website(/.*)?"
sudo restorecon -Rv /srv/website/

# Verify
ls -Z /srv/website/index.html
# Should now show: httpd_sys_content_t
```

## Fix: SELinux Boolean Needs Enabling

```bash
# List booleans related to your service
getsebool -a | grep httpd

# Common fixes:
# Allow Apache to serve from home directories
sudo setsebool -P httpd_enable_homedirs on

# Allow Apache to connect to the network (for reverse proxy)
sudo setsebool -P httpd_can_network_connect on

# Allow Apache to send mail
sudo setsebool -P httpd_can_sendmail on
```

## Fix: Non-Standard Port

```bash
# If a service runs on a non-standard port
# Check allowed ports for a service type
sudo semanage port -l | grep http

# Add a custom port
sudo semanage port -a -t http_port_t -p tcp 8443

# Verify
sudo semanage port -l | grep http
```

## Generate and Apply a Custom Policy Module

```bash
# As a last resort, create a custom policy from the denial
sudo ausearch -m avc --start recent | audit2allow -M mypolicy

# Review the policy before applying
cat mypolicy.te

# Apply the custom module
sudo semodule -i mypolicy.pp
```

Never disable SELinux to fix permissions. Instead, find and apply the correct context, boolean, or port label.
