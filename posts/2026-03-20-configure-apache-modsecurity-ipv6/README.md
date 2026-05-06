# How to Configure Apache mod_security with IPv6 Rules

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Apache, ModSecurity, IPv6, WAF, Security, Web Application Firewall

Description: Configure ModSecurity Web Application Firewall with Apache to protect against IPv6-based attacks, including IP allowlisting, rate limiting, and custom IPv6 detection rules.

---

ModSecurity is a Web Application Firewall (WAF) that protects against SQL injection, XSS, and other attacks. Configuring it for IPv6 requires IPv6-aware IP address matching rules and whitelist configuration.

## Installing ModSecurity

```bash
# Ubuntu/Debian

sudo apt install libapache2-mod-security2 -y
sudo a2enmod security2
sudo a2enmod headers
sudo cp /etc/modsecurity/modsecurity.conf-recommended /etc/modsecurity/modsecurity.conf
sudo systemctl restart apache2

# RHEL/CentOS
sudo dnf install mod_security -y
sudo systemctl restart httpd

# Check that the module is loaded
sudo apachectl -M | grep "security2"
```

## Basic ModSecurity Configuration for IPv6

```apache
# /etc/modsecurity/modsecurity.conf (Debian/Ubuntu example)

# Enable ModSecurity
SecRuleEngine On

# Request body inspection
SecRequestBodyAccess On
SecRequestBodyLimit 13107200

# Response body inspection
SecResponseBodyAccess Off

# Audit logging
SecAuditEngine RelevantOnly
SecAuditLog /var/log/apache2/modsec_audit.log

# Debug log
SecDebugLogLevel 0
SecDebugLog /var/log/apache2/modsec_debug.log

# Temporary files
SecTmpDir /tmp/
SecDataDir /tmp/
```

## IPv6 Whitelist Rules

```apache
# /etc/modsecurity/crs-setup.conf or custom rules file

# Whitelist specific IPv6 addresses
SecRule REMOTE_ADDR "@ipMatch 2001:db8::1" \
    "id:1001,phase:1,pass,nolog,ctl:ruleEngine=Off,\
     msg:'Whitelisted IPv6 admin address'"

# Whitelist an entire IPv6 subnet
# Note: ModSecurity uses CIDR notation for IPv6
SecRule REMOTE_ADDR "@ipMatch 2001:db8:1000::/48" \
    "id:1002,phase:1,pass,nolog,ctl:ruleEngine=Off,\
     msg:'Whitelisted IPv6 office subnet'"

# Allow IPv6 loopback
SecRule REMOTE_ADDR "@ipMatch ::1" \
    "id:1003,phase:1,pass,nolog,ctl:ruleEngine=Off,\
     msg:'IPv6 loopback'"
```

## Custom IPv6 Detection Rules

```apache
# /etc/modsecurity/custom_ipv6_rules.conf

# Detect IPv6 clients and log them
SecRule REMOTE_ADDR "@ipMatch ::/0" \
    "id:2001,phase:1,pass,log,\
     msg:'IPv6 client detected',\
     logdata:'Client IP: %{REMOTE_ADDR}'"

# Block known malicious IPv6 ranges
SecRule REMOTE_ADDR "@ipMatch 2001:db8:dead::/48" \
    "id:2002,phase:1,deny,status:403,\
     msg:'Blocked malicious IPv6 range',\
     logdata:'Blocked: %{REMOTE_ADDR}'"

# Rate limiting for IPv6 clients
# (ModSecurity can track IPv6 address patterns)
SecRule REMOTE_ADDR "@ipMatch ::/0" \
    "id:2003,phase:1,pass,nolog,initcol:ip=%{REMOTE_ADDR},\
     setvar:ip.access_count=+1,expirevar:ip.access_count=60"

SecRule REMOTE_ADDR "@ipMatch ::/0" \
    "id:2004,phase:1,chain,deny,status:429,\
     msg:'Rate limit exceeded for IPv6 client',\
     logdata:'IP: %{REMOTE_ADDR}, Count: %{ip.access_count}'"
    SecRule IP:ACCESS_COUNT "@gt 100"
```

## OWASP Core Rule Set with IPv6

```bash
# Download OWASP CRS
git clone https://github.com/coreruleset/coreruleset.git /etc/modsecurity/coreruleset/
cp /etc/modsecurity/coreruleset/crs-setup.conf.example \
   /etc/modsecurity/coreruleset/crs-setup.conf

# Enable CRS in Apache (Debian/Ubuntu example)
cat >> /etc/apache2/mods-available/security2.conf << 'EOF'
# Include OWASP CRS
IncludeOptional /etc/modsecurity/coreruleset/crs-setup.conf
IncludeOptional /etc/modsecurity/coreruleset/plugins/*-config.conf
IncludeOptional /etc/modsecurity/coreruleset/plugins/*-before.conf
IncludeOptional /etc/modsecurity/coreruleset/rules/*.conf
IncludeOptional /etc/modsecurity/coreruleset/plugins/*-after.conf
EOF

sudo apachectl configtest
sudo systemctl reload apache2
```

## Testing ModSecurity with IPv6

```bash
# Test that ModSecurity blocks attack patterns from IPv6
curl -6 -i "http://yourdomain.com/?foo=/etc/passwd&bar=/bin/sh" 2>&1 | grep "403"

# Test SQLi detection
curl -6 -i "http://yourdomain.com/?id=1%27%20OR%20%271%27=%271" 2>&1 | grep "403"

# Test XSS detection
curl -6 -i "http://yourdomain.com/?q=%3Cscript%3Ealert(1)%3C%2Fscript%3E" 2>&1 | grep "403"

# Check ModSecurity audit log for IPv6 entries
sudo tail -50 /var/log/apache2/modsec_audit.log

# Check if IPv6 addresses appear in logs correctly
sudo grep "Client IP:" /var/log/apache2/modsec_audit.log | tail -5
```

## Virtual Host Integration

```apache
# /etc/apache2/sites-available/yourdomain.conf
# Make sure Apache is also listening on IPv6, for example with Listen [::]:80

<VirtualHost [::]:80>
    ServerName yourdomain.com

    # Enable ModSecurity
    SecRuleEngine On

    # Include custom IPv6 rules
    Include /etc/modsecurity/custom_ipv6_rules.conf

    DocumentRoot /var/www/yourdomain

    ErrorLog ${APACHE_LOG_DIR}/yourdomain_error.log
    CustomLog ${APACHE_LOG_DIR}/yourdomain_access.log combined
</VirtualHost>
```

ModSecurity's IP matching functions handle IPv6 addresses natively with CIDR notation support, enabling comprehensive WAF protection for web applications served to IPv6 clients with the same rule capabilities as IPv4 deployments.
