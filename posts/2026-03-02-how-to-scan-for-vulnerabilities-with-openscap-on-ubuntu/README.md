# How to Scan for Vulnerabilities with OpenSCAP on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, Security, OpenSCAP, Vulnerability Scanning, Compliance

Description: Learn how to install OpenSCAP on Ubuntu, download SCAP security content, run vulnerability scans, and generate compliance reports for system hardening.

---

OpenSCAP is the open-source implementation of the Security Content Automation Protocol (SCAP) - a NIST standard for automated vulnerability scanning and compliance checking. Organizations under regulatory frameworks like PCI-DSS, HIPAA, or CIS benchmarks rely on OpenSCAP to audit their systems against established baselines. On Ubuntu, you can have it running assessments within minutes of installation.

This guide covers installing OpenSCAP, fetching relevant security content, running scans against your Ubuntu system, and making sense of the reports it generates.

## What OpenSCAP Does

OpenSCAP reads XML-based security policies (XCCDF documents and OVAL definitions) and evaluates your system against them. Each rule in a profile checks something specific - whether SSH root login is disabled, whether password complexity requirements are set, whether certain kernel parameters are configured correctly. The result is a pass/fail report for every rule, along with an overall score.

The two main scan types are:
- **Compliance scanning** - checks system configuration against a security benchmark (CIS, STIG, etc.)
- **Vulnerability scanning** - checks installed packages against known CVE databases

## Installing OpenSCAP

```bash
# Update package lists
sudo apt update

# Install the OpenSCAP scanner and utilities
sudo apt install -y libopenscap8 openscap-scanner openscap-utils

# Verify installation
oscap --version
```

The `oscap` command is the main tool you'll use for everything.

## Getting SCAP Security Content

OpenSCAP is just the engine - you need security content (policies) to scan against. Two main sources are useful for Ubuntu:

### SCAP Security Guide (SSG)

The SCAP Security Guide project publishes ready-made profiles for Ubuntu:

```bash
# Install the SCAP Security Guide content for Ubuntu
sudo apt install -y ssg-base ssg-debderived

# List available content files
ls /usr/share/xml/scap/ssg/content/
```

You'll see files like `ssg-ubuntu2004-ds.xml` or `ssg-ubuntu2204-ds.xml` - the datastream files that contain both the XCCDF benchmark and OVAL definitions in a single file.

### Ubuntu OVAL Data

Canonical publishes OVAL data specifically for Ubuntu CVE tracking:

```bash
# Download Ubuntu OVAL data (adjust for your release)
wget https://security-metadata.canonical.com/oval/com.ubuntu.$(lsb_release -cs).usn.oval.xml.bz2

# Decompress it
bunzip2 com.ubuntu.$(lsb_release -cs).usn.oval.xml.bz2

# Verify the file
ls -lh com.ubuntu.*.oval.xml
```

## Exploring Available Profiles

Before scanning, look at what profiles are available in the SSG datastream:

```bash
# List all profiles in the Ubuntu datastream
# Replace with the correct filename for your Ubuntu version
oscap info /usr/share/xml/scap/ssg/content/ssg-ubuntu2204-ds.xml
```

Common profiles you'll see:
- `xccdf_org.ssgproject.content_profile_cis_level1_server` - CIS Level 1 server benchmark
- `xccdf_org.ssgproject.content_profile_cis_level2_server` - CIS Level 2 server benchmark
- `xccdf_org.ssgproject.content_profile_standard` - Basic standard profile

List just the profile IDs and titles more cleanly:

```bash
oscap info --fetch-remote-resources /usr/share/xml/scap/ssg/content/ssg-ubuntu2204-ds.xml 2>/dev/null | grep -A1 "Title:"
```

## Running a Compliance Scan

Run a scan against the CIS Level 1 server profile:

```bash
# Create output directory for reports
mkdir -p ~/openscap-reports

# Run the compliance scan
# This will take a few minutes to check all rules
sudo oscap xccdf eval \
  --profile xccdf_org.ssgproject.content_profile_cis_level1_server \
  --results ~/openscap-reports/results.xml \
  --report ~/openscap-reports/report.html \
  --oval-results \
  /usr/share/xml/scap/ssg/content/ssg-ubuntu2204-ds.xml
```

The command parameters:
- `--profile` - which security profile to evaluate against
- `--results` - output XML file with machine-readable results
- `--report` - output HTML file you can open in a browser
- `--oval-results` - include OVAL results in the output

At the end of the scan, you'll see a summary like:

```text
Title   Ensure Auditing for Processes Prior to auditd is Enabled
Rule    xccdf_org.ssgproject.content_rule_grub2_audit_argument
Result  pass

Title   Ensure SSH Root Login is Disabled
Rule    xccdf_org.ssgproject.content_rule_sshd_disable_root_login
Result  pass

...

Score: 42.00% (42.00 / 100.00)
```

## Running a Vulnerability Scan with Ubuntu OVAL

