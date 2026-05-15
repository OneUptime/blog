# How to Set Up Red Hat Insights for Proactive Performance Monitoring on RHEL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, Red Hat Insights, Monitoring, Proactive, Compliance, Advisories

Description: Register your RHEL systems with Red Hat Insights to get proactive recommendations on performance, security, availability, and compliance issues.

---

Red Hat Insights is a hosted service included with your RHEL subscription. It analyzes system data and provides actionable recommendations to fix problems before they cause outages. It covers performance tuning, security vulnerabilities, stability risks, and compliance.

## Register Your System with Insights

```bash
# Ensure the system is registered with Red Hat Subscription Manager

sudo subscription-manager register --auto-attach

# Install the Insights client (pre-installed on RHEL 8+ except some minimal installs)
sudo dnf install -y insights-client

# Register the system with Insights
sudo insights-client --register

# Run the first data collection
sudo insights-client
```

## Verify Registration

```bash
# Check registration status
sudo insights-client --status

# Set a custom display name
sudo insights-client --display-name "webserver-prod-01"
```

## View Recommendations

After the first collection, log in to the Red Hat Hybrid Cloud Console:

```bash
https://console.redhat.com/insights/
```

Recommendations are categorized by:
- **Availability** - risks that could cause downtime
- **Performance** - tuning opportunities
- **Security** - CVEs and vulnerabilities
- **Stability** - configuration issues that affect reliability

## Configure Collection Schedule

```bash
# Insights collects data daily by default via a systemd timer
systemctl status insights-client.timer

# View the timer schedule
systemctl list-timers | grep insights

# Force a manual collection
sudo insights-client

# Collect and upload with verbose output
sudo insights-client --verbose
```

## Control What Data Is Collected

```bash
# View the Insights configuration
cat /etc/insights-client/insights-client.conf

# Edit to customize data collection
sudo vi /etc/insights-client/insights-client.conf

# To redact hostnames from uploaded data
# obfuscation_list=hostname
```

## Use the Insights Advisor CLI

```bash
# List current recommendations for this system (requires API access)
# Typically viewed in the web console, but the insights-client
# can provide some information locally

# Test connectivity to Red Hat Insights services
sudo insights-client --test-connection

# Fetch diagnostic information after the system has registered and uploaded once
sudo insights-client --diagnosis

# List available compliance policies for this system
sudo insights-client --compliance-policies
```

## Install Insights for Compliance (SCAP)

```bash
# Install the supported SCAP Security Guide package for your RHEL minor version
sudo dnf install -y scap-security-guide

# After assigning the system to a compliance policy, run and upload a compliance scan
sudo insights-client --compliance

# View compliance results in the console at:
# https://console.redhat.com/insights/compliance/
```

## Unregister from Insights

```bash
# If you need to remove a system from Insights
sudo insights-client --unregister
```

Red Hat Insights catches configuration drift, missing patches, and performance issues that are easy to miss during day-to-day operations. Since it is included with every RHEL subscription at no extra cost, there is no reason not to use it on production systems.
