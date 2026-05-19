# How to Set Up Compliance Scanning with OpenSCAP on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, OpenSCAP, Compliance, Security, Auditing

Description: Install and configure OpenSCAP on Ubuntu to run automated compliance scans against SCAP security profiles, generate HTML reports, and integrate scanning into your CI/CD pipeline.

---

OpenSCAP is an open-source implementation of the SCAP (Security Content Automation Protocol) standard. Unlike ad-hoc security scripts, OpenSCAP uses standardized content (OVAL definitions and XCCDF profiles) that can be validated, shared, and compared across organizations. The SCAP Security Guide (SSG) project provides ready-to-use profiles for Ubuntu that map to CIS benchmarks and DISA STIGs.

## Installing OpenSCAP

```bash
sudo apt update
sudo apt install libopenscap8 openscap-scanner openscap-utils -y

# Verify installation

oscap --version
```

Install the SCAP Security Guide content for Ubuntu:

```bash
# Install the SSG package which includes Ubuntu profiles
sudo apt install ssg-base ssg-debderived -y

# List available content files
ls /usr/share/xml/scap/ssg/content/

# You should see files like:
# ssg-ubuntu2204-ds.xml  (Ubuntu 22.04 DataStream)
# ssg-ubuntu2004-ds.xml  (Ubuntu 20.04 DataStream)
```

## Understanding SCAP Content Structure

A SCAP DataStream (`-ds.xml` file) bundles multiple components:
- **XCCDF** - The profile definitions (which rules to check)
- **OVAL** - The actual check logic (how to test each rule)
- **CPE** - Platform applicability (which OS versions apply)

## Listing Available Profiles

```bash
# List all profiles in the Ubuntu 22.04 DataStream
oscap info /usr/share/xml/scap/ssg/content/ssg-ubuntu2204-ds.xml

# Or just list profile IDs and titles
oscap info --profiles \
    /usr/share/xml/scap/ssg/content/ssg-ubuntu2204-ds.xml
```

Common profiles you'll see for Ubuntu:
- `xccdf_org.ssgproject.content_profile_cis_level1_server` - CIS Level 1 (Server)
- `xccdf_org.ssgproject.content_profile_cis_level1_workstation` - CIS Level 1 (Workstation)
- `xccdf_org.ssgproject.content_profile_cis_level2_server` - CIS Level 2 (Server)
- `xccdf_org.ssgproject.content_profile_cis_level2_workstation` - CIS Level 2 (Workstation)
- `xccdf_org.ssgproject.content_profile_stig` - DISA STIG
- `xccdf_org.ssgproject.content_profile_standard` - Standard System Security Profile

## Running Your First Scan

```bash
# Set variables for readability
SSG_FILE="/usr/share/xml/scap/ssg/content/ssg-ubuntu2204-ds.xml"
PROFILE="xccdf_org.ssgproject.content_profile_cis_level1_server"
RESULTS_DIR="/var/log/scap-results"

sudo mkdir -p "$RESULTS_DIR"

# Run a CIS Level 1 Server scan
sudo oscap xccdf eval \
    --profile "$PROFILE" \
    --results "${RESULTS_DIR}/results-$(date +%Y%m%d).xml" \
    --report "${RESULTS_DIR}/report-$(date +%Y%m%d).html" \
    --oval-results \
    "$SSG_FILE"
```

The scan takes several minutes. Exit code 0 means all checks passed; exit code 2 means some checks failed (normal on unconfigured systems).

## Reading Scan Results

```bash
# Quick summary of pass/fail counts
sudo oscap xccdf eval \
    --profile "$PROFILE" \
    --results /tmp/results.xml \
    "$SSG_FILE" 2>&1 | tail -20

# View the HTML report
# Copy to a location your browser can access
sudo cp "${RESULTS_DIR}/report-$(date +%Y%m%d).html" /var/www/html/scap-report.html
```

The HTML report shows:
- Overall compliance percentage
- Pass/fail/not-applicable for each rule
- Rule descriptions and severity
- Fix instructions for failed rules

## Parsing XML Results for Automation

