# How to Implement SCAP Security Guide on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, Security, SCAP, Compliance, Hardening

Description: Implement the SCAP Security Guide on Ubuntu to perform automated compliance scanning and remediation against NIST, CIS, and STIG security profiles.

---

The Security Content Automation Protocol (SCAP) is a set of standards maintained by NIST for automated security checking. The SCAP Security Guide (SSG) project provides SCAP content for Ubuntu, enabling automated scanning against well-known security profiles including CIS Benchmarks and DISA STIGs. This is a step above running manual checklists - SCAP scanners can assess hundreds of controls in minutes and produce audit-ready reports.

## Understanding SCAP Components

SCAP combines several specifications:

- **XCCDF** (Extensible Configuration Checklist Description Format) - defines profiles and rules
- **OVAL** (Open Vulnerability and Assessment Language) - defines how to check system state
- **CPE** (Common Platform Enumeration) - identifies platforms
- **CVE** (Common Vulnerabilities and Exposures) - vulnerability identifiers

The SCAP Security Guide packages all of this into content files you point a scanner at.

## Install OpenSCAP and SCAP Security Guide

```bash
# Install the OpenSCAP scanner and utilities
sudo apt-get update
sudo apt-get install -y libopenscap8 openscap-scanner openscap-utils

# Install SCAP Security Guide content
sudo apt-get install -y ssg-ubuntu ssg-base ssg-debderived

# Verify installation
oscap --version

# List available content
ls /usr/share/xml/scap/ssg/content/
```

The content directory will contain files like `ssg-ubuntu2204-ds.xml` (Data Stream format combining all SCAP components).

## List Available Profiles

Before running a scan, see what profiles are available in the content:

```bash
# List all profiles in the Ubuntu 22.04 content
oscap info /usr/share/xml/scap/ssg/content/ssg-ubuntu2204-ds.xml

# The output shows available profiles like:
# - xccdf_org.ssgproject.content_profile_cis_level1_server
# - xccdf_org.ssgproject.content_profile_cis_level2_server
# - xccdf_org.ssgproject.content_profile_standard
```

Common profiles:

| Profile ID | Description |
|------------|-------------|
| `cis_level1_server` | CIS Benchmark Level 1 for servers |
| `cis_level2_server` | CIS Benchmark Level 2 for servers |
| `standard` | Basic Ubuntu security guide |

## Run a Compliance Scan

```bash
# Create a results directory
sudo mkdir -p /var/log/scap

# Run a CIS Level 1 scan and generate XML and HTML reports
sudo oscap xccdf eval \
    --profile xccdf_org.ssgproject.content_profile_cis_level1_server \
    --results /var/log/scap/results-$(date +%Y%m%d).xml \
    --report /var/log/scap/report-$(date +%Y%m%d).html \
    --oval-results \
    /usr/share/xml/scap/ssg/content/ssg-ubuntu2204-ds.xml

echo "Exit code: $?"
```

The exit code indicates the scan result:
- `0` - all checks passed
- `1` - some checks failed
- `2` - evaluation error

```bash
# Open the HTML report in a browser to review results
# Copy it to your workstation if on a headless server
scp root@server:/var/log/scap/report-$(date +%Y%m%d).html ./
```

## Interpret Scan Results

The XML results file contains detailed findings. Use `oscap` to parse it:

```bash
# Show a summary of results
oscap xccdf generate report /var/log/scap/results-$(date +%Y%m%d).xml | \
    head -100

# Count pass/fail
grep -c 'result>pass<' /var/log/scap/results-$(date +%Y%m%d).xml
grep -c 'result>fail<' /var/log/scap/results-$(date +%Y%m%d).xml

# List only failing rules
oscap xccdf generate fix \
    --result-id xccdf_org.open-scap.results:xccdf_result \
    /var/log/scap/results-$(date +%Y%m%d).xml
```

## Generate a Remediation Script

One of SCAP's most powerful features is generating remediation scripts automatically from scan results:

```bash
# Generate a bash remediation script for all failing checks
sudo oscap xccdf generate fix \
    --fix-type bash \
    --result-id "" \
    --output /tmp/scap-remediation.sh \
    /var/log/scap/results-$(date +%Y%m%d).xml

# Review the script before running it
less /tmp/scap-remediation.sh
```

The generated script is not something to run blindly - review each section to understand what it changes. Some remediations (like disabling services) may break applications if applied without thought.

```bash
# Apply the remediation
sudo bash /tmp/scap-remediation.sh 2>&1 | tee /var/log/scap/remediation-$(date +%Y%m%d).log

# Run the scan again to verify improvement
sudo oscap xccdf eval \
    --profile xccdf_org.ssgproject.content_profile_cis_level1_server \
    --results /var/log/scap/results-post-$(date +%Y%m%d).xml \
    --report /var/log/scap/report-post-$(date +%Y%m%d).html \
    /usr/share/xml/scap/ssg/content/ssg-ubuntu2204-ds.xml
```

