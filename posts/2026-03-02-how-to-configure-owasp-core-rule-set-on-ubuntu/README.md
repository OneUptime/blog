# How to Configure OWASP Core Rule Set on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, Security, WAF, OWASP, Apache

Description: Learn how to install and configure the OWASP Core Rule Set (CRS) with ModSecurity on Ubuntu to protect web applications from common attacks.

---

The OWASP Core Rule Set (CRS) is a set of generic attack detection rules for ModSecurity. It provides protection against a wide range of attacks including the OWASP Top 10 - SQL injection, XSS, local file inclusion, remote code execution, and more. The CRS is designed to minimize false positives while providing broad coverage, but it requires tuning for each application.

## Prerequisites

You need ModSecurity installed and working with Apache. If you haven't done that yet, install it first:

```bash
sudo apt install libapache2-mod-security2
sudo a2enmod security2
sudo cp /etc/modsecurity/modsecurity.conf-recommended /etc/modsecurity/modsecurity.conf
sudo systemctl restart apache2
```

## Installing OWASP CRS

### Method 1: From Package Repository

```bash
# Install CRS from apt

sudo apt install modsecurity-crs

# The rules are installed to /usr/share/modsecurity-crs/
ls /usr/share/modsecurity-crs/
```

### Method 2: From the Official Repository (Recommended for Latest Version)

```bash
# Download the latest CRS release
cd /tmp
wget https://github.com/coreruleset/coreruleset/releases/download/v4.26.0/coreruleset-4.26.0.tar.gz
tar -xzf coreruleset-4.26.0.tar.gz

# Move to the ModSecurity directory
sudo mv coreruleset-4.26.0 /etc/modsecurity/crs

# Copy the example setup file
sudo cp /etc/modsecurity/crs/crs-setup.conf.example /etc/modsecurity/crs/crs-setup.conf
sudo cp /etc/modsecurity/crs/rules/REQUEST-900-EXCLUSION-RULES-BEFORE-CRS.conf.example \
    /etc/modsecurity/crs/rules/REQUEST-900-EXCLUSION-RULES-BEFORE-CRS.conf
sudo cp /etc/modsecurity/crs/rules/RESPONSE-999-EXCLUSION-RULES-AFTER-CRS.conf.example \
    /etc/modsecurity/crs/rules/RESPONSE-999-EXCLUSION-RULES-AFTER-CRS.conf
```

## Configuring Apache to Load CRS

Create an Apache configuration file that loads ModSecurity and the CRS:

```bash
sudo nano /etc/apache2/conf-available/modsecurity-crs.conf
```

```apache
<IfModule security2_module>
    # Load ModSecurity configuration
    Include /etc/modsecurity/modsecurity.conf

    # Load CRS setup configuration
    Include /etc/modsecurity/crs/crs-setup.conf

    # Load CRS plugins and rules in the recommended order
    IncludeOptional /etc/modsecurity/crs/plugins/*-config.conf
    IncludeOptional /etc/modsecurity/crs/plugins/*-before.conf
    Include /etc/modsecurity/crs/rules/*.conf
    IncludeOptional /etc/modsecurity/crs/plugins/*-after.conf
</IfModule>
```

```bash
sudo a2enconf modsecurity-crs
sudo apache2ctl configtest
sudo systemctl restart apache2
```

## Configuring CRS Paranoia Level

The CRS paranoia level (1-4) controls how aggressively it applies rules:

- **Level 1 (default)**: Minimal false positives. Most applications work without tuning.
- **Level 2**: Additional rules enabled. Some false positives possible.
- **Level 3**: More aggressive. Expect false positives for complex applications.
- **Level 4**: Maximum security. Only for highly controlled environments.

```bash
sudo nano /etc/modsecurity/crs/crs-setup.conf
```

```apache
# Set paranoia level (1-4)
SecAction \
    "id:900000,\
    phase:1,\
    pass,\
    t:none,\
    nolog,\
    tag:'OWASP_CRS',\
    ver:'OWASP_CRS/4.26.0',\
    setvar:tx.blocking_paranoia_level=1"

# Optionally set higher detection level without blocking at that level
# This detects PL2 violations but only blocks on PL1 matches
SecAction \
    "id:900001,\
    phase:1,\
    pass,\
    t:none,\
    nolog,\
    tag:'OWASP_CRS',\
    ver:'OWASP_CRS/4.26.0',\
    setvar:tx.detection_paranoia_level=2"
```

## Understanding the Anomaly Scoring System

CRS uses an anomaly scoring approach. Each rule that matches adds points to a request's score. The request is blocked only if the total score exceeds a threshold.

```apache
# In crs-setup.conf - configure thresholds
SecAction \
    "id:900110,\
    phase:1,\
    pass,\
    t:none,\
    nolog,\
    setvar:tx.inbound_anomaly_score_threshold=5,\
    setvar:tx.outbound_anomaly_score_threshold=4"
```