```bash
# Count passed rules straight from the result XML
sudo grep -oE '<result>pass</result>' \
    "${RESULTS_DIR}/results-$(date +%Y%m%d).xml" | wc -l

# Extract failed rules with their IDs
python3 << 'EOF'
import xml.etree.ElementTree as ET

tree = ET.parse('/var/log/scap-results/results-latest.xml')
root = tree.getroot()
ns = {'xccdf': 'http://checklists.nist.gov/xccdf/1.2'}

failed = []
for result in root.findall('.//xccdf:rule-result', ns):
    if result.find('xccdf:result', ns) is not None:
        if result.find('xccdf:result', ns).text == 'fail':
            failed.append(result.get('idref'))

print(f"Failed rules: {len(failed)}")
for rule in failed[:10]:
    print(f"  - {rule}")
EOF
```

## Scanning Specific Rules

Instead of running the full profile, scan a subset of rules:

```bash
# Scan only SSH-related rules
sudo oscap xccdf eval \
    --profile "$PROFILE" \
    --rule "xccdf_org.ssgproject.content_rule_sshd_disable_root_login" \
    --rule "xccdf_org.ssgproject.content_rule_sshd_disable_empty_passwords" \
    --results /tmp/ssh-results.xml \
    "$SSG_FILE"

# Scan all rules matching a pattern
sudo oscap xccdf eval \
    --profile "$PROFILE" \
    --results /tmp/results.xml \
    --report /tmp/report.html \
    "$SSG_FILE" 2>&1 | grep -E "^Rule|pass|fail"
```

## Applying Automatic Remediation

OpenSCAP can generate remediation scripts or apply fixes directly:

```bash
# Generate a bash remediation script (review before running!)
sudo oscap xccdf generate fix \
    --profile "$PROFILE" \
    --output /tmp/remediation.sh \
    --fix-type bash \
    "$SSG_FILE"

# View the generated script
head -100 /tmp/remediation.sh

# Generate an Ansible playbook for remediation
sudo oscap xccdf generate fix \
    --profile "$PROFILE" \
    --output /tmp/remediation.yml \
    --fix-type ansible \
    "$SSG_FILE"
```

**Warning**: Always review generated remediation scripts before applying them. Some fixes (like restricting SSH ciphers or setting password complexity) can lock you out if applied incorrectly.

Apply remediation based on scan results (fix only what failed):

```bash
# First scan and save results
sudo oscap xccdf eval \
    --profile "$PROFILE" \
    --results /tmp/results.xml \
    "$SSG_FILE"

# Generate remediation script from scan results (only failed checks)
sudo oscap xccdf generate fix \
    --output /tmp/targeted-remediation.sh \
    --fix-type bash \
    /tmp/results.xml

# Review and apply
cat /tmp/targeted-remediation.sh
# sudo bash /tmp/targeted-remediation.sh
```

## Creating a Custom Profile

Tailor a profile for your environment by creating a customized version:

```bash
# Create a customized profile XML file
cat << 'EOF' > /tmp/custom-profile.xml
<?xml version="1.0" encoding="UTF-8"?>
<Tailoring xmlns="http://checklists.nist.gov/xccdf/1.2"
           id="xccdf_custom_tailoring">
  <benchmark href="/usr/share/xml/scap/ssg/content/ssg-ubuntu2204-ds.xml"/>
  <version time="2026-03-01T00:00:00">1</version>
  <Profile id="xccdf_custom_profile_org_base" extends="xccdf_org.ssgproject.content_profile_cis_level1_server">
    <title>Custom CIS Profile - Our Organization</title>
    <description>CIS Level 1 Server with organization-specific exclusions</description>

    <!-- Disable specific rules that don't apply to our environment -->
    <select
      idref="xccdf_org.ssgproject.content_rule_mount_option_tmp_noexec"
      selected="false"/>

    <!-- Customize a rule value -->
    <set-value
      idref="xccdf_org.ssgproject.content_value_var_password_pam_maxrepeat">
      3
    </set-value>
  </Profile>
</Tailoring>
EOF

# Run scan with custom profile
sudo oscap xccdf eval \
    --tailoring-file /tmp/custom-profile.xml \
    --profile "xccdf_custom_profile_org_base" \
    --results /tmp/custom-results.xml \
    --report /tmp/custom-report.html \
    "$SSG_FILE"
```

## Integrating into a CI/CD Pipeline

For continuous compliance monitoring, run scans automatically:

```bash
#!/bin/bash
# /usr/local/bin/compliance-scan.sh - Run and report on compliance scan

SSG_FILE="/usr/share/xml/scap/ssg/content/ssg-ubuntu2204-ds.xml"
PROFILE="xccdf_org.ssgproject.content_profile_cis_level1_server"
RESULTS_DIR="/var/log/scap-results"
DATE=$(date +%Y%m%d-%H%M)
FAIL_THRESHOLD=20  # Fail if more than 20 rules fail

mkdir -p "$RESULTS_DIR"

# Run the scan
oscap xccdf eval \
    --profile "$PROFILE" \
    --results "${RESULTS_DIR}/results-${DATE}.xml" \
    --report "${RESULTS_DIR}/report-${DATE}.html" \
    "$SSG_FILE" > "${RESULTS_DIR}/scan-${DATE}.log" 2>&1

SCAN_EXIT=$?

# Count failures (match only the rule-result text element to avoid false hits)
FAIL_COUNT=$(grep -oE '<result>fail</result>' "${RESULTS_DIR}/results-${DATE}.xml" 2>/dev/null | wc -l)
PASS_COUNT=$(grep -oE '<result>pass</result>' "${RESULTS_DIR}/results-${DATE}.xml" 2>/dev/null | wc -l)
TOTAL=$((PASS_COUNT + FAIL_COUNT))
SCORE=0
if [ "$TOTAL" -gt 0 ]; then
    SCORE=$((PASS_COUNT * 100 / TOTAL))
fi

echo "Compliance Score: ${SCORE}% (${PASS_COUNT}/${TOTAL} rules passed)"
echo "Report: ${RESULTS_DIR}/report-${DATE}.html"

# Exit with error if too many failures
if [ "$FAIL_COUNT" -gt "$FAIL_THRESHOLD" ]; then
    echo "ALERT: $FAIL_COUNT rules failed (threshold: $FAIL_THRESHOLD)"
    exit 1
fi
```

Schedule it with cron:

```bash
# Run compliance scan weekly
echo "0 2 * * 0 root /usr/local/bin/compliance-scan.sh" | sudo tee /etc/cron.d/scap-scan
```

## Comparing Scans Over Time

OpenSCAP itself doesn't include a built-in results-diff command, so a small Python script is the most reliable way to compare two result XML files and see which rules changed state:

```bash
python3 << 'EOF'
import xml.etree.ElementTree as ET

ns = {'xccdf': 'http://checklists.nist.gov/xccdf/1.2'}

def load_results(path):
    root = ET.parse(path).getroot()
    out = {}
    for rr in root.findall('.//xccdf:rule-result', ns):
        res = rr.find('xccdf:result', ns)
        if res is not None:
            out[rr.get('idref')] = res.text
    return out

old = load_results('/var/log/scap-results/results-20260201.xml')
new = load_results('/var/log/scap-results/results-20260301.xml')

regressed = [r for r in old if old[r] == 'pass' and new.get(r) == 'fail']
fixed = [r for r in old if old[r] == 'fail' and new.get(r) == 'pass']

print(f"Regressed (pass -> fail): {len(regressed)}")
for r in regressed:
    print(f"  - {r}")
print(f"Fixed (fail -> pass): {len(fixed)}")
for r in fixed:
    print(f"  - {r}")
EOF
```

## Remote Scanning Over SSH

For scanning fleets of machines without installing scan tooling everywhere, `oscap-ssh` (shipped in the `openscap-utils` package) runs `oscap` on a remote host and pulls the results back. The remote host only needs `oscap`, `bash`, `ssh`, `scp`, and `mktemp`:

```bash
# Syntax: oscap-ssh user@host PORT <oscap arguments>
oscap-ssh user@target.example.com 22 \
    xccdf eval \
    --profile "$PROFILE" \
    --results /tmp/remote-results.xml \
    --report /tmp/remote-report.html \
    "$SSG_FILE"
```

For true offline use (scanning a mounted filesystem or chroot rather than a live system), use `oscap-chroot`:

```bash
# Scan a mounted image at /mnt/target
sudo oscap-chroot /mnt/target xccdf eval \
    --profile "$PROFILE" \
    --results /tmp/chroot-results.xml \
    "$SSG_FILE"
```

If you only need raw OVAL system characteristics from a host (for archiving or later analysis), collect them with `--syschar`:

```bash
sudo oscap oval collect \
    --syschar /tmp/system-data.xml \
    "$SSG_FILE"
```

OpenSCAP turns compliance from a periodic manual audit into an automated, measurable process. With HTML reports you can share with auditors and XML results you can track over time, demonstrating compliance becomes a matter of running a script rather than answering a questionnaire.
