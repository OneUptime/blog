# How to Run OpenSCAP Compliance Scans on Ubuntu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ubuntu, OpenSCAP, Compliance, Security, SCAP, Tutorial

Description: Complete guide to using OpenSCAP for security compliance scanning on Ubuntu.

---

Security compliance is a critical aspect of system administration, especially in regulated industries. OpenSCAP provides a powerful, standardized framework for assessing and enforcing security policies on your Ubuntu systems. This comprehensive guide walks you through everything you need to know about running compliance scans with OpenSCAP.

## Understanding SCAP and OpenSCAP

### What is SCAP?

The Security Content Automation Protocol (SCAP) is a collection of specifications maintained by the National Institute of Standards and Technology (NIST). SCAP provides a standardized approach to maintaining system security through:

- **CVE (Common Vulnerabilities and Exposures)**: Standardized identifiers for known vulnerabilities
- **CCE (Common Configuration Enumeration)**: Unique identifiers for system configuration issues
- **CPE (Common Platform Enumeration)**: Standardized method for describing and identifying IT platforms
- **CVSS (Common Vulnerability Scoring System)**: Framework for rating vulnerability severity
- **XCCDF (Extensible Configuration Checklist Description Format)**: Language for writing security checklists
- **OVAL (Open Vulnerability and Assessment Language)**: Language for encoding system details and assessing machine state

### What is OpenSCAP?

OpenSCAP is an open-source implementation of the SCAP standard. It provides:

- Command-line tools for scanning systems
- Libraries for integrating SCAP into applications
- A graphical workbench for creating and running scans
- Support for multiple compliance profiles (CIS, DISA STIG, PCI-DSS)

OpenSCAP enables organizations to automate vulnerability assessments, configuration compliance checks, and security policy enforcement.

## Installing OpenSCAP Tools

### Installing the Core Package

First, update your package list and install the OpenSCAP scanner:

```bash
# Update package repositories
sudo apt update

# Install OpenSCAP scanner and utilities
sudo apt install -y libopenscap8 openscap-scanner openscap-utils

# Verify installation
oscap --version
```

You should see output similar to:

```
OpenSCAP command line tool (oscap) 1.3.x
Copyright 2009--2021 Red Hat Inc., Durham, North Carolina.
```

### Installing SCAP Security Guide Content

The SCAP Security Guide (SSG) provides pre-built security policies and profiles:

```bash
# Install SCAP Security Guide for Ubuntu
sudo apt install -y scap-security-guide

# List available SCAP content files
ls -la /usr/share/xml/scap/ssg/content/
```

### Installing SCAP Workbench (GUI)

For a graphical interface:

```bash
# Install SCAP Workbench
sudo apt install -y scap-workbench

# Launch the workbench (requires X11/desktop environment)
scap-workbench &
```

## SCAP Content and Profiles

### Understanding SCAP Content Structure

SCAP content is organized in XML files containing:

- **XCCDF files**: Define checklists, rules, and profiles
- **OVAL files**: Define how to check system state
- **CPE dictionaries**: Define platform applicability

### Listing Available Content

```bash
# List all available SCAP data streams
ls /usr/share/xml/scap/ssg/content/*.xml

# Common Ubuntu content files:
# - ssg-ubuntu2004-ds.xml (Ubuntu 20.04)
# - ssg-ubuntu2204-ds.xml (Ubuntu 22.04)
# - ssg-ubuntu2404-ds.xml (Ubuntu 24.04)
```

### Viewing Available Profiles

Each SCAP data stream contains multiple security profiles:

```bash
# List all profiles in Ubuntu 22.04 data stream
oscap info /usr/share/xml/scap/ssg/content/ssg-ubuntu2204-ds.xml

# Example output shows profiles like:
# - xccdf_org.ssgproject.content_profile_cis_level1_server
# - xccdf_org.ssgproject.content_profile_cis_level1_workstation
# - xccdf_org.ssgproject.content_profile_cis_level2_server
# - xccdf_org.ssgproject.content_profile_cis_level2_workstation
# - xccdf_org.ssgproject.content_profile_stig
# - xccdf_org.ssgproject.content_profile_standard
```

### Common Security Profiles Explained

| Profile | Description | Use Case |
|---------|-------------|----------|
| CIS Level 1 Server | Basic security hardening for servers | Production servers with minimal security requirements |
| CIS Level 2 Server | Enhanced security hardening | High-security environments |
| DISA STIG | Department of Defense security requirements | Government/military systems |
| Standard | Basic security checks | Development environments |
| PCI-DSS | Payment Card Industry compliance | Systems handling credit card data |

## Running Vulnerability Scans (OVAL)

OVAL (Open Vulnerability and Assessment Language) scans check for known vulnerabilities.

### Basic OVAL Vulnerability Scan

```bash
# Download Ubuntu's official OVAL definitions
# These contain known vulnerabilities for Ubuntu packages

# Create a directory for OVAL content
sudo mkdir -p /var/lib/openscap/oval

# Download the latest Ubuntu OVAL definitions
# For Ubuntu 22.04 (jammy):
wget -O /tmp/com.ubuntu.jammy.usn.oval.xml.bz2 \
    https://security-metadata.canonical.com/oval/com.ubuntu.jammy.usn.oval.xml.bz2

# Extract the OVAL definitions
bunzip2 /tmp/com.ubuntu.jammy.usn.oval.xml.bz2
sudo mv /tmp/com.ubuntu.jammy.usn.oval.xml /var/lib/openscap/oval/

# Run the vulnerability scan
sudo oscap oval eval \
    --results /tmp/oval-results.xml \
    --report /tmp/oval-report.html \
    /var/lib/openscap/oval/com.ubuntu.jammy.usn.oval.xml
```

### Understanding OVAL Results

```bash
# View summary of vulnerable packages
grep -A2 "result.*true" /tmp/oval-results.xml | head -50

# The report shows:
# - Definition ID: Unique identifier for the vulnerability check
# - Result: true (vulnerable) or false (not vulnerable)
# - CVE references: Related CVE identifiers
```

### Automated OVAL Definition Updates

Create a script to keep OVAL definitions current:

