# How to Set Up Dynatrace OneAgent for Full-Stack Monitoring on RHEL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, Dynatrace, Monitoring, APM, Linux

Description: Install and configure Dynatrace OneAgent on RHEL for automated full-stack monitoring of infrastructure, processes, and applications.

---

Dynatrace OneAgent provides automatic, full-stack monitoring of your RHEL servers. It discovers processes, services, and their dependencies without manual configuration. Here is how to install and verify it.

## Prerequisites

You need a Dynatrace environment (SaaS or Managed) with the Environment ID and API token ready.

## Downloading and Installing OneAgent

```bash
# Download the OneAgent installer from your Dynatrace environment
# Replace YOUR_ENVIRONMENT_ID and YOUR_API_TOKEN with your values
curl -o /tmp/dynatrace-oneagent.sh \
  "https://YOUR_ENVIRONMENT_ID.live.dynatrace.com/api/v1/deployment/installer/agent/unix/default/latest?Api-Token=YOUR_API_TOKEN&arch=x86&flavor=default"

# Verify the download
file /tmp/dynatrace-oneagent.sh

# Run the installer with root privileges
sudo /bin/bash /tmp/dynatrace-oneagent.sh \
  --set-app-log-content-access=true \
  --set-infra-only=false
```

## Verifying the Installation

```bash
# Check that the OneAgent service is running
sudo systemctl status oneagent

# View the OneAgent version
/opt/dynatrace/oneagent/agent/tools/oneagentctl --version

# Check connectivity to the Dynatrace server
/opt/dynatrace/oneagent/agent/tools/oneagentctl --get-server
```

## Configuring Host Groups and Tags

Organize your hosts in Dynatrace using host groups and tags:

```bash
# Set the host group (used for logical grouping in Dynatrace)
sudo /opt/dynatrace/oneagent/agent/tools/oneagentctl \
  --set-host-group=production-web-servers

# Set custom host properties
sudo /opt/dynatrace/oneagent/agent/tools/oneagentctl \
  --set-host-property=Environment=production \
  --set-host-property=Team=platform

# Restart the agent for changes to take effect
sudo systemctl restart oneagent
```

## Firewall Configuration

OneAgent needs outbound HTTPS access to Dynatrace:

```bash
# Allow outbound HTTPS to Dynatrace (typically already open)
# If you use a restrictive firewall, allow port 443 outbound

# If using an ActiveGate as a proxy, configure it
sudo /opt/dynatrace/oneagent/agent/tools/oneagentctl \
  --set-server="https://your-activegate.example.com:9999/communication"
```

## Monitoring Custom Processes

OneAgent automatically discovers most processes. For custom applications, verify detection:

```bash
# Check which processes OneAgent has discovered
/opt/dynatrace/oneagent/agent/tools/oneagentctl --get-process-metadata

# View OneAgent logs for detection details
sudo tail -50 /var/log/dynatrace/oneagent/oneagent.log
```

## Configuring Log Monitoring

Enable log monitoring for RHEL system logs:

```bash
# OneAgent can ingest logs automatically
# Configure log sources in the Dynatrace UI under:
# Settings > Log Monitoring > Log sources and storage

# Or use oneagentctl to enable log access
sudo /opt/dynatrace/oneagent/agent/tools/oneagentctl \
  --set-app-log-content-access=true
```

## Updating OneAgent

```bash
# Check current version
/opt/dynatrace/oneagent/agent/tools/oneagentctl --version

# OneAgent updates automatically by default
# To check update status
/opt/dynatrace/oneagent/agent/tools/oneagentctl --get-auto-update-enabled

# To manually trigger an update
sudo /opt/dynatrace/oneagent/agent/tools/oneagentctl --set-auto-update-enabled=true
```

Once installed, navigate to your Dynatrace environment. The host should appear within 5 minutes with full infrastructure metrics, process monitoring, and service detection.
