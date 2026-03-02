# How to Configure Automated Compliance Monitoring on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, Compliance, Monitoring, OpenSCAP, Security Automation

Description: Set up automated compliance monitoring on Ubuntu using OpenSCAP, custom compliance scripts, and alerting to continuously verify your systems meet security baselines.

---

Configuring a system to be compliant at a point in time is only half the battle. Configuration drift - where systems gradually move away from their baseline through patches, software updates, manual changes, and application deployments - is real and constant. Automated compliance monitoring continuously verifies your systems remain in the expected state and alerts you when they drift.

## Tools for Automated Compliance Monitoring

- **OpenSCAP** - Standards-based compliance scanning against CIS benchmarks, STIG, and custom profiles
- **Lynis** - Security auditing tool with actionable hardening recommendations
- **Custom scripts** - Targeted checks for organization-specific requirements
- **Auditd** - Kernel-level audit trail for change detection

## Installing OpenSCAP

OpenSCAP implements the Security Content Automation Protocol (SCAP) and can evaluate systems against published benchmarks:

```bash
# Install OpenSCAP scanner and security content
sudo apt update
sudo apt install openscap-scanner scap-security-guide -y

# Verify installation
oscap --version

# List available content
ls /usr/share/xml/scap/ssg/content/ | grep ubuntu

# List profiles for Ubuntu
oscap info /usr/share/xml/scap/ssg/content/ssg-ubuntu2204-ds.xml | grep "Profile"
```

## Running OpenSCAP Scans

```bash
# Run CIS benchmark scan
sudo oscap xccdf eval \
    --profile xccdf_org.ssgproject.content_profile_cis_level1_server \
    --report /var/log/compliance/cis-report-$(date +%Y%m%d).html \
    --results /var/log/compliance/cis-results-$(date +%Y%m%d).xml \
    /usr/share/xml/scap/ssg/content/ssg-ubuntu2204-ds.xml

# Run STIG scan
sudo oscap xccdf eval \
    --profile xccdf_org.ssgproject.content_profile_stig \
    --report /var/log/compliance/stig-report-$(date +%Y%m%d).html \
    --results /var/log/compliance/stig-results-$(date +%Y%m%d).xml \
    /usr/share/xml/scap/ssg/content/ssg-ubuntu2204-ds.xml

# Parse results to get a pass/fail summary
oscap xccdf generate report /var/log/compliance/cis-results-$(date +%Y%m%d).xml > /dev/null 2>&1

# Count pass/fail from results
grep -c "result>pass" /var/log/compliance/cis-results-$(date +%Y%m%d).xml
grep -c "result>fail" /var/log/compliance/cis-results-$(date +%Y%m%d).xml
```

## Automating OpenSCAP Scans

```bash
# Create compliance scan directory
sudo mkdir -p /var/log/compliance

# Create automated scan script
sudo tee /usr/local/bin/compliance-scan.sh << 'SCRIPT'
#!/bin/bash
# Automated compliance scan

set -euo pipefail

DATE=$(date +%Y%m%d)
REPORT_DIR="/var/log/compliance"
PROFILE="${1:-xccdf_org.ssgproject.content_profile_cis_level1_server}"
CONTENT="/usr/share/xml/scap/ssg/content/ssg-ubuntu2204-ds.xml"
ALERT_EMAIL="security@example.com"
ALERT_THRESHOLD=90  # Alert if pass rate drops below this %

mkdir -p "$REPORT_DIR"

echo "[$(date)] Starting compliance scan with profile: $PROFILE"

# Run scan
oscap xccdf eval \
    --profile "$PROFILE" \
    --report "$REPORT_DIR/report-$DATE.html" \
    --results "$REPORT_DIR/results-$DATE.xml" \
    "$CONTENT" 2>&1 || true  # oscap exits non-zero on failures, we handle that

# Calculate pass rate
PASS=$(grep -c "result>pass" "$REPORT_DIR/results-$DATE.xml" || echo 0)
FAIL=$(grep -c "result>fail" "$REPORT_DIR/results-$DATE.xml" || echo 0)
TOTAL=$((PASS + FAIL))

if [ "$TOTAL" -gt 0 ]; then
    PASS_RATE=$(echo "scale=1; $PASS * 100 / $TOTAL" | bc)
else
    PASS_RATE=0
fi

echo "[$(date)] Results: $PASS passed, $FAIL failed ($PASS_RATE% pass rate)"

# Alert if pass rate below threshold
if [ "$(echo "$PASS_RATE < $ALERT_THRESHOLD" | bc)" -eq 1 ]; then
    echo "Compliance scan alert on $(hostname): Pass rate $PASS_RATE% (threshold: $ALERT_THRESHOLD%)" | \
        mail -s "COMPLIANCE ALERT - $(hostname)" "$ALERT_EMAIL"
fi

# Clean up old reports (keep 90 days)
find "$REPORT_DIR" -name "*.html" -mtime +90 -delete
find "$REPORT_DIR" -name "*.xml" -mtime +90 -delete

echo "[$(date)] Compliance scan complete."
SCRIPT

sudo chmod +x /usr/local/bin/compliance-scan.sh

# Schedule weekly scans (Sunday at 2 AM)
echo "0 2 * * 0 root /usr/local/bin/compliance-scan.sh >> /var/log/compliance/scan.log 2>&1" | \
    sudo tee /etc/cron.d/compliance-scan
```