```bash
#!/bin/bash
# /usr/local/bin/update-oval-definitions.sh
# Script to download and update Ubuntu OVAL definitions

# Configuration
OVAL_DIR="/var/lib/openscap/oval"
UBUNTU_CODENAME=$(lsb_release -cs)
OVAL_URL="https://security-metadata.canonical.com/oval/com.ubuntu.${UBUNTU_CODENAME}.usn.oval.xml.bz2"

# Create directory if it doesn't exist
mkdir -p "${OVAL_DIR}"

# Download latest definitions
echo "Downloading OVAL definitions for Ubuntu ${UBUNTU_CODENAME}..."
wget -q -O /tmp/oval-definitions.xml.bz2 "${OVAL_URL}"

# Extract and install
bunzip2 -f /tmp/oval-definitions.xml.bz2
mv /tmp/oval-definitions.xml "${OVAL_DIR}/com.ubuntu.${UBUNTU_CODENAME}.usn.oval.xml"

echo "OVAL definitions updated successfully"
echo "Last update: $(date)" > "${OVAL_DIR}/last-update.txt"
```

## Running Compliance Scans (XCCDF)

XCCDF scans evaluate system configuration against security benchmarks.

### Basic Compliance Scan

```bash
# Run a CIS Level 1 Server compliance scan on Ubuntu 22.04
sudo oscap xccdf eval \
    --profile xccdf_org.ssgproject.content_profile_cis_level1_server \
    --results /tmp/xccdf-results.xml \
    --report /tmp/xccdf-report.html \
    /usr/share/xml/scap/ssg/content/ssg-ubuntu2204-ds.xml
```

### Detailed Compliance Scan with All Options

```bash
#!/bin/bash
# /usr/local/bin/run-compliance-scan.sh
# Comprehensive compliance scanning script

# Configuration variables
SCAP_CONTENT="/usr/share/xml/scap/ssg/content/ssg-ubuntu2204-ds.xml"
PROFILE="xccdf_org.ssgproject.content_profile_cis_level2_server"
RESULTS_DIR="/var/log/openscap"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
HOSTNAME=$(hostname)

# Create results directory
mkdir -p "${RESULTS_DIR}"

# Run the compliance scan with detailed output
echo "Starting OpenSCAP compliance scan..."
echo "Profile: ${PROFILE}"
echo "Timestamp: ${TIMESTAMP}"

sudo oscap xccdf eval \
    --profile "${PROFILE}" \
    --results "${RESULTS_DIR}/${HOSTNAME}-xccdf-results-${TIMESTAMP}.xml" \
    --report "${RESULTS_DIR}/${HOSTNAME}-xccdf-report-${TIMESTAMP}.html" \
    --oval-results \
    --fetch-remote-resources \
    --progress \
    "${SCAP_CONTENT}"

# Capture exit code
EXIT_CODE=$?

# Generate summary
echo ""
echo "Scan completed with exit code: ${EXIT_CODE}"
echo "Results saved to: ${RESULTS_DIR}/"
echo ""

# Parse and display summary statistics
echo "=== Compliance Summary ==="
oscap xccdf generate stats "${RESULTS_DIR}/${HOSTNAME}-xccdf-results-${TIMESTAMP}.xml"
```

### Understanding Scan Results

The scan produces several result categories:

| Result | Meaning |
|--------|---------|
| pass | Rule requirements are met |
| fail | Rule requirements are not met |
| error | Error occurred during evaluation |
| unknown | Result could not be determined |
| notapplicable | Rule does not apply to this system |
| notchecked | Rule was not evaluated |
| notselected | Rule was not selected in the profile |
| informational | Informational rule only |
| fixed | Issue was automatically remediated |

## Available Profiles: CIS and DISA STIG

### CIS Benchmarks

The Center for Internet Security (CIS) provides widely-adopted security benchmarks:

```bash
# CIS Level 1 - Server Profile
# Provides essential security hardening with minimal impact on functionality
sudo oscap xccdf eval \
    --profile xccdf_org.ssgproject.content_profile_cis_level1_server \
    --results /tmp/cis-l1-results.xml \
    --report /tmp/cis-l1-report.html \
    /usr/share/xml/scap/ssg/content/ssg-ubuntu2204-ds.xml

# CIS Level 2 - Server Profile
# Provides enhanced security hardening for high-security environments
sudo oscap xccdf eval \
    --profile xccdf_org.ssgproject.content_profile_cis_level2_server \
    --results /tmp/cis-l2-results.xml \
    --report /tmp/cis-l2-report.html \
    /usr/share/xml/scap/ssg/content/ssg-ubuntu2204-ds.xml

# CIS Level 1 - Workstation Profile
# For desktop/workstation systems
sudo oscap xccdf eval \
    --profile xccdf_org.ssgproject.content_profile_cis_level1_workstation \
    --results /tmp/cis-ws-results.xml \
    --report /tmp/cis-ws-report.html \
    /usr/share/xml/scap/ssg/content/ssg-ubuntu2204-ds.xml
```

### DISA STIG Profile

The Defense Information Systems Agency (DISA) Security Technical Implementation Guides (STIGs):

```bash
# DISA STIG Profile
# Strict security requirements for government/military systems
sudo oscap xccdf eval \
    --profile xccdf_org.ssgproject.content_profile_stig \
    --results /tmp/stig-results.xml \
    --report /tmp/stig-report.html \
    /usr/share/xml/scap/ssg/content/ssg-ubuntu2204-ds.xml
```

### Comparing Profile Results

```bash
#!/bin/bash
# /usr/local/bin/compare-profiles.sh
# Compare results across different security profiles

SCAP_CONTENT="/usr/share/xml/scap/ssg/content/ssg-ubuntu2204-ds.xml"
OUTPUT_DIR="/tmp/profile-comparison"

mkdir -p "${OUTPUT_DIR}"

# Array of profiles to compare
declare -A PROFILES=(
    ["cis_l1"]="xccdf_org.ssgproject.content_profile_cis_level1_server"
    ["cis_l2"]="xccdf_org.ssgproject.content_profile_cis_level2_server"
    ["stig"]="xccdf_org.ssgproject.content_profile_stig"
    ["standard"]="xccdf_org.ssgproject.content_profile_standard"
)

# Run scans for each profile
for name in "${!PROFILES[@]}"; do
    profile="${PROFILES[$name]}"
    echo "Scanning with profile: ${name}"

    sudo oscap xccdf eval \
        --profile "${profile}" \
        --results "${OUTPUT_DIR}/${name}-results.xml" \
        --report "${OUTPUT_DIR}/${name}-report.html" \
        "${SCAP_CONTENT}" 2>/dev/null

    # Extract pass/fail counts
    PASS=$(grep -c 'result="pass"' "${OUTPUT_DIR}/${name}-results.xml" 2>/dev/null || echo "0")
    FAIL=$(grep -c 'result="fail"' "${OUTPUT_DIR}/${name}-results.xml" 2>/dev/null || echo "0")

    echo "  ${name}: ${PASS} passed, ${FAIL} failed"
done

echo ""
echo "Reports saved to: ${OUTPUT_DIR}/"
```

