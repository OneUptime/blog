# How to Document Calico Felix Configuration for Operators

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, Felix, Kubernetes, Configuration, Networking, Documentation

Description: A guide to documenting Calico Felix configuration parameters, defaults, and operational impact for platform engineering teams.

---

## Introduction

Felix is the primary agent in Calico that runs on every node. It is responsible for programming routes and ACLs, managing network interfaces, and enforcing network policy. Felix reads its configuration from the FelixConfiguration resource in the Calico datastore and translates it into iptables rules, BPF programs, or other data plane constructs.

For operators managing production clusters, documenting Felix configuration is critical. Undocumented configuration changes can lead to unexpected behavior, make incident response harder, and create knowledge silos within the team. A well-maintained Felix configuration document serves as the single source of truth for how networking behaves in your cluster.

This guide covers how to extract, organize, and maintain documentation of your Felix configuration so that any operator on your team can understand and manage it.

## Prerequisites

- Kubernetes cluster with Calico v3.25+ installed
- `calicoctl` CLI installed and configured
- `kubectl` access with appropriate permissions
- Access to a documentation platform (wiki, Git repo, or internal docs site)

## Extracting the Current Felix Configuration

Start by retrieving the active FelixConfiguration resource:

```bash
# Get the default Felix configuration
calicoctl get felixconfiguration default -o yaml > felix-config.yaml

# View it directly
calicoctl get felixconfiguration default -o yaml
```

The output contains all explicitly set parameters. Parameters not listed use their compiled defaults.

```yaml
apiVersion: projectcalico.org/v3
kind: FelixConfiguration
metadata:
  name: default
spec:
  bpfEnabled: false
  ipipEnabled: true
  logSeverityScreen: Info
  reportingInterval: 30s
  routeRefreshInterval: 90s
  iptablesRefreshInterval: 90s
```

## Documenting Key Configuration Categories

Organize Felix parameters into logical groups for your documentation:

### Data Plane Settings

```bash
# Check the active data plane mode
calicoctl get felixconfiguration default -o yaml | grep -E "bpfEnabled|ipipEnabled|vxlanEnabled"
```

Document which data plane is in use (iptables, BPF, or eBPF) and why that decision was made. Include the trade-offs considered during the initial setup.

### Logging and Reporting

```bash
# Review logging configuration
calicoctl get felixconfiguration default -o yaml | grep -E "logSeverity|reportingInterval"
```

Document the log severity levels and reporting intervals. Note any custom log file paths or syslog integrations.

### Refresh Intervals

```bash
# Check refresh intervals
calicoctl get felixconfiguration default -o yaml | grep -E "Interval|Period"
```

These intervals control how often Felix re-syncs with the datastore and refreshes iptables rules. Document any deviations from defaults and the reasoning behind them.

## Creating a Configuration Reference Document

Structure your documentation with these sections:

```markdown
## Felix Configuration Reference

### Environment
- Cluster: production-us-east
- Calico version: v3.27.0
- Data plane: iptables
- Last updated: 2026-03-15

### Modified Parameters
| Parameter | Value | Default | Reason |
|-----------|-------|---------|--------|
| logSeverityScreen | Warning | Info | Reduce log volume in production |
| iptablesRefreshInterval | 180s | 90s | Lower CPU on large clusters |
| routeRefreshInterval | 120s | 90s | Stable network, fewer refreshes needed |

### Default Parameters (unchanged)
| Parameter | Default Value | Description |
|-----------|--------------|-------------|
| bpfEnabled | false | Standard iptables data plane |
| reportingInterval | 30s | Metrics reporting frequency |
```

## Tracking Configuration Changes

Set up a process to detect and document changes:

```bash
# Export current config to a versioned file
DATE=$(date +%Y-%m-%d)
calicoctl get felixconfiguration default -o yaml > "felix-config-${DATE}.yaml"

# Compare with previous configuration
diff felix-config-previous.yaml "felix-config-${DATE}.yaml"
```

Store configuration snapshots in version control:

```bash
# Add to your infrastructure repository
cd /path/to/infra-repo
cp felix-config-${DATE}.yaml calico/felix/
git add calico/felix/felix-config-${DATE}.yaml
git commit -m "Snapshot Felix configuration ${DATE}"
```

## Documenting Node-Specific Overrides

Felix supports per-node configuration overrides. Document any node-specific settings:

```bash
# List all FelixConfiguration resources (not just default)
calicoctl get felixconfiguration -o wide

# Check for node-specific overrides
calicoctl get felixconfiguration -o yaml | grep -A 20 "name: node."
```

If node-specific overrides exist, document which nodes have custom settings and why.

## Verification

Verify that your documentation matches the live cluster state:

```bash
# Re-export and compare with documented values
calicoctl get felixconfiguration default -o yaml > felix-live.yaml

# Check Felix is healthy on all nodes
kubectl get pods -n calico-system -l k8s-app=calico-node -o wide

# Verify Felix is reporting correctly
kubectl logs -n calico-system -l k8s-app=calico-node -c calico-node --tail=10 | grep "Felix"
```

## Troubleshooting

**Configuration not taking effect**: Felix reads configuration changes dynamically, but some parameters require a Felix restart. Check Felix logs for messages about configuration updates.

```bash
kubectl logs -n calico-system -l k8s-app=calico-node -c calico-node --tail=100 | grep -i "config"
```

**Conflicting configurations**: If both default and node-specific FelixConfiguration resources exist, the node-specific resource takes precedence. Verify which configuration is active on each node.

**High CPU from frequent refreshes**: If Felix is consuming excessive CPU, check that refresh intervals have not been set too aggressively low. The `iptablesRefreshInterval` and `routeRefreshInterval` are common culprits.

## Conclusion

Documenting Calico Felix configuration is an investment that pays off during incident response, team onboarding, and cluster upgrades. By extracting the live configuration, organizing it into a structured reference document, and tracking changes over time, operators can maintain full visibility into how their network data plane is configured. Make this documentation part of your regular operational review cycle to keep it current and useful.
