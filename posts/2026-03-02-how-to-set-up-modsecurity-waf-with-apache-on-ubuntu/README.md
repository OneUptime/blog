# How to Set Up ModSecurity WAF with Apache on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, Security, Apache, WAF, Web Security

Description: Step-by-step guide to installing and configuring ModSecurity Web Application Firewall with Apache on Ubuntu, including detection mode setup and basic rule configuration.

---

ModSecurity is an open-source Web Application Firewall (WAF) that works as an Apache module. It inspects HTTP requests and responses, applies rules to detect and block common attacks like SQL injection, cross-site scripting (XSS), and directory traversal. Deployed in front of a web application, it adds a layer of protection without requiring changes to the application code.

## Prerequisites

```bash
# Ensure Apache is installed
sudo apt install apache2

# Verify Apache is running
sudo systemctl status apache2
```

## Installing ModSecurity

```bash
# Install ModSecurity module for Apache
sudo apt install libapache2-mod-security2

# Enable the module
sudo a2enmod security2

# Restart Apache
sudo systemctl restart apache2

# Verify the module is loaded
apache2ctl -M | grep security
# Output: security2_module (shared)
```

## Initial Configuration

ModSecurity ships with a default configuration that needs to be activated:

```bash
# Copy the default configuration
sudo cp /etc/modsecurity/modsecurity.conf-recommended /etc/modsecurity/modsecurity.conf

# Edit the configuration
sudo nano /etc/modsecurity/modsecurity.conf
```

### Switching from Detection to Prevention Mode

The most important setting is the engine mode:

```apache
# Detection mode (log only, don't block) - good for initial deployment
SecRuleEngine DetectionOnly

# Prevention mode (block matching requests) - enable after tuning
# SecRuleEngine On
```

Start with `DetectionOnly`. This lets you observe what ModSecurity would block without affecting users. Switch to `On` only after reviewing logs and tuning out false positives.

### Key Configuration Settings

```apache
# Maximum request body size ModSecurity will inspect (bytes)
SecRequestBodyLimit 13107200          # 12.5MB
SecRequestBodyNoFilesLimit 131072     # 128KB for non-file requests

# Limit for response body inspection
SecResponseBodyLimit 524288           # 512KB

# Temporary file storage for large bodies
SecTmpDir /tmp/
SecDataDir /tmp/

# Audit log configuration
SecAuditEngine RelevantOnly           # Log only relevant events
SecAuditLogRelevantStatus "^(?:5|4(?!04))"  # Log 4xx/5xx except 404
SecAuditLog /var/log/apache2/modsec_audit.log
SecAuditLogParts ABIJDEFHZ           # What to include in audit log

# Request body processing
SecRequestBodyAccess On
SecResponseBodyAccess On

# Default action: pass through (override in rules)
SecDefaultAction "phase:1,log,auditlog,pass"
```

## Understanding ModSecurity Phases

ModSecurity processes requests in phases:

1. **Phase 1 - Request Headers**: Inspect request headers before body is read
2. **Phase 2 - Request Body**: Inspect the request body
3. **Phase 3 - Response Headers**: Inspect response headers
4. **Phase 4 - Response Body**: Inspect the response body
5. **Phase 5 - Logging**: Post-processing and logging

Rules specify which phase they apply in.

## Writing Basic Custom Rules

Custom rules go in additional configuration files:

```bash
sudo nano /etc/modsecurity/custom-rules.conf
```

### Basic Rule Syntax

```apache
SecRule VARIABLES "OPERATOR" "ACTIONS"
```

```apache
# Block requests containing obvious SQL injection
SecRule ARGS "@detectSQLi" \
    "id:1001,\
    phase:2,\
    block,\
    log,\
    msg:'SQL Injection Attempt',\
    tag:'OWASP_CRS/WEB_ATTACK/SQL_INJECTION',\
    severity:'CRITICAL'"

# Block XSS attempts in request arguments
SecRule ARGS "@detectXSS" \
    "id:1002,\
    phase:2,\
    block,\
    log,\
    msg:'XSS Attempt',\
    severity:'CRITICAL'"

# Block path traversal attempts
SecRule REQUEST_URI "@contains /../" \
    "id:1003,\
    phase:1,\
    block,\
    log,\
    msg:'Path Traversal Attempt',\
    severity:'HIGH'"

# Block access to .htaccess files
SecRule REQUEST_FILENAME "@contains /.htaccess" \
    "id:1004,\
    phase:1,\
    block,\
    log,\
    msg:'Attempt to access .htaccess file',\
    severity:'HIGH'"

# Rate limiting: block if User-Agent is empty
SecRule REQUEST_HEADERS:User-Agent "^$" \
    "id:1005,\
    phase:1,\
    block,\
    log,\
    msg:'Empty User-Agent',\
    severity:'MEDIUM'"

# Block specific bad user agents (scanners, etc.)
SecRule REQUEST_HEADERS:User-Agent "@pmFromFile /etc/modsecurity/bad-user-agents.txt" \
    "id:1006,\
    phase:1,\
    block,\
    log,\
    msg:'Known bad user agent',\
    severity:'MEDIUM'"
```