## Generating HTML Reports

### Basic HTML Report Generation

```bash
# Generate HTML report during scan
sudo oscap xccdf eval \
    --profile xccdf_org.ssgproject.content_profile_cis_level1_server \
    --results /tmp/results.xml \
    --report /tmp/compliance-report.html \
    /usr/share/xml/scap/ssg/content/ssg-ubuntu2204-ds.xml

# Open report in browser (if GUI available)
xdg-open /tmp/compliance-report.html
```

### Generate Report from Existing Results

```bash
# If you already have results XML, generate HTML report separately
oscap xccdf generate report \
    --output /tmp/new-report.html \
    /tmp/results.xml
```

### Custom Report Styling

```bash
#!/bin/bash
# /usr/local/bin/generate-custom-report.sh
# Generate customized compliance reports

RESULTS_FILE="$1"
OUTPUT_DIR="$2"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

if [ -z "${RESULTS_FILE}" ] || [ -z "${OUTPUT_DIR}" ]; then
    echo "Usage: $0 <results-xml> <output-directory>"
    exit 1
fi

mkdir -p "${OUTPUT_DIR}"

# Generate standard HTML report
oscap xccdf generate report \
    --output "${OUTPUT_DIR}/report-${TIMESTAMP}.html" \
    "${RESULTS_FILE}"

# Generate guide (shows all rules, not just results)
oscap xccdf generate guide \
    --output "${OUTPUT_DIR}/guide-${TIMESTAMP}.html" \
    --profile xccdf_org.ssgproject.content_profile_cis_level1_server \
    /usr/share/xml/scap/ssg/content/ssg-ubuntu2204-ds.xml

# Generate fix script for failed rules
oscap xccdf generate fix \
    --output "${OUTPUT_DIR}/remediation-${TIMESTAMP}.sh" \
    --fix-type bash \
    "${RESULTS_FILE}"

echo "Reports generated in ${OUTPUT_DIR}/"
ls -la "${OUTPUT_DIR}/"
```

### Generating ARF (Asset Reporting Format) Reports

```bash
# Generate ARF report for compliance tracking systems
sudo oscap xccdf eval \
    --profile xccdf_org.ssgproject.content_profile_cis_level1_server \
    --results-arf /tmp/arf-results.xml \
    /usr/share/xml/scap/ssg/content/ssg-ubuntu2204-ds.xml

# ARF reports contain complete scan information including:
# - System characteristics
# - Scan configuration
# - All results and findings
# - Timestamps and metadata
```

## Remediating Findings

### Automatic Remediation During Scan

**Warning**: Automatic remediation modifies system configuration. Always test in a non-production environment first.

```bash
# Run scan with automatic remediation for failed checks
# USE WITH CAUTION - this modifies your system
sudo oscap xccdf eval \
    --profile xccdf_org.ssgproject.content_profile_cis_level1_server \
    --remediate \
    --results /tmp/remediated-results.xml \
    --report /tmp/remediated-report.html \
    /usr/share/xml/scap/ssg/content/ssg-ubuntu2204-ds.xml
```

### Generate Remediation Scripts

A safer approach is to generate remediation scripts for review:

```bash
# Generate bash remediation script
oscap xccdf generate fix \
    --fix-type bash \
    --output /tmp/remediation.sh \
    --result-id "" \
    /tmp/xccdf-results.xml

# Generate Ansible remediation playbook
oscap xccdf generate fix \
    --fix-type ansible \
    --output /tmp/remediation.yml \
    --result-id "" \
    /tmp/xccdf-results.xml

# Review the generated script before executing
less /tmp/remediation.sh
```

### Manual Remediation Workflow

```bash
#!/bin/bash
# /usr/local/bin/remediation-workflow.sh
# Safe remediation workflow with backups and validation

RESULTS_FILE="$1"
BACKUP_DIR="/var/backups/openscap/$(date +%Y%m%d_%H%M%S)"

if [ -z "${RESULTS_FILE}" ]; then
    echo "Usage: $0 <results-xml-file>"
    exit 1
fi

# Create backup directory
mkdir -p "${BACKUP_DIR}"

# Generate remediation script
echo "Generating remediation script..."
oscap xccdf generate fix \
    --fix-type bash \
    --output "${BACKUP_DIR}/remediation.sh" \
    --result-id "" \
    "${RESULTS_FILE}"

# Create system state backup
echo "Backing up current system state..."
tar -czf "${BACKUP_DIR}/etc-backup.tar.gz" /etc/ 2>/dev/null

# Display remediation script for review
echo ""
echo "=== Remediation Script Contents ==="
cat "${BACKUP_DIR}/remediation.sh"
echo ""
echo "==================================="

# Prompt for confirmation
read -p "Review the script above. Apply remediation? (yes/no): " CONFIRM

if [ "${CONFIRM}" = "yes" ]; then
    echo "Applying remediation..."
    chmod +x "${BACKUP_DIR}/remediation.sh"
    sudo "${BACKUP_DIR}/remediation.sh" 2>&1 | tee "${BACKUP_DIR}/remediation.log"

    echo ""
    echo "Remediation complete. Running validation scan..."

    # Run validation scan
    sudo oscap xccdf eval \
        --profile xccdf_org.ssgproject.content_profile_cis_level1_server \
        --results "${BACKUP_DIR}/post-remediation-results.xml" \
        --report "${BACKUP_DIR}/post-remediation-report.html" \
        /usr/share/xml/scap/ssg/content/ssg-ubuntu2204-ds.xml

    echo "Validation complete. Check ${BACKUP_DIR}/ for results."
else
    echo "Remediation cancelled. Script saved to ${BACKUP_DIR}/remediation.sh"
fi
```

### Targeted Remediation for Specific Rules

```bash
# Find specific rule IDs from results
grep -oP 'idref="[^"]*"' /tmp/xccdf-results.xml | head -20

# Generate fix for specific rule only
oscap xccdf generate fix \
    --fix-type bash \
    --output /tmp/single-fix.sh \
    --rule-id xccdf_org.ssgproject.content_rule_sshd_disable_root_login \
    /usr/share/xml/scap/ssg/content/ssg-ubuntu2204-ds.xml
```

