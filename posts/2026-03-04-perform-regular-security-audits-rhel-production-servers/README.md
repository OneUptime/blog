# How to Perform Regular Security Audits on RHEL Production Servers

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, Security, Audit, Compliance, OpenSCAP

Description: Run security audits on RHEL production servers using OpenSCAP, auditd, and manual checks to maintain compliance and find vulnerabilities.

---

Regular security audits catch misconfigurations and vulnerabilities before attackers do. RHEL includes powerful auditing tools out of the box. Here is how to use them.

## OpenSCAP Compliance Scanning

RHEL ships with OpenSCAP, which can evaluate your system against CIS benchmarks, DISA STIGs, and other security profiles:

```bash
# Install OpenSCAP and the RHEL security content
sudo dnf install openscap-scanner scap-security-guide

# List available security profiles
oscap info /usr/share/xml/scap/ssg/content/ssg-rhel9-ds.xml | grep "Profile:"
```

Run a scan against the CIS benchmark:

```bash
# Run a CIS Level 1 Server scan and generate an HTML report
sudo oscap xccdf eval \
  --profile xccdf_org.ssgproject.content_profile_cis \
  --report /tmp/cis-audit-report.html \
  --results /tmp/cis-audit-results.xml \
  /usr/share/xml/scap/ssg/content/ssg-rhel9-ds.xml
```

## Reviewing the Audit Report

```bash
# Open the report (transfer to a workstation if needed)
# The report shows pass/fail/not-applicable for each rule

# Generate a remediation script for failed items
sudo oscap xccdf generate fix \
  --fix-type bash \
  --result-id "" \
  /tmp/cis-audit-results.xml > /tmp/remediation.sh

# Review the script before running it
cat /tmp/remediation.sh
```

## Auditing with auditd

Configure auditd to monitor security-relevant events:

```bash
# Check that auditd is running
sudo systemctl is-active auditd

# View the current audit rules
sudo auditctl -l

# Search for privilege escalation attempts
sudo ausearch -m USER_AUTH,USER_ACCT --success no --start today

# Search for unauthorized file access attempts
sudo ausearch -m SYSCALL -k unauthorized-access --start today
```

## Checking for Known Vulnerabilities

```bash
# List all security advisories affecting your system
sudo dnf updateinfo list security --available

# Check for critical vulnerabilities specifically
sudo dnf updateinfo list --security --severity Critical --available

# Get details on a specific advisory
sudo dnf updateinfo info RHSA-2024:1234
```

## Manual Security Checks

Run these checks as part of your audit:

```bash
# Check for world-writable files
sudo find / -xdev -type f -perm -0002 -ls 2>/dev/null

# Check for unowned files
sudo find / -xdev \( -nouser -o -nogroup \) -ls 2>/dev/null

# Check for unauthorized SUID/SGID binaries
sudo find / -xdev \( -perm -4000 -o -perm -2000 \) -type f -ls 2>/dev/null

# Verify no accounts have empty passwords
sudo awk -F: '($2 == "") {print $1}' /etc/shadow

# Check listening ports for unexpected services
sudo ss -tulnp
```

## Scheduling Regular Audits

```bash
# Run a weekly OpenSCAP scan via cron
sudo tee /etc/cron.d/security-audit << 'EOF'
0 3 * * 0 root oscap xccdf eval --profile xccdf_org.ssgproject.content_profile_cis --report /var/log/audit/weekly-scan-$(date +\%Y\%m\%d).html /usr/share/xml/scap/ssg/content/ssg-rhel9-ds.xml > /dev/null 2>&1
EOF
```

Keep audit reports for at least 12 months and compare them over time to track your security posture improvements.