Default score values per rule severity:
- CRITICAL = 5 points
- ERROR = 4 points
- WARNING = 3 points
- NOTICE = 2 points

With a threshold of 5, a single CRITICAL match blocks the request. Two WARNING matches also reach the threshold.

## Tuning: Handling False Positives

After deploying in detection mode, you'll see false positives in the logs. Handle them by adding exclusions.

### Finding False Positives

```bash
# Check the audit log for legitimate traffic that triggered rules
sudo grep "id \"9" /var/log/apache2/modsec_audit.log | awk '{print $NF}' | sort | uniq -c | sort -rn | head -20

# See which URIs are triggering the most rules
sudo grep "REQUEST_URI" /var/log/apache2/modsec_audit.log | sort | uniq -c | sort -rn | head -20
```

### Exclusion Methods

The CRS provides two exclusion rule files. Add per-transaction exclusions to the BEFORE file:

```bash
sudo nano /etc/modsecurity/crs/rules/REQUEST-900-EXCLUSION-RULES-BEFORE-CRS.conf
```

```apache
# Disable a rule for a specific URI
SecRule REQUEST_URI "@beginsWith /admin/upload" \
    "id:9001,\
    phase:1,\
    pass,\
    nolog,\
    ctl:ruleRemoveById=941100"

# Disable a rule for a specific IP (admin access)
SecRule REMOTE_ADDR "@ipMatch 10.0.0.5" \
    "id:9002,\
    phase:1,\
    pass,\
    nolog,\
    ctl:ruleEngine=Off"
```

Add startup-time exclusions that modify existing CRS rules to the AFTER file:

```bash
sudo nano /etc/modsecurity/crs/rules/RESPONSE-999-EXCLUSION-RULES-AFTER-CRS.conf
```

```apache
# Disable a specific rule globally
SecRuleRemoveById 941100

# Disable a rule for a specific parameter
SecRuleUpdateTargetById 942100 "!ARGS:sql_query"
```

Application-specific exclusion profiles are also available for popular frameworks:

```bash
# CRS plugins are listed in the official plugin registry
git clone https://github.com/coreruleset/plugin-registry.git

# Enable a plugin
# Download the plugin and include its *-config.conf, *-before.conf, and *-after.conf files
# from /etc/modsecurity/crs/plugins/ as shown in the Apache configuration above.
```

## Enabling Specific Rule Categories

You might not need all rule files. For a PHP application, you'd want PHP rules but not Node.js rules:

```apache
# Selective inclusion - only load what you need
# Comment out rules that don't apply to your stack
# Include /etc/modsecurity/crs/rules/REQUEST-934-APPLICATION-ATTACK-GENERIC.conf
Include /etc/modsecurity/crs/rules/REQUEST-933-APPLICATION-ATTACK-PHP.conf
# Include /etc/modsecurity/crs/rules/REQUEST-944-APPLICATION-ATTACK-JAVA.conf
```

## Sampling Mode for Gradual Rollout

When switching from detection to blocking, use sampling to gradually roll out:

```apache
# In crs-setup.conf
# Only apply blocking rules to 10% of traffic initially
SecAction \
    "id:900400,\
    phase:1,\
    pass,\
    nolog,\
    setvar:tx.sampling_percentage=10"
```

Increase the percentage as you gain confidence that false positives are handled.

## Testing the CRS Installation

```bash
# Test SQL injection detection
curl "http://localhost/?testparam=test' OR 1=1--"

# Should return 403 Forbidden (if in enforcement mode) or be logged (detection mode)

# Test XSS detection
curl "http://localhost/?xss=<script>alert(1)</script>"

# Test path traversal
curl "http://localhost/../../../../etc/passwd"

# Test scanner detection
curl -H "User-Agent: Nikto" http://localhost/

# Verify in the log
sudo tail /var/log/apache2/modsec_audit.log
sudo tail /var/log/apache2/error.log | grep ModSecurity
```

## Updating CRS

```bash
# Check current version
grep "OWASP_CRS" /etc/modsecurity/crs/crs-setup.conf | head -1

# Download latest version
wget https://github.com/coreruleset/coreruleset/releases/download/v4.26.0/coreruleset-4.26.0.tar.gz
tar -xzf coreruleset-4.26.0.tar.gz

# Back up current setup
sudo cp /etc/modsecurity/crs/crs-setup.conf /tmp/crs-setup.conf.backup
sudo cp -r /etc/modsecurity/crs/rules/*EXCLUSION* /tmp/ 2>/dev/null || true

# Replace the rules (not the setup file or exclusions)
sudo rsync -av coreruleset-4.26.0/rules/ /etc/modsecurity/crs/rules/ \
    --exclude="*EXCLUSION*"

# Test and restart
sudo apache2ctl configtest && sudo systemctl reload apache2
```

The OWASP CRS provides a strong baseline protection layer for any web application. The key to a successful deployment is starting in detection mode, reviewing logs methodically, and adding exclusions for legitimate traffic patterns before switching to prevention mode. This process typically takes a few days to a week for a production application.
