# How to Detect Configuration Drift Across RHEL Systems Using Red Hat Insights

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, Red Hat Insights, Configuration Drift, Drift Detection, System Administration, Linux

Description: Use the Drift service in Red Hat Insights to compare RHEL system configurations and detect unintended changes across your infrastructure.

---

Configuration drift occurs when systems that should be identically configured diverge over time due to manual changes, failed updates, or inconsistent automation. Red Hat Insights includes a Drift service that compares registered RHEL systems side by side to identify differences.

## Prerequisites

All systems you want to compare must be registered with Red Hat Insights.

```bash
# Ensure the insights-client is installed and registered
sudo insights-client --register

# Run a fresh data collection
sudo insights-client
```

## Access the Drift Dashboard

Navigate to https://console.redhat.com/insights/drift in your browser. The Drift service lets you compare two or more systems or compare a system against a saved baseline.

## Create a Baseline

A baseline captures the expected configuration of a system at a point in time.

1. Go to the Drift dashboard
2. Click "Baselines" then "Create baseline"
3. Choose to copy from an existing system or define values manually
4. Name the baseline (e.g., "webserver-production-baseline")
5. Save it

## Compare Systems

```bash
# Make sure all systems have recent data
sudo insights-client
```

In the Drift console:

1. Click "Comparison" then "Add to comparison"
2. Select two or more systems (or a system and a baseline)
3. Click "Compare"

The comparison view highlights differences in:

- Installed packages and versions
- Running services
- Kernel parameters
- Network configuration
- Hardware details

## Filter the Comparison

Use the filter options to focus on specific categories:

- **Same** - Show only matching values
- **Different** - Show only values that differ
- **Incomplete data** - Show where data is missing from one side

## Example: Finding Package Version Differences

If two web servers should have identical packages but one was updated independently:

```bash
# On the drifted system, check the current package version
rpm -q httpd

# Compare it against the expected version from the baseline
# The Drift console will show this discrepancy

# Fix the drift by updating or downgrading to match
sudo dnf install httpd-2.4.57-5.el9
```

## Export Drift Reports

The Drift console allows you to export comparison results as CSV or JSON for auditing and change management processes.

## Automate Drift Checks

Combine Insights Drift with Ansible to automatically correct drift when detected.

```bash
# Use an Ansible playbook to enforce the baseline configuration
ansible-playbook -i inventory.ini enforce-baseline.yml --become

# Then re-run insights-client to verify drift is resolved
sudo insights-client
```

Regular drift detection helps maintain consistency across your RHEL fleet and prevents hard-to-diagnose issues caused by configuration mismatches.