## Automated Scanning with Cron

### Basic Cron Setup

```bash
# Create the scanning script
sudo tee /usr/local/bin/openscap-daily-scan.sh << 'EOF'
#!/bin/bash
# /usr/local/bin/openscap-daily-scan.sh
# Daily OpenSCAP compliance scanning script

# Configuration
SCAP_CONTENT="/usr/share/xml/scap/ssg/content/ssg-ubuntu2204-ds.xml"
PROFILE="xccdf_org.ssgproject.content_profile_cis_level1_server"
RESULTS_BASE="/var/log/openscap"
RETENTION_DAYS=30
DATE=$(date +%Y%m%d)
HOSTNAME=$(hostname)

# Logging function
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "${RESULTS_BASE}/scan.log"
}

# Create results directory
mkdir -p "${RESULTS_BASE}/daily"

log "Starting daily compliance scan"

# Run the scan
oscap xccdf eval \
    --profile "${PROFILE}" \
    --results "${RESULTS_BASE}/daily/${HOSTNAME}-${DATE}-results.xml" \
    --report "${RESULTS_BASE}/daily/${HOSTNAME}-${DATE}-report.html" \
    "${SCAP_CONTENT}" > "${RESULTS_BASE}/daily/${HOSTNAME}-${DATE}-stdout.log" 2>&1

EXIT_CODE=$?
log "Scan completed with exit code: ${EXIT_CODE}"

# Generate summary statistics
PASS_COUNT=$(grep -c 'result="pass"' "${RESULTS_BASE}/daily/${HOSTNAME}-${DATE}-results.xml" 2>/dev/null || echo "0")
FAIL_COUNT=$(grep -c 'result="fail"' "${RESULTS_BASE}/daily/${HOSTNAME}-${DATE}-results.xml" 2>/dev/null || echo "0")

log "Results: ${PASS_COUNT} passed, ${FAIL_COUNT} failed"

# Clean up old results (retention policy)
find "${RESULTS_BASE}/daily" -name "*.xml" -mtime +${RETENTION_DAYS} -delete
find "${RESULTS_BASE}/daily" -name "*.html" -mtime +${RETENTION_DAYS} -delete
find "${RESULTS_BASE}/daily" -name "*.log" -mtime +${RETENTION_DAYS} -delete

log "Cleanup complete. Removed files older than ${RETENTION_DAYS} days."

# Send alert if failures exceed threshold
FAIL_THRESHOLD=10
if [ "${FAIL_COUNT}" -gt "${FAIL_THRESHOLD}" ]; then
    log "WARNING: Failure count (${FAIL_COUNT}) exceeds threshold (${FAIL_THRESHOLD})"
    # Add notification logic here (email, Slack, etc.)
fi

exit ${EXIT_CODE}
EOF

# Make script executable
sudo chmod +x /usr/local/bin/openscap-daily-scan.sh
```

### Configure Cron Job

```bash
# Add cron job to run daily at 2 AM
sudo tee /etc/cron.d/openscap-scan << 'EOF'
# OpenSCAP daily compliance scan
# Runs at 2:00 AM every day
SHELL=/bin/bash
PATH=/usr/local/sbin:/usr/local/bin:/sbin:/bin:/usr/sbin:/usr/bin

0 2 * * * root /usr/local/bin/openscap-daily-scan.sh >> /var/log/openscap/cron.log 2>&1
EOF

# Set proper permissions
sudo chmod 644 /etc/cron.d/openscap-scan

# Verify cron job is installed
sudo crontab -l
cat /etc/cron.d/openscap-scan
```

### Systemd Timer Alternative

For systems using systemd, timers provide more control:

```bash
# Create systemd service file
sudo tee /etc/systemd/system/openscap-scan.service << 'EOF'
[Unit]
Description=OpenSCAP Compliance Scan
After=network.target

[Service]
Type=oneshot
ExecStart=/usr/local/bin/openscap-daily-scan.sh
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
EOF

# Create systemd timer file
sudo tee /etc/systemd/system/openscap-scan.timer << 'EOF'
[Unit]
Description=Daily OpenSCAP Compliance Scan Timer

[Timer]
OnCalendar=*-*-* 02:00:00
Persistent=true
RandomizedDelaySec=300

[Install]
WantedBy=timers.target
EOF

# Enable and start the timer
sudo systemctl daemon-reload
sudo systemctl enable openscap-scan.timer
sudo systemctl start openscap-scan.timer

# Check timer status
sudo systemctl list-timers | grep openscap
sudo systemctl status openscap-scan.timer
```

## Custom SCAP Content

### Creating Custom XCCDF Content

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!-- /usr/local/share/openscap/custom-policy.xml -->
<!-- Custom SCAP policy for organization-specific requirements -->

<xccdf:Benchmark
    xmlns:xccdf="http://checklists.nist.gov/xccdf/1.2"
    xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
    id="xccdf_com.example_benchmark_custom"
    resolved="0"
    xml:lang="en-US">

    <xccdf:status date="2024-01-15">draft</xccdf:status>
    <xccdf:title>Custom Security Policy</xccdf:title>
    <xccdf:description>
        Organization-specific security requirements for Ubuntu servers.
    </xccdf:description>
    <xccdf:version>1.0</xccdf:version>

    <!-- Define a custom profile -->
    <xccdf:Profile id="xccdf_com.example_profile_custom_server">
        <xccdf:title>Custom Server Profile</xccdf:title>
        <xccdf:description>Custom hardening profile for servers</xccdf:description>
        <xccdf:select idref="xccdf_com.example_rule_ssh_config" selected="true"/>
        <xccdf:select idref="xccdf_com.example_rule_password_policy" selected="true"/>
    </xccdf:Profile>

    <!-- Define custom rules -->
    <xccdf:Group id="xccdf_com.example_group_ssh">
        <xccdf:title>SSH Configuration</xccdf:title>

        <xccdf:Rule id="xccdf_com.example_rule_ssh_config" selected="false" severity="high">
            <xccdf:title>Ensure SSH root login is disabled</xccdf:title>
            <xccdf:description>
                Root login via SSH should be disabled to prevent unauthorized access.
            </xccdf:description>
            <xccdf:rationale>
                Disabling root login forces administrators to use named accounts,
                improving audit trails and accountability.
            </xccdf:rationale>
            <xccdf:fix system="urn:xccdf:fix:script:sh">
                sed -i 's/^PermitRootLogin.*/PermitRootLogin no/' /etc/ssh/sshd_config
                systemctl restart sshd
            </xccdf:fix>
            <xccdf:check system="http://oval.mitre.org/XMLSchema/oval-definitions-5">
                <xccdf:check-content-ref
                    href="custom-oval.xml"
                    name="oval:com.example:def:1"/>
            </xccdf:check>
        </xccdf:Rule>
    </xccdf:Group>

    <xccdf:Group id="xccdf_com.example_group_password">
        <xccdf:title>Password Policy</xccdf:title>

        <xccdf:Rule id="xccdf_com.example_rule_password_policy" selected="false" severity="medium">
            <xccdf:title>Ensure password minimum length is 14 characters</xccdf:title>
            <xccdf:description>
                Password minimum length should be set to at least 14 characters.
            </xccdf:description>
            <xccdf:fix system="urn:xccdf:fix:script:sh">
                sed -i 's/^PASS_MIN_LEN.*/PASS_MIN_LEN 14/' /etc/login.defs
            </xccdf:fix>
            <xccdf:check system="http://oval.mitre.org/XMLSchema/oval-definitions-5">
                <xccdf:check-content-ref
                    href="custom-oval.xml"
                    name="oval:com.example:def:2"/>
            </xccdf:check>
        </xccdf:Rule>
    </xccdf:Group>

