# How to Scan RHEL Systems for Known Vulnerabilities Using Red Hat Insights

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, Red Hat Insights, Vulnerability Scanning, CVE, Security, Linux

Description: Use the Vulnerability service in Red Hat Insights to scan RHEL systems for known CVEs and prioritize remediation based on risk severity.

---

Red Hat Insights includes a Vulnerability service that cross-references the packages installed on your registered RHEL systems against the Red Hat CVE database. This gives you a clear picture of which systems are exposed to known vulnerabilities.

## Prerequisites

Your RHEL systems must be registered with Red Hat Insights. If not already registered:

```bash
# Register with Insights
sudo insights-client --register

# Run an initial data collection
sudo insights-client
```

## Access the Vulnerability Dashboard

Open https://console.redhat.com/insights/vulnerability/cves in your browser. The dashboard shows all CVEs that affect your registered systems, sorted by severity (Critical, Important, Moderate, Low).

## View CVEs Affecting a Specific System

```bash
# From the CLI, trigger a fresh data upload so the dashboard is current
sudo insights-client

# List installed packages that may be affected
rpm -qa --qf '%{NAME}-%{VERSION}-%{RELEASE}.%{ARCH}\n' | sort
```

In the web console, click on "Systems" and select a specific host to see all CVEs that apply to it.

## Filter and Prioritize CVEs

The Vulnerability dashboard lets you filter by:

- **Severity** - Focus on Critical and Important CVEs first
- **CVSS score** - Sort by Common Vulnerability Scoring System score
- **Known exploits** - Filter to show only CVEs with known public exploits
- **Business risk** - Tag systems with business risk levels to help prioritize

## Remediate a Vulnerability

Once you identify a CVE, the console shows which package update resolves it.

```bash
# Example: CVE-2024-1234 affects openssl
# Update the vulnerable package
sudo dnf update -y openssl

# Verify the fix is applied by checking the installed version
rpm -q openssl

# Re-run insights-client to update the dashboard
sudo insights-client
```

## Generate Remediation Playbooks

For multiple CVEs across multiple systems, use the Remediate button in the console.

```bash
# Download the generated Ansible playbook
# Execute it against your inventory
ansible-playbook -i hosts.ini cve-remediation.yml --become

# Verify the remediation
sudo insights-client
```

## Exclude CVEs That Do Not Apply

If a CVE does not affect your workload due to specific configuration, you can mark it as "Not affected" with a business justification in the web console. This keeps your dashboard clean and focused on actionable items.

## Automate Regular Scanning

```bash
# Verify the insights-client timer runs daily
sudo systemctl status insights-client.timer

# Check when the next run is scheduled
sudo systemctl list-timers insights-client.timer
```

Regular scanning ensures that newly published CVEs are promptly identified across your fleet.
