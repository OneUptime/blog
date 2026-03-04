# How to Register RHEL Systems with Red Hat Insights for Proactive Monitoring

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, Red Hat Insights, Monitoring, System Administration, Linux

Description: Register your RHEL systems with Red Hat Insights to gain proactive monitoring, vulnerability detection, and configuration analysis from the Red Hat cloud console.

---

Red Hat Insights is a hosted service included with every RHEL subscription that analyzes your systems for security vulnerabilities, configuration risks, and performance issues. Registration is straightforward and takes only a few minutes per system.

## Prerequisites

Your RHEL system must be registered with Red Hat Subscription Manager. If it is not already registered:

```bash
# Register the system with your Red Hat account
sudo subscription-manager register --username your_username --password your_password

# Attach the appropriate subscription
sudo subscription-manager attach --auto
```

## Install the Insights Client

On RHEL 8 and RHEL 9, the insights-client package is included in the base repositories.

```bash
# Install the insights-client package
sudo dnf install -y insights-client
```

## Register the System with Insights

```bash
# Register this system with Red Hat Insights
sudo insights-client --register
```

This command collects system configuration data and uploads it to the Red Hat Insights service. The data includes package versions, kernel parameters, network configuration, and other system metadata. No application data or user files are transmitted.

## Verify Registration

```bash
# Check the registration status
sudo insights-client --status

# You should see output similar to:
# System is registered locally via .registered file.
# Registered at 2026-03-04T10:00:00.000000
```

## View Your System in the Console

Open your browser and navigate to https://console.redhat.com/insights/. Log in with your Red Hat account credentials. Your registered system should appear in the inventory within a few minutes.

## Configure Automatic Data Collection

The insights-client installs a systemd timer that runs daily by default.

```bash
# Verify the timer is active
sudo systemctl status insights-client.timer

# Enable it if it is not running
sudo systemctl enable --now insights-client.timer

# Check the schedule
sudo systemctl list-timers insights-client.timer
```

## Manually Trigger a Data Upload

```bash
# Run an immediate collection and upload
sudo insights-client

# Run with verbose output for troubleshooting
sudo insights-client --verbose
```

## Customize What Data Is Collected

You can redact hostnames, IP addresses, or other sensitive data.

```bash
# Edit the Insights client configuration
sudo vi /etc/insights-client/insights-client.conf

# To obfuscate hostnames and IP addresses, add:
# obfuscate=True
# obfuscate_hostname=True
```

## Unregister a System

```bash
# Remove the system from Insights
sudo insights-client --unregister
```

After registration, Insights begins analyzing your system and provides actionable recommendations through the web console.