</xccdf:Benchmark>
```

### Creating Custom OVAL Definitions

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!-- /usr/local/share/openscap/custom-oval.xml -->
<!-- Custom OVAL definitions for organization-specific checks -->

<oval_definitions
    xmlns="http://oval.mitre.org/XMLSchema/oval-definitions-5"
    xmlns:oval="http://oval.mitre.org/XMLSchema/oval-common-5"
    xmlns:unix-def="http://oval.mitre.org/XMLSchema/oval-definitions-5#unix"
    xmlns:ind-def="http://oval.mitre.org/XMLSchema/oval-definitions-5#independent"
    xmlns:linux-def="http://oval.mitre.org/XMLSchema/oval-definitions-5#linux"
    xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">

    <generator>
        <oval:product_name>Custom OVAL Generator</oval:product_name>
        <oval:schema_version>5.11</oval:schema_version>
        <oval:timestamp>2024-01-15T00:00:00</oval:timestamp>
    </generator>

    <definitions>
        <!-- Check SSH PermitRootLogin setting -->
        <definition id="oval:com.example:def:1" class="compliance" version="1">
            <metadata>
                <title>SSH Root Login Disabled</title>
                <description>Checks that SSH root login is disabled</description>
            </metadata>
            <criteria>
                <criterion test_ref="oval:com.example:tst:1"
                    comment="PermitRootLogin is set to no"/>
            </criteria>
        </definition>

        <!-- Check password minimum length -->
        <definition id="oval:com.example:def:2" class="compliance" version="1">
            <metadata>
                <title>Password Minimum Length</title>
                <description>Checks password minimum length is 14 or more</description>
            </metadata>
            <criteria>
                <criterion test_ref="oval:com.example:tst:2"
                    comment="PASS_MIN_LEN is 14 or greater"/>
            </criteria>
        </definition>
    </definitions>

    <tests>
        <!-- Test for SSH PermitRootLogin -->
        <ind-def:textfilecontent54_test id="oval:com.example:tst:1"
            check="all" check_existence="at_least_one_exists"
            comment="PermitRootLogin no" version="1">
            <ind-def:object object_ref="oval:com.example:obj:1"/>
            <ind-def:state state_ref="oval:com.example:ste:1"/>
        </ind-def:textfilecontent54_test>

        <!-- Test for password minimum length -->
        <ind-def:textfilecontent54_test id="oval:com.example:tst:2"
            check="all" check_existence="at_least_one_exists"
            comment="PASS_MIN_LEN 14" version="1">
            <ind-def:object object_ref="oval:com.example:obj:2"/>
            <ind-def:state state_ref="oval:com.example:ste:2"/>
        </ind-def:textfilecontent54_test>
    </tests>

    <objects>
        <!-- Object for SSH config -->
        <ind-def:textfilecontent54_object id="oval:com.example:obj:1" version="1">
            <ind-def:filepath>/etc/ssh/sshd_config</ind-def:filepath>
            <ind-def:pattern operation="pattern match">^[\s]*PermitRootLogin[\s]+(\w+)</ind-def:pattern>
            <ind-def:instance datatype="int">1</ind-def:instance>
        </ind-def:textfilecontent54_object>

        <!-- Object for login.defs -->
        <ind-def:textfilecontent54_object id="oval:com.example:obj:2" version="1">
            <ind-def:filepath>/etc/login.defs</ind-def:filepath>
            <ind-def:pattern operation="pattern match">^[\s]*PASS_MIN_LEN[\s]+(\d+)</ind-def:pattern>
            <ind-def:instance datatype="int">1</ind-def:instance>
        </ind-def:textfilecontent54_object>
    </objects>

    <states>
        <!-- State: PermitRootLogin should be "no" -->
        <ind-def:textfilecontent54_state id="oval:com.example:ste:1" version="1">
            <ind-def:subexpression operation="equals">no</ind-def:subexpression>
        </ind-def:textfilecontent54_state>

        <!-- State: PASS_MIN_LEN should be >= 14 -->
        <ind-def:textfilecontent54_state id="oval:com.example:ste:2" version="1">
            <ind-def:subexpression datatype="int" operation="greater than or equal">14</ind-def:subexpression>
        </ind-def:textfilecontent54_state>
    </states>

</oval_definitions>
```

### Validating Custom Content

```bash
# Validate XCCDF content
oscap xccdf validate /usr/local/share/openscap/custom-policy.xml

# Validate OVAL content
oscap oval validate /usr/local/share/openscap/custom-oval.xml

# Test custom content
oscap xccdf eval \
    --profile xccdf_com.example_profile_custom_server \
    --results /tmp/custom-results.xml \
    --report /tmp/custom-report.html \
    /usr/local/share/openscap/custom-policy.xml
```

## SCAP Workbench GUI

### Installing and Launching SCAP Workbench

```bash
# Install SCAP Workbench
sudo apt install -y scap-workbench

# Launch (requires X11/desktop environment)
scap-workbench &
```

### Using SCAP Workbench

SCAP Workbench provides a graphical interface for:

1. **Loading SCAP Content**: Open data streams from `/usr/share/xml/scap/ssg/content/`
2. **Selecting Profiles**: Choose from available security profiles
3. **Customizing Scans**: Enable/disable specific rules
4. **Running Scans**: Execute scans with visual progress
5. **Viewing Results**: Interactive results browser
6. **Generating Reports**: Export HTML reports

### Command-Line Alternatives for Headless Servers

```bash
# If you can't use GUI, here's the equivalent CLI workflow

# Step 1: List available profiles
oscap info /usr/share/xml/scap/ssg/content/ssg-ubuntu2204-ds.xml

# Step 2: View rules in a profile
oscap xccdf generate guide \
    --profile xccdf_org.ssgproject.content_profile_cis_level1_server \
    --output /tmp/profile-guide.html \
    /usr/share/xml/scap/ssg/content/ssg-ubuntu2204-ds.xml

# Step 3: Run scan
sudo oscap xccdf eval \
    --profile xccdf_org.ssgproject.content_profile_cis_level1_server \
    --results /tmp/results.xml \
    --report /tmp/report.html \
    /usr/share/xml/scap/ssg/content/ssg-ubuntu2204-ds.xml

# Step 4: View results summary
oscap xccdf generate stats /tmp/results.xml
```

### Creating Tailoring Files with SCAP Workbench

Tailoring files allow you to customize profiles without modifying original content:

```bash
# After creating a tailoring file in SCAP Workbench, use it:
sudo oscap xccdf eval \
    --profile xccdf_org.ssgproject.content_profile_cis_level1_server \
    --tailoring-file /path/to/tailoring.xml \
    --results /tmp/tailored-results.xml \
    --report /tmp/tailored-report.html \
    /usr/share/xml/scap/ssg/content/ssg-ubuntu2204-ds.xml
```

## Integration with CI/CD

### GitLab CI Integration

```yaml
# .gitlab-ci.yml
# OpenSCAP compliance scanning in GitLab CI/CD

stages:
  - build
  - test
  - compliance
  - deploy

variables:
  SCAP_PROFILE: "xccdf_org.ssgproject.content_profile_cis_level1_server"
  SCAP_CONTENT: "/usr/share/xml/scap/ssg/content/ssg-ubuntu2204-ds.xml"

compliance_scan:
  stage: compliance
  image: ubuntu:22.04
  before_script:
    # Install OpenSCAP tools
    - apt-get update
    - apt-get install -y openscap-scanner openscap-utils scap-security-guide
  script:
    # Run compliance scan
    - |
      oscap xccdf eval \
        --profile ${SCAP_PROFILE} \
        --results compliance-results.xml \
        --report compliance-report.html \
        ${SCAP_CONTENT} || true

    # Extract failure count
    - FAIL_COUNT=$(grep -c 'result="fail"' compliance-results.xml || echo "0")
    - echo "Failed checks: ${FAIL_COUNT}"

    # Fail pipeline if too many failures
    - |
      if [ "${FAIL_COUNT}" -gt "50" ]; then
        echo "ERROR: Too many compliance failures (${FAIL_COUNT})"
        exit 1
      fi
  artifacts:
    paths:
      - compliance-results.xml
      - compliance-report.html
    reports:
      junit: compliance-results.xml
    expire_in: 30 days
  rules:
    - if: '$CI_PIPELINE_SOURCE == "merge_request_event"'
    - if: '$CI_COMMIT_BRANCH == "main"'
```

### GitHub Actions Integration

```yaml
# .github/workflows/compliance-scan.yml
# OpenSCAP compliance scanning in GitHub Actions

name: Compliance Scan

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]
  schedule:
    # Run weekly on Sundays at midnight
    - cron: '0 0 * * 0'

jobs:
  compliance:
    runs-on: ubuntu-22.04

    env:
      SCAP_PROFILE: xccdf_org.ssgproject.content_profile_cis_level1_server
      SCAP_CONTENT: /usr/share/xml/scap/ssg/content/ssg-ubuntu2204-ds.xml

    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Install OpenSCAP
        run: |
          sudo apt-get update
          sudo apt-get install -y \
            openscap-scanner \
            openscap-utils \
            scap-security-guide

      - name: Run Compliance Scan
        id: scan
        run: |
          # Run the scan (don't fail on scan exit code)
          sudo oscap xccdf eval \
            --profile ${{ env.SCAP_PROFILE }} \
            --results results.xml \
            --report report.html \
            ${{ env.SCAP_CONTENT }} || true

          # Extract metrics
          PASS=$(grep -c 'result="pass"' results.xml || echo "0")
          FAIL=$(grep -c 'result="fail"' results.xml || echo "0")

          echo "pass_count=${PASS}" >> $GITHUB_OUTPUT
          echo "fail_count=${FAIL}" >> $GITHUB_OUTPUT

          # Calculate compliance percentage
          TOTAL=$((PASS + FAIL))
          if [ "${TOTAL}" -gt 0 ]; then
            PERCENT=$((PASS * 100 / TOTAL))
          else
            PERCENT=0
          fi
          echo "compliance_percent=${PERCENT}" >> $GITHUB_OUTPUT

      - name: Check Compliance Threshold
        run: |
          echo "Compliance: ${{ steps.scan.outputs.compliance_percent }}%"
          echo "Passed: ${{ steps.scan.outputs.pass_count }}"
          echo "Failed: ${{ steps.scan.outputs.fail_count }}"

          # Fail if compliance is below 80%
          if [ "${{ steps.scan.outputs.compliance_percent }}" -lt "80" ]; then
            echo "::error::Compliance below 80% threshold"
            exit 1
          fi

      - name: Upload Compliance Report
        uses: actions/upload-artifact@v4
        with:
          name: compliance-report
          path: |
            results.xml
            report.html
          retention-days: 30

      - name: Comment on PR
        if: github.event_name == 'pull_request'
        uses: actions/github-script@v7
        with:
          script: |
            const compliance = '${{ steps.scan.outputs.compliance_percent }}';
            const passed = '${{ steps.scan.outputs.pass_count }}';
            const failed = '${{ steps.scan.outputs.fail_count }}';

            const body = `## Compliance Scan Results

            | Metric | Value |
            |--------|-------|
            | Compliance | ${compliance}% |
            | Passed | ${passed} |
            | Failed | ${failed} |

            See artifacts for detailed report.`;

            github.rest.issues.createComment({
              issue_number: context.issue.number,
              owner: context.repo.owner,
              repo: context.repo.repo,
              body: body
            });
```

