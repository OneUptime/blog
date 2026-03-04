# How to Create and Apply Compliance Policies in Red Hat Insights

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, Red Hat Insights, Compliance, OpenSCAP, Security, Linux

Description: Use the Compliance service in Red Hat Insights to create SCAP-based compliance policies and scan RHEL systems against regulatory standards like CIS and PCI-DSS.

---

Red Hat Insights Compliance integrates with OpenSCAP to let you define security policies and scan your RHEL fleet against standards such as CIS Benchmarks, PCI-DSS, HIPAA, and DISA STIG. Scan results appear in the Insights console where you can track compliance status across all systems.

## Install OpenSCAP on RHEL Systems

```bash
# Install the OpenSCAP scanner and SCAP security guide
sudo dnf install -y openscap-scanner scap-security-guide

# Verify the installation
oscap --version
```

## Create a Compliance Policy in the Console

1. Navigate to https://console.redhat.com/insights/compliance/scappolicies
2. Click "Create policy"
3. Select your RHEL version (e.g., RHEL 9)
4. Choose a compliance profile (e.g., CIS Red Hat Enterprise Linux 9 Benchmark)
5. Assign systems to the policy
6. Set a scan schedule

## Run a Compliance Scan from the CLI

```bash
# List available SCAP profiles
oscap info /usr/share/xml/scap/ssg/content/ssg-rhel9-ds.xml

# Run a CIS benchmark scan locally
sudo oscap xccdf eval \
  --profile xccdf_org.ssgproject.content_profile_cis \
  --results /tmp/cis-results.xml \
  --report /tmp/cis-report.html \
  /usr/share/xml/scap/ssg/content/ssg-rhel9-ds.xml
```

## Upload Results to Insights

The insights-client automatically uploads compliance scan results when the compliance module is enabled.

```bash
# Trigger a compliance scan and upload results to Insights
sudo insights-client --compliance
```

## Review Results in the Console

Navigate to https://console.redhat.com/insights/compliance/reports to see:

- Overall compliance score per system
- List of passed and failed rules
- Remediation steps for each failed rule

## Remediate Non-Compliant Rules

Each failed rule in the console includes a description and remediation guidance.

```bash
# Example: If the scan flags that password minimum length is too short
# Apply the fix using authselect and pwquality
sudo sed -i 's/^minlen.*/minlen = 14/' /etc/security/pwquality.conf

# Example: If the scan flags that auditing is not enabled
sudo systemctl enable --now auditd
```

## Automate Remediation with Ansible

```bash
# Generate an Ansible playbook from SCAP results
sudo oscap xccdf generate fix \
  --fix-type ansible \
  --result-id "" \
  /tmp/cis-results.xml > cis-remediation.yml

# Run the playbook
ansible-playbook cis-remediation.yml --become
```

Re-run the compliance scan after applying fixes to verify your compliance score has improved. Regular scanning helps maintain continuous compliance with your chosen security standard.
