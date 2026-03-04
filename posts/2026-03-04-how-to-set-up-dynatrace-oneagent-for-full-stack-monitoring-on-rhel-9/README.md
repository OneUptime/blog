# How to Set Up Dynatrace OneAgent for Full-Stack Monitoring on RHEL 9

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, Linux, Monitoring, Dynatrace

Description: Step-by-step guide on set up dynatrace oneagent for full-stack monitoring on rhel 9 with practical examples and commands.

---

Dynatrace OneAgent provides full-stack monitoring for RHEL 9, covering infrastructure, applications, and user experience.

## Install OneAgent

```bash
wget -O Dynatrace-OneAgent.sh \
  "https://your-environment.live.dynatrace.com/api/v1/deployment/installer/agent/unix/default/latest?Api-Token=YOUR_API_TOKEN&arch=x86&flavor=default"
sudo /bin/sh Dynatrace-OneAgent.sh --set-app-log-content-access=true
```

## Verify Installation

```bash
sudo systemctl status oneagent
```

## Configure Host Group

```bash
sudo /opt/dynatrace/oneagent/agent/tools/oneagentctl \
  --set-host-group=rhel9-production
```

## Configure Network Zones

```bash
sudo /opt/dynatrace/oneagent/agent/tools/oneagentctl \
  --set-network-zone=datacenter-east
```

## Monitor Custom Processes

Dynatrace auto-discovers processes, but you can add custom detection rules in the Dynatrace UI.

## Configure Log Monitoring

```bash
# OneAgent automatically detects common log files
# For custom log paths, configure in Dynatrace UI:
# Settings > Log Monitoring > Log sources and storage
```

## Verify Data in Dynatrace

Check the Dynatrace UI for:
- Host appears in Infrastructure view
- Processes are detected
- Metrics are flowing

## Conclusion

Dynatrace OneAgent on RHEL 9 provides automatic discovery and monitoring of infrastructure, processes, and applications. Configure host groups and network zones for organized observability.