### Jenkins Pipeline Integration

```groovy
// Jenkinsfile
// OpenSCAP compliance scanning in Jenkins

pipeline {
    agent {
        docker {
            image 'ubuntu:22.04'
            args '--privileged'
        }
    }

    environment {
        SCAP_PROFILE = 'xccdf_org.ssgproject.content_profile_cis_level1_server'
        SCAP_CONTENT = '/usr/share/xml/scap/ssg/content/ssg-ubuntu2204-ds.xml'
        COMPLIANCE_THRESHOLD = '80'
    }

    stages {
        stage('Install Dependencies') {
            steps {
                sh '''
                    apt-get update
                    apt-get install -y \
                        openscap-scanner \
                        openscap-utils \
                        scap-security-guide \
                        bc
                '''
            }
        }

        stage('Run Compliance Scan') {
            steps {
                sh '''
                    oscap xccdf eval \
                        --profile ${SCAP_PROFILE} \
                        --results results.xml \
                        --report report.html \
                        ${SCAP_CONTENT} || true
                '''
            }
        }

        stage('Analyze Results') {
            steps {
                script {
                    def passCount = sh(
                        script: 'grep -c \'result="pass"\' results.xml || echo "0"',
                        returnStdout: true
                    ).trim().toInteger()

                    def failCount = sh(
                        script: 'grep -c \'result="fail"\' results.xml || echo "0"',
                        returnStdout: true
                    ).trim().toInteger()

                    def total = passCount + failCount
                    def compliancePercent = total > 0 ? (passCount * 100 / total) : 0

                    echo "Compliance: ${compliancePercent}%"
                    echo "Passed: ${passCount}"
                    echo "Failed: ${failCount}"

                    if (compliancePercent < env.COMPLIANCE_THRESHOLD.toInteger()) {
                        error "Compliance (${compliancePercent}%) below threshold (${env.COMPLIANCE_THRESHOLD}%)"
                    }
                }
            }
        }
    }

    post {
        always {
            // Archive reports
            archiveArtifacts artifacts: '*.xml, *.html', fingerprint: true

            // Publish HTML report
            publishHTML(target: [
                allowMissing: false,
                alwaysLinkToLastBuild: true,
                keepAll: true,
                reportDir: '.',
                reportFiles: 'report.html',
                reportName: 'Compliance Report'
            ])
        }

        failure {
            // Send notification on failure
            emailext(
                subject: "Compliance Scan Failed - ${env.JOB_NAME}",
                body: "The compliance scan failed. Please check the Jenkins job for details.",
                recipientProviders: [developers(), requestor()]
            )
        }
    }
}
```

### Docker Image Scanning

```bash
#!/bin/bash
# /usr/local/bin/scan-docker-image.sh
# Scan a Docker image for compliance

IMAGE_NAME="$1"
CONTAINER_NAME="openscap-scan-$$"

if [ -z "${IMAGE_NAME}" ]; then
    echo "Usage: $0 <docker-image-name>"
    exit 1
fi

echo "Scanning Docker image: ${IMAGE_NAME}"

# Start container from image
docker run -d --name "${CONTAINER_NAME}" "${IMAGE_NAME}" sleep infinity

# Copy SCAP content into container
docker cp /usr/share/xml/scap/ssg/content/ssg-ubuntu2204-ds.xml \
    "${CONTAINER_NAME}":/tmp/ssg-ubuntu2204-ds.xml

# Install OpenSCAP in container and run scan
docker exec "${CONTAINER_NAME}" bash -c "
    apt-get update && apt-get install -y openscap-scanner openscap-utils
    oscap xccdf eval \
        --profile xccdf_org.ssgproject.content_profile_cis_level1_server \
        --results /tmp/results.xml \
        --report /tmp/report.html \
        /tmp/ssg-ubuntu2204-ds.xml || true
"

# Copy results back
docker cp "${CONTAINER_NAME}":/tmp/results.xml ./docker-scan-results.xml
docker cp "${CONTAINER_NAME}":/tmp/report.html ./docker-scan-report.html

# Cleanup
docker rm -f "${CONTAINER_NAME}"

echo "Results saved to docker-scan-results.xml and docker-scan-report.html"
```

## Complete Example: Production Compliance Workflow

Here is a complete, production-ready compliance scanning solution:

```bash
#!/bin/bash
# /usr/local/bin/production-compliance-scan.sh
# Production-grade OpenSCAP compliance scanning script

set -euo pipefail

#######################################
# Configuration
#######################################

# Paths and settings
readonly SCRIPT_NAME=$(basename "$0")
readonly SCAP_CONTENT_DIR="/usr/share/xml/scap/ssg/content"
readonly RESULTS_BASE="/var/log/openscap"
readonly RETENTION_DAYS=90
readonly TIMESTAMP=$(date +%Y%m%d_%H%M%S)
readonly HOSTNAME=$(hostname -f)

# Default profile (can be overridden via command line)
PROFILE="${PROFILE:-xccdf_org.ssgproject.content_profile_cis_level2_server}"

# Alert thresholds
readonly CRITICAL_THRESHOLD=90  # Alert if compliance below this
readonly WARNING_THRESHOLD=95   # Warn if compliance below this

# Detect Ubuntu version and set appropriate content file
detect_ubuntu_version() {
    local version
    version=$(lsb_release -rs)

    case "${version}" in
        20.04) echo "ssg-ubuntu2004-ds.xml" ;;
        22.04) echo "ssg-ubuntu2204-ds.xml" ;;
        24.04) echo "ssg-ubuntu2404-ds.xml" ;;
        *)
            echo "ERROR: Unsupported Ubuntu version: ${version}" >&2
            exit 1
            ;;
    esac
}

#######################################
# Logging Functions
#######################################

log() {
    local level="$1"
    local message="$2"
    local timestamp
    timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    echo "[${timestamp}] [${level}] ${message}" | tee -a "${LOG_FILE}"
}

log_info() { log "INFO" "$1"; }
log_warn() { log "WARN" "$1"; }
log_error() { log "ERROR" "$1"; }

#######################################
# Setup Functions
#######################################

setup_directories() {
    mkdir -p "${RESULTS_BASE}/daily"
    mkdir -p "${RESULTS_BASE}/reports"
    mkdir -p "${RESULTS_BASE}/remediation"
}

#######################################
# Main Scanning Function
#######################################

run_scan() {
    local scap_content="${SCAP_CONTENT_DIR}/${SCAP_FILE}"
    local results_file="${RESULTS_BASE}/daily/${HOSTNAME}-${TIMESTAMP}-results.xml"
    local report_file="${RESULTS_BASE}/reports/${HOSTNAME}-${TIMESTAMP}-report.html"
    local arf_file="${RESULTS_BASE}/daily/${HOSTNAME}-${TIMESTAMP}-arf.xml"

    log_info "Starting compliance scan"
    log_info "Profile: ${PROFILE}"
    log_info "Content: ${scap_content}"

    # Run the scan
    oscap xccdf eval \
        --profile "${PROFILE}" \
        --results "${results_file}" \
        --results-arf "${arf_file}" \
        --report "${report_file}" \
        --oval-results \
        "${scap_content}" > "${RESULTS_BASE}/daily/${HOSTNAME}-${TIMESTAMP}.log" 2>&1 || true

    # Parse results
    local pass_count
    local fail_count
    local total
    local compliance_percent

    pass_count=$(grep -c 'result="pass"' "${results_file}" 2>/dev/null || echo "0")
    fail_count=$(grep -c 'result="fail"' "${results_file}" 2>/dev/null || echo "0")
    total=$((pass_count + fail_count))

    if [ "${total}" -gt 0 ]; then
        compliance_percent=$((pass_count * 100 / total))
    else
        compliance_percent=0
    fi

    log_info "Scan complete"
    log_info "Results: ${pass_count} passed, ${fail_count} failed"
    log_info "Compliance: ${compliance_percent}%"

    # Check thresholds and alert
    if [ "${compliance_percent}" -lt "${CRITICAL_THRESHOLD}" ]; then
        log_error "CRITICAL: Compliance (${compliance_percent}%) below critical threshold (${CRITICAL_THRESHOLD}%)"
        send_alert "CRITICAL" "${compliance_percent}"
    elif [ "${compliance_percent}" -lt "${WARNING_THRESHOLD}" ]; then
        log_warn "WARNING: Compliance (${compliance_percent}%) below warning threshold (${WARNING_THRESHOLD}%)"
        send_alert "WARNING" "${compliance_percent}"
    fi

    # Generate remediation script for failures
    if [ "${fail_count}" -gt 0 ]; then
        log_info "Generating remediation script..."
        oscap xccdf generate fix \
            --fix-type bash \
            --output "${RESULTS_BASE}/remediation/${HOSTNAME}-${TIMESTAMP}-remediation.sh" \
            --result-id "" \
            "${results_file}" 2>/dev/null || true
    fi

    # Create latest symlinks
    ln -sf "${results_file}" "${RESULTS_BASE}/daily/latest-results.xml"
    ln -sf "${report_file}" "${RESULTS_BASE}/reports/latest-report.html"

    # Output summary JSON for integration
    cat > "${RESULTS_BASE}/daily/latest-summary.json" <<EOF
{
    "timestamp": "${TIMESTAMP}",
    "hostname": "${HOSTNAME}",
    "profile": "${PROFILE}",
    "pass_count": ${pass_count},
    "fail_count": ${fail_count},
    "compliance_percent": ${compliance_percent},
    "results_file": "${results_file}",
    "report_file": "${report_file}"
}
EOF

    log_info "Summary saved to ${RESULTS_BASE}/daily/latest-summary.json"
}

#######################################
# Alert Function
#######################################

send_alert() {
    local severity="$1"
    local compliance="$2"

    # Implement your alerting mechanism here
    # Examples: email, Slack webhook, PagerDuty, etc.

    log_info "Alert sent: ${severity} - Compliance at ${compliance}%"

    # Example: Slack webhook (uncomment and configure)
    # curl -X POST -H 'Content-type: application/json' \
    #     --data "{\"text\":\"[${severity}] Compliance Alert on ${HOSTNAME}: ${compliance}%\"}" \
    #     "${SLACK_WEBHOOK_URL}"
}

#######################################
# Cleanup Function
#######################################

cleanup_old_results() {
    log_info "Cleaning up results older than ${RETENTION_DAYS} days..."

    find "${RESULTS_BASE}/daily" -type f -mtime +${RETENTION_DAYS} -delete 2>/dev/null || true
    find "${RESULTS_BASE}/reports" -type f -mtime +${RETENTION_DAYS} -delete 2>/dev/null || true
    find "${RESULTS_BASE}/remediation" -type f -mtime +${RETENTION_DAYS} -delete 2>/dev/null || true

    log_info "Cleanup complete"
}

#######################################
# Main Entry Point
#######################################

main() {
    # Detect Ubuntu version and set content file
    SCAP_FILE=$(detect_ubuntu_version)

    # Setup logging
    LOG_FILE="${RESULTS_BASE}/scan-${TIMESTAMP}.log"

    # Setup directories
    setup_directories

    log_info "=== Starting ${SCRIPT_NAME} ==="
    log_info "Ubuntu SCAP content: ${SCAP_FILE}"

    # Run the compliance scan
    run_scan

    # Cleanup old results
    cleanup_old_results

    log_info "=== ${SCRIPT_NAME} complete ==="
}

# Run main function
main "$@"
```

## Summary

OpenSCAP provides a powerful, standardized framework for security compliance scanning on Ubuntu systems. Key takeaways from this guide:

1. **Install the essentials**: `openscap-scanner`, `openscap-utils`, and `scap-security-guide` packages provide everything needed for compliance scanning.

2. **Choose appropriate profiles**: Select CIS Level 1 for basic hardening, CIS Level 2 for enhanced security, or DISA STIG for government requirements.

3. **Automate scanning**: Use cron jobs or systemd timers to run regular compliance scans and maintain security posture.

4. **Generate actionable reports**: HTML reports and remediation scripts help address findings efficiently.

5. **Integrate with CI/CD**: Build compliance checks into your deployment pipelines to catch issues early.

6. **Create custom content**: Extend OpenSCAP with organization-specific policies when needed.

Regular compliance scanning is just one part of a comprehensive security strategy. It helps identify configuration drift, ensures systems meet regulatory requirements, and provides documentation for audits.

---

For comprehensive monitoring of your Ubuntu systems and compliance status, consider using [OneUptime](https://oneuptime.com). OneUptime provides real-time infrastructure monitoring, alerting, and incident management that complements your security compliance efforts. With OneUptime, you can monitor system health, track security metrics, receive instant alerts when issues arise, and maintain detailed logs of your compliance status over time. This ensures your systems remain both secure and operational around the clock.