## Custom Compliance Checks

OpenSCAP profiles don't cover everything. Supplement with custom checks:

```bash
#!/bin/bash
# /usr/local/bin/custom-compliance-check.sh
# Organization-specific compliance verification

PASS=0
FAIL=0
CRITICAL=0

check() {
    local LEVEL="$1"  # critical, high, medium
    local NAME="$2"
    local CMD="$3"
    local DESCRIPTION="$4"

    if eval "$CMD" > /dev/null 2>&1; then
        echo "[PASS] [$LEVEL] $NAME"
        ((PASS++))
    else
        echo "[FAIL] [$LEVEL] $NAME - $DESCRIPTION"
        ((FAIL++))
        [ "$LEVEL" = "critical" ] && ((CRITICAL++))
    fi
}

echo "=== Custom Compliance Check - $(hostname) - $(date) ==="
echo ""

# Access Control
check "critical" "Root password locked" \
    "passwd -S root | grep -q ' L '" \
    "Root account should have a locked password"

check "critical" "SSH root login disabled" \
    "grep -rq 'PermitRootLogin no' /etc/ssh/sshd_config /etc/ssh/sshd_config.d/" \
    "PermitRootLogin no must be set in SSH config"

check "high" "SSH password authentication disabled" \
    "grep -rq 'PasswordAuthentication no' /etc/ssh/sshd_config /etc/ssh/sshd_config.d/" \
    "Key-based auth only"

check "high" "No accounts with empty passwords" \
    "[ $(awk -F: '($2 == \"\") {print}' /etc/shadow | wc -l) -eq 0 ]" \
    "All accounts must have passwords set"

check "medium" "Password maximum age set (90 days)" \
    "grep -q 'PASS_MAX_DAYS.*90' /etc/login.defs" \
    "PASS_MAX_DAYS should be 90"

# Firewall
check "critical" "UFW is enabled and active" \
    "ufw status | grep -q 'Status: active'" \
    "Firewall must be active"

check "high" "Default incoming policy is deny" \
    "ufw status verbose | grep -q 'Default: deny (incoming)'" \
    "Default incoming must be deny"

# Services
check "high" "auditd is running" \
    "systemctl is-active auditd" \
    "Audit daemon must be running"

check "high" "fail2ban is running" \
    "systemctl is-active fail2ban" \
    "fail2ban must be running for brute force protection"

check "medium" "Chrony NTP is running" \
    "systemctl is-active chrony" \
    "Time synchronization must be active"

# System
check "critical" "No critical security updates pending" \
    "[ $(apt-get -s upgrade 2>/dev/null | grep -c '^Inst.*security') -eq 0 ]" \
    "Apply all security updates"

check "high" "Core dumps are disabled" \
    "grep -q 'hard core 0' /etc/security/limits.conf /etc/security/limits.d/*.conf" \
    "Core dumps should be disabled"

check "medium" "IP forwarding disabled (unless router)" \
    "[ $(sysctl -n net.ipv4.ip_forward) -eq 0 ]" \
    "Disable IP forwarding unless this is a router"

# Audit Rules
check "high" "Audit rules are immutable" \
    "auditctl -l | grep -q '\-e 2'" \
    "Audit rules must be set immutable"

# Logging
check "medium" "Syslog is running" \
    "systemctl is-active rsyslog || systemctl is-active syslog" \
    "System logging must be active"

echo ""
echo "=== Results: $PASS passed, $FAIL failed (including $CRITICAL critical failures) ==="

# Exit with failure if any critical checks fail
[ "$CRITICAL" -gt 0 ] && exit 2
[ "$FAIL" -gt 0 ] && exit 1
exit 0
```

## Installing Lynis for Security Auditing