The OVAL scan checks installed packages against Canonical's CVE database:

```bash
# Run vulnerability scan with Ubuntu OVAL data
sudo oscap oval eval \
  --results ~/openscap-reports/oval-results.xml \
  --report ~/openscap-reports/oval-report.html \
  com.ubuntu.jammy.usn.oval.xml
```

This produces a report showing which USN (Ubuntu Security Notice) advisories affect packages currently installed on your system.

## Reading the HTML Report

Open the HTML report in a browser or transfer it to your workstation:

```bash
# If you're on the server directly
xdg-open ~/openscap-reports/report.html

# Or copy to your local machine from a remote server
scp user@server:~/openscap-reports/report.html ./
```

The report has three sections:
1. **Score** - overall compliance percentage
2. **Rule Results** - table of every rule with pass/fail/notchecked/notapplicable status
3. **Rule Details** - descriptions and remediation guidance for each failing rule

Each failing rule includes a description of what should be configured and often includes the specific remediation command or configuration change needed.

## Generating Remediation Scripts

OpenSCAP can generate bash scripts or Ansible playbooks to automatically fix failing rules:

```bash
# Generate a bash remediation script
sudo oscap xccdf generate fix \
  --profile xccdf_org.ssgproject.content_profile_cis_level1_server \
  --fix-type bash \
  --output ~/openscap-reports/remediation.sh \
  /usr/share/xml/scap/ssg/content/ssg-ubuntu2204-ds.xml

# Generate an Ansible playbook instead
sudo oscap xccdf generate fix \
  --profile xccdf_org.ssgproject.content_profile_cis_level1_server \
  --fix-type ansible \
  --output ~/openscap-reports/remediation.yml \
  /usr/share/xml/scap/ssg/content/ssg-ubuntu2204-ds.xml
```

Review the remediation script carefully before running it. Some fixes can affect running services or change authentication behavior. Run it on a test system first.

## Evaluating Specific Rules

To check just a subset of rules rather than an entire profile:

```bash
# Scan with a specific rule only
sudo oscap xccdf eval \
  --rule xccdf_org.ssgproject.content_rule_sshd_disable_root_login \
  --results ~/openscap-reports/ssh-result.xml \
  /usr/share/xml/scap/ssg/content/ssg-ubuntu2204-ds.xml
```

## Automating Scans

Schedule regular scans with a cron job or systemd timer to track your compliance posture over time:

```bash
# Create a scan script
sudo nano /usr/local/bin/openscap-scan.sh
```

```bash
#!/bin/bash
# OpenSCAP automated compliance scan

CONTENT="/usr/share/xml/scap/ssg/content/ssg-ubuntu2204-ds.xml"
PROFILE="xccdf_org.ssgproject.content_profile_cis_level1_server"
REPORT_DIR="/var/log/openscap"
TIMESTAMP=$(date +%Y%m%d-%H%M%S)

# Create report directory if needed
mkdir -p "$REPORT_DIR"

# Run the scan
oscap xccdf eval \
  --profile "$PROFILE" \
  --results "$REPORT_DIR/results-$TIMESTAMP.xml" \
  --report "$REPORT_DIR/report-$TIMESTAMP.html" \
  "$CONTENT"

# Extract the score for logging
SCORE=$(oscap info "$REPORT_DIR/results-$TIMESTAMP.xml" 2>/dev/null | grep -i score | awk '{print $2}')
echo "$(date): Compliance scan complete. Score: $SCORE" >> "$REPORT_DIR/scan.log"

# Remove reports older than 30 days
find "$REPORT_DIR" -name "*.xml" -mtime +30 -delete
find "$REPORT_DIR" -name "*.html" -mtime +30 -delete
```

```bash
sudo chmod +x /usr/local/bin/openscap-scan.sh

# Schedule weekly scan via cron
echo "0 2 * * 0 root /usr/local/bin/openscap-scan.sh" | sudo tee /etc/cron.d/openscap-weekly
```

## Interpreting Results in Context

Not every failing rule is a critical problem. OpenSCAP will flag things like:

- **notapplicable** - the rule doesn't apply to your system (e.g., a rule about a package you don't have installed)
- **notchecked** - OpenSCAP couldn't evaluate the rule automatically
- **informational** - noted for awareness, not necessarily a violation

Focus remediation effort on `fail` results from high-severity rules first. Look at the rule severity in the HTML report.

## Keeping OVAL Content Updated

The Ubuntu OVAL data updates frequently as new CVEs are published. Refresh it weekly:

```bash
# Download fresh OVAL data
cd /var/lib/openscap/oval/
sudo wget -N https://security-metadata.canonical.com/oval/com.ubuntu.jammy.usn.oval.xml.bz2
sudo bunzip2 -f com.ubuntu.jammy.usn.oval.xml.bz2
```

OpenSCAP combined with regular scans and a solid process for reviewing and remediating findings gives you a strong, auditable security posture on Ubuntu systems.
