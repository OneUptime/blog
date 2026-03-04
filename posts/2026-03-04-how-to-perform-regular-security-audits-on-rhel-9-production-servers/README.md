# How to Perform Regular Security Audits on RHEL 9 Production Servers

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, Linux, Performance

Description: Step-by-step guide on perform regular security audits on rhel 9 production servers with practical examples and commands.

---

Regular security audits on RHEL 9 production servers identify vulnerabilities and configuration drift before they are exploited.

## OpenSCAP Compliance Scan

```bash
sudo dnf install -y openscap-scanner scap-security-guide

# Run CIS benchmark scan
sudo oscap xccdf eval \
  --profile xccdf_org.ssgproject.content_profile_cis \
  --results /var/log/audit/scap-results.xml \
  --report /var/log/audit/scap-report.html \
  /usr/share/xml/scap/ssg/content/ssg-rhel9-ds.xml
```

## Vulnerability Scanning

```bash
# Check for known CVEs
sudo oscap oval eval \
  --results /var/log/audit/oval-results.xml \
  --report /var/log/audit/oval-report.html \
  /usr/share/xml/scap/ssg/content/ssg-rhel9-oval.xml
```

## User Account Audit

```bash
# Find accounts with no password
sudo awk -F: '($2 == "" ) {print $1}' /etc/shadow

# Find accounts with UID 0
awk -F: '($3 == 0) {print $1}' /etc/passwd

# Check for unauthorized SSH keys
for dir in /home/*/.ssh; do
  echo "=== $dir ==="
  ls -la "$dir/authorized_keys" 2>/dev/null
done
```

## File Integrity Check

```bash
# Initialize AIDE if not done
sudo aide --init
sudo mv /var/lib/aide/aide.db.new.gz /var/lib/aide/aide.db.gz

# Run integrity check
sudo aide --check
```

## Network Audit

```bash
# Check open ports
sudo ss -tlnp

# Check firewall rules
sudo firewall-cmd --list-all

# Verify no unexpected services
sudo systemctl list-units --type=service --state=running
```

## SELinux Audit

```bash
# Check for denials
sudo ausearch -m AVC -ts this-month

# Verify mode
getenforce

# Check for disabled booleans that should be enabled
getsebool -a | grep " off"
```

## Audit Log Review

```bash
# Review failed logins
sudo lastb | head -20

# Review sudo usage
sudo journalctl _COMM=sudo --since="1 month ago"

# Review authentication failures
sudo grep "authentication failure" /var/log/secure
```

## Generate Audit Report

Compile findings into a report:

```bash
# Combine SCAP results with system audit data
echo "Security Audit Report - $(date)" > /var/log/audit/audit-report.txt
echo "OpenSCAP Score: $(grep score /var/log/audit/scap-results.xml)" >> /var/log/audit/audit-report.txt
echo "Open Ports:" >> /var/log/audit/audit-report.txt
sudo ss -tlnp >> /var/log/audit/audit-report.txt
```

## Conclusion

Regular security audits on RHEL 9 combine compliance scanning with OpenSCAP, file integrity monitoring with AIDE, and manual review of users, network, and logs. Schedule audits monthly and address findings promptly.

