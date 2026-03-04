# How to Use Red Hat Insights Advisor to Resolve Configuration Risks on RHEL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, Red Hat Insights, Advisor, Configuration Management, Security, Linux

Description: Use the Advisor service in Red Hat Insights to identify and resolve configuration risks, performance issues, and security gaps across your RHEL systems.

---

Red Hat Insights Advisor analyzes your registered RHEL systems and provides recommendations based on known issues, security advisories, and best practices. Each recommendation includes a description of the risk and step-by-step resolution instructions.

## Accessing Advisor

Navigate to https://console.redhat.com/insights/advisor/recommendations in your browser. You will see a list of recommendations sorted by risk level (Critical, Important, Moderate, Low).

## Using the Insights CLI to View Recommendations

You can also check recommendations from the command line.

```bash
# Run a fresh data collection
sudo insights-client

# Check the number of recommendations for this system
sudo insights-client --check-results
```

## Understanding Recommendation Categories

Advisor organizes findings into four categories:

- **Availability** - Issues that could cause downtime or service interruptions
- **Performance** - Configuration that may degrade system performance
- **Security** - Vulnerabilities or insecure configurations
- **Stability** - Settings that could cause unpredictable behavior

## Filtering Recommendations by Risk

In the web console, use the filter sidebar to focus on specific risk levels.

```bash
# From the CLI, view detailed system information sent to Insights
sudo insights-client --show-results
```

## Applying a Remediation

Each recommendation in the Advisor console includes a "Remediate" button. You can either:

1. Follow the manual steps provided in the recommendation
2. Generate an Ansible remediation playbook

For manual resolution, Advisor provides exact commands. For example, if Advisor flags an outdated openssl package:

```bash
# Update the flagged package as recommended by Advisor
sudo dnf update -y openssl

# Verify the update was applied
rpm -q openssl
```

## Generate an Ansible Playbook for Bulk Remediation

From the Advisor web interface, select multiple recommendations and click "Remediate". This creates an Ansible playbook you can download and execute.

```bash
# Download the generated playbook from the Insights console
# Then run it against affected hosts
ansible-playbook -i inventory.ini insights-remediation.yml --become
```

## Disable Specific Recommendations

If a recommendation does not apply to your environment:

```bash
# You can disable specific rules in the Insights client configuration
# Add the rule ID to the deny list
sudo tee -a /etc/insights-client/remove.conf > /dev/null << 'EOF'
[remove]
commands=/bin/some_command
EOF

# Re-run the client to update
sudo insights-client
```

Advisor continuously monitors your systems and updates recommendations as new issues are discovered or patches are released. Review the dashboard regularly to keep your RHEL fleet in optimal condition.