```bash
# Create the bad user agent list
sudo nano /etc/modsecurity/bad-user-agents.txt
```

```
sqlmap
nikto
havij
```

### Include Custom Rules in Configuration

```bash
# Add to /etc/modsecurity/modsecurity.conf or create an Apache config
sudo nano /etc/apache2/conf-available/modsecurity-custom.conf
```

```apache
<IfModule security2_module>
    Include /etc/modsecurity/modsecurity.conf
    Include /etc/modsecurity/custom-rules.conf
</IfModule>
```

```bash
sudo a2enconf modsecurity-custom
sudo apache2ctl configtest
sudo systemctl restart apache2
```

## Common Variables in Rules

| Variable | Description |
|----------|-------------|
| `ARGS` | All request arguments (GET and POST) |
| `ARGS_NAMES` | Argument names |
| `REQUEST_HEADERS` | HTTP request headers |
| `REQUEST_URI` | The URI requested |
| `REQUEST_FILENAME` | The filename portion of URI |
| `REQUEST_BODY` | Request body |
| `REQUEST_METHOD` | HTTP method (GET, POST, etc.) |
| `RESPONSE_BODY` | Response body |
| `RESPONSE_STATUS` | HTTP response status code |
| `REMOTE_ADDR` | Client IP address |
| `SERVER_NAME` | VirtualHost name |

## Common Operators

| Operator | Description |
|----------|-------------|
| `@contains` | String contains substring |
| `@streq` | String equality |
| `@rx` | Regular expression match |
| `@pmFromFile` | Phrase match from file |
| `@detectSQLi` | SQL injection detection |
| `@detectXSS` | XSS detection |
| `@gt` `@lt` `@ge` `@le` | Numeric comparisons |
| `@ipMatchFromFile` | IP address match from file |

## Whitelisting and Exceptions

After enabling ModSecurity, you'll likely need to whitelist some legitimate traffic:

```apache
# Whitelist an IP address from all rules
SecRule REMOTE_ADDR "@ipMatch 192.168.1.100" \
    "id:9001,phase:1,pass,nolog,ctl:ruleEngine=Off"

# Whitelist a specific rule for a specific path
# Disable rule 941100 for the /upload path
SecRule REQUEST_URI "@beginsWith /upload" \
    "id:9002,phase:1,pass,nolog,ctl:ruleRemoveById=941100"

# Whitelist specific parameter from inspection
SecRuleUpdateTargetById 941100 "!ARGS:file_content"

# Disable ModSecurity for a specific VirtualHost
<VirtualHost *:443>
    ServerName api.example.com
    # ... other config ...
    SecRuleEngine Off
</VirtualHost>
```

## Reading the Audit Log

The audit log is your primary tool for understanding what ModSecurity is doing:

```bash
# View the audit log
sudo tail -f /var/log/apache2/modsec_audit.log

# Find blocked requests
sudo grep "Access denied" /var/log/apache2/modsec_audit.log

# Find which rules triggered
sudo grep "id \"" /var/log/apache2/modsec_audit.log | awk '{print $NF}' | sort | uniq -c | sort -rn
```

A typical audit log entry:

```
---abcdef---A--
[02/Mar/2026:10:23:45.123456 +0000] AbCdEf localhost 192.168.1.50 46821 localhost 80
---abcdef---B--
GET /admin?id=1 OR 1=1-- HTTP/1.1
Host: example.com
---abcdef---F--
HTTP/1.1 403 Forbidden
---abcdef---H--
Message: Access denied with code 403 (phase 2). Pattern match "..." at ARGS:id. [file "/etc/modsecurity/rules/REQUEST-942-APPLICATION-ATTACK-SQLI.conf"] [line "452"] [id "942100"] [msg "SQL Injection Attack Detected via libinjection"] [severity "CRITICAL"]
```

## Integrating with Apache VirtualHosts

```apache
# /etc/apache2/sites-available/example.com.conf

<VirtualHost *:443>
    ServerName example.com

    # Enable ModSecurity for this VirtualHost
    SecRuleEngine On

    # Override specific rules for this vhost
    SecRuleRemoveById 920320   # Remove User-Agent Required rule

    SSLEngine on
    SSLCertificateFile /etc/ssl/certs/example.com.crt
    SSLCertificateKeyFile /etc/ssl/private/example.com.key

    ProxyPass / http://localhost:8080/
    ProxyPassReverse / http://localhost:8080/
</VirtualHost>
```

## Testing ModSecurity

```bash
# Test SQL injection detection
curl "http://localhost/?id=1+OR+1=1--"

# Test XSS detection
curl "http://localhost/?name=<script>alert(1)</script>"

# Check Apache error log for blocks
sudo tail -f /var/log/apache2/error.log | grep ModSecurity

# Test with a known scanner signature
curl -H "User-Agent: sqlmap" http://localhost/
```

ModSecurity in detection mode, combined with careful log review and gradual rule tuning, is the right approach before enabling blocking. The goal is to block real attacks without interrupting legitimate users, and that calibration takes time and careful observation of your actual traffic patterns.