```bash
# Install Lynis
sudo apt install lynis -y

# Run a full system audit
sudo lynis audit system --quick

# View the last report
sudo cat /var/log/lynis.log | grep "Suggestion\|Warning" | head -30

# Run and save report
sudo lynis audit system --report-file /var/log/compliance/lynis-$(date +%Y%m%d).log

# Extract hardening index score
sudo grep "Hardening index" /var/log/lynis.log
```

Automate Lynis and alert on score drops:

```bash
sudo tee /usr/local/bin/lynis-check.sh << 'SCRIPT'
#!/bin/bash

PREV_SCORE_FILE="/var/log/compliance/lynis-prev-score.txt"
REPORT="/var/log/compliance/lynis-$(date +%Y%m%d).log"

sudo lynis audit system --quiet --report-file "$REPORT"

CURRENT_SCORE=$(grep "Hardening index" "$REPORT" | awk '{print $NF}' | tr -d '[]')

echo "Current Lynis hardening index: $CURRENT_SCORE"

if [ -f "$PREV_SCORE_FILE" ]; then
    PREV_SCORE=$(cat "$PREV_SCORE_FILE")
    if [ "$CURRENT_SCORE" -lt "$PREV_SCORE" ]; then
        echo "Lynis score dropped from $PREV_SCORE to $CURRENT_SCORE on $(hostname)" | \
            mail -s "Compliance Score Drop Alert" admin@example.com
    fi
fi

echo "$CURRENT_SCORE" > "$PREV_SCORE_FILE"
SCRIPT
sudo chmod +x /usr/local/bin/lynis-check.sh
```

## Alerting with OneUptime

Integrate compliance check results with [OneUptime](https://oneuptime.com) for centralized monitoring and alerting. Use OneUptime's HTTP monitors to call a compliance status endpoint:

```bash
# Create a compliance status endpoint script
sudo tee /usr/local/bin/compliance-status-api.sh << 'SCRIPT'
#!/bin/bash
# Returns compliance status as JSON for monitoring systems

/usr/local/bin/custom-compliance-check.sh > /tmp/compliance-status.txt 2>&1
EXIT_CODE=$?

FAIL_COUNT=$(grep -c "^\[FAIL\]" /tmp/compliance-status.txt || echo 0)
PASS_COUNT=$(grep -c "^\[PASS\]" /tmp/compliance-status.txt || echo 0)
CRITICAL=$(grep -c "^\[FAIL\].*\[critical\]" /tmp/compliance-status.txt || echo 0)

STATUS="compliant"
[ "$FAIL_COUNT" -gt 0 ] && STATUS="non_compliant"

echo "Content-Type: application/json"
echo ""
echo "{\"status\": \"$STATUS\", \"pass\": $PASS_COUNT, \"fail\": $FAIL_COUNT, \"critical\": $CRITICAL, \"host\": \"$(hostname)\", \"timestamp\": \"$(date -u +%Y-%m-%dT%H:%M:%SZ)\"}"
SCRIPT
```

## Compliance Reporting

Generate weekly compliance reports:

```bash
sudo tee /usr/local/bin/weekly-compliance-report.sh << 'SCRIPT'
#!/bin/bash

REPORT_DATE=$(date '+%Y-%m-%d')
REPORT_FILE="/var/log/compliance/weekly-report-$REPORT_DATE.txt"

echo "Weekly Compliance Report - $(hostname)" > "$REPORT_FILE"
echo "Generated: $(date)" >> "$REPORT_FILE"
echo "" >> "$REPORT_FILE"

echo "=== Custom Compliance Checks ===" >> "$REPORT_FILE"
/usr/local/bin/custom-compliance-check.sh >> "$REPORT_FILE" 2>&1

echo "" >> "$REPORT_FILE"
echo "=== Security Updates Pending ===" >> "$REPORT_FILE"
apt-get -s upgrade 2>/dev/null | grep "^Inst.*security" >> "$REPORT_FILE" || echo "None" >> "$REPORT_FILE"

echo "" >> "$REPORT_FILE"
echo "=== Failed Authentication (Last 7 Days) ===" >> "$REPORT_FILE"
grep "authentication failure" /var/log/auth.log | wc -l >> "$REPORT_FILE"

# Email the report
mail -s "Weekly Compliance Report - $(hostname)" admin@example.com < "$REPORT_FILE"
echo "Report sent."
SCRIPT

sudo chmod +x /usr/local/bin/weekly-compliance-report.sh

# Schedule Monday morning
echo "0 7 * * 1 root /usr/local/bin/weekly-compliance-report.sh" | sudo tee /etc/cron.d/weekly-compliance
```

Automated compliance monitoring converts security policy from a document into a measurable reality. The gap between what you think your systems look like and what they actually look like is often surprising. Regular automated checks make that gap visible and actionable.
