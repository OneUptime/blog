# How to Configure Apache with mod_security WAF on RHEL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, Apache, ModSecurity, WAF, Security, Linux

Description: Learn how to install and configure ModSecurity as a web application firewall for Apache on RHEL, including OWASP Core Rule Set integration.

---

ModSecurity is an open-source web application firewall (WAF) that protects Apache against common attacks like SQL injection, cross-site scripting (XSS), and other OWASP Top 10 threats. On RHEL, you can pair ModSecurity with the OWASP Core Rule Set (CRS) for a solid baseline defense. This guide walks through installation, configuration, and rule tuning.

## Prerequisites

- A RHEL system with Apache installed and running
- EPEL repository enabled
- Root or sudo access

## Step 1: Install ModSecurity

```bash
# Enable EPEL if not already enabled
sudo dnf install -y epel-release

# Install ModSecurity for Apache
sudo dnf install -y mod_security mod_security_crs

# Verify the module is loaded
httpd -M | grep security
```

## Step 2: Understand the Configuration Layout

```mermaid
graph TD
    A[/etc/httpd/conf.d/mod_security.conf] --> B[Main module settings]
    C[/etc/httpd/modsecurity.d/] --> D[modsecurity_crs_10_setup.conf]
    C --> E[activated_rules/]
    E --> F[OWASP CRS Rules]
```

Key files:
- `/etc/httpd/conf.d/mod_security.conf` - Main module configuration
- `/etc/httpd/modsecurity.d/` - Rule directory
- `/var/log/httpd/modsec_audit.log` - Audit log for blocked requests

## Step 3: Configure ModSecurity Mode

ModSecurity has two main modes:

```bash
# Edit the main configuration
sudo vi /etc/httpd/conf.d/mod_security.conf
```

```apache
# Detection only mode (logs but does not block)
# Use this initially to avoid breaking your application
SecRuleEngine DetectionOnly

# Enforcement mode (logs and blocks)
# Switch to this after testing
# SecRuleEngine On
```

Start in `DetectionOnly` mode so you can see what would be blocked without affecting traffic.

## Step 4: Configure Basic Settings

```apache
# /etc/httpd/conf.d/mod_security.conf

# Enable the rule engine
SecRuleEngine DetectionOnly

# Set the request body access (needed to inspect POST data)
SecRequestBodyAccess On

# Maximum request body size (default 13107200 = 12.5MB)
SecRequestBodyLimit 13107200

# Maximum request body size stored in memory (rest goes to disk)
SecRequestBodyInMemoryLimit 131072

# Set the response body access (inspect responses for data leaks)
SecResponseBodyAccess On

# Response body MIME types to inspect
SecResponseBodyMimeType text/plain text/html text/xml application/json

# Maximum response body size
SecResponseBodyLimit 524288

# Set the temporary directory for file uploads
SecTmpDir /tmp/

# Set the data directory for persistent storage
SecDataDir /var/lib/mod_security

# Configure the audit log
SecAuditEngine RelevantOnly
SecAuditLogRelevantStatus "^(?:5|4(?!04))"
SecAuditLogType Serial
SecAuditLog /var/log/httpd/modsec_audit.log

# Set the audit log parts to record
SecAuditLogParts ABIJDEFHZ
```

## Step 5: Enable OWASP Core Rule Set

```bash
# The CRS rules should already be installed
ls /etc/httpd/modsecurity.d/activated_rules/

# If rules are not activated, create symlinks
cd /etc/httpd/modsecurity.d/activated_rules/
sudo ln -s /usr/share/mod_modsecurity_crs/rules/*.conf .

# Verify rules are present
ls -la /etc/httpd/modsecurity.d/activated_rules/
```

## Step 6: Create Custom Rule Exclusions

Your application will likely trigger false positives. Create an exclusion file:

```bash
# Create a custom rules file that loads after the CRS
cat <<'EOF' | sudo tee /etc/httpd/modsecurity.d/custom-exclusions.conf
# Disable a specific rule that causes false positives
# Rule 942100: SQL Injection detection via libinjection
SecRuleRemoveById 942100

# Disable rules for a specific URL path
SecRule REQUEST_URI "@beginsWith /api/upload"     "id:10001,phase:1,pass,nolog,    ctl:ruleRemoveById=200002,    ctl:ruleRemoveById=200003"

# Allow a specific parameter to bypass SQL injection checks
SecRule ARGS:search_query "@rx .*"     "id:10002,phase:2,pass,nolog,    ctl:ruleRemoveTargetById=942100;ARGS:search_query"

# Increase the body limit for file upload endpoints
SecRule REQUEST_URI "@beginsWith /upload"     "id:10003,phase:1,pass,nolog,    ctl:requestBodyLimit=52428800"
EOF
```

## Step 7: Test the Configuration

```bash
# Test Apache configuration syntax
sudo apachectl configtest

# Reload Apache
sudo systemctl reload httpd

# Test with a simple SQL injection attempt
curl "http://localhost/?id=1%20OR%201=1"

# Test with an XSS attempt
curl "http://localhost/?name=<script>alert('xss')</script>"

# Check the audit log for detections
sudo tail -f /var/log/httpd/modsec_audit.log
```

## Step 8: Switch to Enforcement Mode

After testing and tuning, enable blocking:

```apache
# Change from DetectionOnly to On
SecRuleEngine On
```

```bash
# Reload Apache
sudo systemctl reload httpd
```

## Step 9: Monitor and Maintain

```bash
# Watch the audit log for blocked requests
sudo tail -f /var/log/httpd/modsec_audit.log

# Count blocked requests per rule ID
sudo grep -oP 'id "\K[0-9]+' /var/log/httpd/modsec_audit.log | sort | uniq -c | sort -rn | head -20

# Check for false positives (look for legitimate traffic being blocked)
sudo grep "403" /var/log/httpd/access_log | tail -20
```

## Troubleshooting

```bash
# If your application breaks after enabling ModSecurity, check the audit log
sudo cat /var/log/httpd/modsec_audit.log

# Look for the rule ID causing the block
# Then add it to your exclusion file

# Temporarily disable ModSecurity for debugging
# SecRuleEngine Off

# Check that the data directory exists and has correct permissions
ls -laZ /var/lib/mod_security/

# Verify SELinux is not blocking ModSecurity
sudo ausearch -m avc -ts recent | grep modsec
```

## Summary

ModSecurity with the OWASP Core Rule Set provides strong baseline protection for Apache on RHEL. Start in DetectionOnly mode, review the audit logs to identify false positives, create exclusion rules for your application, and then switch to enforcement mode. Regular log review helps you keep the rules tuned and your applications protected.