## Generate an Ansible Remediation Playbook

For infrastructure managed with Ansible, generate a playbook instead of a shell script:

```bash
# Generate Ansible remediation tasks
sudo oscap xccdf generate fix \
    --fix-type ansible \
    --result-id "" \
    --output /tmp/scap-remediation.yml \
    /var/log/scap/results-$(date +%Y%m%d).xml

# Apply via Ansible
ansible-playbook -i inventory /tmp/scap-remediation.yml --become
```

## Scan Against a Custom Profile (Tailoring)

When a standard profile has rules that do not apply to your environment, create a tailoring file to exclude them:

```bash
# Create a tailoring file to disable specific rules
cat > /tmp/my-tailoring.xml << 'EOF'
<?xml version="1.0" encoding="utf-8"?>
<xccdf:Tailoring
    xmlns:xccdf="http://checklists.nist.gov/xccdf/1.2"
    id="xccdf_custom_tailoring_001">

  <xccdf:version time="2026-03-02T00:00:00">1</xccdf:version>

  <xccdf:Profile
      id="xccdf_custom_tailoring_profile_cis_customized"
      extends="xccdf_org.ssgproject.content_profile_cis_level1_server">

    <xccdf:title>CIS Level 1 - Customized</xccdf:title>

    <!-- Disable AIDE file integrity check (use Tripwire instead) -->
    <xccdf:select
        idref="xccdf_org.ssgproject.content_rule_aide_build_database"
        selected="false"/>

    <!-- Disable rsync removal if needed for this server role -->
    <xccdf:select
        idref="xccdf_org.ssgproject.content_rule_package_rsync_removed"
        selected="false"/>
  </xccdf:Profile>
</xccdf:Tailoring>
EOF

# Scan with the tailoring file
sudo oscap xccdf eval \
    --profile xccdf_custom_tailoring_profile_cis_customized \
    --tailoring-file /tmp/my-tailoring.xml \
    --results /var/log/scap/results-tailored-$(date +%Y%m%d).xml \
    --report /var/log/scap/report-tailored-$(date +%Y%m%d).html \
    /usr/share/xml/scap/ssg/content/ssg-ubuntu2204-ds.xml
```

## Automate SCAP Scanning

Set up a weekly SCAP scan that emails the HTML report:

```bash
sudo nano /usr/local/bin/scap-weekly-scan.sh
```

```bash
#!/bin/bash
# Weekly SCAP compliance scan

CONTENT="/usr/share/xml/scap/ssg/content/ssg-ubuntu2204-ds.xml"
PROFILE="xccdf_org.ssgproject.content_profile_cis_level1_server"
DATE=$(date +%Y%m%d)
RESULTS_DIR="/var/log/scap"

mkdir -p "$RESULTS_DIR"

# Run the scan
oscap xccdf eval \
    --profile "$PROFILE" \
    --results "$RESULTS_DIR/results-$DATE.xml" \
    --report "$RESULTS_DIR/report-$DATE.html" \
    "$CONTENT" > "$RESULTS_DIR/scan-$DATE.log" 2>&1

EXIT_CODE=$?

# Parse results
PASS=$(grep -c 'result>pass<' "$RESULTS_DIR/results-$DATE.xml" 2>/dev/null || echo 0)
FAIL=$(grep -c 'result>fail<' "$RESULTS_DIR/results-$DATE.xml" 2>/dev/null || echo 0)

echo "SCAP scan on $(hostname) - Pass: $PASS, Fail: $FAIL, Exit: $EXIT_CODE"

# Clean up reports older than 90 days
find "$RESULTS_DIR" -name "*.xml" -mtime +90 -delete
find "$RESULTS_DIR" -name "*.html" -mtime +90 -delete
```

```bash
sudo chmod +x /usr/local/bin/scap-weekly-scan.sh

# Schedule weekly
echo "0 2 * * 0 root /usr/local/bin/scap-weekly-scan.sh" | \
    sudo tee /etc/cron.d/scap-weekly
```

## Integrate with Compliance Workflows

SCAP output integrates with compliance management platforms. The XML results file follows the XCCDF standard, making it importable into tools like:

- OpenSCAP Workbench (GUI viewer)
- Foreman/Satellite (with OpenSCAP plugin)
- Ansible Automation Platform (compliance policies)
- Custom dashboards via XML parsing

SCAP provides machine-readable, auditor-accepted compliance evidence. Running it quarterly or after major changes gives you defensible documentation that specific controls are met, which is particularly important for PCI DSS, HIPAA, or government security frameworks.
